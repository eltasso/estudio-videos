# -*- coding: utf-8 -*-
"""EFECTOS DE SONIDO gratis (Mixkit: licencia libre, uso comercial, sin atribución y SIN clave). Baja SÓLO los que usa este video.
   python <APP>/tools/sonidos.py <carpeta> <pedidos.json> [--tomas 3]
pedidos.json = [{"id":"agua","tags":["water","splash"],"q":"water pour","min":0.5,"max":6}, …]
   id = nombre del archivo (sfx/<id>.mp3 y alternativas <id>_2, <id>_3) · tags = etiquetas de Mixkit en inglés (una palabra o con guiones)
   q = palabras que tiene que tener el título (ordena por coincidencia) · min/max = duración aceptada en segundos · estricto = sólo los que coinciden.
Salida: <carpeta>/sfx/ + sfx/_sfx_fuentes.json (título, duración y origen de cada archivo). Si Mixkit no responde, avisa y sigue: el video sale sin ese efecto."""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
for _x in (sys.stdout, sys.stderr):
    if hasattr(_x, "reconfigure"): _x.reconfigure(encoding="utf-8", errors="replace")   # salida siempre UTF-8

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130"}
MAX_PEDIDOS, MAX_BYTES = 25, 8_000_000
_cache = {}


def bajar(url, tope=MAX_BYTES):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return r.read(tope + 1)


def parsear(html, pagina):
    """De la página de una etiqueta saca título, duración y URL de cada sonido."""
    out = []
    for c in html.split('data-audio-player-preview-url-value="')[1:]:
        url = c.split('"')[0]
        u = urllib.parse.urlparse(url)
        if u.scheme != "https" or not (u.hostname or "").endswith("mixkit.co"): continue     # sólo archivos de Mixkit
        nombre = (re.search(r'item-grid-card__title">\s*([^<]+?)\s*<', c) or [None, ""])[1]
        d = re.search(r">\s*(\d+):(\d\d)\s*<", c)
        out.append({"url": url, "nombre": nombre, "dur": int(d[1]) * 60 + int(d[2]) if d else 0, "pagina": pagina})
    return out, html.count('data-audio-player-preview-url-value="')


def etiqueta(tag):
    if tag in _cache: return _cache[tag]
    out = []
    if not re.match(r"^[a-z0-9-]+$", tag): print(f"  etiqueta inválida: {tag!r}"); return out
    pag0 = f"https://mixkit.co/free-sound-effects/{tag}/"
    for n in range(1, 4):
        try: html = bajar(pag0 + (f"?page={n}" if n > 1 else ""), 4_000_000).decode("utf8", "ignore")
        except Exception as e: print(f"  no pude leer la etiqueta {tag} ({type(e).__name__})"); break
        items, cant = parsear(html, pag0)
        out += items
        time.sleep(0.6)
        if cant < 36: break
    _cache[tag] = out
    return out


def elegir(p, items):
    mi, ma = p.get("min", 0.3), p.get("max", 60)
    pal = [w for w in str(p.get("q", "")).lower().split() if w]
    res = [s for s in items if not s["dur"] or mi <= s["dur"] <= ma]
    puntos = lambda s: sum(w in s["nombre"].lower() for w in pal)
    res.sort(key=puntos, reverse=True)
    if pal and p.get("estricto"): res = [s for s in res if puntos(s) > 0]
    return res


def valido(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True)
    return r.returncode == 0 and bool(r.stdout.strip())


def main(B, ped, tomas):
    O = B + "/sfx"; os.makedirs(O, exist_ok=True)
    MAN = O + "/_sfx_fuentes.json"
    try: man = json.load(open(MAN, encoding="utf8"))
    except Exception: man = {}
    for p in json.load(open(ped, encoding="utf8"))[:MAX_PEDIDOS]:
        i = str(p.get("id") or "")
        if not re.match(r"^[\w-]+$", i): print(f"id inválido: {i!r}"); continue
        if man.get(i): print("ya está", i); continue
        vistos, items = set(), []
        for t in p.get("tags") or []:
            for s in etiqueta(str(t).strip().lower()):
                if s["url"] not in vistos: vistos.add(s["url"]); items.append(s)
        res = elegir(p, items)
        if not res: print("SIN RESULTADO", i, "→ probá otras etiquetas o seguí sin ese efecto"); continue
        hechos = []
        for k, s in enumerate(res[:tomas]):
            f = i + (f"_{k + 1}" if k else "") + ".mp3"
            try:
                data = bajar(s["url"])
                if len(data) < 1000 or len(data) > MAX_BYTES: continue
                open(f"{O}/{f}", "wb").write(data)
                if not valido(f"{O}/{f}"): os.remove(f"{O}/{f}"); continue
                hechos.append({"archivo": f, "nombre": s["nombre"], "dur": s["dur"], "url": s["url"], "pagina": s["pagina"]})
            except Exception as e: print(f"  no pude bajar una toma de {i} ({type(e).__name__})")
        if hechos:
            man[i] = hechos
            print(f"ok {i}: " + " · ".join(f"{x['archivo']} ({x['dur']} s, {x['nombre']})" for x in hechos), flush=True)
            json.dump(man, open(MAN, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        else: print("SIN RESULTADO", i)
    print("listo →", O)


if __name__ == "__main__":
    if len(sys.argv) < 3: print(__doc__); sys.exit(0)
    m = re.search(r"--tomas (\d+)", " ".join(sys.argv))
    try: main(os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/"), sys.argv[2], min(5, int(m[1])) if m else 3)
    except Exception as e:                      # nada frena el video: sale sin efectos
        print(f"⚠ sonidos falló ({type(e).__name__}): seguí sin efectos y anotalo en REPORTE.md.")
    sys.exit(0)
