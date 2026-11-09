# -*- coding: utf-8 -*-
"""HERRAMIENTA DEL ESTUDIO (no la copies ni la edites): python <APP>/tools/render.py <carpeta_del_video> [--limit N]
Lee <carpeta>/shots_timed.json  = [{"id":"b01_gancho","startMs":0,"endMs":3200}, ...]  (id = nombre sin extensión de una foto o clip en fotos/, clips/ o avatar/frames/)
     <carpeta>/avatar_ranges.json = [{"file":"avatar/A1.mp4","frame":"avatar/frames/a1.jpg","startMs":3200,"endMs":8900}, ...]  (opcional)
        El mismo clip puede ir en PEDAZOS (A1 de 3,2 a 6,0 s, foto, A1 de 8,5 a 11 s): cada pedazo arranca en su punto del clip
        y el lipsync no se corre. Si el clip no empieza en el primer pedazo, poné "clipStartMs" (dónde empieza el clip en la voz).
        PANTALLA PARTIDA: agregá "foto":"<id>" y "lado":"izq"|"der" → el avatar ocupa esa mitad (encuadrado en la cara)
        y la foto la otra mitad, con movimiento. Sirve para tramos de avatar más largos sin que se vuelva estático.
     <carpeta>/voz/master.wav (mide la duración sola).
Si un clip de avatar todavía no existe usa su "frame" como foto fija con el cartel «Esperando avatar» (si falta una imagen, «Esperando imagen»); cuando el clip llega, volvé a correr: SOLO se rehacen los segmentos cuya fuente cambió.
Escribe plan.json (para el panel y validar.py) + segments/NNNN.mp4 + segments/xf.json (fundidos avatar 0,6 s / foto 0,3 s). Después: python <APP>/tools/assemble.py <carpeta>."""
import json, os, re, sys, subprocess, shutil, time
from concurrent.futures import ThreadPoolExecutor

B = (sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else os.getcwd()).replace("\\", "/").rstrip("/")
FPS = 30
W, H = 1920, 1080
SW, SH = 3840, 2160
# la duracion del master se mide, no se escribe a mano (en mk02ds estaba fija: se desincronizaba)
AUDIO_MS = round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                      "-of", "csv=p=0", B + "/voz/master.wav"],
                                     capture_output=True, text=True).stdout.strip() or 0) * 1000)
SAT = "eq=saturation=0.92"   # un toque menos de saturación = más real

shots = json.load(open(B + "/shots_timed.json", encoding="utf-8"))
ranges = []
rp = B + "/avatar_ranges.json"
if os.path.exists(rp):
    ranges = json.load(open(rp, encoding="utf-8"))

def esp(origen, texto, tipo, clave):
    """Lo que todavía no llegó se muestra con un cartel elegante. Es sólo vista previa: validar.py no deja entregarlo."""
    try:
        import espera
        return espera.cartel(origen, texto, espera.ruta(B, tipo, clave))
    except Exception as e:
        print("cartel de espera no disponible:", e)
        return origen

def img_for(sid):
    for d in ("fotos", "clips", "avatar/frames", "avatar"):
        for ext in (".jpg", ".jpeg", ".png", ".webp", ".mp4"):
            p = "%s/%s/%s%s" % (B, d, sid, ext)
            if os.path.exists(p):
                return p
    return None

# construir lista de clips: (path, t0_ms, t1_ms, is_video)
clips = []
for s in shots:
    p = img_for(s["id"])
    if not p:
        print("FALTA IMG", s["id"], "-> va el cartel de espera")
        q = esp(None, "Esperando imagen", "foto", "imagen")
        if q: clips.append([q, s["startMs"], s["endMs"], False])
        continue
    clips.append([p, s["startMs"], s["endMs"], p.endswith(".mp4")])

# EDICIÓN EXTREMA (opcional): extrema/manifest.json = [{"mp4":"extrema/xm03.mp4","startMs":..,"endMs":..}]
# Cada pieza tapa la línea de fotos/clips en su tramo. Nunca pisa un tramo de avatar; si falta el mp4 queda el b-roll normal.
# Las piezas se hacen en segundo plano mientras llega el avatar (extrema/EN_CURSO). En el armado final (todos los clips de
# avatar ya están) se esperan como mucho 10 min; si no llegan, el video sale sin ellas: nunca se traba.
def _xm_en_curso():
    try: return time.time() - os.path.getmtime(B + "/extrema/EN_CURSO") < 100 * 60     # más viejo = quedó colgado: no se espera
    except OSError: return False
if "--limit" not in sys.argv and _xm_en_curso() and all(os.path.exists(B + "/" + r["file"]) for r in ranges if r.get("file")):
    _t0 = time.time(); print("extrema: esperando las piezas (máx. 10 min)", flush=True)
    while _xm_en_curso() and time.time() - _t0 < 600: time.sleep(10)
    print("extrema: %s tras %d s" % ("llegaron" if not _xm_en_curso() else "no llegaron, va sin ellas", time.time() - _t0), flush=True)
try:
    _xm = json.load(open(B + "/extrema/manifest.json", encoding="utf-8")) if os.path.exists(B + "/extrema/manifest.json") else []
except Exception as e:
    print("extrema: manifest ilegible ->", e); _xm = []
_XR = []
for x in _xm:
    try:
        f = B + "/" + x["mp4"]; a, b = int(x["startMs"]), int(x["endMs"])
        if not (os.path.exists(f) and os.path.getsize(f) > 50000) or b - a < 700: continue
        if any(not (b <= r["startMs"] or a >= r["endMs"]) for r in ranges): print("extrema: pisa al avatar, va b-roll ->", x["mp4"]); continue
        if any(not (b <= u[1] or a >= u[2]) for u in _XR): continue
        _XR.append([f, a, b])
    except Exception as e: print("extrema: pieza salteada ->", e)
if _XR:
    _nc = []
    for p, a, b, isv in clips:
        segs = [(a, b)]
        for _f, ra, rb in _XR:
            segs = [s2 for x, y in segs for s2 in (((x, y),) if (y <= ra or x >= rb) else tuple(t for t in ((x, ra), (rb, y)) if t[1] - t[0] > 0))]
        segs = [t for t in segs if t[1] - t[0] >= 400]
        _vis = lambda t: (t[1] - t[0]) - sum(max(0, min(t[1], r["endMs"]) - max(t[0], r["startMs"])) for r in ranges)
        if len(segs) > 1: segs = [max(segs, key=_vis)]       # la pieza partió la foto: queda el pedazo que más se ve, la foto no vuelve
        _nc += [[p, x, y, isv] for x, y in segs]
    clips = _nc + [[f, a, b, True] for f, a, b in _XR]
    clips.sort(key=lambda c: c[1])
    print("extrema: %d piezas en la línea" % len(_XR))

# recortar contra los tramos de avatar
out = []
for c in clips:
    p, a, b, isv = c
    if not isv or "/clips/" in p:   # los clips de stock se recortan contra el avatar igual que una foto
        segs = [(a, b)]
        for r in ranges:
            ra, rb = r["startMs"], r["endMs"]
            ns = []
            for x, y in segs:
                if y <= ra or x >= rb:
                    ns.append((x, y))
                else:
                    if x < ra: ns.append((x, ra))
                    if y > rb: ns.append((rb, y))
            segs = ns
        for x, y in segs:
            if y - x >= 500:
                out.append([p, x, y, isv])
    else:
        out.append(c)

def absp(f): return f if (":" in f or f.startswith("/")) else B + "/" + f
# un mismo clip puede ir en pedazos (intro partida en tramos ≤ 6 s con fotos entre medio):
# cada pedazo arranca en (startMs - clipStartMs) dentro del clip, así el lipsync sigue a la voz.
# clipStartMs = dónde empieza ese clip en la voz; si no se da, el startMs más chico de ese archivo.
OFF = {}
SPL = {}   # (archivo, startMs) -> {"foto": ruta, "lado": "izq"|"der"}
try: CARA_CX = float(json.load(open(B + "/refs/canal.json", encoding="utf-8")).get("cara_cx") or 0.5)
except Exception: CARA_CX = 0.5
_c0 = {}
for r in ranges: _c0[r["file"]] = min(_c0.get(r["file"], 1e12), r.get("clipStartMs", r["startMs"]))
for r in ranges:
    f = absp(r["file"])
    if os.path.exists(f) and os.path.getsize(f) > 100000:
        out.append([f, r["startMs"], r["endMs"], True])
        OFF[(f, r["startMs"])] = max(0, r["startMs"] - r.get("clipStartMs", _c0[r["file"]])) / 1000
        if r.get("foto"):
            fp = img_for(r["foto"])
            if fp and not fp.endswith(".mp4"): SPL[(f, r["startMs"])] = {"foto": fp, "lado": "der" if r.get("lado") == "der" else "izq"}
            else: print("PANTALLA PARTIDA: falta la foto", r["foto"], "-> ese tramo va con el avatar entero")
    elif r.get("frame") and os.path.exists(absp(r["frame"])):
        print("AVATAR PENDIENTE (va su cuadro fijo con el cartel de espera):", r["file"])
        out.append([esp(absp(r["frame"]), "Esperando avatar", "avatar", r["frame"]), r["startMs"], r["endMs"], False])
    else:
        print("FALTA AVATAR y su frame:", r["file"], "-> va el cartel de espera")
        q = esp(None, "Esperando avatar", "avatar", "sin_cuadro")
        if q: out.append([q, r["startMs"], r["endMs"], False])
out.sort(key=lambda c: c[1])
# Sin huecos en la línea de tiempo, con o sin Edición extrema: los planos se pegan uno tras otro, así que un hueco (las piezas, o el
# recorte de foto < 0,5 s que se descarta arriba) adelanta TODO lo que viene después y los labios se desfasan de la voz.
# Los tapa la foto vecina; si no hay, la pieza se queda quieta en su último cuadro (≤ 1,5 s). El arranque de un video no se mueve (lipsync).
if out and out[0][1] > 0 and not out[0][3]: out[0][1] = 0
for i in range(len(out) - 1):
    c, d = out[i], out[i + 1]
    if d[1] - c[2] <= 0: continue
    if not c[3]: c[2] = d[1]
    elif not d[3]: d[1] = c[2]
    elif "/extrema/" in c[0] and d[1] - c[2] <= 1500: c[2] = d[1]
    elif d[1] - c[2] <= 800: c[2] = d[1]                 # avatar que sigue un instante más (su clip continúa o queda quieto)
    else: print("⚠ HUECO sin tapar entre dos videos en", c[2], "ms: el video se va a adelantar", d[1] - c[2], "ms")
# plan.json (lo dibuja el panel y lo revisa validar.py) sale de acá: nunca lo escribas a mano aparte
def kind(p, isv):
    q = p.replace("\\", "/")
    return "av" if "/avatar/" in q else ("clip" if isv else "foto")
json.dump({"voice_dur": round(AUDIO_MS / 1000, 3),
           "segments": [dict({"kind": kind(p, v), "t0": round(a / 1000, 3), "t1": round(b / 1000, 3), "file": p}, **({"split": True} if (p, a) in SPL else {})) for p, a, b, v in out]},
          open(B + "/plan.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# frames exactos por limites acumulados
total_frames = round(AUDIO_MS / 1000 * FPS)
plan = []; OFFS = []; SPLS = []
for i, (p, a, b, isv) in enumerate(out):
    f0 = round(a / 1000 * FPS)
    f1 = round(b / 1000 * FPS)
    n = max(2, f1 - f0)
    plan.append([p, n, isv]); OFFS.append(OFF.get((p, a), 0) if isv else 0); SPLS.append(SPL.get((p, a)) if isv else None)
XF_AV, XF_FOTO = 18, 9          # cuadros de fundido: avatar<->fotos 0.6 s, foto<->foto 0.3 s
for i in range(len(plan)):
    if i == len(plan) - 1: plan[i].append(0); continue
    _ea = lambda k: "/avatar/" in plan[k][0].replace("\\", "/") or (plan[k][2] and "/clips/" not in plan[k][0])   # un clip de stock funde corto, como una foto
    av = _ea(i) or _ea(i + 1)
    xm = "/extrema/" in plan[i][0].replace("\\", "/") or "/extrema/" in plan[i + 1][0].replace("\\", "/")   # la pieza de edición extrema entra con corte corto: la 1ª palabra no queda tapada
    plan[i].append(XF_FOTO if xm and "/avatar/" not in plan[i][0] + plan[i + 1][0] else (XF_AV if av else XF_FOTO))
os.makedirs(B + "/segments", exist_ok=True)
json.dump([{"n": x[1], "d": x[3]} for x in plan], open(B + "/segments/xf.json", "w"))
print("clips=%d frames=%d (%.2fs)" % (len(plan), sum(x[1] for x in plan), sum(x[1] for x in plan) / FPS))

SEG = B + "/segments"
os.makedirs(SEG, exist_ok=True)

import random
MOVES = ["in", "out", "izq", "der", "arriba", "abajo", "diag_in", "diag_out"]
_MOT = {}
def plan_motion():
    """Movimiento al azar por foto (sin patron): tipo, intensidad y punto de foco distintos,
    nunca el mismo tipo dos veces seguidas. Semilla fija = re-render identico."""
    rng = random.Random(20261106); prev = None
    for i, (p, n, isv, *_) in enumerate(plan):   # se sortea también para los videos: así un avatar que llega no corre el resto
        t = rng.choice([m for m in MOVES if m != prev]); prev = t
        _MOT[i] = dict(t=t, A=rng.uniform(0.05, 0.13), Z=rng.uniform(1.07, 1.14),
                       cx=rng.uniform(0.3, 0.7), cy=rng.uniform(0.3, 0.65),
                       a=rng.uniform(0.0, 0.3), b=rng.uniform(0.7, 1.0))

def motion(idx, n):
    m = _MOT[idx]; N = max(1, n - 1)
    e = "(0.5-0.5*cos(PI*on/%d))" % N          # arranque y frenada suaves
    A, Z, cx, cy, a, b = m["A"], m["Z"], m["cx"], m["cy"], m["a"], m["b"]
    t = m["t"]
    if t in ("in", "diag_in"):  z = "1+%.4f*%s" % (A, e)
    elif t in ("out", "diag_out"): z = "1+%.4f*(1-%s)" % (A, e)
    else: z = "%.4f" % Z
    X = "(iw-iw/zoom)*%.3f" % cx; Y = "(ih-ih/zoom)*%.3f" % cy
    if t == "izq": X = "(iw-iw/zoom)*(%.3f-%.3f*%s)" % (b, b - a, e)
    if t == "der": X = "(iw-iw/zoom)*(%.3f+%.3f*%s)" % (a, b - a, e)
    if t == "arriba": Y = "(ih-ih/zoom)*(%.3f-%.3f*%s)" % (b, b - a, e)
    if t == "abajo": Y = "(ih-ih/zoom)*(%.3f+%.3f*%s)" % (a, b - a, e)
    if t.startswith("diag"):
        d = 1 if cx < 0.5 else -1
        X = "(iw-iw/zoom)*(%.3f+%.3f*%s)" % (cx, d * 0.25, e)
    return "z='%s':x='%s':y='%s'" % (z, X, Y)

def build(i):
    p, n0, isv, D = plan[i]
    n = n0 + D                      # cola para el fundido con el siguiente
    dst = "%s/%04d.mp4" % (SEG, i)
    sp = SPLS[i]
    _ver = lambda f: "%d:%d" % (os.path.getsize(f), int(os.path.getmtime(f)))   # si rehacés una foto con el mismo nombre, el segmento se rehace
    firma = "%s|%d|%d|%.3f|%s|%s|%s" % (p, n, int(isv), OFFS[i], "" if isv and not sp else json.dumps(_MOT.get(i), sort_keys=True), json.dumps(sp, sort_keys=True) if sp else "", _ver(p) + ("," + _ver(sp["foto"]) if sp else ""))
    if os.path.exists(dst) and os.path.exists(dst + ".src") and open(dst + ".src", encoding="utf-8").read() == firma:
        return i, 0
    if sp:   # avatar en una mitad (encuadrado en la cara) + foto con movimiento en la otra, con una línea fina en el medio
        HW = W // 2
        fc = ("[0:v]scale=-2:%d,fps=%d,tpad=stop_mode=clone:stop_duration=2,trim=duration=%.3f,setpts=PTS-STARTPTS,"
              "crop=%d:%d:'max(0,min(iw-%d,iw*%.3f-%d))':0,%s[a];"
              "[1:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,zoompan=%s:d=%d:s=%dx%d:fps=%d,%s[f];"
              "%s hstack=inputs=2,drawbox=x=%d:y=0:w=4:h=ih:color=white@0.85:t=fill,format=yuv420p,setsar=1") % (
              H, FPS, n / FPS, HW, H, HW, CARA_CX, HW // 2, SAT,
              SH // 2, SH, SH // 2, SH, motion(i, n), n, HW, H, FPS, SAT,
              "[a][f]" if sp["lado"] == "izq" else "[f][a]", HW - 2)
        cmd = ["ffmpeg", "-v", "error", "-y"] + (["-ss", "%.3f" % OFFS[i]] if OFFS[i] else []) + ["-i", p, "-loop", "1", "-i", sp["foto"],
               "-filter_complex", fc, "-frames:v", str(n), "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", dst]
    elif isv:
        vf = ("scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,fps=%d,tpad=stop_mode=clone:stop_duration=2,"
              "trim=duration=%.3f,setpts=PTS-STARTPTS,%s,format=yuv420p,setsar=1") % (
              W, H, W, H, FPS, n / FPS, SAT)
        cmd = ["ffmpeg", "-v", "error", "-y"] + (["-ss", "%.3f" % OFFS[i]] if OFFS[i] else []) + ["-i", p, "-vf", vf, "-frames:v", str(n),
               "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", dst]
    else:
        vf = ("scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,"
              "zoompan=%s:d=%d:s=%dx%d:fps=%d,%s,format=yuv420p,setsar=1") % (
              SW, SH, SW, SH, motion(i, n), n, W, H, FPS, SAT)
        cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", p, "-vf", vf,
               "-frames:v", str(n), "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", dst]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return i, "ERR " + r.stderr[-300:]
    open(dst + ".src", "w", encoding="utf-8").write(firma)
    return i, 0

plan_motion()
for f in os.listdir(SEG):            # segmentos sobrantes de un plan anterior más largo
    m = re.match(r"(\d{4})\.mp4(\.src)?$", f)
    if m and int(m.group(1)) >= len(plan): os.remove(os.path.join(SEG, f))
limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else len(plan)
with ThreadPoolExecutor(max_workers=int(os.environ.get("RENDER_WORKERS") or 6)) as ex:
    for i, err in ex.map(build, range(limit)):
        if err:
            print("seg", i, err)
print("hechos", min(limit, len(plan)))
