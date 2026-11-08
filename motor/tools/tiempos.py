# -*- coding: utf-8 -*-
"""Tiempos POR PALABRA de la voz (Groq whisper GRATIS si hay clave "groq"; si no, OpenAI whisper-1). Uso:
   python <APP>/tools/tiempos.py <carpeta_del_video> [idioma: es|en|pt…]
Lee voz/master.wav y escribe captions.json = [{"text":" palabra","startMs":1234,"endMs":1500}, …].
Costo: US$0,006 por minuto de audio (queda anotado en gasto.jsonl)."""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass


def transcribir(audio, idioma="", t0=0.0, tramo=None):
    """Devuelve (palabras, texto) de un audio (lo pasa a mp3 mono 16 kHz)."""
    T = os.path.join(os.path.dirname(audio), "_asr"); os.makedirs(T, exist_ok=True)
    mp3 = os.path.join(T, f"t{int(t0)}.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.3f}"] + (["-t", f"{tramo:.3f}"] if tramo else []) +
                   ["-i", audio, "-ac", "1", "-ar", "16000", "-b:a", "32k", mp3], check=True)
    bnd = uuid.uuid4().hex; partes = []
    def campo(k, v): partes.append(f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    groq = (_cfg.leer().get("groq") or "").strip()
    campo("model", "whisper-large-v3-turbo" if groq else "whisper-1"); campo("response_format", "verbose_json"); campo("timestamp_granularities[]", "word")
    if idioma: campo("language", idioma)
    partes.append(f'--{bnd}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()
                  + open(mp3, "rb").read() + b"\r\n")
    partes.append(f"--{bnd}--\r\n".encode())
    url = "https://api.groq.com/openai/v1/audio/transcriptions" if groq else "https://api.openai.com/v1/audio/transcriptions"
    quien = "Groq" if groq else "OpenAI"
    q = urllib.request.Request(_cfg.url(url), data=b"".join(partes),
                               headers={"Authorization": "Bearer " + (groq or _cfg.clave("openai")), "Content-Type": "multipart/form-data; boundary=" + bnd, "User-Agent": "estudio-videos/1.0"})
    t = credito = 0
    while True:
        try:
            j = json.load(urllib.request.urlopen(q, timeout=600))
            if credito: _cfg.alerta(quien)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf8", "ignore")[:300]
            if e.code in (401, 403): sys.exit(f"⛔ {quien} rechazó la clave")
            if re.search(_cfg.SIN_CREDITO, msg, re.I):
                if _cfg.esperar_credito(quien, credito): credito += 1; continue
                sys.exit(f"⛔ {quien} sin crédito: cargá saldo y volvé a correr tiempos.py")
            print("reintento", e.code, msg, flush=True)
        except Exception as e: print("reintento", e, flush=True)
        t += 1
        if t >= 6: sys.exit(f"⛔ {quien} no respondió")
        time.sleep(10 * t if not groq else 30 * t)   # Groq gratis: límite por minuto
    ws = []
    for w in j.get("words", []):
        s, e = (float(w["start"]) + t0) * 1000, (float(w["end"]) + t0) * 1000
        ws.append({"text": " " + w["word"].strip(), "startMs": round(s), "endMs": round(max(e, s + 40)), "timestampMs": round(s), "confidence": 1.0})
    return ws, j.get("text", "")


if __name__ == "__main__":
    B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
    IDI = sys.argv[2] if len(sys.argv) > 2 else ""
    M = B + "/voz/master.wav"
    if not os.path.exists(M): sys.exit("⛔ falta voz/master.wav")
    D = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", M], capture_output=True, text=True).stdout.strip() or 0)
    TRAMO = 1200.0   # 20 min por pedido (mp3 32 kbps ≈ 4,8 MB, debajo del límite de 25 MB)
    words, t0 = [], 0.0
    while t0 < D - 0.05:
        w, _ = transcribir(M, IDI, t0, TRAMO); words += w; t0 += TRAMO
    json.dump(words, open(B + "/captions.json", "w", encoding="utf8"), ensure_ascii=False, indent=0)
    _cfg.gasto(B, "whisper", 0 if (_cfg.leer().get("groq") or "").strip() else D / 60 * 0.006, seg=round(D))
    print(f"✓ captions.json: {len(words)} palabras en {D / 60:.1f} min", flush=True)
