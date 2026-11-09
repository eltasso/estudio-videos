# -*- coding: utf-8 -*-
"""Clips de stock del MODO AHORRO (Pexels, gratis). Uso:
   python <APP>/tools/stock.py <carpeta> <pedidos.json> > <carpeta>/clips/stock.log 2>&1      (en segundo plano)
pedidos = [{"id":"p003", "muestra":"her hands pressing tomato seeds into a seed tray", "buscar":["planting tomato seeds tray", "hands planting seeds soil"]}, …]
  · id = el del plano de planos.json. "buscar" = 1 a 3 búsquedas EN INGLÉS, de la más precisa a la más general.
  · "muestra" (recomendado) = lo que TIENE que verse, literal, con el objeto nombrado en el guion (la semilla, el huevo, la maceta).
  · JUEZ CON VISIÓN: de cada plano junta hasta 10 candidatos, los mira en UNA hoja (deepseek-flash, ~US$0,0003 por plano, tope
    US$0,06 por video) contra la frase que suena y "muestra", y se queda con el que muestra eso. Sin clave, sin crédito o si falla:
    vuelve al sorteo de antes. Si ninguno sirve (0-2 de 10) ese plano pasa a foto, como mucho 4 por video: el costo no cambia.
  · Baja clips/<id>.mp4 (horizontal, 1080p si hay, un poco más largo que el plano) y clips/<id>.json con de dónde salió.
  · Nunca usa dos veces el mismo clip en un video. Para cambiar uno: borrá clips/<id>.mp4 y pedí el id con otra búsqueda.
  · Se puede volver a correr: sólo pide lo que falta. Lo que Pexels no tenga queda en clips/_sin_stock.json:
    esos planos van con fotos.py y no cuentan para el tope de fotos."""
import base64, hashlib, io, json, os, random, re, subprocess, sys, threading, time, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

if len(sys.argv) < 3: print(__doc__); sys.exit(0)
B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
O = B + "/clips"; os.makedirs(O, exist_ok=True)
ST, CACHE, SIN = O + "/_stock.json", O + "/_busquedas.json", O + "/_sin_stock.json"
API, UA = "https://api.pexels.com/videos/search", "estudio-videos/1.0"
TOP, ESPERA_MAX = 8, 70 * 60            # se sortea entre los primeros resultados: dos videos del mismo tema no salen iguales
CANDS, MUY_MAL, MAX_A_FOTO = 10, 2, 4      # juez: candidatos por plano · puntaje de "nada que ver" · planos que pueden pasar a foto por video
TOPE_JUEZ = float(os.environ.get("TOPE_JUEZ_STOCK") or 0.06)
JUEZ_CACHE = O + "/_juez.json"


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)
def jload(p, d):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d
def jsave(p, o):
    t = p + ".tmp"; json.dump(o, open(t, "w", encoding="utf8"), ensure_ascii=False, indent=1); os.replace(t, p)


# ── compuerta ─────────────────────────────────────────────
CAMBIAR = sys.argv[2] == "--cambiar"        # render.py encontró un clip negro o roto: va otro de los que ya salieron en su búsqueda
if CAMBIAR:
    peds = [{"id": i, "buscar": [str(jload(f"{O}/{i}.json", {}).get("buscar") or "stock footage clip")]} for i in sys.argv[3].split(",") if i]
    for p in peds:
        if os.path.exists(f"{O}/{p['id']}.mp4"): os.replace(f"{O}/{p['id']}.mp4", f"{O}/{p['id']}.descartado")
else: peds = jload(sys.argv[2], None)
planos = {p["id"]: p for p in (jload(B + "/planos.json", []) or [])}
if not isinstance(peds, list) or not peds: sys.exit("⛔ el pedido tiene que ser una lista: [{\"id\":\"p003\",\"buscar\":[\"...\"]}]")
if not planos: sys.exit("⛔ falta planos.json: corré tools/planos.py primero")
mal, vistos = [], set()
for p in peds:
    i = str(p.get("id") or ""); q = p.get("buscar")
    if isinstance(q, str): q = p["buscar"] = [q]
    if i in vistos: mal.append(f"id repetido: {i}")
    vistos.add(i)
    if i not in planos: mal.append(f"{i}: no es un plano de planos.json"); continue
    if planos[i].get("split"): mal.append(f"{i}: es de pantalla partida, va con fotos.py")
    if not isinstance(q, list) or not 1 <= len(q) <= 3 or not all(isinstance(x, str) and x.strip() for x in q): mal.append(f"{i}: 'buscar' tiene que traer de 1 a 3 búsquedas"); continue
    for x in q:
        if re.search(r"[áéíóúñ¿¡ãõç]", x, re.I): mal.append(f"{i}: búsqueda en otro idioma ('{x}'): van en inglés")
        if not 2 <= len(x.split()) <= 8: mal.append(f"{i}: '{x}' tiene que ser de 2 a 8 palabras concretas")
    if p.get("muestra") is not None and not (isinstance(p["muestra"], str) and 3 <= len(p["muestra"].split()) <= 30): mal.append(f"{i}: 'muestra' = lo que tiene que verse, de 3 a 30 palabras")
if mal: print("⛔ COMPUERTA: no busqué nada. Corregí el pedido:\n  · " + "\n  · ".join(mal[:40]), flush=True); sys.exit(1)

est, cache = jload(ST, {"usados": {}}), jload(CACHE, {})
hecha = lambda i: os.path.exists(f"{O}/{i}.mp4") and os.path.getsize(f"{O}/{i}.mp4") > 50000
falta = [p for p in peds if not hecha(p["id"])]
if not falta: log(f"✓ nada que pedir: {len(peds)} clips listos"); sys.exit(0)


class SinAcceso(Exception): pass
_esperado = [0.0]


def pedir(q):
    url = API + "?" + urllib.parse.urlencode({"query": q, "orientation": "landscape", "size": "medium", "per_page": 40})
    intento = 0
    while True:
        rq = urllib.request.Request(_cfg.url(url), headers={"Authorization": _cfg.clave("pexels"), "User-Agent": UA})
        try: return json.load(urllib.request.urlopen(rq, timeout=60))
        except urllib.error.HTTPError as e:
            if e.code in (401, 403): raise SinAcceso("Pexels rechazó la clave")
            if e.code not in (429, 500, 502, 503, 504): log(f"  búsqueda '{q}': error {e.code}"); return {}
            espera = 20 * (intento + 1)
            if e.code == 429:
                try: espera = max(60, min(900, int(e.headers.get("X-Ratelimit-Reset") or 0) - time.time()))
                except ValueError: espera = 300
                log(f"  Pexels llegó a su límite de pedidos: espero {espera / 60:.0f} min")
        except (urllib.error.URLError, TimeoutError, ConnectionError, ValueError):
            espera = 20 * (intento + 1)
        intento += 1; _esperado[0] += espera
        if _esperado[0] > ESPERA_MAX or intento > 12: raise SinAcceso("Pexels no respondió a tiempo")
        time.sleep(espera)


def archivo(v):
    F = [f for f in v.get("video_files") or [] if f.get("file_type") == "video/mp4" and str(f.get("link", "")).startswith("https://")
         and (f.get("width") or 0) >= 1280 and (f.get("width") or 0) >= (f.get("height") or 0)]
    return min(F, key=lambda f: abs(f["width"] - 1920))["link"] if F else None


def chico(v):
    """La versión liviana del clip: el panel la reproduce directo desde Pexels, sin subir nada a GitHub."""
    F = [f for f in v.get("video_files") or [] if f.get("file_type") == "video/mp4" and str(f.get("link", "")).startswith("https://videos.pexels.com/")
         and (f.get("width") or 0) >= 480 and (f.get("width") or 0) >= (f.get("height") or 0)]
    return min(F, key=lambda f: abs(f["width"] - 640))["link"] if F else None


_lk_busca = threading.Lock()
def buscar(q):
    with _lk_busca: return _buscar(q)       # de a una: Pexels tiene tope por hora y el caché es un solo archivo


def _buscar(q):
    k = q.strip().lower()
    if k not in cache:
        V = []
        for v in pedir(q).get("videos") or []:
            a = archivo(v)
            if a:
                pics = [x.get("picture") for x in (v.get("video_pictures") or []) if str(x.get("picture", "")).startswith("https://")]
                V.append({"id": v["id"], "dur": v.get("duration") or 0, "pagina": v.get("url", ""), "autor": (v.get("user") or {}).get("name", ""), "link": a, "prev": chico(v),
                          "fotos": [u for u in ([v.get("image")] + pics[len(pics) // 2:len(pics) // 2 + 1]) if u and str(u).startswith("https://")][:2]})
        cache[k] = V; jsave(CACHE, cache); time.sleep(.4)
    return cache[k]


def elegir(p):
    """Con juez: el mejor puntuado sin usar (o None si ninguno sirve y todavía se puede pasar a foto).
    Sin juez: el primer clip sin usar y lo bastante largo, sorteado entre los mejores resultados de cada búsqueda."""
    need = (planos[p["id"]]["endMs"] - planos[p["id"]]["startMs"]) + 600
    R = ranking.get(p["id"])
    if R:
        libres = [(v, q, s) for v, q, s in R if str(v["id"]) not in est["usados"]]
        if libres:
            v, q, s = libres[0]
            if s > MUY_MAL or a_foto[0] >= MAX_A_FOTO: return v, q, need      # el mejor que haya; sólo "nada que ver" pasa a foto
            a_foto[0] += 1; log(f"  juez: {p['id']} ningún clip muestra lo que dice (mejor {s}/10) → va con foto")
            return None, "juez", need
    rng = random.Random(hashlib.sha1((B + p["id"]).encode()).hexdigest())
    for q in p["buscar"]:
        c = [v for v in buscar(q) if str(v["id"]) not in est["usados"] and v["dur"] * 1000 >= need][:TOP]
        if c: return rng.choice(c), q, need
    return None, None, need


# ── JUEZ CON VISIÓN: ¿el clip muestra lo que dice la frase? ─────────────
W = jload(B + "/captions.json", []) or []
def frase(i):
    a, b = planos[i]["startMs"], planos[i]["endMs"]
    t = " ".join(str(w.get("text", "")).strip() for w in W if w.get("endMs", 0) > a - 1500 and w.get("startMs", 0) < b + 300)
    return re.sub(r"\s+", " ", t)[:420]


class _Juez:
    def __init__(s):
        s.gastado, s.lk, s.n, s.off = 0.0, threading.Lock(), 0, None
        P = _cfg.leer().get("precio") or {}; s.pm, s.po = P.get("miss", 0.15) / 1e6, P.get("out", 0.6) / 1e6
        try: from PIL import Image, ImageDraw; s.Image, s.Draw = Image, ImageDraw
        except Exception: s.off = "falta Pillow"
        try: s.k = _cfg.clave("deepseek")
        except SystemExit: s.off = s.off or "sin clave de DeepSeek"

    def hoja(s, cands):
        """Hoja 2 columnas × 5 filas: cada celda = 2 cuadros del clip (portada + mitad) con su número grande."""
        CW, CH = 240, 135; cols = 2; filas = (len(cands) + 1) // 2
        im = s.Image.new("RGB", (cols * (2 * CW + 12), filas * (CH + 8)), (255, 255, 255)); d = s.Draw.Draw(im)
        ok = 0
        for n, v in enumerate(cands):
            x0, y0 = (n % cols) * (2 * CW + 12), (n // cols) * (CH + 8)
            for j, u in enumerate((v.get("fotos") or [])[:2]):
                try:
                    b = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read(4 << 20)
                    f = s.Image.open(io.BytesIO(b)).convert("RGB"); f.thumbnail((CW * 3, CH * 3))
                    r = max(CW / f.width, CH / f.height); f = f.resize((max(CW, int(f.width * r)), max(CH, int(f.height * r))))
                    im.paste(f.crop(((f.width - CW) // 2, (f.height - CH) // 2, (f.width - CW) // 2 + CW, (f.height - CH) // 2 + CH)), (x0 + j * CW, y0)); ok += 1
                except Exception: pass
            d.rectangle((x0, y0, x0 + 34, y0 + 30), fill=(0, 0, 0)); d.text((x0 + 9, y0 + 6), str(n + 1), fill=(255, 255, 0))
        if ok < max(2, len(cands)): return None
        b = io.BytesIO(); im.save(b, "JPEG", quality=80); return base64.b64encode(b.getvalue()).decode()

    def __call__(s, p, cands):
        if s.off or not cands: return None
        with s.lk:
            if s.gastado + 0.002 > TOPE_JUEZ: s.off = "llegó al tope de US$%.2f" % TOPE_JUEZ; return None
        img = s.hoja(cands)
        if not img: return None
        txt = (f"You choose stock video clips for a narrated video. At this moment the narrator says (Spanish or English):\n\"{frase(p['id'])}\"\n"
               + (f"What MUST be seen on screen: {p['muestra']}\n" if p.get("muestra") else "")
               + f"Searches used: {'; '.join(p['buscar'])}\n"
               f"The image shows {len(cands)} numbered candidates; each cell = 2 frames of the same clip (start and middle).\n"
               "Score each 0-10 for how LITERALLY it shows what the narrator says.\n"
               "10 = the exact action AND the exact object named (if it says sowing tomato seeds: hands putting seeds in soil).\n"
               "7 = right action or right object, believable for this video. 4 = same topic but generic.\n"
               "0-2 = unrelated, or a person talking/posing to camera, a face close-up that could look like another presenter, "
               "a big brand logo, a studio/advertising look, or a setting that contradicts the video (a city office in a gardening video).\n"
               "Prefer hands, objects and the real place over people. Answer JSON only: "
               '{"p":[{"n":1,"s":7,"why":"<6 words"}, ...]}')
        body = {"model": "deepseek-flash", "temperature": 0, "max_tokens": 1500, "thinking": {"type": "disabled"}, "response_format": {"type": "json_object"},
                "messages": [{"role": "user", "content": [{"type": "text", "text": txt}, {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + img}}]}]}
        rq = urllib.request.Request(_cfg.url("https://api.deepseek.com/chat/completions"), data=json.dumps(body).encode(),
                                    headers={"Authorization": "Bearer " + s.k, "Content-Type": "application/json", "User-Agent": UA})
        for k in range(3):
            try:
                r = json.load(urllib.request.urlopen(rq, timeout=180)); u = r.get("usage") or {}
                with s.lk: s.gastado += u.get("prompt_tokens", 0) * s.pm + u.get("completion_tokens", 0) * s.po; s.n += 1
                c = (r["choices"][0]["message"].get("content") or "").strip()
                if not c: continue
                L = json.loads(c[c.find("{"):c.rfind("}") + 1]).get("p") or []
                sc = {int(x["n"]): (max(0, min(10, int(x.get("s", 0)))), str(x.get("why", ""))[:60]) for x in L if isinstance(x, dict) and str(x.get("n", "")).isdigit()}
                return [(cands[n - 1], sc[n][0], sc[n][1]) for n in sorted(sc, key=lambda n: -sc[n][0]) if 1 <= n <= len(cands)]
            except urllib.error.HTTPError as e:
                if e.code in (401, 402, 403): s.off = f"DeepSeek {e.code}"; return None
                time.sleep(6 * (k + 1))
            except Exception: time.sleep(6 * (k + 1))
        return None


def juzgar_todos(lista):
    """Llena ranking[id] = [(clip, búsqueda, puntaje)] en paralelo. Lo juzgado se guarda: si se vuelve a correr no se paga dos veces."""
    J = _Juez()
    if J.off: log(f"juez: apagado ({J.off}) → sorteo como antes"); return
    viejo = jload(JUEZ_CACHE, {})
    def uno(p):
        need = (planos[p["id"]]["endMs"] - planos[p["id"]]["startMs"]) + 600
        cands, de, vis = [], {}, set()
        for j, q in enumerate(p["buscar"]):
            if len(cands) >= 6: break                         # con 6 alcanza: no se gasta otra búsqueda de Pexels
            try: res = buscar(q)
            except SinAcceso: return
            for v in [v for v in res if str(v["id"]) not in est["usados"] and v["dur"] * 1000 >= need and v.get("fotos")][: (6 if j == 0 else 4)]:
                if v["id"] not in vis and len(cands) < CANDS: vis.add(v["id"]); cands.append(v); de[v["id"]] = q
        if not cands: return
        clave_c = p["id"] + ":" + ",".join(str(v["id"]) for v in cands)
        if clave_c in viejo:
            por = {str(v["id"]): v for v in cands}
            ranking[p["id"]] = [(por[i], de[por[i]["id"]], s) for i, s in viejo[clave_c] if i in por]; return
        R = J(p, cands)
        if R:
            ranking[p["id"]] = [(v, de[v["id"]], s) for v, s, _ in R]
            with J.lk: viejo[clave_c] = [(str(v["id"]), s) for v, s, _ in R]; notas[p["id"]] = [(str(v["id"]), s, w) for v, s, w in R[:3]]
    with ThreadPoolExecutor(6) as ex: list(ex.map(uno, lista))
    jsave(JUEZ_CACHE, viejo)
    if J.gastado > 0: _cfg.gasto(B, "juez_stock", J.gastado, llamadas=J.n)
    log(f"juez: {len(ranking)}/{len(lista)} planos juzgados con visión · US$%.4f" % J.gastado + (f" · {J.off}" if J.off else ""))


ranking, notas, a_foto = {}, {}, [0]


def medir(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type:format=duration", "-of", "json", f], capture_output=True, text=True)
    try: d = json.loads(r.stdout); return float(d["format"]["duration"]) if d.get("streams") else 0
    except Exception: return 0


def roto_o_negro(f, seg):
    """Antes de aceptar un clip: que se pueda leer entero y que no tenga negro. El mismo criterio que el revisor final."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-t", "%.2f" % seg, "-f", "mp4", "-i", f, "-an", "-vf", "scale=320:-2,blackdetect=d=0.5:pix_th=0.10", "-f", "null", "-"], capture_output=True, text=True, encoding="utf8", errors="replace")
    return r.returncode != 0 or "black_start" in r.stderr


def bajar(t):
    p, v, q, need = t; i = p["id"]; tmp = f"{O}/_{i}.part"; dst = f"{O}/{i}.mp4"
    try:
        with urllib.request.urlopen(urllib.request.Request(v["link"], headers={"User-Agent": UA}), timeout=120) as r, open(tmp, "wb") as f:
            total = 0
            while True:
                b = r.read(1 << 18)
                if not b: break
                total += len(b)
                if total > 600 << 20: raise ValueError("archivo enorme")
                f.write(b)
        r2 = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-t", "%.2f" % (need / 1000 + 1), "-an", "-c", "copy", "-movflags", "+faststart", "-f", "mp4", dst + ".tmp"], capture_output=True, text=True)
        if r2.returncode or medir(dst + ".tmp") < need / 1000 - .25: raise ValueError("clip ilegible o corto")
        if roto_o_negro(dst + ".tmp", need / 1000): raise ValueError("clip negro o roto")
        os.replace(dst + ".tmp", dst)
        nota = next(([s, w] for x, s, w in notas.get(i, []) if x == str(v["id"])), None)
        jsave(f"{O}/{i}.json", {"id": i, "fuente": "Pexels", "buscar": q, "pexels": v["id"], "pagina": v["pagina"], "autor": v["autor"], **({"prev": v["prev"]} if v.get("prev") else {}), **({"juez": nota} if nota else {})})
        return i, True
    except Exception as e:
        log(f"  ✗ {i}: {type(e).__name__} {str(e)[:120]}")
        for x in (dst + ".tmp",):
            if os.path.exists(x): os.remove(x)
        return i, False
    finally:
        if os.path.exists(tmp): os.remove(tmp)


sin, corte = [], None
log(f"→ {len(falta)} clips por buscar")
try:
    if not CAMBIAR: juzgar_todos(falta)
except SinAcceso as e: corte = str(e)
except Exception as e: log(f"juez: falló ({type(e).__name__}) → sorteo como antes")
pend = [] if corte else falta
for ronda in range(4):                 # si una descarga falla, ese clip queda marcado y se elige otro
    lote = []
    for p in pend:
        try: v, q, need = elegir(p)
        except SinAcceso as e: corte = str(e); break
        if not v: sin.append(p["id"]); log(f"  sin resultados útiles: {p['id']} {p['buscar']}"); continue
        est["usados"][str(v["id"])] = p["id"]; lote.append((p, v, q, need))
    jsave(ST, est)
    if corte or not lote: break
    with ThreadPoolExecutor(4) as ex: R = dict(ex.map(bajar, lote))
    pend = [t[0] for t in lote if not R[t[0]["id"]]]
    log(f"bajados {len(lote) - len(pend)}/{len(lote)}")
    if not pend: break

if corte:
    log(f"⛔ {corte}: lo que faltaba pasa a fotos")
    _cfg.alerta("Pexels", f"{corte}. Este video sigue con más fotos de lo normal.")
    sin += [p["id"] for p in falta if not hecha(p["id"]) and p["id"] not in sin]
sin = sorted(set(sin + [p["id"] for p in falta if not hecha(p["id"])]))
previos = [x for x in jload(SIN, []) if not hecha(x)]
jsave(SIN, sorted(set(previos + sin)))
if CAMBIAR:
    for p in peds:                     # si no apareció otro, vuelve el de antes y queda marcado para que lo vea la sesión
        if not hecha(p["id"]) and os.path.exists(f"{O}/{p['id']}.descartado"): os.replace(f"{O}/{p['id']}.descartado", f"{O}/{p['id']}.mp4")
log(f"FIN: {sum(hecha(p['id']) for p in peds)}/{len(peds)} clips en clips/" + (f" · sin clip: {', '.join(sin[:30])} → probá otra búsqueda una vez, o hacelos con fotos.py (no cuentan para el tope)" if sin else ""))
sys.exit(0)
