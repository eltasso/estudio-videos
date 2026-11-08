# Hoja de contacto SIN texto (ffmpeg en Windows suele no tener fontconfig: drawtext revienta).
#   python <APP>/tools/hoja.py <salida.jpg> <img_o_video> [<img_o_video> …]   (hasta 12, grilla 4x3)
# Acepta fotos y videos (de un video toma el cuadro del medio). Después mirala con Read.
import os, subprocess, sys, tempfile

out, items = sys.argv[1], sys.argv[2:14]
if not items: sys.exit("uso: hoja.py salida.jpg img1 img2 …")
tmp = tempfile.mkdtemp(); frames = []
for i, f in enumerate(items):
    if not os.path.exists(f): print("no existe:", f); continue
    o = os.path.join(tmp, f"{i:02d}.jpg")
    if f.lower().endswith((".mp4", ".mov", ".webm", ".mkv")):
        d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip() or "1"
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(float(d) / 2), "-i", f, "-frames:v", "1"]
    else: cmd = ["ffmpeg", "-v", "error", "-y", "-i", f]
    subprocess.run(cmd + ["-vf", "scale=480:270:force_original_aspect_ratio=increase,crop=480:270", "-q:v", "3", o], check=True)
    frames.append(o)
if not frames: sys.exit("ninguna imagen existe")
n = len(frames); cols = 4 if n > 4 else n; rows = (n + cols - 1) // cols
ins, lay = [], []
for i, f in enumerate(frames): ins += ["-i", f]; lay.append(f"{(i % cols) * 480}_{(i // cols) * 270}")
fc = "".join(f"[{i}:v]" for i in range(n)) + f"xstack=inputs={n}:layout={'|'.join(lay)}:fill=black[o]" if n > 1 else "[0:v]null[o]"
subprocess.run(["ffmpeg", "-v", "error", "-y"] + ins + ["-filter_complex", fc, "-map", "[o]", "-q:v", "3", out], check=True)
print("hoja:", out, f"({n} cuadros, {cols}x{rows})")
