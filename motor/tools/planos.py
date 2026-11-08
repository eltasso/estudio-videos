# -*- coding: utf-8 -*-
"""PLANOS — arma los planos del b-roll y shots_timed.json. NO escribas scripts propios para esto.
  1) python <APP>/tools/planos.py <carpeta>
       Necesita captions.json y avatar_ranges.json (el plan de ventanas: escribilo vos ANTES).
       → planos.json: un plano de b-roll cada ~5 s (entre las ventanas del avatar), cortado en pausas del habla, con el
         TEXTO que se dice en ese plano. Escribí UN prompt por plano, con "id" = el id del plano (p001, p002…).
         Las fotos de la pantalla partida ("foto" en una ventana) también entran en la lista, con su propio id.
  2) python <APP>/tools/planos.py <carpeta> --shots
       → shots_timed.json con cada plano y SU foto. Falla si falta alguna foto. Nunca repite una foto.
Ritmo: ~12 planos por minuto de b-roll, ~5 s cada uno, CERO imágenes repetidas. Debajo de las ventanas del avatar no hace
falta foto (el avatar la tapa)."""
import json, os, subprocess, sys, glob
for _x in (sys.stdout, sys.stderr):
    if hasattr(_x, "reconfigure"): _x.reconfigure(encoding="utf-8", errors="replace")   # salida siempre UTF-8

OBJ, MIN, MAX = 4800, 2800, 6500       # ms por plano
HUECO_CHICO = 500                      # render.py descarta los pedazos de foto de menos de esto: no hace falta foto
IMG = (".jpg", ".jpeg", ".png", ".webp")


def jload(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d


def voz_ms(B, caps):
    """Fin real de la voz: lo más largo entre las palabras + 400 ms y la duración de master.wav (así no queda cola sin imagen)."""
    fin = (caps[-1]["endMs"] + 400) if caps else 0
    try:
        d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{B}/voz/master.wav"],
                           capture_output=True, text=True).stdout.strip()
        fin = max(fin, round(float(d) * 1000))
    except Exception: pass
    return int(fin)


def armar(B):
    W = [w for w in (jload(f"{B}/captions.json") or []) if w.get("text", "").strip()]
    if len(W) < 20: sys.exit("⛔ falta captions.json (corré tiempos.py primero)")
    R = jload(f"{B}/avatar_ranges.json")
    if not R: sys.exit("⛔ falta avatar_ranges.json: escribí primero el plan de ventanas del avatar (KIT §3) y volvé a correr esto")
    R = sorted(R, key=lambda r: r["startMs"])
    V = [(r["startMs"], r["endMs"]) for r in R]
    if V[0][0] > 300: print("⚠ la primera ventana del avatar no arranca en 0: el video TIENE que abrir con el avatar hablando (startMs: 0)")
    dur = voz_ms(B, W)
    huecos, t = [], 0
    for a, b in V:
        if a > t: huecos.append((t, a))
        t = max(t, b)
    if dur > t: huecos.append((t, dur))
    cortes_ok = [w["startMs"] for i, w in enumerate(W) if i and w["startMs"] - W[i - 1]["endMs"] >= 120] or [w["startMs"] for w in W]
    texto = lambda x, y: " ".join(w["text"].strip() for w in W if x <= w["startMs"] < y)
    P, cortos = [], 0
    for a, b in huecos:
        L = b - a
        if L < HUECO_CHICO: continue                   # astilla que render.py no muestra: no gasta foto
        if L < MIN: cortos += 1                        # hueco corto: lleva foto propia igual (estirar la anterior la repetiría)
        n = max(1, round(L / OBJ)); bordes = [a]
        for k in range(1, n):
            ideal = a + L * k / n
            c = min(cortes_ok, key=lambda x: abs(x - ideal))
            if abs(c - ideal) > 900 or c - bordes[-1] < MIN or b - c < MIN: c = int(ideal)
            bordes.append(c)
        bordes.append(b)
        for x, y in zip(bordes, bordes[1:]):
            P.append({"id": "p%03d" % (len(P) + 1), "startMs": int(x), "endMs": int(y), "seg": round((y - x) / 1000, 1), "texto": texto(x, y)})
    # las fotos de la pantalla partida: también una foto distinta cada una (van aparte: no entran en shots_timed.json)
    usados, n_split = {p["id"] for p in P}, 0
    for r in R:
        f = r.get("foto")
        if not f: continue
        if f in usados: sys.exit(f"⛔ la foto '{f}' se usa dos veces en avatar_ranges.json o choca con un plano: cada ventana partida lleva su foto propia (ej. s01, s02…)")
        usados.add(f); n_split += 1
        P.append({"id": f, "startMs": int(r["startMs"]), "endMs": int(r["endMs"]), "seg": round((r["endMs"] - r["startMs"]) / 1000, 1),
                  "texto": texto(r["startMs"], r["endMs"]), "split": True})
    json.dump(P, open(f"{B}/planos.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    base = [p for p in P if not p.get("split")]
    broll = sum(p["endMs"] - p["startMs"] for p in base) / 60000
    print(f"✓ planos.json: {len(base)} planos de b-roll ({broll:.1f} min de b-roll, {len(base) / max(broll, .1):.1f} por minuto)"
          f"{f' + {n_split} fotos de pantalla partida' if n_split else ''} · {len(V)} ventanas de avatar.\n"
          f"  Ahora: UN prompt por plano (id = el del plano, p001…) con tools/fotos.py. Ninguna foto se repite.")
    if cortos: print(f"⚠ {cortos} huecos de menos de {MIN / 1000:.1f} s entre ventanas: si podés, dejá ≥ 3 s (una foto tan corta casi no se ve).")


def shots(B):
    P = jload(f"{B}/planos.json")
    if not P: sys.exit(f"⛔ primero: python {os.path.abspath(__file__)} {B}")
    hay = lambda i: [x for x in glob.glob(f"{B}/fotos/{i}.*") if x.lower().endswith(IMG)]
    falta = [p["id"] for p in P if not hay(p["id"])]
    if falta: sys.exit(f"⛔ faltan {len(falta)} fotos ({', '.join(falta[:12])}{'…' if len(falta) > 12 else ''}). Esperalas con esperar.py o repedilas.")
    Q = [p for p in P if not p.get("split")]
    fin = voz_ms(B, jload(f"{B}/captions.json") or [])
    S = []
    for i, p in enumerate(Q):
        a = 0 if i == 0 else p["startMs"]
        b = Q[i + 1]["startMs"] if i + 1 < len(Q) else max(p["endMs"], fin)
        S.append({"id": p["id"], "startMs": int(a), "endMs": int(b)})   # se estira por debajo del avatar: no se ve, no hay huecos
    json.dump(S, open(f"{B}/shots_timed.json", "w", encoding="utf8"), indent=1)
    print(f"✓ shots_timed.json: {len(S)} planos, {len(S)} fotos distintas (cero repetidas). Seguí con render.py.")


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(0)
    B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
    shots(B) if "--shots" in sys.argv else armar(B)
