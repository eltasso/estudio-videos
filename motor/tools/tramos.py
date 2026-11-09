# -*- coding: utf-8 -*-
"""ARMADO POR TRAMOS (lo usa assemble.py; no se llama a mano).
El video se parte en tramos fijos de 30 s medidos en la línea de tiempo, siempre sobre la grilla de keyframes (cada 60 cuadros).
Cada tramo se codifica UNA vez con la calidad de entrega, en paralelo, y se guarda por su huella (segmentos, fundidos, capas y
ajustes): si un arreglo no lo toca, se reusa. Después se pegan sin recomprimir.
Como el corte cae siempre donde ya iba un keyframe, el resultado tiene la misma estructura que una pasada entera: los fundidos
y las capas se calculan adentro del tramo donde caen, aunque crucen el corte."""
import hashlib, json, os, subprocess, time
from concurrent.futures import ThreadPoolExecutor

FPS, GOP, PASO = 30, 60, 900
VERSION = "t1"
CPU = os.cpu_count() or 4
PROCS = int(os.environ.get("ARMADO_PROCS") or max(2, CPU))
HILOS = int(os.environ.get("ARMADO_HILOS") or 1)     # medido en Actions (4 núcleos): 4 procesos de 1 hilo es lo más rápido para el video entero


def huella(f):
    h = hashlib.md5()
    with open(f, "rb") as a:
        for b in iter(lambda: a.read(1 << 20), b""): h.update(b)
    return h.hexdigest()


def duracion(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


class Plan: pass


def planificar(B, segs, XF, capas, vf, entrega, crf=20, preset="medium"):
    """Calcula los tramos y su huella, sin codificar nada. capas = [(archivo, t_s)]."""
    p = Plan(); p.B, p.vf, p.entrega, p.crf, p.preset = B, vf, list(entrega), crf, preset
    p.segs = [B + "/segments/" + s for s in segs]
    p.N = [x["n"] for x in XF]; p.D = [x["d"] for x in XF]
    p.L = [n + d for n, d in zip(p.N, p.D)]
    p.F = [0]
    for n in p.N: p.F.append(p.F[-1] + n)
    p.total = p.F[-1]
    p.dir = B + "/tramos"; os.makedirs(p.dir, exist_ok=True)
    with ThreadPoolExecutor(CPU) as ex: H = list(ex.map(huella, p.segs))
    C = []                                     # capas: si una no se puede leer, no entra (el video sale igual)
    for f, t in capas:
        try:
            d = duracion(f)
            if d > 0: C.append((f, t, d, huella(f)))
        except Exception as e: print("capa salteada:", os.path.basename(f), type(e).__name__)
    p.tramos = []
    for A in range(0, p.total, PASO):
        Z = min(A + PASO, p.total); t = Plan(); t.A, t.Z = A, Z
        t.idx = [k for k in range(len(p.N)) if p.F[k] < Z and p.F[k] + p.L[k] > A]
        t.capas = [(f, t0, dc) for f, t0, dc, _ in C if t0 < Z / FPS and t0 + dc > A / FPS]
        cl = [(h, round(t0, 3), round(dc, 3)) for f, t0, dc, h in C if t0 < Z / FPS and t0 + dc > A / FPS]
        t.clave = hashlib.sha1(json.dumps([VERSION, A, Z, [(H[k], p.F[k] - A, p.N[k], p.D[k], p.D[k - 1] if k else 0) for k in t.idx], cl, crf, preset, vf, p.entrega]).encode()).hexdigest()[:20]
        t.mp4 = "%s/%s.mp4" % (p.dir, t.clave)
        p.tramos.append(t)
    p.firma = hashlib.sha1("".join(t.clave for t in p.tramos).encode()).hexdigest()
    p.faltan = [t for t in p.tramos if not (os.path.exists(t.mp4) and os.path.getsize(t.mp4) > 1000)]
    return p


def comando(p, t, sal, con_capas=True):
    ins, fc, prev, base = [], [], "[v0]", p.F[t.idx[0]]
    for j, k in enumerate(t.idx):
        ins += ["-threads", "1", "-i", p.segs[k]]
        fc.append("[%d:v]settb=AVTB,fps=%d,format=yuv420p,setsar=1,tpad=stop_mode=clone:stop=%d,trim=end_frame=%d,setpts=PTS-STARTPTS[v%d]" % (j, FPS, FPS, p.L[k], j))
    for j in range(1, len(t.idx)):
        k = t.idx[j]; d = p.D[k - 1]; o = "[x%d]" % j
        if d > 0: fc.append("%s[v%d]xfade=transition=fade:duration=%.4f:offset=%.4f%s" % (prev, j, d / FPS, (p.F[k] - base) / FPS, o))
        else: fc.append("%s[v%d]concat=n=2:v=1:a=0%s" % (prev, j, o))
        prev = o
    fc.append("%strim=start_frame=%d:end_frame=%d,setpts=PTS-STARTPTS[b]" % (prev, t.A - base, t.Z - base)); prev = "[b]"
    if con_capas:
        for c, (f, t0, _) in enumerate(t.capas):
            n = len(t.idx) + c; ins += ["-i", f]
            desde, demora = max(0.0, t.A / FPS - t0), max(0.0, t0 - t.A / FPS)
            fc.append("[%d:v]format=yuva420p,trim=start=%.4f,setpts=PTS-STARTPTS+%.4f/TB[o%d]" % (n, desde, demora, c))
            fc.append("%s[o%d]overlay=0:0:eof_action=pass:repeatlast=0[c%d]" % (prev, c, c)); prev = "[c%d]" % c
    fc.append("%s%s[fin]" % (prev, p.vf))
    return (["ffmpeg", "-v", "error", "-y", "-nostdin", "-filter_complex_threads", str(HILOS)] + ins + ["-filter_complex", ";".join(fc), "-map", "[fin]",
            "-c:v", "libx264", "-crf", str(p.crf), "-preset", p.preset, "-pix_fmt", "yuv420p", "-r", str(FPS), "-threads", str(HILOS), "-an"]
            + p.entrega + ["-video_track_timescale", "15360", sal])


def paquetes(f):
    """[(pts, es_keyframe)] leyendo el contenedor, sin decodificar."""
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts,flags", "-of", "csv=p=0", f], capture_output=True, text=True)
    S = []
    for l in r.stdout.split():
        a = l.split(",")
        if len(a) >= 2 and a[0].lstrip("-").isdigit(): S.append((int(a[0]), a[1].startswith("K")))
    return sorted(S)


def _uno(p, t):
    tmp = t.mp4 + ".tmp.mp4"
    for con in ([True, False] if t.capas else [False]):       # si una capa rompe el tramo, ese tramo sale sin capas: el video no se cae
        r = subprocess.run(comando(p, t, tmp, con), capture_output=True, text=True, errors="replace")
        if r.returncode == 0 and len(paquetes(tmp)) == t.Z - t.A:
            os.replace(tmp, t.mp4)
            return con or not t.capas
        print("tramo %d: falló%s · %s" % (t.A // PASO, " con capas" if con and t.capas else "", r.stderr[-400:].strip()), flush=True)
    raise RuntimeError("tramo %d no salió" % (t.A // PASO))


def comprobar(f, total):
    """Cuadros justos, tiempos parejos y keyframe exacto cada 2 s en lo que quedó pegado."""
    S = paquetes(f)
    if len(S) != total: raise RuntimeError("cuadros: %d de %d" % (len(S), total))
    pasos = {b[0] - a[0] for a, b in zip(S, S[1:])}
    if len(pasos) != 1: raise RuntimeError("tiempos desparejos: %s" % sorted(pasos)[:6])
    k = [i for i, (_, x) in enumerate(S) if x]
    if k != list(range(0, total, GOP)): raise RuntimeError("keyframes fuera de la grilla: %s" % [x for x in k if x % GOP][:6])


def armar(p, salida):
    global HILOS
    t0 = time.time(); rehechos = len(p.faltan); sin_capas = 0
    if p.faltan:
        if not os.environ.get("ARMADO_HILOS"): HILOS = max(1, CPU // min(PROCS, rehechos))     # un arreglo de pocos tramos usa todos los núcleos
        print("tramos: %d de %d por codificar · %d a la vez" % (rehechos, len(p.tramos), PROCS), flush=True)
        with ThreadPoolExecutor(PROCS) as ex:
            for ok in ex.map(lambda t: _uno(p, t), p.faltan): sin_capas += 0 if ok else 1
    else: print("tramos: todos reusados (%d)" % len(p.tramos), flush=True)
    lst = p.dir + "/lista.txt"
    with open(lst, "w", encoding="utf8") as fh:
        for t in p.tramos: fh.write("file '%s'\nduration %.6f\n" % (t.mp4, (t.Z - t.A) / FPS))
    tmp = salida + ".tmp.mp4"
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-nostdin", "-f", "concat", "-safe", "0", "-i", lst, "-map", "0:v", "-c", "copy", "-an", "-video_track_timescale", "15360", tmp], capture_output=True, text=True, errors="replace")
    if r.returncode: raise RuntimeError("pegado: " + r.stderr[-400:])
    comprobar(tmp, p.total)
    os.replace(tmp, salida)
    vivos = {os.path.basename(t.mp4) for t in p.tramos} | {"lista.txt"}
    for f in os.listdir(p.dir):
        if f not in vivos:
            try: os.remove(os.path.join(p.dir, f))
            except OSError: pass
    print("tramos: %d rehechos de %d en %.0f s%s" % (rehechos, len(p.tramos), time.time() - t0, " · %d sin capas" % sin_capas if sin_capas else ""), flush=True)
    return rehechos
