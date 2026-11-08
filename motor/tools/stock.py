# -*- coding: utf-8 -*-
"""Clips de stock del MODO AHORRO (Pexels, gratis). Uso:
   python <APP>/tools/stock.py <carpeta> <pedidos.json> > <carpeta>/clips/stock.log 2>&1      (en segundo plano)
pedidos = [{"id":"p003", "buscar":["senior hands kneading dough", "kneading bread close up"]}, …]
  · id = el del plano de planos.json. "buscar" = 1 a 3 búsquedas EN INGLÉS, de la más precisa a la más general.
  · Baja clips/<id>.mp4 (horizontal, 1080p si hay, un poco más largo que el plano) y clips/<id>.json con de dónde salió.
  · Nunca usa dos veces el mismo clip en un video. Para cambiar uno: borrá clips/<id>.mp4 y pedí el id con otra búsqueda.
  · Se puede volver a correr: sólo pide lo que falta. Lo que Pexels no tenga queda en clips/_sin_stock.json:
    esos planos van con fotos.py y no cuentan para el tope de fotos."""
import hashlib, json, os, random, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request
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


def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)
def jload(p, d):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d
def jsave(p, o):
    t = p + ".tmp"; json.dump(o, open(t, "w", encoding="utf8"), ensure_ascii=False, indent=1); os.replace(t, p)


# ── compuerta ─────────────────────────────────────────────
peds = jload(sys.argv[2], None)
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


def buscar(q):
    k = q.strip().lower()
    if k not in cache:
        V = []
        for v in pedir(q).get("videos") or []:
            a = archivo(v)
            if a: V.append({"id": v["id"], "dur": v.get("duration") or 0, "pagina": v.get("url", ""), "autor": (v.get("user") or {}).get("name", ""), "link": a})
        cache[k] = V; jsave(CACHE, cache); time.sleep(.4)
    return cache[k]


def elegir(p):
    """El primer clip sin usar y lo bastante largo, sorteado entre los mejores resultados de cada búsqueda."""
    need = (planos[p["id"]]["endMs"] - planos[p["id"]]["startMs"]) + 600
    rng = random.Random(hashlib.sha1((B + p["id"]).encode()).hexdigest())
    for q in p["buscar"]:
        c = [v for v in buscar(q) if str(v["id"]) not in est["usados"] and v["dur"] * 1000 >= need][:TOP]
        if c: return rng.choice(c), q, need
    return None, None, need


def medir(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type:format=duration", "-of", "json", f], capture_output=True, text=True)
    try: d = json.loads(r.stdout); return float(d["format"]["duration"]) if d.get("streams") else 0
    except Exception: return 0


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
        os.replace(dst + ".tmp", dst)
        jsave(f"{O}/{i}.json", {"id": i, "fuente": "Pexels", "buscar": q, "pexels": v["id"], "pagina": v["pagina"], "autor": v["autor"]})
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
pend = falta
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
log(f"FIN: {sum(hecha(p['id']) for p in peds)}/{len(peds)} clips en clips/" + (f" · sin clip: {', '.join(sin[:30])} → probá otra búsqueda una vez, o hacelos con fotos.py (no cuentan para el tope)" if sin else ""))
sys.exit(0)
