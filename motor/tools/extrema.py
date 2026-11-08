# -*- coding: utf-8 -*-
"""EDICIÓN EXTREMA (opcional, la activa el panel): python <APP>/tools/extrema.py <carpeta_del_video> [--tope 0.20] [--max 12] [--sin-render]
Elige los mejores momentos SIN avatar, DeepSeek flash escribe una partitura corta por momento (qué operación, qué fotos,
qué palabras en pantalla y en qué cuadro) y el motor de Remotion (APP/extrema) la vuelve una pieza de motion graphics.
Deja extrema/xmNN.mp4 + extrema/manifest.json; render.py las mete en la línea (nunca encima del avatar).
TOPE DURO: cuando lo gastado llega al tope deja de pedir; lo que no llegó queda con el b-roll normal.
Si un momento falla (partitura inválida, render roto) ese momento queda con el b-roll normal: nunca rompe el video.
El render a MP4 corre SOLO en GitHub Actions (en la PC usá --sin-render)."""
import itertools
import glob, json, os, re, shutil, subprocess, sys, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg

FPS = 30
PKG = os.path.join(_cfg.APP, "extrema")
PRECIO = {"hit": 0.0201, "miss": 0.2015, "out": 0.806}      # US$ por 1M tokens de flash, medido con el saldo real (8-nov-2026)
OPS_DIR = os.environ.get("EXTREMA_OPS_DIR") or os.path.join(PKG, "src", "ops")
def _cargar_catalogo():
    cat = {}
    for f in sorted(glob.glob(OPS_DIR + "/*.fichas.json")):
        fam = os.path.basename(f).split(".")[0]
        try:
            for c in json.load(open(f, encoding="utf8")): c["familia"] = fam; cat[c["op"]] = c
        except Exception as e: print("extrema: ficha rota", f, e, flush=True)
    return cat
CAT = _cargar_catalogo()   # una ficha por operación: qué es, cuándo va, cuántas fotos y qué datos pide
try: ESTILOS = json.load(open(OPS_DIR + "/estilos.json", encoding="utf8"))
except Exception: ESTILOS = {}
NUM = {w: str(i) for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split())}
NUM.update({w: str(i) for i, w in enumerate("cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis diecisiete dieciocho diecinueve veinte".split())})
NUM.update({"una": "1", "thirty": "30", "forty": "40", "fifty": "50", "hundred": "100", "treinta": "30", "cuarenta": "40", "cincuenta": "50", "cien": "100"})
LOOKS = {   # el look sale del canal si tiene paleta; si no, uno de estos
    "papel": {"acento": "#C7432B", "tinta": "#231c12", "papel": "#F6F1E7", "display": "Fraunces", "texto": "Inter"},
    "noche": {"acento": "#E8B04A", "tinta": "#15171c", "papel": "#EEE9DF", "display": "Playfair", "texto": "Inter"},
    "clinico": {"acento": "#0F8C8C", "tinta": "#10232a", "papel": "#F3F7F7", "display": "DMSerif", "texto": "Inter"},
    "alarma": {"acento": "#D7261E", "tinta": "#0d0d0d", "papel": "#F4F1EA", "display": "Anton", "texto": "Inter"},
}
FUENTES = {"Fraunces", "Playfair", "DMSerif", "Anton", "Bebas", "Cormorant", "Inter", "SpaceGrotesk", "Syne", "ArchivoBlack", "Oswald", "InstrumentSerif"}


def jl(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d


def log(*a): print(time.strftime("%H:%M:%S"), "extrema:", *a, flush=True)


# ── cuenta de gasto con tope duro (se reserva antes de cada llamada, se ajusta con el uso real)
class Caja:
    def __init__(s, tope): s.tope, s.gastado, s.reservado, s.lk, s.n = float(tope), 0.0, 0.0, threading.Lock(), 0
    def pedir(s, monto):
        with s.lk:
            if s.gastado + s.reservado + monto > s.tope: return False
            s.reservado += monto; return True
    def cerrar(s, monto, real):
        with s.lk: s.reservado -= monto; s.gastado += real; s.n += 1


def ia(caja, msgs, reserva, max_tokens=9000):
    if not caja.pedir(reserva): raise RuntimeError("tope")
    real = 0.0
    try:
        body = {"model": _cfg.leer().get("modelo") or "deepseek-flash", "max_tokens": max_tokens, "temperature": 0.9, "messages": msgs, "response_format": {"type": "json_object"}}
        if "flash" not in body["model"]: body["model"] = "deepseek-flash"        # edición extrema va siempre en flash
        try: k = _cfg.clave("deepseek")
        except SystemExit: k = ""
        rq = urllib.request.Request(_cfg.url("https://api.deepseek.com/chat/completions"), data=json.dumps(body).encode(),
                                    headers={"Authorization": "Bearer " + k, "Content-Type": "application/json", "User-Agent": "estudio-videos/1.0"})
        for i in range(3):
            if caja.gastado + real >= caja.tope: raise RuntimeError("tope")     # el tope es duro también entre reintentos
            try:
                r = json.load(urllib.request.urlopen(rq, timeout=400)); u = r.get("usage") or {}
                hit = u.get("prompt_cache_hit_tokens", 0)
                real += (hit * PRECIO["hit"] + (u.get("prompt_tokens", 0) - hit) * PRECIO["miss"] + u.get("completion_tokens", 0) * PRECIO["out"]) / 1e6
                c = (r["choices"][0]["message"].get("content") or "").strip()
                if c: return json.loads(c[c.find("{"):c.rfind("}") + 1])
            except urllib.error.HTTPError as e:
                if e.code in (401, 402, 403): raise RuntimeError("DeepSeek %d" % e.code)
            except (ValueError, KeyError): pass
            except Exception: time.sleep(8 * (i + 1))
        raise RuntimeError("sin respuesta")
    finally: caja.cerrar(reserva, real)


# ── momentos candidatos: frases enteras fuera del avatar, de 3,5 a 9 s
def candidatos(W, AV, total_ms):
    """Frases (o pedazos de frase cortados en una coma) de 3,5 a 9 s, enteras fuera del avatar."""
    libre = lambda a, b: all(b + 250 <= r["startMs"] or a - 250 >= r["endMs"] for r in AV)
    frases, cur = [], []
    for w in W:
        cur.append(w)
        if re.search(r"[.!?…]$", w["text"].strip()): frases.append(cur); cur = []
    if cur: frases.append(cur)
    trozos = []
    for f in frases:                       # frase larga: se corta en las comas (y si no hay, cada ~20 palabras)
        if f[-1]["endMs"] - f[0]["startMs"] <= 9000: trozos.append(f); continue
        t = []
        for w in f:
            t.append(w)
            if (re.search(r"[,;:]$", w["text"].strip()) and t[-1]["endMs"] - t[0]["startMs"] >= 3500) or len(t) >= 22: trozos.append(t); t = []
        if t: trozos.append(t)
    unidos = []
    for t in trozos:                       # frases cortas seguidas se juntan
        if unidos and t[-1]["endMs"] - unidos[-1][0]["startMs"] <= 9000 and unidos[-1][-1]["endMs"] - unidos[-1][0]["startMs"] < 3500 and t[0]["startMs"] - unidos[-1][-1]["endMs"] < 700:
            unidos[-1] = unidos[-1] + t
        else: unidos.append(t)
    out = []
    for f in unidos:
        a, b = f[0]["startMs"], f[-1]["endMs"]
        if 3500 <= b - a <= 9000 and libre(a, b) and a > 4000 and b < total_ms - 3000:
            out.append({"startMs": a, "endMs": b + 120, "texto": "".join(x["text"] for x in f).strip()})
    return out


def elegir(caja, cands, n):
    """Una llamada barata elige los momentos con mejor bisagra visual; si falla, se eligen por reglas."""
    lista = "\n".join("%d: %s" % (i, c["texto"][:160]) for i, c in enumerate(cands))
    try:
        j = ia(caja, [{"role": "user", "content": "These are sentences of a YouTube video. Pick the %d sentences where a motion-graphics designer can make the sentence HAPPEN to photos: numbers, sizes, contrasts, lists, a turn, something hidden, a strong concrete image. Spread them across the whole video. Return JSON {\"ids\":[...]} with the indices.\n\n%s" % (n, lista)}], 0.012, 6000)
        ids = [int(x) for x in j.get("ids", []) if str(x).isdigit() and int(x) < len(cands)]
    except Exception as e:
        log("elegir por reglas (", e, ")"); ids = []
    if not ids:
        pun = lambda c: (2 if re.search(r"\d|\b(" + "|".join(NUM) + r")\b", c["texto"].lower()) else 0) + (1 if re.search(r"\b(but|not|never|pero|nunca|no)\b", c["texto"].lower()) else 0)
        ids = sorted(range(len(cands)), key=lambda i: -pun(cands[i]))
    elegidos = []
    for i in ids:   # separados al menos 25 s entre sí
        c = cands[i]
        if all(abs(c["startMs"] - e["startMs"]) > 25000 for e in elegidos): elegidos.append(c)
        if len(elegidos) >= n: break
    return sorted(elegidos, key=lambda c: c["startMs"])


# ── fichas de fotos gratis (sin IA): foco = centro del detalle, zona_calma = la zona más tranquila
ZONAS = {"top-left": (0, 0, .5, .4), "top-right": (.5, 0, 1, .4), "bottom-left": (0, .6, .5, 1), "bottom-right": (.5, .6, 1, 1), "top": (.15, 0, .85, .3), "bottom": (.15, .7, .85, 1), "left": (0, .25, .4, .75), "right": (.6, .25, 1, .75)}


def ficha(p):
    from PIL import Image, ImageFilter, ImageStat
    im = Image.open(p).convert("L").resize((192, 108)); ed = im.filter(ImageFilter.FIND_EDGES); px = ed.load(); Wd, Hd = ed.size
    sx = sy = s = 0
    for y in range(2, Hd - 2):
        for x in range(2, Wd - 2):
            v = px[x, y] ** 2; sx += v * x; sy += v * y; s += v
    foco = [round(sx / s / Wd, 2), round(sy / s / Hd, 2)] if s else [.5, .45]
    mejor, zona = 1e9, "bottom-left"
    for z, (a, b, c, d) in ZONAS.items():
        box = (int(a * Wd), int(b * Hd), int(c * Wd), int(d * Hd))
        e = ImageStat.Stat(ed.crop(box)).mean[0]; v = ImageStat.Stat(im.crop(box)).stddev[0]
        lejos = (((a + c) / 2 - foco[0]) ** 2 + ((b + d) / 2 - foco[1]) ** 2) ** .5
        costo = e + v * 0.35 - lejos * 18
        if costo < mejor: mejor, zona = costo, z
    return {"foco": foco, "zona_calma": zona, "luz": round(ImageStat.Stat(im).mean[0])}


def descripcion(pr):
    if isinstance(pr, dict): return ((pr.get("subject") or "") + ". " + (pr.get("moment") or "")).strip(". ")
    return str(pr or "")


# ── partitura → componente
def palabras(m, W):
    return [(w["text"].strip(), round((w["startMs"] - m["startMs"]) * FPS / 1000)) for w in W if w["startMs"] >= m["startMs"] - 1 and w["endMs"] <= m["endMs"] + 200]


def limpia(x): return re.sub(r"[^\w+%$]", "", str(x)).lower()


def dichos(P):
    """Lo que se dijo de verdad: palabras, sus dígitos y números compuestos ("twenty five" = 25, "two hundred" = 200)."""
    w = [limpia(x[0]) for x in P]; ds = set(w)
    val = [int(NUM[x]) if x in NUM else (int(x) if x.isdigit() else None) for x in w]
    ds |= {str(v) for v in val if v is not None}
    MUL = {"hundred": 100, "cien": 100, "cientos": 100, "thousand": 1000, "mil": 1000, "million": 1000000, "millones": 1000000, "millón": 1000000, "millon": 1000000}
    for i in range(len(w) - 1):
        a, b = val[i], val[i + 1]
        if a is not None and b is not None and a >= 20 and a % 10 == 0 and b < 10: ds.add(str(a + b))
        if a is not None and w[i + 1] in MUL: ds.add(str(a * MUL[w[i + 1]]))
        if a is not None and w[i + 1] in ("y", "and") and i + 2 < len(w) and val[i + 2] is not None and val[i + 2] < 10: ds.add(str(a + val[i + 2]))
    return ds


def _campo(spec, v, ruta, P, fichas, ds, err):
    """Valida un dato de la ficha: texto:N, dicho:N, num:a:b, palabra, foto, opcion:a|b. Un '?' final lo hace opcional."""
    opc = spec.endswith("?"); spec = spec.rstrip("?")
    if v is None or v == "":
        if not opc: err.append("%s is required" % ruta)
        return None
    tipo, *arg = spec.split(":")
    if tipo in ("texto", "dicho"):
        v = re.sub(r"^(?:dicho|texto):\s*", "", str(v).strip()); n = int(arg[0]) if arg else 24     # a veces copia el tipo de la ficha
        if len(v) > n: err.append("%s '%s' too long (max %d letters)" % (ruta, v, n))
        for x in re.findall(r"\d+(?:[.,]\d+)*", v):
            if limpia(x) not in ds: err.append("%s '%s': the number %s was not said in the sentence, never invent data" % (ruta, v, x))
        if tipo == "dicho":
            for x in v.split():
                if limpia(x) and limpia(x) not in ds: err.append("%s: '%s' is not a spoken word" % (ruta, x))
        return v
    if tipo == "num":
        try: f = float(v)
        except Exception: err.append("%s must be a number" % ruta); return None
        if arg and not float(arg[0]) <= f <= float(arg[1]): err.append("%s out of range %s..%s" % (ruta, arg[0], arg[1]))
        return f
    if tipo == "palabra":
        try: i = int(v)
        except Exception: err.append("%s must be a word index" % ruta); return None
        if not 0 <= i < len(P): err.append("%s: word %d does not exist" % (ruta, i)); return None
        return P[i][1]
    if tipo == "foto":
        f = fichas.get(v)
        if not f: err.append("%s: photo %s does not exist" % (ruta, v)); return None
        return {"id": v, "foco": f["foco"], "zona": f["zona_calma"]}
    if tipo == "opcion":
        if str(v) not in arg[0].split("|"): err.append("%s must be one of %s" % (ruta, arg[0]))
        return str(v)
    err.append("ficha rota: %s" % spec); return None


def _datos(card, d, ruta, P, fichas, ds, err):
    out = {}; d = d if isinstance(d, dict) else {}
    for k, spec in (card.get("datos") or {}).items():
        if isinstance(spec, dict):      # lista de filas: {"lista": {campo: spec}, "min": 2, "max": 5}
            filas = d.get(k) if isinstance(d.get(k), list) else []
            lo, hi = spec.get("min", 1), spec.get("max", 6)
            if not lo <= len(filas) <= hi: err.append("%s.%s needs %d to %d items" % (ruta, k, lo, hi))
            out[k] = [{c: _campo(s, f.get(c) if isinstance(f, dict) else None, "%s.%s[%d].%s" % (ruta, k, i, c), P, fichas, ds, err) for c, s in spec["lista"].items()} for i, f in enumerate(filas[:hi])]
        else: out[k] = _campo(spec, d.get(k), ruta + "." + k, P, fichas, ds, err)
    return out


def look_de(estilo, look):
    """El mundo visual del acto. El acento del canal manda salvo en mundos con paleta propia."""
    e = ESTILOS.get(estilo)
    if not e: return look
    L = {k: v for k, v in e.items() if k != "para"}
    if look.get("_canal") and estilo not in ("neon", "alarma", "plano"): L["acento"] = look["acento"]
    return L


def armar(m, s, W, fichas, look):
    P = palabras(m, W); n = len(P); fr = round((m["endMs"] - m["startMs"]) * FPS / 1000)
    err, actos = [], []
    ds = dichos(P)
    for k, a in enumerate(sorted(s.get("actos") or [], key=lambda a: int(a.get("desde", 0) or 0))):
        op = a.get("op")
        if op not in CAT: err.append("act %d: unknown op %r" % (k, op)); continue
        d = 0 if k == 0 else max(0, min(n - 1, int(a.get("desde", 0) or 0)))
        fotos = []
        for pid in a.get("fotos") or []:
            f = fichas.get(pid)
            if not f: err.append("act %d: photo %s does not exist" % (k, pid)); continue
            fotos.append({"id": pid, "foco": f["foco"], "zona": f["zona_calma"], "clara": False})
        card = CAT[op]; f0, f1 = (card.get("fotos") or [0, 12])[:2]
        if len(fotos) < f0: err.append("act %d (%s): needs at least %d photos" % (k, op, f0))
        if len(fotos) > f1: fotos = fotos[:f1]
        if card.get("var") and a.get("var") and str(a["var"]) not in card["var"]: err.append("act %d (%s): var must be one of %s" % (k, op, card["var"]))
        lin = []
        for l in a.get("lineas") or []:
            try: i, j, rol = int(l[0]), int(l[1]), (l[2] if len(l) > 2 else "lead")
            except Exception: err.append("act %d: bad line %r" % (k, l)); continue
            if not (0 <= i <= j < n): err.append("act %d: line [%d,%d] outside words 0..%d" % (k, i, j, n - 1)); continue
            lin.append({"w": [[P[x][0], P[x][1]] for x in range(i, j + 1)], "rol": "golpe" if rol == "golpe" else "lead", "_i": i})
        ac = {"op": op, "d": d, "fotos": fotos, "lineas": lin, "var": str(a.get("var") or ""), "texto": str(a.get("texto") or "")}
        if card.get("datos"): ac["datos"] = _datos(card, a.get("datos"), "act %d datos" % k, P, fichas, ds, err)
        if a.get("estilo") in ESTILOS: ac["look"] = look_de(a["estilo"], look)
        actos.append(ac)
    if not actos: return None, err + ["no acts"]
    actos[0]["d"] = 0
    for k, a in enumerate(actos): a["a"] = 0 if k == 0 else max(0, P[a["d"]][1] - 4)
    if CAT[actos[-1]["op"]].get("no_ultimo"): err.append("%s can never be the last act" % actos[-1]["op"])
    for k, a in enumerate(actos):
        a["b"] = actos[k + 1]["a"] if k + 1 < len(actos) else fr
        if a["b"] - a["a"] < 22: err.append("act %d (%s) lasts %d frames: minimum 22, merge it" % (k, a["op"], a["b"] - a["a"]))
        lo = a["d"]; hi = actos[k + 1]["d"] - 1 if k + 1 < len(actos) else n - 1
        for l in a["lineas"]:
            if not lo <= l["_i"] <= hi: err.append("act %d: line starting at word %d is outside the act (words %d..%d)" % (k, l["_i"], lo, hi))
        if sum(1 for l in a["lineas"] if l["rol"] == "golpe") > 1: err.append("act %d: more than one golpe" % k)
        if len(a["lineas"]) > 3: err.append("act %d: more than 3 lines" % k)
        for l in a["lineas"]:
            if l["rol"] == "golpe" and not any(len(re.sub(r"\W", "", x[0])) >= 4 or re.search(r"\d", x[0]) for x in l["w"]): err.append("act %d: golpe '%s' is only filler words: pick the word with weight" % (k, " ".join(x[0] for x in l["w"])))
            if l["rol"] == "golpe" and len(" ".join(x[0] for x in l["w"])) > 22: err.append("act %d: golpe '%s' too long (max 22 letters)" % (k, " ".join(x[0] for x in l["w"])))
        if a["op"] == "numeral":
            t = re.sub(r"[^\w+%$]", "", a["texto"])
            dichas = {re.sub(r"[^\w+%$]", "", x[0]).lower() for x in P}
            dichas |= {NUM[x] for x in dichas if x in NUM}
            if not t or t.lower() not in dichas or len(t) > 7: err.append("act %d: numeral 'texto' must be ONE spoken word (or its digits), max 7 letters" % k)
            a["texto"] = t
        for l in a["lineas"]: del l["_i"]
        del a["d"]
    return {"frames": fr, "look": look, "actos": actos}, err


def look_canal(B):
    c = jl(B + "/refs/canal.json", {}) or {}
    pal = c.get("paleta") or []
    if len(pal) >= 3 and all(re.match(r"^#[0-9a-fA-F]{6}$", x) for x in pal):
        lum = lambda h: .3 * int(h[1:3], 16) + .59 * int(h[3:5], 16) + .11 * int(h[5:7], 16)
        sat = lambda h: max(int(h[i:i + 2], 16) for i in (1, 3, 5)) - min(int(h[i:i + 2], 16) for i in (1, 3, 5))
        tinta = min(pal, key=lum)
        L = {"acento": max(pal, key=sat), "tinta": tinta if lum(tinta) < 90 else "#231c12", "papel": max(pal, key=lum), "display": "Fraunces", "texto": "Inter", "_canal": True}
    else:
        L = dict(LOOKS.get(c.get("look_extrema") or "", LOOKS["papel"]))
    fu = [str(x).replace(" ", "") for x in (c.get("fuentes") or [])]
    fu = [{"PlayfairDisplay": "Playfair", "BebasNeue": "Bebas", "CormorantGaramond": "Cormorant", "DMSerifDisplay": "DMSerif"}.get(x, x) for x in fu]
    if fu and fu[0] in FUENTES: L["display"] = fu[0]
    return L


def main():
    a = sys.argv[1:]
    B = os.path.abspath(a[0] if a and not a[0].startswith("--") else os.getcwd()).replace("\\", "/").rstrip("/")
    tope = float(a[a.index("--tope") + 1]) if "--tope" in a else 0.20
    nmax = int(a[a.index("--max") + 1]) if "--max" in a else 12
    sin_render = "--sin-render" in a or not os.environ.get("GITHUB_ACTIONS")
    X = B + "/extrema"; os.makedirs(X, exist_ok=True)
    W = jl(B + "/captions.json", []); AV = jl(B + "/avatar_ranges.json", []) or []; SH = jl(B + "/shots_timed.json", []) or []
    FT = {f["id"]: f for f in (jl(B + "/fotos_todas.json", []) or []) if isinstance(f, dict) and f.get("id")}
    if not W: log("sin captions.json: no hay edición extrema"); return
    total = W[-1]["endMs"]
    caja = Caja(tope)

    # fotos que existen (sólo imágenes, nunca la cara del avatar)
    fotos = {}
    for f in sorted(os.listdir(B + "/fotos")) if os.path.isdir(B + "/fotos") else []:
        i, ext = os.path.splitext(f)
        if ext.lower() in (".png", ".jpg", ".jpeg", ".webp") and not i.startswith("_"): fotos[i] = B + "/fotos/" + f
    if len(fotos) < 8: log("muy pocas fotos (%d): no hay edición extrema" % len(fotos)); return
    prev = jl(X + "/partituras.json", {}) or {}
    if prev.get("momentos") and "--rehacer" not in a:   # otra máquina ya las compuso (GitHub corta cada 6 h): no se paga dos veces
        momentos = prev["momentos"]; partes = {k: m["partitura"] for k, m in enumerate(momentos) if m.get("partitura")}
        caja.gastado = 0.0
        log("reuso las %d partituras ya compuestas" % len(partes))
    else:
        momentos = None
    fichas = {}
    for i, p in (fotos.items() if momentos is None else []):
        try: fichas[i] = ficha(p); fichas[i]["muestra"] = descripcion((FT.get(i) or {}).get("prompt"))[:200]
        except Exception: pass
    look = look_canal(B)
    if momentos is None: partes, momentos = componer_todo(B, X, W, AV, SH, FT, fichas, look, caja, total, nmax, tope)
    if momentos is None: return
    if not partes or sin_render:
        if sin_render: log("sin render (sólo en GitHub Actions): quedan las partituras en extrema/partituras.json")
        return
    renderizar(B, X, fotos, partes, momentos, caja)


TRANSICIONES = {"tiras", "cortina", "pliegue", "forma"}


def linea_op(c): return "%s | %s | styles: %s" % (c["op"], c.get("para", ""), ",".join(c.get("estilos") or ["*"]))


def ficha_op(c):
    """Ficha larga: sólo va al compositor para las pocas operaciones elegidas en ese momento."""
    x = "- %s: %s Photos %s to %s." % (c["op"], c.get("ficha", ""), *(c.get("fotos") or [0, 12])[:2])
    if c.get("var"): x += " var: %s." % " | ".join(v for v in c["var"] if v)
    if c.get("datos"): x += " datos: " + json.dumps(c["datos"], ensure_ascii=False, separators=(",", ":"))
    return x


def sirve(c, estilo): return "*" in (c.get("estilos") or ["*"]) or estilo in c["estilos"]


def dirigir(caja, momentos, B):
    """Una llamada barata: qué mundos visuales usa ESTE video y qué operaciones van en cada momento. Si falla, se reparte por reglas."""
    estilos = "\n".join("%s: %s" % (k, v.get("para", "")) for k, v in ESTILOS.items())
    ops = "\n".join(linea_op(c) for c in CAT.values() if c["op"] != "pleno")
    guion = ""
    for f in ("guion.txt", "guion.md"):
        try: guion = open(B + "/" + f, encoding="utf8").read()[:700]; break
        except Exception: pass
    frases = "\n".join("%d: %s" % (i, m["texto"][:170]) for i, m in enumerate(momentos))
    ped = ("You are the art director of a whole YouTube video. Decide its visual language, then give each signature moment its own component.\n\n"
           "VIDEO OPENING:\n%s\n\nSIGNATURE MOMENTS:\n%s\n\nVISUAL WORLDS (style: best for):\n%s\n\nCOMPONENTS (name | best for | styles):\n%s\n\n"
           "Rules: pick 1 main style that fits the topic and 1 or 2 secondary styles for contrast. Most moments use the main style. For each moment list 3 components, best first, whose shape IS the idea of the sentence (a journey -> a map, a verdict -> a stamp, a countdown -> a clock). "
           "Never put the same first component on two moments. Use many different families; a real variety is the goal. The components tiras, cortina, pliegue and forma are only a photo with words on it: never list them first if a real object component can carry the sentence. A component needs what the sentence offers: do not pick a map if no place is named, nor a number component if no number is said. Each component must allow the moment's style.\n"
           'Return JSON only: {"estilo":"...","secundarios":["..."],"momentos":[{"i":0,"estilo":"...","ops":["a","b","c"]}]}') % (guion or "-", frases, estilos, ops)
    plan = {}
    try:
        j = ia(caja, [{"role": "user", "content": ped}], 0.012, 14000)
        for x in j.get("momentos") or []:
            try: i = int(x["i"])
            except Exception: continue
            e = x.get("estilo") if x.get("estilo") in ESTILOS else j.get("estilo")
            if e not in ESTILOS or not 0 <= i < len(momentos): continue
            o = [y for y in (x.get("ops") or []) if y in CAT and y != "pleno" and sirve(CAT[y], e)]
            o = [y for y in o if y not in TRANSICIONES] + [y for y in o if y in TRANSICIONES]      # la foto con palabra encima es el último recurso
            if o: plan[i] = (e, o)
        log("director:", j.get("estilo"), j.get("secundarios"))
    except Exception as ex: log("director por reglas (", ex, ")")
    principal = next((v[0] for v in plan.values()), "papel" if "papel" in ESTILOS else None)
    resto = [c["op"] for c in CAT.values() if c["op"] != "pleno" and c["op"] not in TRANSICIONES and sirve(c, principal or "")]
    fams = {}
    for x in resto: fams.setdefault(x.split("_")[0] if "_" in x else "base", []).append(x)
    resto = [x for tanda in itertools.zip_longest(*fams.values()) for x in tanda if x]       # sin director, igual varias familias
    usados, out = set(), {}
    for i in range(len(momentos)):           # el primero de cada momento no se repite en todo el video
        e, o = plan.get(i, (principal, []))
        o = [x for x in o if x not in usados] + [x for x in o if x in usados]
        if not o or o[0] in usados: o = [x for x in resto if x not in usados][:2] + o
        if o: usados.add(o[0])
        out[i] = (e, o[:3])
    return out


def componer_todo(B, X, W, AV, SH, FT, fichas, look, caja, total, nmax, tope):
    cands = candidatos(W, AV, total)
    if not cands: log("no hay frases fuera del avatar"); return None, None
    momentos = elegir(caja, cands, nmax)
    log("%d momentos elegidos de %d candidatos" % (len(momentos), len(cands)))
    plan = dirigir(caja, momentos, B)

    comp = open(PKG + "/compositor.md", encoding="utf8").read()
    lib = "\n".join("%s: %s | focus %s | calm zone %s | light %s" % (i, f.get("muestra") or "-", f["foco"], f["zona_calma"], f["luz"]) for i, f in sorted(fichas.items()))
    SIS = comp + "\n\nPHOTO LIBRARY OF THIS VIDEO (id: what it shows | focus | calm zone for text | brightness 0-255):\n" + lib
    lk = threading.Lock(); usadas = set()

    def sugeridas(m):
        return [s["id"] for s in SH if s["endMs"] > m["startMs"] - 4000 and s["startMs"] < m["endMs"] + 4000 and s["id"] in fichas][:8]

    def componer(k, m):
        with lk: us = set(usadas)
        P = palabras(m, W)
        estilo, elegidas = plan.get(k, (None, []))
        lk_m = look_de(estilo, look)
        perm = set(elegidas) | {"pleno"}
        ped = "SENTENCE: %s\nWORDS (index:word@frame), %d frames total:\n%s\nPHOTOS SHOWN AROUND THESE SECONDS: %s\nUSED (do not use): %s\nCOMPONENTS FOR THIS MOMENT (the main act must use the first one unless the sentence cannot feed it; pleno is only a short setup act before another component):\n%s\n%s" % (
            m["texto"], round((m["endMs"] - m["startMs"]) * FPS / 1000), " ".join("%d:%s@%d" % (i, w, f) for i, (w, f) in enumerate(P)),
            ", ".join(sugeridas(m)) or "-", ", ".join(sorted(us)) or "-", "\n".join(ficha_op(CAT[o]) for o in elegidas), ficha_op(CAT["pleno"]))
        msgs = [{"role": "system", "content": SIS}, {"role": "user", "content": ped}]
        for intento in range(3):
            try: s = ia(caja, msgs, 0.012)
            except RuntimeError as e:
                if str(e) == "tope": return k, None, "tope"
                return k, None, str(e)
            part, errs = armar(m, s, W, fichas, lk_m)
            errs = errs + ["op %s is not available for this moment" % a.get("op") for a in (s.get("actos") or []) if a.get("op") not in perm]
            if part and not errs:
                with lk:
                    for ac in part["actos"]: usadas.update(f["id"] for f in ac["fotos"])
                return k, part, s.get("bisagra")
            msgs += [{"role": "assistant", "content": json.dumps(s)}, {"role": "user", "content": "Fix these problems and return the whole JSON again:\n- " + "\n- ".join(errs)}]
        return k, None, "partitura inválida: " + "; ".join(errs[:2])[:200]

    partes = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        for k, part, info in ex.map(lambda km: componer(*km), enumerate(momentos)):
            if part: partes[k] = part; log("xm%02d %s | %s" % (k + 1, info, [x["op"] for x in part["actos"]]))
            else: log("xm%02d queda con b-roll (%s)" % (k + 1, info))
    log("partituras %d/%d · gastado US$%.4f de US$%.2f (%d llamadas)" % (len(partes), len(momentos), caja.gastado, tope, caja.n))
    if caja.gastado > 0: _cfg.gasto(B, "edicion_extrema", caja.gastado, llamadas=caja.n)
    json.dump({"look": look, "plan": {str(k): v for k, v in plan.items()}, "momentos": [dict(m, id="xm%02d" % (k + 1), partitura=partes.get(k)) for k, m in enumerate(momentos)], "gasto": round(caja.gastado, 4)},
              open(X + "/partituras.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    return partes, momentos


def renderizar(B, X, fotos, partes, momentos, caja):
    # ── render en Actions: paquete en una carpeta escribible, fotos livianas, mp4 por pieza
    T = os.environ.get("EXTREMA_TRABAJO") or "/tmp/extrema_pkg"
    if not os.path.exists(T + "/node_modules/remotion"):
        shutil.rmtree(T, ignore_errors=True); shutil.copytree(PKG, T, ignore=shutil.ignore_patterns("node_modules", "gen"))
        r = subprocess.run(["npm", "i", "--no-audit", "--no-fund", "--loglevel=error"], cwd=T, capture_output=True, text=True, timeout=900)
        if r.returncode: log("npm falló, queda el b-roll normal:", r.stderr[-400:]); return
    else:
        shutil.copytree(PKG + "/src", T + "/src", dirs_exist_ok=True, ignore=shutil.ignore_patterns("gen")); shutil.copy2(PKG + "/render.mjs", T + "/render.mjs")
    G = T + "/src/gen"; shutil.rmtree(G, ignore_errors=True); os.makedirs(G)
    pub = T + "/public"; os.makedirs(pub + "/fotos", exist_ok=True)
    from PIL import Image
    ids, man = [], []
    for k, part in sorted(partes.items()):
        mid = "xm%02d" % (k + 1); ids.append(mid)
        for ac in part["actos"]:
            for f in ac["fotos"]:
                d = pub + "/fotos/" + f["id"] + ".jpg"
                if not os.path.exists(d):
                    im = Image.open(fotos[f["id"]]).convert("RGB"); im.thumbnail((1920, 1080)); im.save(d, quality=86)
        open(G + "/%s.tsx" % mid, "w", encoding="utf8").write("import React from 'react';\nimport {Pieza} from '../motor';\nconst S: any = %s;\nexport default function Component() { return <Pieza s={S} />; }\n" % json.dumps(part, ensure_ascii=False))
    open(G + "/manifest.ts", "w", encoding="utf8").write("".join("import c%d from './%s';\n" % (i, x) for i, x in enumerate(ids)) +
        "export const comps = [%s];\n" % ",".join("{id:'%s',C:c%d,frames:%d}" % (x, i, partes[int(x[2:]) - 1]["frames"]) for i, x in enumerate(ids)))
    t0 = time.time()
    try:
        r = subprocess.run(["node", "render.mjs", pub, X, ",".join(ids)], cwd=T, capture_output=True, text=True, timeout=3600)
        print(r.stdout[-1500:], r.stderr[-800:])
    except subprocess.TimeoutExpired: log("el render tardó demasiado: van las piezas que llegaron")
    res = jl(X + "/render.json", {}) or {}
    for k, part in sorted(partes.items()):
        mid = "xm%02d" % (k + 1); f = X + "/" + mid + ".mp4"; m = momentos[k]
        if not (res.get(mid) or {}).get("ok") or not os.path.exists(f): log(mid, "no se renderizó: queda el b-roll"); continue
        dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip()
        if not dur or abs(float(dur) * FPS - part["frames"]) > 6: log(mid, "duración rara (%s s): queda el b-roll" % dur); continue
        man.append({"mp4": "extrema/" + mid + ".mp4", "startMs": m["startMs"], "endMs": m["endMs"], "texto": m["texto"][:120]})
    json.dump(man, open(X + "/manifest.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    shutil.rmtree(pub, ignore_errors=True)
    log("%d piezas listas en %.0f s · edición extrema US$%.4f" % (len(man), time.time() - t0, caja.gastado))


if __name__ == "__main__":
    try: main()
    except Exception as e:      # nunca rompe el video: sin manifest, render.py usa el b-roll normal
        log("falló, queda el b-roll normal:", type(e).__name__, str(e)[:300])
