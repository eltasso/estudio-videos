# -*- coding: utf-8 -*-
"""Corre UN video entero dentro de GitHub Actions (en la cuenta del usuario, con SUS claves de los secretos del repo).
Lo lanza .github/workflows/video.yml. Mismo motor que el Estudio de PC (server.py: sesión de Claude Code con DeepSeek,
proxy que mide el gasto, guardián). Cada ~2 min publica el avance en la rama `estado` (videos/<vid>.json), que es lo
que lee el panel. Lee los mensajes del panel (mensajes/<vid>.json). Al terminar sube final.mp4 a un Release.
Si se acerca al límite de 6 h de GitHub, frena, guarda todo en la caché y se relanza solo en otra máquina."""
import base64, json, os, shutil, subprocess, sys, time, unicodedata, urllib.error, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(BASE)
sys.path.insert(0, BASE + "/tools")
import _cfg

E = os.environ
VID = E["VID"]
REPO = E["GITHUB_REPOSITORY"]
TOK = E["GH_TOKEN"]
LIMITE = float(E.get("LIMITE_MIN", "320")) * 60     # GitHub corta a las 6 h: a las 5 h 20 min frenamos y seguimos en otra máquina
T0 = time.time()
RUN_URL = f"https://github.com/{REPO}/actions/runs/{E.get('GITHUB_RUN_ID', '')}"


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)   # los logs del repo son PÚBLICOS: nunca imprimir claves ni el guion


def gh(method, path, body=None, ok404=True):
    rq = urllib.request.Request(E.get("GITHUB_API_URL", "https://api.github.com") + path, method=method,
                                data=json.dumps(body).encode() if body is not None else None,
                                headers={"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json",
                                         "User-Agent": "estudio-videos", "X-GitHub-Api-Version": "2022-11-28"})
    for k in range(5):
        try:
            r = urllib.request.urlopen(rq, timeout=60).read()
            return json.loads(r) if r else {}
        except urllib.error.HTTPError as e:
            if e.code == 404 and ok404: return None
            if e.code in (409, 422) and method == "PUT": return {"_conflicto": True}
            log("GitHub", e.code, path)
        except Exception as e: log("GitHub", e)
        time.sleep(5 * (k + 1))
    return None


def rama_estado():
    if gh("GET", f"/repos/{REPO}/branches/estado"): return
    main = gh("GET", f"/repos/{REPO}")["default_branch"]
    sha = gh("GET", f"/repos/{REPO}/git/ref/heads/{main}")["object"]["sha"]
    gh("POST", f"/repos/{REPO}/git/refs", {"ref": "refs/heads/estado", "sha": sha})


def leer_estado(ruta):
    r = gh("GET", f"/repos/{REPO}/contents/{ruta}?ref=estado")
    if not r: return None, None
    return json.loads(base64.b64decode(r["content"]).decode("utf8")), r["sha"]


def escribir_estado(ruta, obj):
    for _ in range(3):
        _, sha = leer_estado(ruta)
        body = {"message": f"estado {VID}", "branch": "estado",
                "content": base64.b64encode(json.dumps(obj, ensure_ascii=False, indent=1).encode("utf8")).decode()}
        if sha: body["sha"] = sha
        r = gh("PUT", f"/repos/{REPO}/contents/{ruta}", body)
        if r and not r.get("_conflicto"): return True
        time.sleep(3)
    return False


try: os.remove(os.path.join(_cfg.DATOS, "relanzar_" + VID))   # vino en la caché de la máquina anterior
except OSError: pass

# ── 1) claves (secretos del repo) → config.json local de esta máquina (nunca se imprime)
c = _cfg.leer()
for k in ("deepseek", "openai", "fish", "runpod", "groq", "pexels"):
    v = (E.get(k.upper() + "_API_KEY") or "").strip()
    if v: c[k] = v
c["github"] = TOK                                  # token del propio workflow: sube cara+audio un rato a ESTE repo (público) para RunPod
c["avatar_repo"] = REPO.split("/")[1]
c["fotos_motor"] = "ahorro" if str(E.get("AHORRO") or "") == "1" and c.get("pexels") else "openai"
_cfg.guardar(c)
os.chmod(_cfg.CONFIG, 0o600)
# La sesión de DeepSeek corre con otro usuario y solo ve esta copia SIN claves; las herramientas usan el puente del motor.
_pub = E.get("ESTUDIO_CONFIG_PUB")
if _pub:
    with open(_pub, "w", encoding="utf8") as _f: json.dump({k: ("via-puente" if v and k in _cfg.CLAVES + _cfg.OPCIONALES else v) for k, v in c.items()}, _f)
    os.chmod(_pub, 0o644)
for _k in ("DEEPSEEK_API_KEY", "OPENAI_API_KEY", "FISH_API_KEY", "RUNPOD_API_KEY", "GROQ_API_KEY", "PEXELS_API_KEY"): E.pop(_k, None)

# ── 2) el canal (lo sube el panel a canales/<id>/ del repo)
cid = E["CANAL"]
src = os.path.join(RAIZ, "canales", cid)
if not os.path.exists(os.path.join(src, "canal.json")): sys.exit(f"⛔ no existe el canal {cid} en el repo")
dst = os.path.join(_cfg.CANALES, cid)
os.makedirs(dst, exist_ok=True)
for f in os.listdir(src): shutil.copyfile(os.path.join(src, f), os.path.join(dst, f))

import server                                      # noqa: E402  (crea las carpetas de datos)
import threading                                   # noqa: E402
server.preparar_brain()
threading.Thread(target=server.TS(("127.0.0.1", server.PROXY_PORT), server.Proxy).serve_forever, daemon=True).start()

ST = os.path.join(_cfg.DATOS, f"nube_{VID}.json")
st = server.jload(ST, {}) or {}
rama_estado()


import re                                          # noqa: E402
TAPAR = re.compile(r"(api[ _-]?key[^\n]{0,20}?)\S*\*+\S*|sk-[A-Za-z0-9_\-]{8,}|gh[ps]_[A-Za-z0-9]{8,}|rpa_[A-Za-z0-9]{8,}|gsk_[A-Za-z0-9]{8,}", re.I)
SECRETOS = [v for v in (str(c.get(k) or "") for k in ("deepseek", "openai", "fish", "runpod", "groq", "pexels", "github")) if len(v) >= 8] + [TOK]
def tapar(t):                                      # el repo es público: nada que se parezca a una clave
    for v in SECRETOS: t = t.replace(v, "[oculto]")
    return TAPAR.sub(lambda m: (m.group(1) or "") + "[oculto]", t)
def limpio(o):
    if isinstance(o, str): return tapar(o)
    if isinstance(o, list): return [limpio(x) for x in o]
    if isinstance(o, dict): return {k: limpio(x) for k, x in o.items()}
    return o


# ── lo que muestra el panel: se publica entero en la rama `estado` (panel/<vid>/…) con git, que no gasta la cuota de la API
GIT_DIR = os.path.join(os.path.dirname(_cfg.DATOS.rstrip("/\\")), "estado_git")
GIT_HOST = E.get("GITHUB_SERVER_URL", "https://github.com").rstrip("/")
GIT_URL = f"{GIT_HOST}/{REPO}.git"                 # sin token en la URL: ni en .git/config ni en la lista de procesos
GIT_ENV = dict(E, GIT_CONFIG_COUNT="1", GIT_CONFIG_KEY_0=f"http.{GIT_HOST}/.extraheader",
               GIT_CONFIG_VALUE_0="AUTHORIZATION: basic " + base64.b64encode(f"x-access-token:{TOK}".encode()).decode())


def git(*a):
    return subprocess.run(["git", "-C", GIT_DIR, *a], capture_output=True, text=True, timeout=300, env=GIT_ENV)


def preparar_git():
    if os.path.isdir(os.path.join(GIT_DIR, ".git")): return
    os.makedirs(GIT_DIR, mode=0o700, exist_ok=True)
    git("init", "-q"); git("remote", "add", "origin", GIT_URL)
    git("config", "user.name", "estudio"); git("config", "user.email", "estudio@users.noreply.github.com")


def traer():
    r = git("fetch", "-q", "--depth", "1", "origin", "estado")
    return r.returncode == 0 and git("checkout", "-q", "-f", "--detach", "FETCH_HEAD").returncode == 0


def armar_panel(extra):
    """Escribe en la copia de git lo que cambió de este video. Devuelve la lista de rutas tocadas."""
    rid = st["rid"]; v = server.video(rid); cwd = v["cwd"]
    base = os.path.join(GIT_DIR, "panel", VID); os.makedirs(base, exist_ok=True)
    pub = st.setdefault("pub", {})
    def js(nombre, o):
        with open(os.path.join(base, nombre), "w", encoding="utf8") as fh: json.dump(limpio(o), fh, ensure_ascii=False, separators=(",", ":"))
    vista = {k: x for k, x in v.items() if k != "cwd"}
    vista["nube"] = extra
    js("video.json", vista)
    tl = server.timeline(rid)
    for x in tl["lanes"]:                          # clips de stock: el panel los reproduce directo desde Pexels (los mp4 no se suben a GitHub)
        if x.get("k") == "clip" and str(x.get("f") or "").endswith(".mp4"):
            try: u = json.load(open(os.path.join(cwd, x["f"][:-4] + ".json"), encoding="utf8")).get("prev")
            except (OSError, ValueError): u = None
            if u: x["v"] = u
    js("timeline.json", tl)
    g = server.gallery(rid); js("gallery.json", g)
    prompts = {}                                   # lo que se le pidió a cada foto, para el visor del panel
    for it in g["fotos"] + g["clips"]:
        p = server.prompt_for(cwd, it["p"])
        if p: prompts[it["p"]] = p[:4000]
    js("prompts.json", prompts)
    ev = server.events(rid); ult = ev[-250:]
    cortos = [{k: (x[:1500] if isinstance(x, str) else x) for k, x in e.items()} for e in ult]
    js("chat.json", {"total": len(ev), "desde": len(ev) - len(ult), "ev": cortos})

    def nuevo(clave, ruta):
        try: firma = str(os.path.getmtime(ruta))
        except OSError: return False
        if pub.get(clave) == firma: return False
        pub[clave] = firma; return True

    n = 0                                          # miniaturas: las fotos van apareciendo en el panel a medida que llegan
    for it in g["fotos"] + g["clips"] + [{"p": q} for q in g.get("qc", [])]:
        rel = it["p"]; full = os.path.join(cwd, rel)
        if n >= 150 or not nuevo("t:" + rel, full): continue
        j = server.thumb(full, 420, "/tmp/estudio_t")
        if not j: pub.pop("t:" + rel, None); continue
        dst = os.path.join(base, "t", rel + ".jpg"); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(j, dst); n += 1

    for rel in {x["fr"] for x in tl["lanes"] if x.get("fr")}:     # la foto fija sobre la que el visor dice «Esperando avatar»
        full = os.path.join(cwd, rel)
        if not nuevo("t:" + rel, full): continue
        j = server.thumb(full, 1280, "/tmp/estudio_t")
        if not j: pub.pop("t:" + rel, None); continue
        dst = os.path.join(base, "t", rel + ".jpg"); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copyfile(j, dst)

    X = os.path.join(cwd, "extrema")               # Edición extrema en vivo: cada pieza entra a la línea de tiempo, en versión liviana, apenas se renderiza
    M = server.jload(os.path.join(X, "momentos.json"), []) or []
    if M:
        R = server.jload(os.path.join(X, "render.json"), {}) or {}
        tl["xm"] = []
        for m in M:
            i = str(m.get("id") or ""); rel = "extrema/" + i + ".mp4"; arch = str(m.get("arch") or rel); full = os.path.join(cwd, arch); dst = os.path.join(base, "f", rel); capa = arch.endswith(".mov")
            hecha = bool((R.get(i) or {}).get("ok")) and os.path.exists(full)
            if hecha and nuevo("x:" + rel, full):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                try: mal = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x2c2c2e:s=640x360:r=30", "-i", full, "-an", "-filter_complex", "[1:v]scale=640:360,format=yuva420p[o];[0:v][o]overlay=shortest=1,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-movflags", "+faststart", dst] if capa else ["ffmpeg", "-v", "error", "-y", "-i", full, "-an", "-vf", "scale=640:-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst], capture_output=True, timeout=120).returncode
                except subprocess.TimeoutExpired: mal = 1
                if mal:
                    pub.pop("x:" + rel, None)
                    if os.path.exists(dst): os.remove(dst)
            tl["xm"].append({"t0": m["startMs"] / 1000, "t1": m["endMs"] / 1000, "t": str(m.get("texto") or "")[:120], "f": rel if hecha and os.path.exists(dst) else ""})
        js("timeline.json", tl)

    F = v.get("files") or {}
    for rel in [F.get(k) for k in ("guion", "reporte", "captions")] + ["planos.json"]:     # textos que abre el panel
        if not rel: continue
        full = os.path.join(cwd, rel)
        if nuevo("f:" + rel, full) and os.path.getsize(full) < 3_000_000:
            dst = os.path.join(base, "f", rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(full, encoding="utf8", errors="replace") as a, open(dst, "w", encoding="utf8") as b: b.write(tapar(a.read()))
    rel = F.get("master")
    if rel and nuevo("m:" + rel, os.path.join(cwd, rel)):   # la voz, liviana, para escucharla en la línea de tiempo
        dst = os.path.join(base, "f", rel + ".mp3"); os.makedirs(os.path.dirname(dst), exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(cwd, rel), "-ac", "1", "-b:a", "48k", dst], capture_output=True, timeout=300)
        w = server.wave(rid)
        if w: shutil.copyfile(w, os.path.join(base, "wave.png"))
    server.jsave(ST, st)


def con_clave():
    """Última red antes de cada commit al repo público: la clave tal cual, en base64, en hex o al revés."""
    formas = []
    for v in SECRETOS:
        b = v.encode(); formas += [b, base64.b64encode(b), base64.b64encode(b).rstrip(b"="), b.hex().encode(), b[::-1]]
    for rel in git("diff", "--cached", "--name-only", "-z").stdout.split("\0"):
        p = os.path.join(GIT_DIR, rel)
        if rel and os.path.isfile(p):
            with open(p, "rb") as f: d = f.read()
            if any(x in d for x in formas): return True
    return False


def publicar_panel(extra):
    """Un solo commit con todo lo del panel. Si otro video (o un mensaje) empujó justo antes, se reintenta sobre lo nuevo."""
    if not st.get("rid"): return
    try:
        preparar_git()
        for intento in range(4):
            if not traer(): log("git: no pude traer la rama estado"); return
            if intento: st["pub"] = {k: x for k, x in st.get("pub", {}).items() if k[:2] not in ("t:", "f:", "m:", "x:")}
            armar_panel(extra)
            git("add", "-A", "panel/" + VID)
            if git("diff", "--cached", "--quiet").returncode == 0: return
            if con_clave():
                git("reset", "-q", "--hard", "HEAD"); log("⛔ publicación frenada: un archivo traía una clave; no se subió nada"); return
            git("commit", "-q", "-m", "panel " + VID)
            if git("push", "-q", "origin", "HEAD:refs/heads/estado").returncode == 0: return
            time.sleep(4 + 3 * intento)
        log("git: no pude publicar el panel")
    except Exception as e: log("no pude publicar el panel:", type(e).__name__)


def clave_mala():
    """Si DeepSeek rechaza la clave, no tiene sentido insistir: se avisa en el panel enseguida."""
    for x in server.events(st["rid"])[-6:]:
        t = x.get("t") if isinstance(x.get("t"), str) else ""
        if re.search(r"401|Authentication Fails|invalid x-api-key|api key.*invalid", t, re.I): return True
    return False


def publicar(estado, extra=None):
    try:
        v = server.video(st["rid"]) if st.get("rid") else {}
        ev = []
        if st.get("rid"):
            for x in server.events(st["rid"])[-30:]:
                t = x.get("t") if isinstance(x.get("t"), str) else json.dumps(x.get("t"), ensure_ascii=False)
                ev.append({"k": x.get("k"), "t": tapar(t or "")[:400]})
        o = {"vid": VID, "titulo": E.get("TITULO"), "canal": cid, "estado": estado, "actualizado": time.time(),
             "creado": st.get("creado"), "run": RUN_URL, "pasos": (v.get("pipeline") or {}).get("steps"),
             "costo": v.get("cost"), "eventos": ev, "maquinas": st.get("maquinas", 1), "extrema": "1" if str(E.get("EXTREMA") or "") == "1" else "", "ahorro": "1" if str(E.get("AHORRO") or "") == "1" else "", "etapas": etapas_resumen() if st.get("rid") else None}
        o.update(st.get("final") or {})
        o.update(extra or {})
        escribir_estado(f"videos/{VID}.json", o)
        publicar_panel({k: o.get(k) for k in ("titulo", "canal", "run", "estado", "error", "final", "release", "actualizado", "maquinas", "extrema", "ahorro", "etapas")})
    except Exception as e: log("no pude publicar el estado:", type(e).__name__)


# ── registro por etapas: lo que el panel muestra para saber si un video entró en la hora (sin contar la espera del avatar)
NOMBRES_ETAPA = [("maquina", "Preparar la máquina"), ("guion", "Guion"), ("voz", "Voz"), ("tiempos", "Tiempos"), ("avatar_cola", "Avatar en cola"), ("avatar_gen", "Avatar generando"), ("fotos", "Fotos y stock"),
                 ("extrema", "Edición extrema"), ("previo", "Render sin avatar"), ("render", "Render"), ("armado", "Armado"), ("revisor", "Revisor"), ("correcciones", "Correcciones"), ("entrega", "Entrega")]
MEDIA = (".png", ".jpg", ".jpeg", ".webp", ".mp4")
xm = {"p": None, "t": 0}


def materiales(cwd, con_plan=False):
    """Voz con tiempos, tramos de avatar y TODAS las fotos y clips de los planos (el .json de un pedido no cuenta: la foto puede no haber llegado)."""
    if not all(os.path.exists(os.path.join(cwd, f)) for f in ("captions.json", "avatar_ranges.json", "shots_timed.json") + (("plan.json",) if con_plan else ())): return False
    try: tiene = {os.path.splitext(f)[0] for d in ("fotos", "clips") if os.path.isdir(os.path.join(cwd, d)) for f in os.listdir(os.path.join(cwd, d)) if f.lower().endswith(MEDIA)}
    except OSError: return False
    sh = server.jload(os.path.join(cwd, "shots_timed.json"), []) or []
    return len(tiene) >= 8 and bool(sh) and all(isinstance(s, dict) and s.get("id") in tiene for s in sh)


def etapas_observar(cwd):
    et = st.setdefault("et", {}); cre = st.get("creado") or time.time()
    def m(rel):
        try: return os.path.getmtime(os.path.join(cwd, rel))
        except OSError: return None
    def poner(k, ini, fin=None):
        e = et.setdefault(k, {})
        if ini and "i" not in e: e["i"] = round(ini, 1)
        if fin and "f" not in e: e["f"] = round(fin, 1)
    if st.get("run0"): poner("maquina", st["run0"], cre)
    g = m("guion.txt"); poner("guion", cre, g)
    v = m("voz/master.wav")
    if g: poner("voz", g, v)
    c = m("captions.json")
    if v: poner("tiempos", v, c)
    L = server.jload(os.path.join(cwd, "avatar", "it_llamada.json"), {}) or {}
    if L.get("enviado"): poner("avatar_cola", L["enviado"], L.get("genera") or L.get("llego"))
    if L.get("genera"): poner("avatar_gen", L["genera"], L.get("llego"))
    try:
        F = [os.path.join(cwd, d, f) for d in ("fotos", "clips") if os.path.isdir(os.path.join(cwd, d)) for f in os.listdir(os.path.join(cwd, d)) if f.lower().endswith(MEDIA)]
        if F and "i" not in et.get("fotos", {}): poner("fotos", min(os.path.getmtime(f) for f in F))
    except OSError: pass
    if "i" in et.get("fotos", {}) and materiales(cwd): poner("fotos", None, time.time())
    if xm.get("t"):
        poner("extrema", xm["t"])
        if xm["p"] is not None and xm["p"].poll() is not None: poner("extrema", None, time.time())
    server.jsave(ST, st)


def etapas_resumen():
    """{filas:[{k,n,seg,pasadas,fin}], total_s, avatar_s, sin_avatar_s} con lo que hay hasta ahora."""
    try:
        cwd = server.video(st["rid"])["cwd"]; etapas_observar(cwd); et = st.get("et", {}); ahora = st.get("t_fin") or time.time(); M = {}
        try:
            for l in open(os.path.join(cwd, "gates", "etapas.jsonl"), encoding="utf8"):
                try: x = json.loads(l)
                except ValueError: continue
                if x.get("q") == "ini": M.setdefault(x.get("e"), []).append([x["t"], None])
                else:
                    for a in reversed(M.get(x.get("e"), [])):
                        if a[1] is None: a[1] = x["t"]; break
        except OSError: pass
        for k in M: M[k] = [a for a in M[k] if a[1] is None or a[1] - a[0] >= 5]        # un «sin cambios» no cuenta como pasada
        fin_rev = (M.get("revisor") or [[0, None]])[0][1]
        if fin_rev:                                 # lo que corre después del primer revisor son las correcciones
            M["correcciones"] = []
            for k in ("render", "armado", "revisor"):
                M["correcciones"] += [a for a in M.get(k, []) if a[0] >= fin_rev]; M[k] = [a for a in M.get(k, []) if a[0] < fin_rev]
            M["correcciones"].sort()
        filas = []
        for k, n in NOMBRES_ETAPA:
            I = [[et[k].get("i"), et[k].get("f")]] if et.get(k, {}).get("i") else M.get(k) or []
            if not I: continue
            filas.append({"k": k, "n": n, "seg": max(0, round(sum((b or ahora) - a for a, b in I))), "pasadas": len(I), "fin": all(b for _, b in I)})
        total = ahora - (st.get("run0") or st.get("creado") or ahora)
        a0, a1 = et.get("avatar_cola", {}).get("i"), et.get("avatar_gen", {}).get("f") or et.get("avatar_cola", {}).get("f")
        avatar = (a1 or ahora) - a0 if a0 else 0
        return {"filas": filas, "total_s": round(total), "avatar_s": round(avatar), "sin_avatar_s": round(total - avatar), "cerrado": bool(st.get("t_fin"))}
    except Exception as e:
        log("etapas:", type(e).__name__); return None


def mensajes_nuevos():
    m, _ = leer_estado(f"mensajes/{VID}.json")
    m = m if isinstance(m, list) else []
    n = st.get("msj", 0)
    st["msj"] = len(m); server.jsave(ST, st)
    return [str(x.get("texto") if isinstance(x, dict) else x) for x in m[n:]]


XM_ON = str(E.get("EXTREMA") or "").lower() in ("1", "true", "si", "sí")
if XM_ON and st.get("extrema") and not st.get("xm_ok") and not st.get("xm_reintento"):     # la extrema no llegó a entrar al video: se intenta UNA vez más en esta pasada
    st["extrema"] = False; st["xm_reintento"] = True; server.jsave(ST, st)
SOLO_XM = False

# ── 3) arrancar o retomar la sesión
if not st.get("rid"):
    st["creado"] = time.time()
    try:                                           # el reloj arranca cuando GitHub prende la máquina, no cuando esta termina de instalarse
        _r = gh("GET", f"/repos/{REPO}/actions/runs/{E.get('GITHUB_RUN_ID', '')}") or {}
        st["run0"] = time.mktime(time.strptime(_r["run_started_at"], "%Y-%m-%dT%H:%M:%SZ")) - time.timezone
    except Exception: pass
    try:
        st["rid"] = server.nuevo_video({"canal": cid, "titulo": E["TITULO"], "idea": E.get("IDEA", ""),
                                        "min": E.get("MINUTOS") or None, "cap": E.get("TOPE") or 2})
    except Exception as e:
        publicar("parado", {"error": "No arrancó: " + str(e)[:300]}); sys.exit(1)
    st["seguir"] = 0
    log("video lanzado")
else:
    st["maquinas"] = st.get("maquinas", 1) + 1; st["seguir"] = 0
    try:
        _v0 = server.video(st["rid"]); _n0 = st.get("msj", 0)
        _msj = mensajes_nuevos()
        _otros = [m for m in _msj if not m.strip().lower().startswith("/extrema")]
        if XM_ON and len(_otros) < len(_msj): st["extrema"] = False; log("pedido explícito: otra pasada de edición extrema")   # el mensaje "/extrema" la vuelve a intentar sin despertar a la sesión
        _hecho = bool(_v0["pipeline"]["complete"] and _v0["files"].get("final") and os.path.exists(os.path.join(_v0["cwd"], _v0["files"]["final"])))
        SOLO_XM = bool(XM_ON and not st.get("extrema") and _hecho and not _otros)
        if not SOLO_XM: st["msj"] = _n0             # los mensajes los lee la sesión, como siempre
    except Exception as _e: SOLO_XM = False; log("no pude ver si era una pasada de edición extrema:", type(_e).__name__)
    try:                                           # el usuario pudo haber subido el tope desde el panel: solo se sube, nunca se baja
        _mf = os.path.join(server.rdir(st["rid"]), "meta.json"); _m = server.jload(_mf, {})
        if float(E.get("TOPE") or 0) > float(_m.get("cap") or 0): _m["cap"] = float(E["TOPE"]); server.jsave(_mf, _m)
    except ValueError: pass
    if SOLO_XM: log("video ya terminado: pasada sólo de edición extrema, la sesión no se despierta")
    else:
        server.launch(st["rid"], "La sesión siguió en otra máquina (GitHub corta cada 6 h). Todo lo tuyo está igual en tu carpeta: "
                                 "mirá qué hay, NO rehagas nada y seguí el CAMINO RECTO del KIT hasta el final.")
        log("video retomado, máquina", st["maquinas"])
server.jsave(ST, st)
publicar("trabajando")


def _caida(t, e, tb):
    """Nada puede dejar el video en «trabajando» para siempre. El detalle va tapado: los logs del repo son públicos."""
    import traceback
    log("el motor se cortó:", t.__name__, tapar("".join(traceback.format_exception(t, e, tb)))[-900:])
    publicar("parado", {"error": "El motor se cortó (" + t.__name__ + "). Lo que estaba hecho quedó guardado: mandá un mensaje acá para que siga."})


sys.excepthook = _caida

XM_TOPE = str(min(float(E.get("TOPE_EXTREMA") or 0.20), 0.20))
XM_LOG = os.path.join("/tmp", "extrema_" + VID + ".log")


def xm_lista(cwd):
    """La edición extrema puede arrancar cuando hay voz con tiempos, tramos de avatar, plan y TODAS las fotos de los planos."""
    return materiales(cwd, con_plan=True)


def xm_fin(log_tail=True):
    """Cierra la extrema de fondo (si sigue viva la corta: el video no la espera) y pasa sus líneas al log."""
    p = xm["p"]
    if p and p.poll() is None:
        if os.environ.get("ESTUDIO_USUARIO_SESION"): subprocess.run(["sudo", "-n", "pkill", "-9", "-u", os.environ["ESTUDIO_USUARIO_SESION"], "-f", "/tmp/extrema_pkg"], capture_output=True)      # el render corre como el usuario sin claves: se para aparte, sin tocar la sesión
        try: os.killpg(p.pid, 15)                  # también el render de Remotion que cuelga de ella
        except OSError: p.terminate()
        try: p.wait(30)
        except subprocess.TimeoutExpired:
            try: os.killpg(p.pid, 9)
            except OSError: p.kill()
        try: os.remove(os.path.join(xm["cwd"], "extrema", "EN_CURSO"))
        except OSError: pass
        log("extrema: no terminó a tiempo, el video sale sin ella")
    if log_tail and os.path.exists(XM_LOG):
        with open(XM_LOG, encoding="utf8", errors="replace") as f:
            for _l in [l for l in f.read().splitlines() if "extrema:" in l][-14:]: log(tapar(_l)[:200])


def xm_lanzar():
    """Arranca extrema.py en segundo plano MIENTRAS se espera el avatar; render.py mete las piezas en el único armado final."""
    try:
        cwd = server.video(st["rid"])["cwd"]
        if not xm_lista(cwd): return
        xm["p"] = subprocess.Popen([sys.executable, BASE + "/tools/extrema.py", cwd, "--tope", XM_TOPE, "--fondo"],
                                   stdout=open(XM_LOG, "a"), stderr=subprocess.STDOUT, start_new_session=True)
        xm["t"] = time.time(); xm["cwd"] = cwd; st["xm_fondo"] = True; server.jsave(ST, st)
        log("extrema: arranca en segundo plano mientras llega el avatar")
    except Exception as e: log("extrema: no pude arrancarla (", type(e).__name__, ")")


AUTO = {"p": None, "previo": False, "armado": False, "fallos": 0}
AUTO_LOG = os.path.join("/tmp", "armado_" + VID + ".log")


def como_sesion(script, **extra):
    """Mismo usuario aislado y misma lista blanca de entorno que la sesión: lo que toca material generado nunca corre con acceso a las claves."""
    u = E.get("ESTUDIO_USUARIO_SESION")
    if not u: return ["bash", "-c", "umask 002; " + script]
    pasa = {x: E[x] for x in ("PATH", "LANG", "LC_ALL", "TZ") if x in E}
    pasa.update(extra, HOME="/home/" + u, USER=u, ESTUDIO_CONFIG=E["ESTUDIO_CONFIG_PUB"], ESTUDIO_PUENTE=f"http://127.0.0.1:{server.PROXY_PORT}", ESTUDIO_DATA=server.D)
    return ["sudo", "-n", "-H", "-u", u, "--", "env", "-i", *[f"{k}={v}" for k, v in pasa.items()], "bash", "-c", "umask 002; " + script]


def linea(t, cwd, a="", n=0):
    import shlex
    return "nice -n %d %s -B %s/tools/%s %s %s" % (n, shlex.quote(sys.executable), shlex.quote(BASE), t, shlex.quote(cwd), a)


def auto_lanzar(*pasos):
    AUTO["p"] = subprocess.Popen(como_sesion(" && ".join(pasos)), stdout=open(AUTO_LOG, "a"), stderr=subprocess.STDOUT, start_new_session=True)


def auto_tick():
    """Lo que no depende de la sesión lo hace el motor solo: mientras se espera el avatar, los planos sin él; cuando llega, sus segmentos y el armado."""
    try:
        if AUTO["p"]:
            if AUTO["p"].poll() is None: return
            if AUTO["p"].returncode and AUTO["armado"]:
                AUTO["fallos"] += 1; log("armado automático: salió con error", AUTO["p"].returncode)
                with open(AUTO_LOG, encoding="utf8", errors="replace") as f: log(tapar(f.read()[-500:]))
                if AUTO["fallos"] < 2: AUTO["armado"] = False
            AUTO["p"] = None
        cwd = server.video(st["rid"])["cwd"]
        if not materiales(cwd): return
        R = server.jload(os.path.join(cwd, "avatar_ranges.json"), []) or []
        def listo(r):                              # hace al menos 45 s que no cambia: no agarrar un clip que se está cortando
            try: f = os.path.join(cwd, r["file"]); return os.path.getsize(f) > 100000 and time.time() - os.path.getmtime(f) > 45
            except (OSError, KeyError, TypeError): return False
        llego = bool(R) and all(listo(r) for r in R)
        if llego and not AUTO["armado"] and not os.path.exists(os.path.join(cwd, "final.mp4")):
            AUTO["armado"] = True; auto_lanzar(linea("fondo_avatar.py", cwd), linea("render.py", cwd), linea("assemble.py", cwd)); log("armado: llegó el avatar, arranca solo")
        elif not llego and not AUTO["previo"]:
            AUTO["previo"] = True; auto_lanzar(linea("render.py", cwd, "--previo", 5)); log("render: arrancan los planos sin avatar mientras se espera")
    except Exception as e: log("armado automático:", type(e).__name__)


def control_cerrado(cwd):
    """True cuando no queda nada por hacer: si el control pasó, la sesión no sigue inventando vueltas."""
    J = lambda f: server.jload(os.path.join(cwd, "gates", f), {}) or {}
    fin = os.path.join(cwd, "final.mp4"); q = J("qc_ok.json"); r = J("revisor_final.json")
    if not (q and r and os.path.exists(fin) and os.path.exists(os.path.join(cwd, "REPORTE.md")) and os.path.exists(os.path.join(cwd, "meta.json"))): return False
    if abs(os.path.getmtime(fin) - float(q.get("final_mtime") or 0)) > 2: return False
    if not r.get("malas") or J("armado.json").get("correcciones", 0) >= 1: return True
    return time.time() - float(r.get("t") or 0) > 20 * 60          # marcó algo y a los 20 min no hubo pasada: sale como está


def correr_con_tope(script, tope):
    """Acá la sesión ya terminó: si se pasa del tope se corta todo lo que corre como su usuario."""
    p = subprocess.Popen(como_sesion(script, ARMADO_EXTREMA="1"), stdout=open(AUTO_LOG, "a"), stderr=subprocess.STDOUT, start_new_session=True)
    try: return p.wait(timeout=max(5, tope))
    except subprocess.TimeoutExpired:
        if E.get("ESTUDIO_USUARIO_SESION"): subprocess.run(["sudo", "-n", "pkill", "-9", "-u", E["ESTUDIO_USUARIO_SESION"]], capture_output=True)
        try: os.killpg(p.pid, 9)
        except OSError: pass
        p.wait(); return -9


def sin_saldo_con_final(cwd):
    """True si DeepSeek lleva 3 min sin saldo y el video ya está armado y quieto: esperar crédito no le suma nada al video."""
    if not (server.jload(_cfg.ALERTAS, {}) or {}).get("DeepSeek"): st.pop("sin_saldo", None); return False
    st["sin_saldo"] = st.get("sin_saldo") or time.time()
    fin = os.path.join(cwd, "final.mp4")
    if time.time() - st["sin_saldo"] < 180 or AUTO["p"] or not os.path.exists(fin) or time.time() - os.path.getmtime(fin) < 60: return False
    return subprocess.run(["pgrep", "-f", r"tools/(assemble|render)\.py"], capture_output=True).returncode != 0


def cerrar_sin_ia(cwd):
    """Lo que no necesita IA igual se hace (huecos negros) y el REPORTE dice la verdad."""
    log("DeepSeek sin saldo con el video armado: se entrega sin revisión con IA")
    publicar("trabajando", {"nota": "DeepSeek sin saldo: entrego el video sin revisión con IA"})
    try: correr_con_tope(linea("revisor.py", cwd), 5 * 60)
    except Exception as e: log("revisor sin IA:", type(e).__name__)
    try:
        with open(os.path.join(cwd, "REPORTE.md"), "a", encoding="utf8") as f:
            f.write("\n\n## Cierre automático\nDeepSeek se quedó sin saldo con el video ya armado: salió sin la revisión final con IA. Conviene mirarlo antes de publicar.\n")
    except OSError as e: log("reporte:", type(e).__name__)
    st["cerrado_sin_ia"] = True; server.jsave(ST, st)


def _granja_servicio():
    try: import granja
    except Exception as e: log("granja: no disponible (", type(e).__name__, ")"); return
    while True:
        time.sleep(10)
        try: granja.atender(_cfg.DATOS, lambda *a: log(*a))
        except Exception as e: log("granja:", type(e).__name__)
threading.Thread(target=_granja_servicio, daemon=True).start()

relanzar, ult = False, 0
while True:
    time.sleep(20)
    meta = server.jload(os.path.join(server.rdir(st["rid"]), "meta.json"), {})
    vivo = server.alive(meta.get("pid"))
    if time.time() - ult > 60:
        if XM_ON and xm["p"] is None and not st.get("extrema"): xm_lanzar()
        elif xm["p"] and xm["p"].poll() is None and time.time() - xm["t"] > 95 * 60: xm_fin(False)     # colgada: no se espera más
        auto_tick()
        ult = time.time(); publicar("trabajando" if vivo else "pensando")
        nuevos = mensajes_nuevos()
        if nuevos:
            try:                                   # lo pide el usuario: ahí sí vale otra pasada
                _g = os.path.join(server.video(st["rid"])["cwd"], "gates"); os.makedirs(_g, exist_ok=True); open(os.path.join(_g, "pedido_usuario"), "w").write("1")
                if os.path.exists(os.path.join(_g, "qc_ok.json")): os.remove(os.path.join(_g, "qc_ok.json"))
            except OSError: pass
            if vivo: meta.setdefault("cola", []).extend(nuevos); server.jsave(os.path.join(server.rdir(st["rid"]), "meta.json"), meta)
            else: server.launch(st["rid"], "\n\n".join(nuevos)); continue
    if time.time() - T0 > LIMITE:
        server.stop(st["rid"]); relanzar = True; log("límite de tiempo: sigue en otra máquina"); break
    if vivo:
        if not meta.get("cola") and sin_saldo_con_final(server.video(st["rid"])["cwd"]):
            server.stop(st["rid"]); time.sleep(3); cerrar_sin_ia(server.video(st["rid"])["cwd"]); break
        if not meta.get("cola") and control_cerrado(server.video(st["rid"])["cwd"]):
            st["cierre"] = st.get("cierre") or time.time()
            if time.time() - st["cierre"] > 90: server.stop(st["rid"]); log("control pasado: se cierra la sesión")
        else: st.pop("cierre", None)
        continue
    if meta.get("cola"):
        txt = "\n\n".join(meta["cola"]); meta["cola"] = []; server.jsave(os.path.join(server.rdir(st["rid"]), "meta.json"), meta)
        server.launch(st["rid"], txt); continue
    v = server.video(st["rid"])
    if v["pipeline"]["complete"]: break
    if v["estado"] == "tope": publicar("tope", {"error": "Se alcanzó el tope de gasto del video."}); sys.exit(0)
    if clave_mala(): publicar("parado", {"error": "DeepSeek rechazó la clave. Cambiala en Configuración y mandá un mensaje acá para que siga."}); sys.exit(1)
    if st.get("seguir", 0) >= 6: publicar("parado", {"error": "La sesión terminó sin completar el video. Mandá un mensaje acá para que siga desde donde quedó."}); sys.exit(1)
    st["seguir"] = st.get("seguir", 0) + 1; server.jsave(ST, st)
    server.launch(st["rid"], "Todavía falta terminar el video (final.mp4 + REPORTE.md). Seguí con el CAMINO RECTO del KIT desde donde "
                             "quedaste, sin rehacer lo que ya está y sin preguntar.")

if relanzar:
    open(os.path.join(_cfg.DATOS, "relanzar_" + VID), "w").write("1")
    publicar("trabajando", {"nota": "sigue en otra máquina"}); sys.exit(0)

# ── 3b) EDICIÓN EXTREMA: se hace de fondo mientras llega el avatar. Después del final nunca se lanza de cero ni se rearma todo:
#        si quedaron piezas que no entraron, se aplican SÓLO sus tramos con un tope duro. Si no alcanza, el video sale sin ellas.
TOPE_XM_TARDE = 25 * 60


def extrema_tarde():
    _v = server.video(st["rid"]); _cwd = _v["cwd"]
    _fin = os.path.join(_cwd, _v["files"]["final"]) if _v["files"].get("final") else None
    _man = (server.jload(os.path.join(_cwd, "extrema", "manifest.json"), []) or []) + (server.jload(os.path.join(_cwd, "extrema", "capas.json"), []) or [])
    if not _fin or not os.path.exists(_fin) or not _man: log("extrema: no hay piezas para agregar, va sin edición extrema"); return
    if time.time() - T0 > LIMITE - 32 * 60: log("extrema: no alcanza el tiempo de esta máquina, va sin edición extrema"); return
    publicar("trabajando", {"nota": "edición extrema"})
    _bk = _fin + ".sin_extrema.mp4"
    try: os.link(_fin, _bk)
    except OSError: shutil.copyfile(_fin, _bk)
    _ok, _antes, t0 = False, os.path.getmtime(_fin), time.time()
    resto = lambda: TOPE_XM_TARDE - (time.time() - t0)
    try:
        r1 = correr_con_tope(linea("render.py", _cwd), resto())
        r2 = correr_con_tope(linea("assemble.py", _cwd), resto()) if r1 == 0 else 1
        if r2 == 0 and os.path.getmtime(_fin) == _antes: _ok = True; log("extrema: las piezas ya estaban en el video")
        elif r2 == 0:
            r3 = correr_con_tope(linea("validar.py", _cwd, "--etapa final"), max(60, resto()))
            _ok = r3 == 0 and os.path.getsize(_fin) > 1e6
            log("extrema: %d piezas aplicadas por tramos en %d s" % (len(_man), time.time() - t0) if _ok else "extrema: no pasó el control, vuelve el final sin ellas")
        else: log("extrema: no llegó dentro del tope (", r1, r2, "), vuelve el final sin ellas")
    finally:
        try:
            if _ok: os.remove(_bk); st["xm_ok"] = True
            else: os.replace(_bk, _fin)
        except OSError as e: log("extrema: limpieza:", type(e).__name__)


if XM_ON and st.get("xm_fondo") and not st.get("extrema"):
    if xm["p"] and xm["p"].poll() is None:      # los componentes ya están pagos: se esperan antes de cortarlos, con tope para que el video nunca se trabe
        publicar("trabajando", {"nota": "edición extrema"}); _x0 = time.time(); log("extrema: el video está listo, espero los componentes (máx. 45 min)")
        while xm["p"].poll() is None and time.time() - _x0 < 45 * 60 and time.time() - T0 < LIMITE - 40 * 60: time.sleep(10)
        log("extrema: terminaron tras %d s" % (time.time() - _x0) if xm["p"].poll() is not None else "extrema: no llegaron en el tope de espera")
    xm_fin()
if XM_ON and not st.get("extrema"):
    try: extrema_tarde()
    except Exception as e: log("extrema: falló (", type(e).__name__, "), el video sale como estaba")
    st["extrema"] = True; server.jsave(ST, st)

# ── 4) entrega: Release con el final y el reporte
v = server.video(st["rid"]); cwd = v["cwd"]
fin = os.path.join(cwd, v["files"]["final"]) if v["files"].get("final") else None
tag = "video-" + VID
_e0 = time.time()
if not fin or not os.path.exists(fin):
    publicar("parado", {"error": "La sesión dijo que terminó, pero no encontré el video final. Mandá un mensaje acá para que lo revise."}); sys.exit(1)
_nom = re.sub(r"[^A-Za-z0-9]+", "-", unicodedata.normalize("NFKD", E.get("TITULO") or "").encode("ascii", "ignore").decode()).strip("-")[:90] or VID     # el MP4 se descarga con el título
_dir = os.path.join("/tmp", "release_" + VID); os.makedirs(_dir, exist_ok=True)
_mp4 = os.path.join(_dir, _nom + ".mp4")
if os.path.exists(_mp4): os.remove(_mp4)
try: os.link(fin, _mp4)
except OSError: shutil.copyfile(fin, _mp4)
fin = _mp4
archivos = [x for x in (fin, os.path.join(cwd, "REPORTE.md")) if x and os.path.exists(x)]
_rep = os.path.join(cwd, "REPORTE.md")
if os.path.exists(_rep):                           # lo único de texto que va al Release
    with open(_rep, encoding="utf8", errors="replace") as _f: _t = tapar(_f.read())
    with open(_rep, "w", encoding="utf8") as _f: _f.write(_t)
r = subprocess.run(["gh", "release", "create", tag, *archivos, "--repo", REPO, "--title", (E.get("TITULO") or VID)[:120],
                    "--notes", f"Canal: {cid}. Hecho por el Estudio."], capture_output=True, text=True)
if r.returncode != 0:
    r = subprocess.run(["gh", "release", "upload", tag, *archivos, "--repo", REPO, "--clobber"], capture_output=True, text=True)
    if r.returncode != 0:
        publicar("parado", {"error": "El video quedó hecho, pero GitHub no me dejó guardarlo. Mandá un mensaje acá para reintentar."}); sys.exit(1)
url = f"https://github.com/{REPO}/releases/download/{tag}/{os.path.basename(fin)}"
st["final"] = {"final": url, "release": f"https://github.com/{REPO}/releases/tag/{tag}"}
st.setdefault("et", {})["entrega"] = {"i": round(_e0, 1), "f": round(time.time(), 1)}; st["t_fin"] = time.time()
server.jsave(ST, st)
publicar("listo")
_r = etapas_resumen() or {}
log("listo · %d min en total · %d min sin contar el avatar" % (_r.get("total_s", 0) / 60, _r.get("sin_avatar_s", 0) / 60))
