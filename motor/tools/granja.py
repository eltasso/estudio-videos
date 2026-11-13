# -*- coding: utf-8 -*-
"""Render de las piezas animadas EN PARALELO: una máquina de GitHub por pieza (workflow piezas.yml), en vez de una atrás de otra
en la máquina del video. Lo usan extrema.py / extrema_libre.py / escenas.py:

    granja.render(T, pub, X, ids, log, local)

  T    carpeta del paquete Remotion ya preparado (src/, src/gen/, render.mjs, package.json)
  pub  carpeta public del paquete (fotos, clips)
  X    <video>/extrema  → ahí quedan <id>.mp4 / <id>.mov y render.json, igual que con el render de siempre
  ids  piezas a renderizar
  local  función(ids) que las renderiza en esta misma máquina (el camino de antes): es el respaldo, nunca se pierde nada

Reglas:
  · sólo en GitHub Actions y con 2 piezas o más; con una sola no hay nada que repartir.
  · quien tiene permiso para repartir es el proceso del motor (tiene GH_TOKEN). Una herramienta que corre como la sesión (sin claves)
    deja el pedido en X/_granja/ y lo atiende el motor (granja.atender, llamado desde nube.py).
  · lo que no vuelva a tiempo se renderiza acá con `local`. Una pieza que ya está hecha no se vuelve a hacer."""
import hashlib, json, os, shutil, subprocess, tarfile, time

_REPARTIDO = {}
MAX_PARALELO = 20          # una cuenta gratis de GitHub corre 20 trabajos a la vez
TOPE_S = 25 * 60           # lo que se espera a las máquinas; lo que falte va por el camino local


def _jl(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d


def _gh(*a, timeout=300):
    return subprocess.run(["gh", *a], capture_output=True, text=True, encoding="utf8", errors="replace", timeout=timeout)


def _huella(T, i):
    """La pieza es su código: si el .tsx no cambió, lo ya renderizado sirve; si cambió, se hace de nuevo."""
    try: return hashlib.sha1(open("%s/src/gen/%s.tsx" % (T, i), "rb").read()).hexdigest()[:16]
    except OSError: return ""


def _existe(X, i): return any(os.path.exists("%s/%s.%s" % (X, i, e)) for e in ("mp4", "mov"))


def _hechas(X, ids, T=None):
    res = _jl(X + "/render.json", {}) or {}
    return [i for i in ids if (res.get(i) or {}).get("ok") and _existe(X, i) and (T is None or (res[i].get("h") and res[i].get("h") == _huella(T, i)))]


def _anotar(X, nuevo):
    res = _jl(X + "/render.json", {}) or {}
    res.update(nuevo)
    json.dump(res, open(X + "/render.tmp", "w", encoding="utf8"), indent=1); os.replace(X + "/render.tmp", X + "/render.json")


def puede_repartir():
    return bool(os.environ.get("GITHUB_ACTIONS") and os.environ.get("GH_TOKEN") and os.environ.get("GITHUB_REPOSITORY"))


def repartir(T, pub, X, ids, log, tope=TOPE_S):
    """Sube el paquete, abre una máquina por pieza y trae lo que vuelve. Devuelve las piezas que quedaron hechas."""
    repo, vid = os.environ["GITHUB_REPOSITORY"], os.environ.get("VID") or "video"
    tag = "piezas-%s-%d" % (vid, int(time.time()))
    paq = "/tmp/%s.tgz" % tag
    t0 = time.time()
    with tarfile.open(paq, "w:gz", compresslevel=3) as tar:
        for nombre in ("src", "render.mjs", "package.json", "package-lock.json", "tsconfig.json", "remotion.config.ts"):
            if os.path.exists(T + "/" + nombre): tar.add(T + "/" + nombre, arcname="pkg/" + nombre)
        if os.path.isdir(pub): tar.add(pub, arcname="pkg/public")
    hechas = []
    try:
        r = _gh("release", "create", tag, paq, "--repo", repo, "--prerelease", "--title", "piezas (temporal)", "--notes", "Archivos temporales del render en paralelo. Se borran solos.")
        if r.returncode: log("granja: no pude subir el paquete (%s)" % r.stderr.strip()[-160:]); return hechas
        r = _gh("workflow", "run", "piezas.yml", "--repo", repo, "--ref", os.environ.get("GITHUB_REF_NAME") or "main", "-f", "tag=" + tag, "-f", "ids=" + json.dumps(ids))
        if r.returncode: log("granja: no pude abrir las máquinas (%s)" % r.stderr.strip()[-160:]); return hechas
        log("granja: %d piezas, una máquina cada una (paquete %.1f MB)" % (len(ids), os.path.getsize(paq) / 1e6))
        _REPARTIDO[X] = True
        vistas = set()
        while time.time() - t0 < tope and len(vistas) < len(ids):
            time.sleep(15)
            r = _gh("release", "view", tag, "--repo", repo, "--json", "assets", "-q", ".assets[]|select(.state==\"uploaded\")|.name", timeout=90)
            if r.returncode: continue
            nombres = set(r.stdout.split())
            for i in ids:
                if i in vistas or (i + ".json") not in nombres: continue        # el .json se sube último: cuando está, la pieza ya terminó (bien o mal)
                vistas.add(i)
                d = _gh("release", "download", tag, "--repo", repo, "-D", X, "--clobber", "-p", i + ".json", "-p", i + ".mp4", "-p", i + ".mov", timeout=900)
                info = _jl("%s/%s.json" % (X, i), {}) or {}
                try: os.remove("%s/%s.json" % (X, i))
                except OSError: pass
                ok = bool(info.get("ok")) and d.returncode == 0 and _existe(X, i)
                if ok: info["h"] = _huella(T, i)
                _anotar(X, {i: info if ok else {"ok": False, "error": str(info.get("error") or d.stderr.strip()[-200:] or "no llegó")[:600]}})
                if ok: hechas.append(i)
                log("granja: %s %s (%s s)" % (i, "lista" if ok else "falló", info.get("s", "?")))
        if len(vistas) < len(ids): log("granja: %d piezas no volvieron en %d min" % (len(ids) - len(vistas), tope // 60))
    finally:
        _gh("release", "delete", tag, "--repo", repo, "--cleanup-tag", "-y", timeout=120)
        try: os.remove(paq)
        except OSError: pass
    log("granja: %d de %d piezas en %.0f s" % (len(hechas), len(ids), time.time() - t0))
    return hechas


def render(T, pub, X, ids, log, local):
    """Deja en X las piezas `ids`. En paralelo si se puede; lo que falte, con `local(ids_que_faltan)`."""
    os.makedirs(X, exist_ok=True)
    ya = set(_hechas(X, ids, T)); falta = [i for i in ids if i not in ya]
    if ya: log("granja: %d piezas ya estaban hechas" % len(ya))
    if falta and os.environ.get("GITHUB_ACTIONS"):
        try:
            if puede_repartir(): repartir(T, pub, X, falta, log)
            elif os.environ.get("ESTUDIO_PUENTE"): _pedir(T, pub, X, falta, log)
        except Exception as e: log("granja: falló el reparto (%s), sigue acá" % type(e).__name__)
        ya = set(_hechas(X, ids, T)); res = _jl(X + "/render.json", {}) or {}
        vistas = [i for i in ids if i not in ya and i in res]          # volvieron con error: no se insiste
        if _REPARTIDO.get(X): vistas = [i for i in ids if i not in ya]  # se repartió: lo que no volvió a tiempo tampoco se hace acá
        if vistas: log("granja: %s no salieron y quedan afuera" % ", ".join(vistas))
        falta = [i for i in ids if i not in ya and i not in vistas]
    if falta:
        previo = _jl(X + "/render.json", {}) or {}       # el render local reescribe render.json: se conserva lo que ya volvió
        local(falta)
        nuevo = _jl(X + "/render.json", {}) or {}
        for i in falta:
            if (nuevo.get(i) or {}).get("ok"): nuevo[i]["h"] = _huella(T, i)
        previo.update(nuevo); json.dump(previo, open(X + "/render.json", "w", encoding="utf8"), indent=1)


# ── pedidos de una herramienta que corre sin claves (la sesión): los atiende el motor
def _pedir(T, pub, X, ids, log, tope=TOPE_S + 5 * 60):
    P = X + "/_granja"; os.makedirs(P, exist_ok=True)
    try: subprocess.run(["chmod", "-R", "a+rX", T], capture_output=True, timeout=120)
    except Exception: pass
    f = "%s/pedido_%d.json" % (P, int(time.time()))
    json.dump({"T": T, "pub": pub, "X": X, "ids": ids, "estado": "pendiente", "t": time.time()}, open(f, "w", encoding="utf8"))
    log("granja: pedí %d piezas al motor" % len(ids))
    t0 = time.time()
    while time.time() - t0 < tope:
        time.sleep(10)
        e = (_jl(f, {}) or {}).get("estado")
        if e in ("hecho", "tomado"): _REPARTIDO[X] = True
        if e in ("hecho", "fallo"): break
        if e == "pendiente" and time.time() - t0 > 180: break       # nadie lo tomó: no hay motor atendiendo, sigue acá
    try: os.remove(f)
    except OSError: pass


def atender(datos, log):
    """Lo llama el motor (con GH_TOKEN) cada pocos segundos: toma los pedidos pendientes de cualquier video de `datos`."""
    if not puede_repartir(): return
    for raiz, dirs, fs in os.walk(datos):
        if os.path.basename(raiz) != "_granja": continue
        for n in sorted(fs):
            f = os.path.join(raiz, n); p = _jl(f, None)
            if not n.startswith("pedido_") or not p or p.get("estado") != "pendiente": continue
            T, pub, X, ids = str(p.get("T") or ""), str(p.get("pub") or ""), str(p.get("X") or ""), [str(i) for i in p.get("ids") or []]
            real = os.path.realpath
            if not (real(X) + os.sep).startswith(real(datos) + os.sep) or not real(T).startswith("/tmp/") or not (real(pub) + os.sep).startswith(real(T) + os.sep) \
               or not ids or len(ids) > 40 or any(not i.replace("_", "").isalnum() for i in ids):
                p["estado"] = "fallo"; json.dump(p, open(f, "w", encoding="utf8")); continue
            p["estado"] = "tomado"; json.dump(p, open(f, "w", encoding="utf8"))
            try: repartir(T, pub, X, ids, log)
            except Exception as e: log("granja: pedido falló (%s)" % type(e).__name__); p["estado"] = "fallo"
            else: p["estado"] = "hecho"
            try: json.dump(p, open(f, "w", encoding="utf8"))
            except OSError: pass
