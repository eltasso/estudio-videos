# -*- coding: utf-8 -*-
"""HERRAMIENTA DEL ESTUDIO (no la copies ni la edites): python <APP>/tools/assemble.py <carpeta_del_video>
Une segments/ (con los fundidos de xf.json) + voz/master.wav + SFX de cues.json -> final.mp4 (1920x1080 30fps, audio ESTÉREO AAC 192k).
cues.json = [{"file":"tela.mp3","t":171100,"gain":0.07,"fade":0.4}, ...]  (archivos en <carpeta>/sfx/; t en ms; gain 0.035-0.08 = -29 a -22 dB)."""
import atexit, fcntl, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import etapas

B = (sys.argv[1] if len(sys.argv) > 1 else os.getcwd()).replace("\\", "/").rstrip("/")
SFXDIR = B + "/sfx"
VOZ = B + "/voz/master.wav"
FINAL = B + "/final.mp4"
EST = B + "/gates/armado.json"
os.makedirs(B + "/gates", exist_ok=True)
_LOCK = open(B + "/gates/.armado.lock", "a"); fcntl.flock(_LOCK, fcntl.LOCK_EX)     # de a uno: el segundo que entra encuentra todo hecho
etapas.marca(B, "armado", "ini"); atexit.register(lambda: etapas.marca(B, "armado", "fin"))

# (archivo, t_ms, ganancia, fade_out_s)   -18 a -24 dB bajo la voz
# los cues salen de cues.json (cada video los suyos); sin archivo = sin SFX
CUES = [(c["file"], c["t"], c["gain"], c["fade"]) for c in
        json.load(open(B + "/cues.json", encoding="utf-8"))] if os.path.exists(B + "/cues.json") else []
for _c in [c for c in CUES if not os.path.exists(SFXDIR + "/" + c[0])]: print("falta el SFX", _c[0], "(va sin él)")
CUES = [c for c in CUES if os.path.exists(SFXDIR + "/" + c[0])]

def run(cmd, fatal=True, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FALLO:", " ".join(cmd)[:400])
        print(r.stderr[-1500:])
        if fatal: sys.exit(1)
    return r

def leer_capas():
    """Edición extrema: componentes con transparencia que van encima de lo que hay en pantalla (extrema/capas.json)."""
    try: L = json.load(open(B + "/extrema/capas.json", encoding="utf-8"))
    except Exception: return []
    out = []
    for c in L if isinstance(L, list) else []:
        try:
            m = str(c["mov"]); t = float(c["startMs"]) / 1000
            if re.fullmatch(r"extrema/xm\d+\.mov", m) and t >= 0 and os.path.getsize(B + "/" + m) > 10000: out.append((B + "/" + m, t))
        except (KeyError, TypeError, ValueError, OSError): pass
    return out[:12]

segs = sorted(f for f in os.listdir(B + "/segments") if re.match(r"\d{4}\.mp4$", f))
video = B + "/video_noaudio.mp4"
XF = json.load(open(B + "/segments/xf.json")) if os.path.exists(B + "/segments/xf.json") else None
if XF: segs = segs[:len(XF)]
print("segmentos:", len(segs))

ENTREGA = ["-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-g", "60", "-keyint_min", "60",
           "-sc_threshold", "0", "-maxrate", "5M", "-bufsize", "10M"]   # listo para YouTube: bt709, rango tv, keyframe cada 2 s
VF_ENTREGA = "scale=out_color_matrix=bt709:out_range=limited,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"

def xfade_chain(files, ns, ds, out, crf, entrega=False, capas=()):
    """Une con fundidos sin correr los tiempos: cada archivo trae ds[k] cuadros de cola extra."""
    ins, fc, prev, t = [], [], "[v0]", 0
    for k, f in enumerate(files):
        ins += ["-i", f]; fc.append("[%d:v]settb=AVTB,fps=30,format=yuv420p,setsar=1[v%d]" % (k, k))
    for k in range(1, len(files)):
        t += ns[k - 1]; d = ds[k - 1]
        o = "[x%d]" % k
        if d > 0: fc.append("%s[v%d]xfade=transition=fade:duration=%.4f:offset=%.4f%s" % (prev, k, d / 30, t / 30, o))
        else: fc.append("%s[v%d]concat=n=2:v=1:a=0%s" % (prev, k, o))
        prev = o
    if len(files) == 1: prev = "[v0]"
    for k, (f, t) in enumerate(capas):      # van en esta misma pasada: el video no se codifica una vez más
        n = len(files) + k; ins += ["-i", f]
        fc.append("[%d:v]format=yuva420p,setpts=PTS-STARTPTS+%.3f/TB[o%d]" % (n, t, k))
        fc.append("%s[o%d]overlay=0:0:eof_action=pass:repeatlast=0[c%d]" % (prev, k, k)); prev = "[c%d]" % k
    if entrega: fc.append("%s%s[fin]" % (prev, VF_ENTREGA)); prev = "[fin]"
    return run(["ffmpeg", "-v", "error", "-y"] + ins + ["-filter_complex", ";".join(fc), "-map", prev,
         "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast" if crf < 20 else "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"] + (ENTREGA if entrega else []) + [out], fatal=not capas).returncode == 0

def _jl(p, d=None):
    try: return json.load(open(p, encoding="utf-8"))
    except Exception: return d

def firma_audio():
    h = [open(VOZ, "rb").read(1 << 16), os.path.getsize(VOZ), repr(CUES)] + [(c[0], os.path.getsize(SFXDIR + "/" + c[0])) for c in CUES]
    return hashlib.sha1(repr(h).encode("utf8", "ignore")).hexdigest()

def compuerta(est):
    """Un final ya revisado no se rearma por iniciativa propia: si pasó, queda; si marcó fallas, se corrige UNA vez."""
    if os.environ.get("ARMADO_EXTREMA") or not os.path.exists(FINAL): return
    rev = _jl(B + "/gates/revisor_final.json") or {}
    if os.path.exists(B + "/gates/pedido_usuario"):       # lo pidió el usuario desde el panel: ahí sí
        os.remove(B + "/gates/pedido_usuario"); est["correcciones"] = 0
    elif est.get("correcciones", 0) >= 1:                 # vale también si el final cambió desde la revisión: la pasada ya se hizo
        print("⛔ ya se hizo la pasada de correcciones (máximo 1): no se rearma. Anotá lo que falte en REPORTE.md y terminá."); sys.exit(0)
    elif abs(os.path.getmtime(FINAL) - float(rev.get("final_mtime") or 0)) > 2: return
    elif not rev.get("malas"):
        print("✓ este final ya pasó el control: no se rearma. Seguí con meta.json y REPORTE.md y terminá."); sys.exit(0)
    est["correcciones"] = est.get("correcciones", 0) + 1

FIRMA, ESTADO = None, _jl(EST, {}) or {}
if XF and len(XF) == len(segs):
    import tramos
    CAPAS = leer_capas()
    if CAPAS: print("capas de edición extrema:", len(CAPAS))
    P = None
    try: P = tramos.planificar(B, segs, XF, CAPAS, VF_ENTREGA, ENTREGA)
    except Exception as e: print("no pude planificar los tramos (%s): va el armado completo" % type(e).__name__)
    if P:
        FIRMA = hashlib.sha1((P.firma + firma_audio()).encode()).hexdigest()
        if os.path.exists(FINAL) and ESTADO.get("firma") == FIRMA:
            print("✓ sin cambios: final.mp4 ya está al día."); sys.exit(0)
    compuerta(ESTADO)
    hecho = False
    if P:
        try: tramos.armar(P, video); hecho = True
        except Exception as e: print("el armado por tramos falló (%s): va el armado completo" % str(e)[:300], flush=True)
    if not hecho:
        TMP = B + "/xf_tmp"; os.makedirs(TMP, exist_ok=True)
        G = 25; chunks, cn, cd = [], [], []
        for c in range(0, len(segs), G):
            idx = list(range(c, min(c + G, len(segs))))
            out = "%s/c%03d.mp4" % (TMP, c // G)
            xfade_chain([B + "/segments/" + segs[i] for i in idx], [XF[i]["n"] for i in idx], [XF[i]["d"] for i in idx], out, 14)
            chunks.append(out); cn.append(sum(XF[i]["n"] for i in idx)); cd.append(XF[idx[-1]]["d"])
            print("tramo", len(chunks), "listo")
        if not CAPAS or not xfade_chain(chunks, cn, cd, video, 20, entrega=True, capas=CAPAS):     # si las capas fallan, el video sale igual sin ellas
            if CAPAS: print("las capas fallaron: va sin ellas")
            xfade_chain(chunks, cn, cd, video, 20, entrega=True)
else:
    print("sin xf.json: corte seco")
    lst = B + "/concat.txt"
    with open(lst, "w", encoding="utf-8") as fh:
        for f in segs:
            fh.write("file '%s/segments/%s'\n" % (B, f))
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
         "-vf", VF_ENTREGA, "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p",
         "-r", "30", "-an"] + ENTREGA + [video])

# mezcla de audio
inputs = ["-i", VOZ]
for f, t, g, fo in CUES:
    inputs += ["-i", SFXDIR + "/" + f]
def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip())

audio = B + "/audio_mix.m4a"
VOZ_ESTEREO = "pan=stereo|c0=c0|c1=c0"   # la voz va igual a los dos canales (con -ac 2 bajaba 3 dB)
if not CUES:
    # sin SFX: la voz sola (amix con 1 entrada no es válido en ffmpeg)
    run(["ffmpeg", "-v", "error", "-y", "-i", VOZ, "-af", VOZ_ESTEREO, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", audio])
else:
    parts = []
    for i, (f, t, g, fo) in enumerate(CUES, start=1):
        d = min(dur(SFXDIR + "/" + f), 20.0)
        parts.append("[%d:a]aformat=channel_layouts=stereo,volume=%.4f,atrim=0:%.2f,afade=t=out:st=%.2f:d=%.2f,adelay=%d|%d[a%d]"
                     % (i, g, d, max(0.0, d - fo), fo, t, t, i))
    mix = "".join("[a%d]" % i for i in range(1, len(CUES) + 1))
    fc = ";".join(parts) + ";[0:a]" + VOZ_ESTEREO + "[voz];[voz]" + mix + ("amix=inputs=%d:normalize=0:duration=first[out]" % (len(CUES) + 1))
    run(["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex", fc.strip(";"),
         "-map", "[out]", "-ac", "2", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", audio])

final = FINAL
_tmp = B + "/final.tmp.mp4"                # se escribe al lado y se reemplaza de una: si algo corta el armado, el final anterior sigue sano
run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", audio,
     "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy",
     "-movflags", "+faststart", _tmp])
os.replace(_tmp, final)
if FIRMA:
    ESTADO["firma"] = FIRMA; os.makedirs(B + "/gates", exist_ok=True)
    json.dump(ESTADO, open(EST, "w", encoding="utf-8"))
d = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).stdout.strip()
print("final:", final, d, "s")
