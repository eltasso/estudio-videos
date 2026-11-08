# -*- coding: utf-8 -*-
"""Fotos del b-roll. Motor (Configuración → Fotos): "openai" = gpt-image-2.5-sunburst SIEMPRE low + Batch; referencia SOLO en las fotos del presentador;
"manual" = las hace el usuario con lo que quiera (gratis).
   python <APP>/tools/fotos.py <carpeta_del_video> <pedidos.json> > <carpeta>/fotos/fotos.log 2>&1      (en segundo plano)
pedidos.json = [{"id":"b01_gancho", "cara": true|false, "prompt": { JSON con los campos del KIT }}, …]
  · "cara": true → sale el presentador: se le agrega su DESCRIPCIÓN física al "subject" y va con refs/cara.png (128x192) por /images/edits
    en Batch, para que coincida con el avatar. Tope: TOPE_CARA fotos por video. Todas las demás, sin referencia, por /images/generations en Batch.
  · manual: escribe fotos/PROMPTS.md y espera a que se suban fotos/<id>.png|jpg|webp desde el panel.
Antes de gastar pasa la COMPUERTA (campos obligatorios, detalle, palabras prohibidas): si falla, no manda NADA.
Guarda cada prompt al lado de su foto (fotos/<id>.json), manda los batches, espera (consulta cada 30 s) y baja fotos/<id>.png.
Si se corta o fallan algunas, volver a correrlo con el mismo pedidos.json: sólo pide las que faltan y retoma los batches en vuelo.
Opción --no-wait: manda y sale (volvé a correrlo después para bajar)."""
import glob, json, os, re, sys, time, base64, uuid, urllib.request, urllib.error, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
PED = sys.argv[2]
NO_WAIT = "--no-wait" in sys.argv
C = _cfg.leer()
MODEL, SIZE, QUALITY = C.get("imagen_modelo") or "gpt-image-2.5-sunburst", C.get("imagen_size") or "1088x608", "low"   # low: regla dura, no se cambia
O = B + "/fotos"; os.makedirs(O, exist_ok=True)
ST = O + "/_batches.json"
MOTOR = (C.get("fotos_motor") or "openai").lower()
try: CANAL = json.load(open(B + "/refs/canal.json", encoding="utf8"))
except Exception: CANAL = {}
PRESENTADOR = (CANAL.get("presentador") or "").strip()
API = "https://api.openai.com/v1"
REF, TOPE_CARA = B + "/refs/cara.png", 15   # la única referencia permitida: la cara del presentador, en pocas fotos
TOPE_AHORRO = 20   # modo Ahorro: el resto de los planos va con clips de stock (tools/stock.py)


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)


# ── compuerta ANTES de gastar ─────────────────────────────
peds = json.load(open(PED, encoding="utf8"))
CAMPOS = ["type", "moment", "subject", "action", "props", "setting", "light", "camera", "color", "avoid"]
PROHIBIDOS = ["cinematic", "35mm", "bokeh", "8k", "highly detailed", "photorealistic", "golden hour", "out of focus", "blurry",
              "soft focus", "shallow depth of field", "subject isolation", "stock photo", "studio lighting"]
VACIO = re.compile(r"\b(empty room|nobody|no one|no people|unoccupied|bare room|minimalist|isolated on|plain background|product shot|catalog)\b", re.I)
problemas, ids, camaras = [], set(), {}
for p in peds:
    i = str(p.get("id") or "")
    if not re.match(r"^[\w-]+$", i): problemas.append(f"id inválido: {i!r} (letras, números, _ y -)"); continue
    if i in ids: problemas.append(f"id repetido: {i}")
    ids.add(i)
    j = p.get("prompt")
    if isinstance(j, str):
        try: j = json.loads(j)
        except Exception: problemas.append(f"{i}: el prompt tiene que ser un objeto JSON"); continue
    if not isinstance(j, dict): problemas.append(f"{i}: el prompt tiene que ser un objeto JSON"); continue
    creativa = bool(j.get("detalle_narrativo")) or bool(re.search(r"grid|collage|illustration|infographic|diagram|notebook|flat lay|before.?after", str(j.get("type", "")), re.I))   # imagen creativa (KIT §4b)
    falt = [k for k in CAMPOS if not j.get(k)] if not creativa else [k for k in ("type", "subject", "avoid") if not j.get(k)]
    if falt: problemas.append(f"{i}: faltan campos {','.join(falt)}")
    if "nothing blurred out" not in json.dumps(j).lower(): problemas.append(f"{i}: falta la cláusula \"nothing blurred out\" (en type)")
    sin_avoid = json.dumps({k: v for k, v in j.items() if k != "avoid"}).lower()
    hit = [w for w in PROHIBIDOS if w in sin_avoid.replace("nothing blurred out", "")]
    if hit: problemas.append(f"{i}: palabras prohibidas {hit} (dan look de IA/stock)")
    if not creativa:
        if len(str(j.get("moment", ""))) < 70: problemas.append(f"{i}: 'moment' muy corto (≥70 caracteres: QUÉ pasa en ese segundo y POR QUÉ importa)")
        props = j.get("props") or []
        if isinstance(props, str): props = [x for x in re.split(r"[;,]", props) if x.strip()]
        if len(props) < 6: problemas.append(f"{i}: 'props' con {len(props)} cosas (mínimo 6 objetos concretos con detalle)")
        if len(str(j.get("action", ""))) < 30: problemas.append(f"{i}: 'action' vacía (alguien a mitad del gesto, o el rastro fresco)")
        txt = " ".join(str(j.get(k, "")) for k in ("moment", "subject", "setting", "action"))
        if VACIO.search(txt): problemas.append(f"{i}: escena vacía/catálogo ('{VACIO.search(txt).group(0)}')")
        av = str(j.get("avoid", "")).lower()
        if "watermark" not in av: problemas.append(f"{i}: 'avoid' sin 'watermark'")   # el texto legible en una foto está bien: nunca se exige evitarlo
        cam = re.sub(r"\W+", " ", str(j.get("camera", "")).lower()).strip(); camaras[cam] = camaras.get(cam, 0) + 1
    if p.get("cara"):
        if len(PRESENTADOR) < 60: problemas.append(f"{i}: pide al presentador pero el canal no tiene su descripción física detallada (Mis canales → Presentador, ≥60 caracteres)")
        else:   # descripción + refs/cara.png (si existe)
            j = dict(j); j["subject"] = ("the same person as the reference photo: " if os.path.exists(REF) else "") + f"{PRESENTADOR} (always this exact same person). " + str(j.get("subject", ""))
    p["_j"] = j
if len(peds) >= 6 and camaras and max(camaras.values()) / len(peds) > 0.3:
    problemas.append("lote: más del 30 % de las fotos con la MISMA cámara — variá (manos a 40 cm, plano medio, cenital, por encima del hombro, desde la puerta)")
_otras = 0
for _f in glob.glob(f"{B}/fotos/*.json"):
    try:
        _d = json.load(open(_f, encoding="utf8"))
        if isinstance(_d, dict) and _d.get("cara") and _d.get("id") not in ids: _otras += 1
    except Exception: pass
_caras = _otras + sum(1 for p in peds if p.get("cara"))
if _caras > TOPE_CARA: problemas.append(f"lote: {_caras} fotos con el presentador en este video (tope {TOPE_CARA}): dejá el gancho y las mejores, el resto con cara:false")
if MOTOR == "ahorro":
    try: _libres = set(json.load(open(f"{B}/clips/_sin_stock.json", encoding="utf8")))   # Pexels no tuvo clip: no cuentan
    except Exception: _libres = set()
    _todas = set(ids)
    for _f in glob.glob(f"{B}/fotos/*.json"):
        try:
            _d = json.load(open(_f, encoding="utf8"))
            if isinstance(_d, dict) and _d.get("id"): _todas.add(_d["id"])
        except Exception: pass
    if len(_todas - _libres) > TOPE_AHORRO: problemas.append(f"lote: modo Ahorro, {len(_todas - _libres)} fotos en este video (tope {TOPE_AHORRO}): dejá el gancho, las del presentador, las creativas y lo que un clip no puede mostrar; el resto va con tools/stock.py")
if problemas:
    print("⛔ COMPUERTA: no mando nada. Reescribí los prompts:\n  · " + "\n  · ".join(problemas[:40]), flush=True); sys.exit(1)

for p in peds:   # el prompt queda al lado de la foto (el panel lo muestra y el validador lo revisa)
    json.dump({"id": p["id"], "cara": bool(p.get("cara")), "prompt": p["_j"], "motor": MOTOR if MOTOR == "manual" else f"{MODEL} {QUALITY} batch"},
              open(f"{O}/{p['id']}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)


# ── API ───────────────────────────────────────────────
def api(path, data=None, headers=None, raw=False, timeout=600):
    h = {"Authorization": "Bearer " + _cfg.clave("openai"), "User-Agent": "estudio-videos/1.0"}; h.update(headers or {})
    for intento in range(1000):
        q = urllib.request.Request(_cfg.url(API + path), data=data, headers=h, method="POST" if data is not None else "GET")
        try:
            r = urllib.request.urlopen(q, timeout=timeout)
            if intento: _cfg.alerta("OpenAI")
            return r if raw else json.load(r)
        except urllib.error.HTTPError as e:
            t = e.read().decode("utf8", "ignore")[:400]
            if e.code in (401, 403): sys.exit("⛔ OpenAI rechazó la clave")
            if (e.code == 429 or e.code >= 500) and not re.search(_cfg.SIN_CREDITO, t, re.I) and intento < 30:
                time.sleep(min(300, 15 * (intento + 1))); continue
            if re.search(_cfg.SIN_CREDITO, t, re.I):
                if _cfg.esperar_credito("OpenAI", intento): continue
                sys.exit("⛔ OpenAI sin crédito: cargá saldo en platform.openai.com y volvé a correr fotos.py (retoma solo)")
            raise RuntimeError(f"{e.code} {path}: {t}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if intento < 30: time.sleep(min(300, 15 * (intento + 1))); continue
            raise


def multipart(campos, archivo):
    bnd = uuid.uuid4().hex; out = []
    for k, v in campos.items(): out.append(f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    nombre, contenido = archivo
    out.append(f'--{bnd}\r\nContent-Disposition: form-data; name="file"; filename="{nombre}"\r\nContent-Type: application/jsonl\r\n\r\n'.encode() + contenido + b"\r\n")
    out.append(f"--{bnd}--\r\n".encode())
    return b"".join(out), {"Content-Type": "multipart/form-data; boundary=" + bnd}


LOCK = O + "/_fotos.lock"
def _vivo(pid):
    try:
        if os.name == "nt":
            import subprocess
            return str(pid) in subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"], capture_output=True, text=True).stdout
        os.kill(pid, 0); return True
    except Exception: return False
while True:   # un solo fotos.py por video: dos a la vez se pisan _batches.json y se pierden fotos pagadas
    try:
        fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.write(fd, str(os.getpid()).encode()); os.close(fd); break
    except FileExistsError:
        try: otro = int(open(LOCK).read().strip() or 0)
        except Exception: otro = 0
        if otro and otro != os.getpid() and _vivo(otro): log(f"ya hay otro fotos.py en este video (pid {otro}): espero que termine"); time.sleep(30); continue
        try: os.remove(LOCK)
        except OSError: pass
import atexit
atexit.register(lambda: os.path.exists(LOCK) and open(LOCK).read().strip() == str(os.getpid()) and os.remove(LOCK))
est = json.load(open(ST, encoding="utf8")) if os.path.exists(ST) else {"batches": []}
def guardar(): json.dump(est, open(ST, "w", encoding="utf8"), indent=1)
def hecha(i): return any(os.path.exists(f"{O}/{i}{e}") and os.path.getsize(f"{O}/{i}{e}") > 1000 for e in (".png", ".jpg", ".jpeg", ".webp"))
en_vuelo = {n for b in est["batches"] if not b.get("bajado") for n in b["names"]}
faltan = [p for p in peds if not hecha(p["id"]) and p["id"] not in en_vuelo]
def texto(j): return json.dumps(j, ensure_ascii=False)

if MOTOR == "manual":   # las hace el usuario con el generador que quiera: lista para copiar + espera las subidas
    md = ["# Fotos para hacer a mano", "", f"Hacelas en 16:9 (ideal {SIZE}) con el programa que quieras y subilas desde el panel",
          "(video → «Fotos a mano») o copialas a esta carpeta con el nombre exacto `<id>.png` / `.jpg`.", ""]
    for p in peds: md += [f"## {p['id']}" + ("  ✓ lista" if hecha(p["id"]) else ""), "```", texto(p["_j"]), "```", ""]
    open(O + "/PROMPTS.md", "w", encoding="utf8").write("\n".join(md))
    t0 = time.time(); ult = -1
    while True:
        falt = [p["id"] for p in peds if not hecha(p["id"])]
        json.dump([{"id": p["id"], "prompt": texto(p["_j"]), "lista": hecha(p["id"])} for p in peds], open(O + "/_manual.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
        if not falt: _cfg.alerta("Fotos"); log(f"✓ las {len(peds)} fotos ya están en fotos/"); sys.exit(0)
        if len(falt) != ult:
            ult = len(falt); log(f"esperando {len(falt)} fotos hechas a mano (lista en fotos/PROMPTS.md)")
            _cfg.alerta("Fotos", f"Faltan {len(falt)} fotos para hacer a mano: abrí el video → «Fotos a mano», copiá los prompts y subilas.")
        if NO_WAIT or time.time() - t0 > 24 * 3600: log("sigo esperando: volvé a correr este comando cuando estén"); sys.exit(1)
        time.sleep(20)

for con in (False, True):   # la API no deja mezclar endpoints en un batch: con la cara va aparte
    lote = [p for p in faltan if bool(p.get("cara") and os.path.exists(REF)) == con]
    if not lote: continue
    ep = "/v1/images/edits" if con else "/v1/images/generations"
    ref_uri = "data:image/png;base64," + base64.b64encode(open(REF, "rb").read()).decode() if con else ""
    lineas = []
    for p in lote:
        body = {"model": MODEL, "prompt": texto(p["_j"]), "size": SIZE, "quality": QUALITY, "n": 1}
        if con: body["images"] = [{"image_url": ref_uri}]
        lineas.append(json.dumps({"custom_id": p["id"], "method": "POST", "url": ep, "body": body}, ensure_ascii=False))
    data, hd = multipart({"purpose": "batch"}, ("batch.jsonl", ("\n".join(lineas) + "\n").encode("utf8")))
    f = api("/files", data, hd)
    b = api("/batches", json.dumps({"input_file_id": f["id"], "endpoint": ep, "completion_window": "24h"}).encode(), {"Content-Type": "application/json"})
    est["batches"].append({"id": b["id"], "endpoint": ep, "names": [p["id"] for p in lote], "t": time.time()}); guardar()
    log(f"→ batch {b['id']} · {len(lote)} fotos · {'con la cara del presentador' if con else 'sin referencia'} · low {SIZE}")

pend = lambda: [b for b in est["batches"] if not b.get("bajado")]
if not pend(): log(f"✓ nada que pedir: {sum(hecha(p['id']) for p in peds)}/{len(peds)} fotos listas"); sys.exit(0)
if NO_WAIT: log(f"--no-wait: {len(pend())} batch(es) en vuelo. Volvé a correr el mismo comando para bajarlos."); sys.exit(0)

PRECIO = {"/v1/images/edits": 0.00207, "/v1/images/generations": 0.00169}   # Batch low 1088x608 (medido)
def costo(u, ep):
    if not u or not u.get("output_tokens"): return PRECIO.get(ep, 0.00169)
    d = u.get("input_tokens_details") or {}; img = d.get("image_tokens", 0); txt = d.get("text_tokens", max(0, u.get("input_tokens", 0) - img))
    return (txt * 5 + img * 8 + u["output_tokens"] * 30) / 1e6 * 0.5      # Batch = mitad de precio

t0 = time.time(); ultimo = ""; sin_credito = False; reintentar = False
COLA_LLENA = r"token_limit|enqueued|rate.?limit|429|server_error|timeout"
while pend():
    for b in pend():
        s = api(f"/batches/{b['id']}")
        st, rc = s.get("status"), s.get("request_counts") or {}
        msg = f"batch {b['id'][-8:]}: {st} {rc.get('completed', 0)}/{rc.get('total', '?')}"
        if msg != ultimo: log(msg); ultimo = msg
        if st in ("completed", "cancelled", "expired", "failed"):
            ok = fail = 0; usd = 0.0
            for fid in (s.get("output_file_id"), s.get("error_file_id")):
                if not fid: continue
                r = api(f"/files/{fid}/content", raw=True, timeout=3600)
                for ln in r:
                    if not ln.strip(): continue
                    x = json.loads(ln); body = (x.get("response") or {}).get("body") or {}
                    d = (body.get("data") or [{}])[0]
                    if d.get("b64_json"):
                        open(f"{O}/{x['custom_id']}.png", "wb").write(base64.b64decode(d["b64_json"])); ok += 1; usd += costo(body.get("usage"), b["endpoint"])
                    else:
                        err = json.dumps(body.get('error') or x.get('error') or {})
                        if re.search(_cfg.SIN_CREDITO, err, re.I): sin_credito = True
                        elif re.search(COLA_LLENA, err, re.I): reintentar = True
                        fail += 1; log(f"  ✗ {x.get('custom_id')}: {err[:200]}")
            if s.get("errors"):
                err = json.dumps(s["errors"])[:300]; log("  batch con errores: " + err)
                if re.search(_cfg.SIN_CREDITO, err, re.I): sin_credito = True
                elif re.search(COLA_LLENA, err, re.I) or st in ("expired", "failed"): reintentar = True
            b["bajado"] = True; b["ok"], b["fail"] = ok, fail; guardar()
            if usd: _cfg.gasto(B, "fotos_gpt", usd, n=ok)
            log(f"✓ batch {b['id'][-8:]}: {ok} fotos bajadas, {fail} fallidas (US${usd:.3f})")
    if pend(): time.sleep(30)
falt = [p["id"] for p in peds if not hecha(p["id"])]
if falt and sin_credito:   # OpenAI se quedó sin crédito a mitad: esperar y volver a pedir sólo las que faltan
    ronda = int(os.environ.get("FOTOS_RONDA_CREDITO", "0"))
    if _cfg.esperar_credito("OpenAI", ronda):
        os.environ["FOTOS_RONDA_CREDITO"] = str(ronda + 1)
        os.execv(sys.executable, [sys.executable] + sys.argv)
if falt and reintentar and int(os.environ.get("FOTOS_RONDA_COLA", "0")) < 12:   # cola de OpenAI llena: esperar y pedir sólo las que faltan
    os.environ["FOTOS_RONDA_COLA"] = str(int(os.environ.get("FOTOS_RONDA_COLA", "0")) + 1)
    log(f"OpenAI tenía la cola llena: vuelvo a pedir {len(falt)} fotos en 2 min"); time.sleep(120)
    try: os.remove(LOCK)
    except OSError: pass
    os.execv(sys.executable, [sys.executable] + sys.argv)
log(f"FIN: {len(peds) - len(falt)}/{len(peds)} fotos en fotos/ ({(time.time() - t0) / 60:.0f} min)" +
    (f" · faltan {falt[:12]} → corregí esos prompts (si los rechazó el filtro) y volvé a correr" if falt else ""))
sys.exit(1 if falt else 0)
