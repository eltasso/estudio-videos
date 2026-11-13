# -*- coding: utf-8 -*-
"""FONDO DEL AVATAR: InfiniteTalk va rompiendo las zonas con mucho detalle del fondo (hojas → mosaico de colores) a medida que avanza el reel.
   python <APP>/tools/fondo_avatar.py <carpeta> [--medir] [--hasta S]
Corre solo antes del armado, gratis y sin otra llamada al avatar:
1. Compara el reel al principio y al final y marca dónde apareció el mosaico (nunca sobre la persona).
2. Desde el primer clip con falla, repone en esa zona el fondo limpio del primer segundo, igualando el color de cada clip.
Los originales quedan en avatar/sin_fondo/. Si la zona no es segura no toca nada y lo deja anotado en gates/fondo_avatar.json. Nunca frena el video."""
import json, os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageFilter

W, H, T = 640, 360, 16
SUBA, MIN_TILES, MAX_FRAC, CORTE, INTRUSO = 6.0, 10, 0.40, 1.8, 22.0     # suba de croma por bloque · bloques mínimos de una zona · máximo del cuadro · suba que ya se ve en un clip (lo sano no pasó de 1,3) · cambio de luz que delata a la persona


def jload(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d
def dur(f): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip() or 0)
def tam(f):
    x = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip().split(",")
    return int(x[0]), int(x[1])


def cuadro(f, t):
    b = subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % max(0, t), "-i", f, "-frames:v", "1", "-vf", "scale=%d:%d" % (W, H), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32) if len(b) == W * H * 3 else None


def croma(a):
    """Cuánto varía el color dentro de cada bloque: el mosaico sube mucho, la persona y las paredes casi nada."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; y = 0.299 * r + 0.587 * g + 0.114 * b
    c = np.stack([b - y, r - y], -1); h, w = H // T, W // T
    return c[:h * T, :w * T].reshape(h, T, w, T, 2).std((1, 3)).mean(-1)


def luma_bloques(a):
    y = a.mean(-1); h, w = H // T, W // T
    return y[:h * T, :w * T].reshape(h, T, w, T).mean((1, 3))


def vecinos(m, n=1):
    m = m.copy()
    for _ in range(n):
        x = m.copy(); x[1:] |= m[:-1]; x[:-1] |= m[1:]; x[:, 1:] |= m[:, :-1]; x[:, :-1] |= m[:, 1:]; m = x
    return m
def achicar(m, n=1): return ~vecinos(~m, n)


def zonas(m):
    """Zonas conectadas de una grilla booleana, de mayor a menor."""
    vis = np.zeros(m.shape, bool); Z = []
    for i, j in zip(*np.nonzero(m)):
        if vis[i, j]: continue
        P, q = [], [(int(i), int(j))]; vis[i, j] = True
        while q:
            a, b = q.pop(); P.append((a, b))
            for c, d in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                if 0 <= c < m.shape[0] and 0 <= d < m.shape[1] and m[c, d] and not vis[c, d]: vis[c, d] = True; q.append((c, d))
        Z.append(P)
    return sorted(Z, key=len, reverse=True)


def persona(E):
    """Dónde está la persona: lo que más se mueve al principio del reel (el fondo todavía está sano), con margen."""
    L = np.stack([luma_bloques(x) for x in E]); mov = L.std(0)
    alto = mov > max(2.0, float(np.percentile(mov, 80)))
    Z = zonas(alto)
    if not Z: return np.zeros(mov.shape, bool)
    m = np.zeros(mov.shape, bool)
    for P in Z:
        if len(P) >= max(6, len(Z[0]) * 0.25):
            for i, j in P: m[i, j] = True
    # hacia abajo y entre sus extremos también es persona (ropa quieta, piernas)
    cols = np.nonzero(m.any(0))[0]
    if len(cols):
        filas = np.nonzero(m.any(1))[0]
        centro = int(np.median(np.nonzero(m)[1])); ancho = max(int(np.percentile(np.nonzero(m)[1], 90)) - centro, centro - int(np.percentile(np.nonzero(m)[1], 10)), 3)
        m[filas.min():, max(0, centro - ancho):centro + ancho + 1] = True
    return vecinos(m, 1)


def analizar(reel, hasta=None):
    d = min(dur(reel), hasta or 1e9)
    if d < 40: return {"estado": "corto", "d": d}
    E = [x for x in (cuadro(reel, t) for t in np.arange(1, min(31, d * 0.25), 3.0)) if x is not None]
    F = [x for x in (cuadro(reel, d - k) for k in (1.5, 7, 13, 19)) if x is not None]
    if len(E) < 3 or len(F) < 2: return {"estado": "sin_cuadros", "d": d}
    base = np.median(np.stack([croma(x) for x in E]), 0); fin = np.median(np.stack([croma(x) for x in F]), 0)
    suba = fin - base; pers = persona(E)
    roto = achicar(vecinos(suba > SUBA, 1), 1)
    sobre_persona = int((roto & pers).sum())
    m = np.zeros(roto.shape, bool)
    Z = [P for P in zonas(roto & ~pers) if len(P) >= MIN_TILES]
    for P in Z:
        for i, j in P: m[i, j] = True
    m = vecinos(m, 1) & ~pers
    frac = float(m.mean())
    return {"estado": "falla" if Z else "sano", "d": round(d, 1), "E0": E[0], "base": base, "suba": suba, "m": m, "pers": pers, "frac": round(frac, 3),
            "zonas": [len(P) for P in Z], "sobre_persona": sobre_persona, "suba_p99": round(float(np.percentile(suba, 99)), 1), "suba_media_zona": round(float(suba[m].mean()), 1) if m.any() else 0.0}


def main(B, medir, hasta):
    reel = B + "/avatar/it/reel.mp4"; EST = B + "/gates/fondo_avatar.json"; os.makedirs(B + "/gates", exist_ok=True)
    if not os.path.exists(reel): print("fondo: no hay reel, sigo"); return
    if not medir and (jload(EST, {}) or {}).get("reel_mtime") == os.path.getmtime(reel): print("fondo: ya revisado"); return
    t0 = time.time(); A = analizar(reel, hasta)
    res = {k: v for k, v in A.items() if not hasattr(v, "shape")}; res["reel_mtime"] = os.path.getmtime(reel)
    print("fondo:", {k: v for k, v in res.items() if k != "reel_mtime"}, flush=True)
    if A["estado"] == "falla" and medir:
        os.makedirs(B + "/qc", exist_ok=True)
        v = np.zeros((*A["m"].shape, 3), np.uint8); v[A["m"]] = (255, 80, 60); v[A["pers"]] = (60, 120, 255)
        Image.fromarray(v).resize((W, H), Image.NEAREST).save(B + "/qc/fondo_zonas.png")
    if A["estado"] != "falla" or medir:
        if not medir: json.dump(res, open(EST, "w"), ensure_ascii=False)
        return
    if A["frac"] > MAX_FRAC or A["frac"] <= 0:
        res["estado"] = "dudoso"; json.dump(res, open(EST, "w"), ensure_ascii=False); print("fondo: la zona no es segura, no toco nada"); return
    sync = (jload(B + "/avatar/it_sync.json", {}) or {}).get("cortes") or []
    if not sync: res["estado"] = "sin_cortes"; json.dump(res, open(EST, "w"), ensure_ascii=False); return
    sync = sorted(sync, key=lambda c: c["real"]); m = A["m"]; base = A["base"]
    Med = []
    with ThreadPoolExecutor(4) as ex: fr = list(ex.map(lambda c: cuadro(reel, c["real"] + c["dur"] / 2), sync))
    prim = None
    for k, (c, f) in enumerate(zip(sync, fr)):
        s = float((croma(f) - base)[m].mean()) if f is not None else 0.0
        Med.append(round(s, 1))
        if prim is None and s > CORTE: prim = k
    if prim is None: res["estado"] = "sin_clips"; json.dump(res, open(EST, "w"), ensure_ascii=False); return
    cw, ch = tam(B + "/" + sync[0]["file"])
    lim = B + "/avatar/fondo_limpio.png"; msk = B + "/avatar/fondo_mascara.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", reel, "-frames:v", "1", "-vf", "scale=%d:%d" % (cw, ch), lim], check=True)
    # si en algún clip la persona se fue más allá de su zona (un brazo, inclinarse), esos bloques también son persona
    E0 = A["E0"]; L0 = luma_bloques(E0); pers = A["pers"].copy()
    veces = np.zeros(pers.shape, int)
    for f in fr:
        if f is None: continue
        d = luma_bloques(f) - L0; veces += np.abs(d - np.median(d)) > INTRUSO
    intruso = (veces >= 2) & ~m                       # el mosaico también cambia la luz: solo cuenta lo que está fuera de él y pegado a la persona
    for P in zonas(intruso):
        if any(vecinos(pers, 1)[i, j] for i, j in P):
            for i, j in P: pers[i, j] = True
    pers = vecinos(pers, 1)
    tapar = ~pers                                     # con el fondo roto se repone todo lo que no es la persona: al final también se ensucian madera, piso y flores
    res["frac_repuesta"] = round(float(tapar.mean()), 3)
    if not 0.2 <= float(tapar.mean()) <= 0.85: res["estado"] = "dudoso"; json.dump(res, open(EST, "w"), ensure_ascii=False); print("fondo: la persona no se separa bien, no toco nada"); return
    g = np.zeros((H, W), np.uint8); h, w = m.shape; g[:h * T, :w * T] = np.kron(tapar.astype(np.uint8), np.ones((T, T), np.uint8)) * 255; g[h * T:] = g[h * T - 1]; g[:, w * T:] = g[:, [w * T - 1]]
    Image.fromarray(g).resize((cw, ch), Image.BILINEAR).filter(ImageFilter.GaussianBlur(cw / 90)).save(msk)
    quieto = ~vecinos(m, 1) & ~pers
    gq = np.zeros((H, W), bool); gq[:h * T, :w * T] = np.kron(quieto, np.ones((T, T), bool))
    os.makedirs(B + "/avatar/sin_fondo", exist_ok=True)
    def uno(par):
        c, f = par; src = B + "/" + c["file"]; tmp = src + ".fondo.mp4"
        gan = np.clip(f[gq].mean(0) / (E0[gq].mean(0) + 1e-3), 0.85, 1.15) if f is not None and gq.any() else np.ones(3)
        fc = "[1:v]format=rgb24,colorchannelmixer=rr=%.3f:gg=%.3f:bb=%.3f,format=rgba[s];[2:v]format=gray[a];[s][a]alphamerge[o];[0:v][o]overlay=shortest=1:format=auto,format=yuv420p[v]" % tuple(gan)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-threads", "2", "-i", src, "-loop", "1", "-i", lim, "-loop", "1", "-i", msk, "-filter_complex", fc,
                        "-map", "[v]", "-map", "0:a?", "-c:a", "copy", "-c:v", "libx264", "-crf", "17", "-preset", "veryfast", tmp], check=True, capture_output=True)
        return c, tmp
    with ThreadPoolExecutor(2) as ex: H_ = list(ex.map(uno, list(zip(sync, fr))[prim:]))
    for c, tmp in H_:                                 # todos juntos: nadie arma a medias; el original no se pierde
        dst = B + "/avatar/sin_fondo/" + os.path.basename(c["file"])
        if not os.path.exists(dst): shutil.copyfile(B + "/" + c["file"], dst)
        os.replace(tmp, B + "/" + c["file"])
    res.update(estado="arreglado", desde=sync[prim]["file"], clips=len(H_), seg=round(time.time() - t0), medidas=Med[:200])
    json.dump(res, open(EST, "w"), ensure_ascii=False)
    print("fondo: arreglado desde %s · %d clips · %d s" % (sync[prim]["file"], len(H_), res["seg"]), flush=True)


if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(0)
    _B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
    _h = float(sys.argv[sys.argv.index("--hasta") + 1]) if "--hasta" in sys.argv else None
    try: main(_B, "--medir" in sys.argv, _h)
    except Exception as e: print("⚠ fondo: no pude revisarlo (%s): sigo sin tocar nada" % type(e).__name__, flush=True)    # nunca frena el armado
    sys.exit(0)
