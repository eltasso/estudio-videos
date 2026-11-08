# -*- coding: utf-8 -*-
"""HERRAMIENTA DEL ESTUDIO (no la copies ni la edites): python <APP>/tools/assemble.py <carpeta_del_video>
Une segments/ (con los fundidos de xf.json) + voz/master.wav + SFX de cues.json -> final.mp4 (1920x1080 30fps, audio ESTÉREO AAC 192k).
cues.json = [{"file":"tela.mp3","t":171100,"gain":0.07,"fade":0.4}, ...]  (archivos en <carpeta>/sfx/; t en ms; gain 0.035-0.08 = -29 a -22 dB)."""
import json, os, re, subprocess, sys

B = (sys.argv[1] if len(sys.argv) > 1 else os.getcwd()).replace("\\", "/").rstrip("/")
SFXDIR = B + "/sfx"
VOZ = B + "/voz/master.wav"

# (archivo, t_ms, ganancia, fade_out_s)   -18 a -24 dB bajo la voz
# los cues salen de cues.json (cada video los suyos); sin archivo = sin SFX
CUES = [(c["file"], c["t"], c["gain"], c["fade"]) for c in
        json.load(open(B + "/cues.json", encoding="utf-8"))] if os.path.exists(B + "/cues.json") else []
for _c in [c for c in CUES if not os.path.exists(SFXDIR + "/" + c[0])]: print("falta el SFX", _c[0], "(va sin él)")
CUES = [c for c in CUES if os.path.exists(SFXDIR + "/" + c[0])]

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FALLO:", " ".join(cmd)[:400])
        print(r.stderr[-1500:])
        sys.exit(1)
    return r

segs = sorted(f for f in os.listdir(B + "/segments") if re.match(r"\d{4}\.mp4$", f))
video = B + "/video_noaudio.mp4"
XF = json.load(open(B + "/segments/xf.json")) if os.path.exists(B + "/segments/xf.json") else None
if XF: segs = segs[:len(XF)]
print("segmentos:", len(segs))

ENTREGA = ["-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-g", "60", "-keyint_min", "60",
           "-sc_threshold", "0", "-maxrate", "5M", "-bufsize", "10M"]   # listo para YouTube: bt709, rango tv, keyframe cada 2 s
VF_ENTREGA = "scale=out_color_matrix=bt709:out_range=limited,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709"

def xfade_chain(files, ns, ds, out, crf, entrega=False):
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
    if entrega: fc.append("%s%s[fin]" % (prev, VF_ENTREGA)); prev = "[fin]"
    run(["ffmpeg", "-v", "error", "-y"] + ins + ["-filter_complex", ";".join(fc), "-map", prev,
         "-c:v", "libx264", "-crf", str(crf), "-preset", "veryfast" if crf < 20 else "medium", "-pix_fmt", "yuv420p", "-r", "30", "-an"] + (ENTREGA if entrega else []) + [out])

if XF and len(XF) == len(segs):
    TMP = B + "/xf_tmp"; os.makedirs(TMP, exist_ok=True)
    G = 25; chunks, cn, cd = [], [], []
    for c in range(0, len(segs), G):
        idx = list(range(c, min(c + G, len(segs))))
        out = "%s/c%03d.mp4" % (TMP, c // G)
        xfade_chain([B + "/segments/" + segs[i] for i in idx], [XF[i]["n"] for i in idx], [XF[i]["d"] for i in idx], out, 14)
        chunks.append(out); cn.append(sum(XF[i]["n"] for i in idx)); cd.append(XF[idx[-1]]["d"])
        print("tramo", len(chunks), "listo")
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

final = B + "/final.mp4"
run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", audio,
     "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy",
     "-movflags", "+faststart", final])
d = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).stdout.strip()
print("final:", final, d, "s")
