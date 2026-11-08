# -*- coding: utf-8 -*-
"""Avatar con InfiniteTalk (RunPod), UNA sola llamada por video (US$0,25 aprox.).
   python <APP>/tools/avatar_it.py <carpeta_del_video> > <carpeta>/avatar/it.log 2>&1        (en segundo plano)

Lee <carpeta>/avatar_ranges.json (TODAS las ventanas donde se ve el avatar, plan CERRADO), voz/master.wav y la foto del
presentador refs/avatar.png (máxima resolución, mirando a cámara).
1. Concatena el audio de todas las ventanas en un solo reel (≤ 590 s) y hace UN solo /run.
2. RunPod necesita URLs: sube cara + audio un rato a un repo PÚBLICO de tu GitHub (config "avatar_repo") y los BORRA al terminar.
3. Corta cada ventana del reel MIDIENDO dónde quedó (correlación de audio), corrige el desfase y escribe avatar/A0.mp4, A1.mp4…
⛔ 1 sola llamada por video: si avatar/it_llamada.json dice "ok" o "corriendo", se niega. Un FAILED no cobra: ahí sí se puede repetir.
   Si cambiás ventanas después de la llamada, las nuevas van con FOTO (sacalas de avatar_ranges.json)."""
import base64, json, os, subprocess, sys, time, urllib.request, urllib.error
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
O = f"{B}/avatar/it"; os.makedirs(O, exist_ok=True)
LED = f"{B}/avatar/it_llamada.json"
SR = 8000; PAD = 0.3; TOPE = 590.0
EP = "https://api.runpod.ai/v2/infinitetalk"


def sale(msg, code=1): print(msg, flush=True); sys.exit(code)
def jload(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d
def log(*a): print(time.strftime("%H:%M:%S"), *a, flush=True)


led = jload(LED, {}) or {}
if led.get("estado") in ("ok", "corriendo"):
    sale(f"⛔ Este video YA tuvo su llamada a InfiniteTalk ({led.get('estado')}, {led.get('t')}). 1 sola por video: "
         "si cambiaste ventanas, las nuevas van con FOTO (sacalas de avatar_ranges.json).")
R = jload(f"{B}/avatar_ranges.json")
if not R: sale("⛔ falta avatar_ranges.json (el plan de ventanas tiene que estar CERRADO antes de llamar)")
R = sorted(R, key=lambda r: r["startMs"])
for a, b in zip(R, R[1:]):
    if b["startMs"] < a["endMs"]: sale(f"⛔ ventanas superpuestas: {a['file']} y {b['file']}")
total = sum((r["endMs"] - r["startMs"]) / 1000 + PAD for r in R)
if total > TOPE: sale(f"⛔ {total:.0f} s de avatar: el reel se corta en ~600 s. Bajá ventanas hasta ≤ {TOPE:.0f} s (lo que sobra va con foto).")
FOTO = f"{B}/refs/avatar.png"
if not os.path.exists(FOTO): sale("⛔ falta refs/avatar.png (la foto del presentador)")

# ── audio del reel: las ventanas una detrás de otra
segs, cortes, t = [], [], 0.0
for r in R:
    a, b = r["startMs"] / 1000, r["endMs"] / 1000 + PAD
    segs.append((a, b)); cortes.append({"file": r["file"], "ms": a, "nom": round(t, 3), "dur": round(b - a, 3)}); t += b - a
if t < 21: a = segs[-1][1]; segs.append((a, a + 21 - t)); t = 21.0   # RunPod pide ≥ 20 s: relleno que no se usa
parts = []
for i, (a, b) in enumerate(segs):
    p = f"{O}/s{i:03d}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", f"{B}/voz/master.wav", "-ar", "16000", "-ac", "1", p], check=True)
    parts.append(p)
open(f"{O}/lista.txt", "w").write("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{O}/lista.txt", "-c", "copy", f"{O}/voz.wav"], check=True)
canal = jload(f"{B}/refs/canal.json", {}) or {}
prompt = f"{canal.get('presentador') or 'a person'} talking warmly to the camera in {canal.get('escena') or 'their home'}, natural expression, gentle small gestures, steady camera"
log(f"InfiniteTalk: {len(R)} ventanas · reel {t:.1f} s · 1 llamada")


# ── GitHub: hospedar los inputs un rato
def gh(method, path, body=None):
    q = urllib.request.Request(_cfg.url("https://api.github.com" + path), method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": "Bearer " + _cfg.clave("github"), "Accept": "application/vnd.github+json",
                                        "User-Agent": "estudio-videos", "X-GitHub-Api-Version": "2022-11-28"})
    try: return json.load(urllib.request.urlopen(q, timeout=300))
    except urllib.error.HTTPError as e:
        if e.code == 404: return None
        sale(f"⛔ GitHub {e.code} en {path}: {e.read().decode('utf8', 'ignore')[:300]} (¿el token tiene permiso 'repo'?)")

user = (os.environ.get("GITHUB_REPOSITORY") or "").split("/")[0] or gh("GET", "/user")["login"]; repo = _cfg.leer().get("avatar_repo") or "estudio-avatar-inputs"
if not gh("GET", f"/repos/{user}/{repo}"):
    gh("POST", "/user/repos", {"name": repo, "private": False, "auto_init": True, "description": "Archivos temporales del avatar (se borran solos)"})
    time.sleep(5)
job = os.path.basename(B) + "-" + time.strftime("%m%d%H%M%S")
subidos = {}
for nombre, f in (("face.png", FOTO), ("audio.wav", f"{O}/voz.wav")):
    r = gh("PUT", f"/repos/{user}/{repo}/contents/{job}/{nombre}", {"message": f"{job} {nombre}", "content": base64.b64encode(open(f, "rb").read()).decode()})
    subidos[nombre] = (r["content"]["sha"], f"https://raw.githubusercontent.com/{user}/{repo}/HEAD/{job}/{nombre}", os.path.getsize(f))
for nombre, (_, url, size) in subidos.items():   # lo publicado tiene que pesar lo mismo que lo local (si no, no se paga el /run)
    ok = False
    for _ in range(36):
        try:
            h = urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=30)
            ok = int(h.headers.get("Content-Length") or 0) == size
        except Exception: ok = False
        if ok: break
        time.sleep(5)
    if not ok: sale(f"⛔ {nombre} no quedó publicado bien en GitHub: NO se lanza el /run (no se paga)")

def borrar_inputs():
    for nombre, (sha, _, _) in subidos.items():
        try: gh("DELETE", f"/repos/{user}/{repo}/contents/{job}/{nombre}", {"message": f"borrar {job} {nombre}", "sha": sha})
        except SystemExit: pass


# ── RunPod: 1 sola llamada
def rp(path, body=None):
    q = urllib.request.Request(_cfg.url(EP + path), data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": "Bearer " + _cfg.clave("runpod"), "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(q, timeout=120))

led = {"estado": "corriendo", "t": time.strftime("%Y-%m-%d %H:%M:%S"), "ventanas": [r["file"] for r in R], "reel_s": round(t, 1)}
json.dump(led, open(LED, "w"), indent=1)
reel = f"{O}/reel.mp4"
try:
    j = rp("/run", {"input": {"prompt": prompt, "image": subidos["face.png"][1], "audio": subidos["audio.wav"][1], "size": "720p",
                              "enable_safety_checker": False}, "policy": {"executionTimeout": 7200000}})
    if not j.get("id"): raise RuntimeError("RunPod rechazó el pedido: " + json.dumps(j)[:300])
    led["job"] = j["id"]; json.dump(led, open(LED, "w"), indent=1); log("RUN", j["id"])
    fin, ult = None, ""
    while True:
        time.sleep(30)
        try: s = rp("/status/" + j["id"])
        except Exception as e: log("status:", e); continue
        if s.get("status") != ult: ult = s.get("status"); log("estado:", ult)
        if s.get("status") == "COMPLETED": fin = s; break
        if s.get("status") in ("FAILED", "CANCELLED", "TIMED_OUT"): raise RuntimeError(f"{s.get('status')}: {json.dumps(s.get('error') or s)[:300]}")
    out = fin.get("output") or {}
    res = out.get("result") or out.get("video") or out.get("url") if isinstance(out, dict) else out
    if isinstance(res, str) and res.startswith("http"): data = urllib.request.urlopen(res, timeout=1800).read()
    elif isinstance(res, str): data = base64.b64decode(res.split(",", 1)[-1])
    else: raise RuntimeError("RunPod terminó sin video: " + json.dumps(out)[:300])
    open(reel, "wb").write(data)
    json.dump(fin, open(f"{O}/status_final.json", "w"), indent=1)
except Exception as e:
    led["estado"] = "fallo"; led["error"] = str(e)[:300]; json.dump(led, open(LED, "w"), indent=1)
    borrar_inputs()
    sale(f"⛔ InfiniteTalk falló (un FAILED no cobra; podés volver a correr esta herramienta): {e}")
borrar_inputs()
led["estado"] = "ok"; json.dump(led, open(LED, "w"), indent=1)
_cfg.gasto(B, "avatar_runpod", 0.25, reel_s=round(t, 1))


# ── corte con medición del desfase
def pcm(p):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(b, np.int16).astype(np.float32)
env = lambda x: np.convolve(np.abs(x), np.ones(80) / 80, "same")[::40]   # envolvente a 200 Hz
RA, V = pcm(reel), pcm(f"{O}/voz.wav")
dur_reel = len(RA) / SR
sync, perdidas = [], []
for c in cortes:
    n = c["nom"]; d = min(c["dur"], 6.0)
    if n + 0.5 > dur_reel: perdidas.append(c["file"]); continue
    ref = V[int(n * SR): int((n + d) * SR)]
    b0 = max(0.0, n - 1.0); bus = RA[int(b0 * SR): int((n + d + 1.0) * SR)]
    lag = 0.0
    if len(ref) > SR and len(bus) > len(ref):
        er, eb = env(ref), env(bus); er = (er - er.mean()) / (er.std() + 1e-6); eb = eb - eb.mean()
        k = int(np.argmax(np.correlate(eb, er, "valid"))); lag = k / 200.0 - (n - b0)
        if abs(lag) > 0.8: lag = 0.0   # medición dudosa: se queda en el nominal
    s = max(0.0, n + lag)
    c["real"] = round(s, 3); c["lag_ms"] = round(lag * 1000); sync.append(c)
def _cortar(c):   # en paralelo y veryfast: uno por uno tardaba ~25 min, y el render igual los recodifica
    os.makedirs(os.path.dirname(f"{B}/{c['file']}"), exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-threads", "2", "-ss", f"{c['real']:.3f}", "-t", f"{c['dur']:.3f}", "-i", reel,
                    "-c:v", "libx264", "-crf", "17", "-preset", "veryfast", "-c:a", "aac", f"{B}/{c['file']}.tmp.mp4"], check=True)
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(4) as _ex: list(_ex.map(_cortar, sync))
for c in sync: os.replace(f"{B}/{c['file']}.tmp.mp4", f"{B}/{c['file']}")   # todos juntos: nadie rearma a medias
json.dump({"reel_s": round(dur_reel, 2), "cortes": sync, "perdidas": perdidas}, open(f"{B}/avatar/it_sync.json", "w"), indent=1)
mx = max([abs(c["lag_ms"]) for c in sync] or [0])
print(f"✓ {len(sync)} clips cortados · desfase corregido (máx {mx} ms)" + (f" · ⛔ el reel salió corto: sin clip {perdidas} → sacalas de avatar_ranges.json (van con foto)" if perdidas else ""), flush=True)
sys.exit(1 if perdidas else 0)
