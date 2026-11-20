# -*- coding: utf-8 -*-
"""Voz en off de los reels con Fish Audio (la misma API que usa el estudio).
   python3 sonido/voz.py                 -> public/voz/<reel>/<línea>.wav  +  src/gen/voz.json (duración de cada línea en frames)
   python3 sonido/voz.py --voz <id>      -> usa otra voz de Fish (id del modelo) en lugar de la de guiones.json
   python3 sonido/voz.py --forzar        -> rehace todas las líneas aunque ya existan
   python3 sonido/voz.py --rehacer reel2-errores/b2,reel4-catalogo/imp   -> rehace sólo esas (otra toma)
Los textos están en sonido/guiones.json. Sólo se regeneran las líneas cuyo texto o voz cambió (se guarda una huella).
La clave: variable FISH_API_KEY (en la nube de Claude la pone sola el proxy)."""
import hashlib, json, os, subprocess, sys, time
from fish_audio_sdk import Session, TTSRequest

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..'))
PUB = os.path.join(RAIZ, 'public', 'voz')
GEN = os.path.join(RAIZ, 'src', 'gen', 'voz.json')
FPS = 30
MODELOS = ['s2.1-pro-free', 's1']

args = sys.argv[1:]
guiones = json.load(open(os.path.join(AQUI, 'guiones.json'), encoding='utf8'))
VOZ = args[args.index('--voz') + 1] if '--voz' in args else guiones['_voz']['id']
VEL = float(guiones['_voz'].get('velocidad', 1.0))   # >1 = más rápida, sin cambiar el tono (ritmo de reel)
FORZAR = '--forzar' in args
REHACER = set(args[args.index('--rehacer') + 1].split(',')) if '--rehacer' in args else set()   # ej: reel2-errores/b2,reel4-catalogo/imp
try:
    viejo = json.load(open(GEN, encoding='utf8'))
except Exception:
    viejo = {}

s = Session(os.environ.get('FISH_API_KEY') or 'proxy-injected')


def dur(f):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip())


def generar(texto, destino):
    crudo = destino + '.crudo.mp3'
    for intento in range(3):
        for be in MODELOS:
            try:
                with open(crudo, 'wb') as f:
                    for ch in s.tts(TTSRequest(text=texto, reference_id=VOZ, format='mp3', mp3_bitrate=192, normalize=True,
                                               temperature=0.8, top_p=0.9), backend=be):
                        f.write(ch)
                if os.path.getsize(crudo) > 2000:
                    # recorta silencios de punta y punta, 48 kHz estéreo, fundido cortito al final
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', crudo, '-af',
                                    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,'
                                    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,afade=t=in:d=0.03,areverse,'
                                    'aresample=48000', '-ac', '2', destino], check=True)
                    # control: que no haya quedado muda
                    vol = subprocess.run(['ffmpeg', '-hide_banner', '-i', destino, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
                    pico = float(vol.split('max_volume:')[1].split('dB')[0]) if 'max_volume:' in vol else -99
                    if pico < -20:
                        raise RuntimeError(f'audio casi mudo ({pico} dB)')
                    # cadena de locución: limpia graves, compresión suave y pico a -1.5 dB (que se escuche por encima de los efectos)
                    gan = -1.5 - pico
                    tmp = destino + '.tmp.wav'
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', destino, '-af',
                                    f'atempo={VEL},highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=1,volume={gan:.2f}dB,alimiter=limit=0.84',
                                    tmp], check=True)
                    os.replace(tmp, destino)
                    os.remove(crudo)
                    return be
            except Exception as e:
                print(f'   {be}: {str(e)[:160]}', flush=True)
        time.sleep(3 * (intento + 1))
    raise SystemExit(f'No pude generar: {texto!r}')


salida = {}
for reel, lineas in guiones.items():
    if reel.startswith('_'):
        continue
    os.makedirs(os.path.join(PUB, reel), exist_ok=True)
    salida[reel] = {}
    for lid, texto in lineas.items():
        archivo = f'voz/{reel}/{lid}.wav'
        ruta = os.path.join(RAIZ, 'public', archivo)
        huella = hashlib.sha1(f'{VOZ}|{VEL}|{texto}'.encode()).hexdigest()[:12]
        prev = viejo.get(reel, {}).get(lid)
        if not FORZAR and f'{reel}/{lid}' not in REHACER and prev and prev.get('huella') == huella and os.path.exists(ruta):
            salida[reel][lid] = prev
            continue
        be = generar(texto, ruta)
        d = dur(ruta)
        salida[reel][lid] = {'archivo': archivo, 'frames': int(round(d * FPS)), 'texto': texto, 'huella': huella}
        print(f'  {reel}/{lid}: {d:.2f}s ({be})  {texto}', flush=True)

os.makedirs(os.path.dirname(GEN), exist_ok=True)
json.dump(salida, open(GEN, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('listo ->', GEN)
