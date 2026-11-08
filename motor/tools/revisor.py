# -*- coding: utf-8 -*-
"""REVISOR FINAL (no frena): saca cuadros de final.mp4 y los mira con visión (deepseek-flash, menos de US$0,01 por video, con tu clave de DeepSeek).
   python <APP>/tools/revisor.py <carpeta>
1. Deja qc/f_001.jpg, f_002.jpg… (un cuadro cada 30 s) y qc/final_info.json. Mide los huecos negros ≥ 0,5 s (sin IA).
2. Busca fallas claras: cara o cuerpo deformes, glitch del avatar, marca de agua, cuadros rotos, la misma foto repetida.
   El texto legible en carteles, papeles o pantallas está BIEN: nunca se marca. No compara las fotos contra el guion.
3. Lo que encuentra va a gates/correcciones.txt. Aplicalo y anotalo en gates/correcciones_hechas.txt.
Si no hay clave o crédito, hace sólo lo que no usa IA y sigue. Máximo 2 revisiones con IA por video."""
import base64, glob, io, json, math, os, re, subprocess, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg
for _x in (sys.stdout, sys.stderr):
    if hasattr(_x, "reconfigure"): _x.reconfigure(encoding="utf-8", errors="replace")   # salida siempre UTF-8

MODELO = os.environ.get("REVISOR_MODELO") or "deepseek-flash"   # el único de DeepSeek que ve imágenes (deepseek-v4-pro responde que no ve)
_P = _cfg.leer().get("precio") or {"miss": 0.15, "out": 0.6}
PRECIO = (_P["miss"] / 1e6, _P["out"] / 1e6)
CADA_S, MAX_CUADROS, MAX_CORRIDAS = 30, 48, 2


def jload(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d


def duracion(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout.strip() or 0)


def cuadros(B, fin, dur):
    """Un cuadro cada 30 s (más separados si el video es muy largo). No los rehace si el final no cambió."""
    Q = B + "/qc"; os.makedirs(Q, exist_ok=True)
    paso = max(CADA_S, math.ceil(dur / MAX_CUADROS))
    viejos = sorted(glob.glob(Q + "/f_*.jpg"))
    if viejos and (jload(Q + "/final_info.json") or {}).get("cada_s") == paso and min(os.path.getmtime(f) for f in viejos) >= os.path.getmtime(fin):
        return viejos, paso
    for f in viejos: os.remove(f)
    k = 0
    while k * paso < dur - 0.5:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(k * paso), "-i", fin, "-frames:v", "1", "-vf", "scale=960:-2", "-q:v", "3",
                        "%s/f_%03d.jpg" % (Q, k + 1)], capture_output=True)
        k += 1
    return sorted(glob.glob(Q + "/f_*.jpg")), paso


def negros(fin):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", fin, "-an", "-vf", "scale=320:-2,blackdetect=d=0.5:pix_th=0.10", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf8", errors="replace")
    return [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", r.stderr)]


def hoja(paths):
    """Grilla 4x3 numerada 1..12 → jpg en base64."""
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.load_default(size=34)
    W, H = 480, 270; n = len(paths); cols = 4 if n > 4 else n; rows = (n + cols - 1) // cols
    im = Image.new("RGB", (cols * W, rows * H), (90, 90, 90)); d = ImageDraw.Draw(im)
    for i, p in enumerate(paths):
        x, y = (i % cols) * W, (i // cols) * H
        try:
            t = Image.open(p).convert("RGB"); t.thumbnail((W, H))
            im.paste(t, (x + (W - t.width) // 2, y + (H - t.height) // 2))
        except Exception: pass
        d.rectangle([x, y, x + 52, y + 44], fill="yellow"); d.text((x + 8, y + 3), str(i + 1), fill="black", font=font)
    b = io.BytesIO(); im.save(b, "JPEG", quality=80); return base64.b64encode(b.getvalue()).decode()


class SinIA(Exception): pass


def preguntar(txt, b64):
    try: clave = _cfg.clave("deepseek")
    except SystemExit: raise SinIA("no hay clave de DeepSeek")
    body = {"model": MODELO, "temperature": 0, "max_tokens": 8000, "response_format": {"type": "json_object"},   # flash piensa antes de contestar: con poco margen vuelve vacío
            "messages": [{"role": "user", "content": [{"type": "text", "text": txt},
                         {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + b64}}]}]}
    rq = urllib.request.Request(_cfg.url("https://api.deepseek.com/chat/completions"), data=json.dumps(body).encode(),
                                headers={"Authorization": "Bearer " + clave, "Content-Type": "application/json", "User-Agent": "estudio-videos/1.0"})
    for k in range(4):
        try:
            r = json.load(urllib.request.urlopen(rq, timeout=280)); u = r.get("usage", {})
            return json.loads(r["choices"][0]["message"]["content"]), u.get("prompt_tokens", 0), u.get("completion_tokens", 0)
        except urllib.error.HTTPError as e:
            t = e.read().decode("utf8", "ignore")[:300]
            if e.code in (401, 403): raise SinIA("DeepSeek rechazó la clave")
            if e.code == 402: raise SinIA("DeepSeek sin saldo")
            if re.search(_cfg.SIN_CREDITO, t, re.I): raise SinIA("DeepSeek sin saldo")
            print(f"  reintento {k + 1}: HTTP {e.code}", flush=True)
        except Exception as e:
            print(f"  reintento {k + 1}: {type(e).__name__}", flush=True)
        time.sleep(10 * (k + 1))
    return {}, 0, 0


REGLAS = ("Sos el revisor de calidad de un video de YouTube terminado. Cada cuadro numerado es un fotograma del video "
  "(el tiempo va entre corchetes abajo). OJO: dos imágenes superpuestas y semitransparentes son un FUNDIDO normal entre planos: NUNCA lo marques. "
  "Una persona en una mitad y una foto en la otra es una PANTALLA PARTIDA normal, y un collage o un antes/después dentro de un mismo cuadro es intencional. "
  "Marcá SOLO fallas claras y seguras: la cara del presentador deforme, derretida o con glitch; marca de agua o logo de un generador "
  "(el texto legible en papeles, carteles o pantallas está BIEN: no lo marques nunca); persona deformada o estirada; manos deformes; "
  "la misma foto repetida en dos cuadros distintos. No marques estilo ni encuadre. Ante la duda, NO lo marques. Respondé JSON: "
  "{\"malas\":[{\"n\":<número>,\"motivo\":\"<corto, en español>\"}]} (vacía si todo está bien).\n\n")

ARREGLO = ("→ mirá en plan.json qué hay en ese segundo. Si es una foto: borrá fotos/<id>.png, pedí ese id de nuevo con fotos.py y volvé a correr render.py + assemble.py. "
           "Si es el avatar: NUNCA otra llamada; sacá esa ventana de avatar_ranges.json (queda la foto de abajo), salvo la primera, que no se toca.")


def revisar_ia(F, paso):
    """Las hojas se miran todas a la vez: el video se revisa en lo que tarda una sola hoja."""
    def una(k):
        g = F[k:k + 12]
        tiempos = [(int(re.search(r"f_(\d+)", os.path.basename(f)).group(1)) - 1) * paso for f in g]
        txt = REGLAS + f"Hay {len(g)} cuadros numerados; los lugares grises sin número son relleno y no cuentan.\n" + "  ".join(f"{i + 1}:[{t // 60}:{t % 60:02d}]" for i, t in enumerate(tiempos))
        return (tiempos, *preguntar(txt, hoja(g)))
    malas, ti, to = [], 0, 0
    with ThreadPoolExecutor(6) as ex:
        for tiempos, r, a, b in ex.map(una, range(0, len(F), 12)):
            ti += a; to += b
            for m in r.get("malas", []) or []:
                try: malas.append((tiempos[int(m["n"]) - 1], str(m.get("motivo", ""))[:160]))
                except Exception: pass
    return sorted(malas), ti * PRECIO[0] + to * PRECIO[1]


def main(B):
    fin = B + "/final.mp4"
    if not os.path.exists(fin): sys.exit("⛔ falta final.mp4: corré render.py y assemble.py primero")
    os.makedirs(B + "/gates", exist_ok=True)
    EST = B + "/gates/revisor_final.json"
    est = jload(EST, {}) or {}
    if est.get("final_mtime") == os.path.getmtime(fin): print("✓ este final ya estaba revisado y no cambió: seguí."); return
    dur = duracion(fin)
    F, paso = cuadros(B, fin, dur)
    ng = negros(fin)
    json.dump({"cada_s": paso, "duracion": round(dur, 2), "negros": ng, "cuadros": len(F)}, open(B + "/qc/final_info.json", "w", encoding="utf8"))
    lin = [f"HUECO NEGRO {a:.1f}-{b:.1f} s → mirá en plan.json qué falta ahí, arreglalo y volvé a correr render.py + assemble.py." for a, b in ng]
    costo, ia, corridas = 0.0, False, int(est.get("corridas") or 0)
    if corridas >= MAX_CORRIDAS: print(f"ya van {corridas} revisiones con IA en este video: no gasto más.")
    elif F:
        try:
            malas, costo = revisar_ia(F, paso); ia = True; corridas += 1
            lin += [f"FINAL ~{t // 60}:{t % 60:02d}: {m} {ARREGLO}" for t, m in malas]
            if costo: _cfg.gasto(B, "revisor", costo, cuadros=len(F))
        except SinIA as e: print(f"sin revisión con IA ({e}): seguí igual.")
    json.dump({"t": time.time(), "n": len(F), "malas": len(lin), "costo_usd": round(costo, 4), "ia": ia, "corridas": corridas, "final_mtime": os.path.getmtime(fin)},
              open(EST, "w", encoding="utf8"))
    if lin:
        with open(B + "/gates/correcciones.txt", "a", encoding="utf8") as fh:
            fh.write(f"\n# Revisor final — {time.strftime('%d-%m %H:%M')} ({len(lin)} de {len(F)} cuadros)\n" + "\n".join(lin) + "\n")
        print(f"⚠ {len(lin)} cosas para arreglar en gates/correcciones.txt:\n  · " + "\n  · ".join(lin[:30]))
    else: print("✓ el revisor no encontró fallas." if ia else "✓ sin huecos negros (esta vez sin revisión con IA).")
    print(f"({len(F)} cuadros revisados, US${costo:.3f})")


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(0)
    try: main(os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/"))
    except Exception as e:                      # nada frena el video
        print(f"⚠ el revisor falló ({type(e).__name__}): anotalo en REPORTE.md y seguí."); sys.exit(0)
