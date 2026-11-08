# -*- coding: utf-8 -*-
"""Voz con el CLON de la voz del canal (Fish Audio). Uso (en segundo plano, con log):
   python <APP>/tools/voz.py <carpeta_del_video> > <carpeta>/voz/voz.log 2>&1
Lee <carpeta>/guion.txt y la muestra de voz del canal en <carpeta>/refs/voz.wav (+ refs/voz.txt = lo que se dice en la muestra).
Parte el guion en bloques de ~2500 caracteres, genera 3 a la vez, rehace los que salen cortos o largos y une todo en voz/master.wav.
La voz se clona una sola vez en la cuenta de Fish, sin filtros, y los videos siguientes reutilizan ese clon.
Si se corta, volver a correrlo: sólo rehace los bloques que faltan. Los tags de emoción ([whispering], [excited]…) se respetan."""
import hashlib, json, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass
from fish_audio_sdk import Session, TTSRequest, ReferenceAudio

B = os.path.abspath(sys.argv[1]).replace("\\", "/").rstrip("/")
O = B + "/voz"; os.makedirs(O, exist_ok=True)
C = _cfg.leer()
texto = open(B + "/guion.txt", encoding="utf8").read().strip()
if not texto: sys.exit("⛔ guion.txt vacío")
REF = B + "/refs/voz.wav"
if not os.path.exists(REF): sys.exit("⛔ falta refs/voz.wav (la muestra de voz del canal)")
ref_txt = open(B + "/refs/voz.txt", encoding="utf8").read().strip() if os.path.exists(B + "/refs/voz.txt") else ""
ref = ReferenceAudio(audio=open(REF, "rb").read(), text=ref_txt)


def voz_guardada():
    """La voz del canal se clona UNA sola vez en la cuenta de Fish del usuario, tal cual viene: sin limpiar ni mejorar el audio
    (la reducción de ruido la vuelve robótica). Los videos siguientes del canal encuentran ese clon por su nombre y lo reutilizan.
    El nombre sale del audio: si el canal cambia de voz, se clona la nueva. Si Fish no deja, sigue con la muestra."""
    titulo = "estudio-" + hashlib.sha1(ref.audio).hexdigest()[:12]
    try:
        s = Session(_cfg.clave("fish"), base_url=_cfg.url("https://api.fish.audio"))
        for m in s.list_models(self_only=True, title=titulo, page_size=20).items:
            if m.title == titulo and m.state == "trained":
                print("voz: uso el clon guardado en Fish", flush=True); return m.id
        m = s.create_model(title=titulo, visibility="private", voices=[ref.audio], texts=[ref_txt] if ref_txt else None, enhance_audio_quality=False)
        for _ in range(30):
            if m.state == "trained":
                print("voz: clon creado en Fish, sin filtros (no se vuelve a clonar)", flush=True); return m.id
            time.sleep(4); m = s.get_model(m.id)
        print("voz: el clon no terminó a tiempo, sigo con la muestra", flush=True)
    except SystemExit: raise
    except Exception as e:
        print("voz: no pude guardar el clon (%s), sigo con la muestra" % str(e)[:160], flush=True)
    return None


VOZ = voz_guardada()


def bloques(t, n=2500):
    out, cur = [], ""
    for p in re.split(r"\n\s*\n", t):
        p = p.strip()
        if not p: continue
        if len(p) > n:   # párrafo gigante: por oraciones
            for s in re.split(r"(?<=[.!?…])\s+", p):
                if len(cur) + len(s) + 1 > n and cur: out.append(cur.strip()); cur = ""
                cur += s + " "
            continue
        if len(cur) + len(p) + 2 > n and cur: out.append(cur.strip()); cur = ""
        cur += p + "\n\n"
    if cur.strip(): out.append(cur.strip())
    return out


def dur(p):
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip()
    return float(o or 0)


BACK = [C.get("fish_backend") or "s2.1-pro-free", "s1"]


def sintetizar(i, txt):
    out = f"{O}/blk_{i:03d}.wav"
    limpio = re.sub(r"\[[^\]]*\]|\([^)]*\)", "", txt)
    esperado = max(3.0, len(limpio) / 15.0)            # ~15 caracteres por segundo hablado
    if os.path.exists(out) and 0.5 * esperado <= dur(out) <= 2.2 * esperado: return i, out, "ya estaba"
    err = ""
    for intento in range(4):
        for be in BACK:
            try:
                s = Session(_cfg.clave("fish"), base_url=_cfg.url("https://api.fish.audio")); tmp = out + ".tmp.wav"
                with open(tmp, "wb") as f:
                    for ch in s.tts(TTSRequest(text=txt, format="wav", chunk_length=300, normalize=True, temperature=1.0, top_p=0.95,
                                               **({"reference_id": VOZ} if VOZ and intento < 2 else {"references": [ref]})), backend=be):
                        f.write(ch)
                d = dur(tmp)
                if not (0.5 * esperado <= d <= 2.2 * esperado): err = f"duración rara {d:.0f} s (esperado ~{esperado:.0f})"; continue
                os.replace(tmp, out); return i, out, f"{d:.0f} s ({be})"
            except SystemExit: raise
            except Exception as e:
                err = str(e)[:200]
                if re.search(r"401|403|invalid.*key|unauthor", err, re.I): raise SystemExit("⛔ Fish rechazó la clave")
        time.sleep(5 * (intento + 1))
    raise RuntimeError(f"bloque {i}: {err}")


bl = bloques(texto)
print(f"voz: {len(bl)} bloques · {len(texto)} caracteres", flush=True)
json.dump([{"i": i, "chars": len(b)} for i, b in enumerate(bl)], open(O + "/manifest.json", "w"), indent=1)
fallas = []
with ThreadPoolExecutor(3) as ex:
    fs = {ex.submit(sintetizar, i, b): i for i, b in enumerate(bl)}
    for f in as_completed(fs):
        try: i, p, info = f.result(); print(f"  ✓ bloque {i}: {info}", flush=True)
        except Exception as e: fallas.append(fs[f]); print(f"  ✗ {e}", flush=True)
if fallas: sys.exit(f"⛔ fallaron los bloques {sorted(fallas)}: volvé a correr voz.py (rehace sólo esos)")
lista = O + "/lista.txt"
open(lista, "w", encoding="utf8").write("".join(f"file '{O}/blk_{i:03d}.wav'\n" for i in range(len(bl))))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lista, "-ar", "44100", "-ac", "1", O + "/master.wav"], check=True)
print(f"✓ voz/master.wav {dur(O + '/master.wav') / 60:.1f} min", flush=True)
