# -*- coding: utf-8 -*-
"""Efectos de sonido y música de fondo para los reels, 100% sintetizados por código (sin licencias de terceros).
   python3 sonido/generar.py            -> public/sfx/*.wav  y  public/musica/*.wav
Todo sale a 44.1 kHz estéreo 16 bit. Cada efecto está normalizado para que se escuche parejo."""
import os
import numpy as np
from scipy import signal

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(AQUI, '..', 'public')
rng = np.random.default_rng(7)


def t_(dur):
    return np.arange(int(SR * dur)) / SR


def env_ad(n, a, d, curva=4.0):
    """envolvente ataque (s) + caída exponencial (s)"""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / max(d, 1e-4) * curva / 4))
    return e


def bp(x, lo, hi, orden=2):
    sos = signal.butter(orden, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, orden=2):
    return signal.sosfilt(signal.butter(orden, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, orden=2):
    return signal.sosfilt(signal.butter(orden, f, btype='high', fs=SR, output='sos'), x)


def barrido_lp(x, f0, f1):
    """lowpass que se abre/cierra en el tiempo (bloques de 256 muestras, estado continuo)"""
    out = np.zeros_like(x)
    n = len(x)
    bloques = range(0, n, 256)
    zi = None
    for i in bloques:
        k = i / max(n - 1, 1)
        f = f0 * (f1 / f0) ** k
        sos = signal.butter(2, min(f, SR * 0.45), btype='low', fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + 256], zi = signal.sosfilt(sos, x[i:i + 256], zi=zi)
    return out


def reverb(x, seg=1.6, mezcla=0.25, brillo=5000):
    """reverb por convolución con una cola de ruido que decae (rápida y suave)"""
    n = int(SR * seg)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.0 / seg)
    ir = lp(ir, brillo)
    ir /= np.sqrt(np.sum(ir ** 2))
    mojado = np.concatenate([signal.fftconvolve(x, ir), [0.0]])[:len(x) + n]
    seco = np.concatenate([x, np.zeros(n)])
    return seco * (1 - mezcla) + mojado * mezcla


def estereo(x, ancho=0.0):
    """de mono a estéreo con un retardo mínimo (Haas) para dar cuerpo"""
    if ancho <= 0:
        return np.stack([x, x], 1)
    d = int(SR * 0.012 * ancho)
    r = np.concatenate([np.zeros(d), x])[:len(x)]
    return np.stack([x, x * (1 - ancho * 0.3) + r * ancho * 0.3], 1)


def guardar(nombre, x, pico=0.89, carpeta='sfx'):
    os.makedirs(os.path.join(PUB, carpeta), exist_ok=True)
    if x.ndim == 1:
        x = estereo(x)
    # recorta silencio final
    a = np.abs(x).max(1)
    ult = np.nonzero(a > 1e-4)[0]
    if len(ult):
        x = x[:ult[-1] + int(SR * 0.02)]
    x = x / (np.abs(x).max() + 1e-9) * pico
    # fade de 5 ms al final para que no haga click
    f = min(len(x), int(SR * 0.005))
    x[-f:] *= np.linspace(1, 0, f)[:, None]
    from scipy.io import wavfile
    wavfile.write(os.path.join(PUB, carpeta, nombre + '.wav'), SR, (x * 32767).astype(np.int16))
    print('  ', carpeta + '/' + nombre + '.wav', f'{len(x) / SR:.2f}s')


# ───────────────────────── EFECTOS ─────────────────────────

def whoosh(dur=0.55, f0=300, f1=6000, pico_en=0.6):
    n = int(SR * dur)
    x = rng.standard_normal(n)
    t = np.arange(n) / n
    e = np.where(t < pico_en, (t / pico_en) ** 2.2, ((1 - t) / (1 - pico_en)) ** 1.6)
    y = barrido_lp(x, f0, f1) * e
    y = hp(y, 120)
    return np.stack([y * (1 - 0.4 * t), y * (0.6 + 0.4 * t)], 1)   # se mueve de izq. a der.


def impacto():
    """golpe grave cinematográfico (para el gancho del inicio)"""
    t = t_(1.6)
    f = 38 + 110 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    sub = np.tanh(sub * 2.2)
    golpe = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 30) * 0.8
    cola = lp(rng.standard_normal(len(t)), 600) * np.exp(-t * 3.5) * 0.25
    return reverb(sub + golpe + cola, 2.2, 0.22, 3000)


def pop(f0=900, f1=260, dur=0.09):
    t = t_(dur + 0.05)
    f = f1 + (f0 - f1) * np.exp(-t * 60)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.002, dur)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 900) * 0.3
    return y + click


def tick():
    t = t_(0.04)
    y = bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t * 260)
    y += np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300) * 0.6
    return y


def campana(f=1318.5, dur=2.2, brillo=1.0):
    t = t_(dur)
    parciales = [(1, 1, 1.6), (2.0, 0.45, 2.4), (2.76, 0.35, 3.2), (5.4, 0.18 * brillo, 5.0), (8.93, 0.08 * brillo, 7)]
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in parciales)
    y *= env_ad(len(t), 0.002, dur)
    return reverb(y, 1.8, 0.3)


def acierto():
    """dos notas ascendentes, suena a 'correcto'"""
    a = campana(1046.5, 1.2, 0.6)
    b = campana(1568, 1.6, 0.6)
    off = int(SR * 0.11)
    out = np.zeros(len(b) + off)
    out[:len(a)] += a
    out[off:off + len(b)] += b * 0.9
    return out


def error():
    """zumbido corto de 'mal' (dos pulsos graves)"""
    t = t_(0.16)
    sq = signal.square(2 * np.pi * 140 * t) * 0.5 + signal.square(2 * np.pi * 147 * t) * 0.5
    sq = lp(sq, 1800) * env_ad(len(t), 0.004, 0.14)
    gap = np.zeros(int(SR * 0.05))
    return reverb(np.concatenate([sq, gap, sq * 0.9]), 0.6, 0.15)


def burbujas(dur=1.6, cant=16):
    out = np.zeros(int(SR * dur))
    for _ in range(cant):
        inicio = int(rng.uniform(0, dur - 0.12) * SR)
        d = rng.uniform(0.03, 0.08)
        t = t_(d)
        f0 = rng.uniform(350, 900)
        f = f0 * (1 + 2.5 * t / d)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * rng.uniform(0.4, 1)
        out[inicio:inicio + len(b)] += b
    return reverb(out, 0.5, 0.18, 4000)


def chisporroteo(dur=1.8):
    """agua hirviendo / yerba que se quema: ruido + crujidos"""
    n = int(SR * dur)
    base = bp(rng.standard_normal(n), 1500, 7000) * 0.25
    cr = np.zeros(n)
    for _ in range(int(dur * 90)):
        i = rng.integers(0, n - 400)
        cr[i:i + 400] += rng.standard_normal(400) * np.exp(-np.arange(400) / 40) * rng.uniform(0.3, 1.2)
    cr = hp(cr, 1800)
    e = np.minimum(1, np.arange(n) / (SR * 0.15)) * np.minimum(1, (n - np.arange(n)) / (SR * 0.4))
    return (base + cr) * e


def subida(dur=1.4):
    """riser: ruido que se abre + tono que sube (antes de un dato fuerte)"""
    n = int(SR * dur)
    t = np.arange(n) / SR
    ruido = barrido_lp(rng.standard_normal(n), 200, 9000) * (t / dur) ** 2
    f = 180 * (6 ** (t / dur))
    tono = np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / dur) ** 3 * 0.35
    return reverb(ruido * 0.7 + tono, 1.0, 0.2)


def tap():
    """toque en pantalla (botón Seguir)"""
    t = t_(0.06)
    y = np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 120) + hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 500) * 0.4
    return y


def cajon(dur=0.5):
    """golpe de bombo legüero suave (acento musical)"""
    t = t_(dur)
    f = 70 + 90 * np.exp(-t * 35)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    y += lp(rng.standard_normal(len(t)), 1200) * np.exp(-t * 40) * 0.5
    return reverb(y, 0.9, 0.2, 2500)


def maquina(n_toques=10, cada=0.065):
    out = np.zeros(int(SR * (n_toques * cada + 0.1)))
    for i in range(n_toques):
        tk = tick() * rng.uniform(0.6, 1)
        j = int(i * cada * SR + rng.uniform(-0.008, 0.008) * SR)
        j = max(0, j)
        out[j:j + len(tk)] += tk
    return out


def cebar(dur=1.3):
    """chorrito de agua cayendo en el mate"""
    n = int(SR * dur)
    x = rng.standard_normal(n)
    mod = 1 + 0.5 * np.sin(2 * np.pi * 9 * np.arange(n) / SR + rng.uniform(0, 6)) * rng.uniform(0.6, 1, n).cumsum() / np.arange(1, n + 1)
    y = bp(x, 700, 3200) * mod
    y += burbujas(dur, 10)[:n] * 0.5
    e = np.minimum(1, np.arange(n) / (SR * 0.08)) * np.minimum(1, (n - np.arange(n)) / (SR * 0.25))
    return y * e


# ───────────────────────── MÚSICA ─────────────────────────
# Guitarra punteada por Karplus-Strong + bombo suave + shaker. Aire de folclore relajado (6/8), 84 negras con puntillo/min.

def nota_hz(nombre):
    notas = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = nombre[:-1], int(nombre[-1])
    return 440 * 2 ** ((notas[n] + 12 * (o + 1) - 69) / 12)


def cuerda(f, dur, brillo=0.5, decay=0.996):
    n = int(SR * dur)
    N = int(round(SR / f))
    y = np.zeros(n + N + 1)
    exc = rng.uniform(-1, 1, N)
    exc = lp(exc, 1200 + 5000 * brillo, 1)  # pulsada con la yema: menos brillante
    y[1:N + 1] = exc                         # y[0] = 0 para que exista y[n-N-1] desde el primer bloque
    i = N + 1
    while i < n + N + 1:
        k = min(N, n + N + 1 - i)
        y[i:i + k] = decay * 0.5 * (y[i - N:i - N + k] + y[i - N - 1:i - N - 1 + k])
        i += k
    y = y[1:n + 1]
    cuerpo = bp(y, 90, 5000, 1)   # cuerpo de la guitarra
    return cuerpo * env_ad(n, 0.002, dur * 0.9, 3)


def musica(dur, bpm=84, nombre='folk_chill', progresion=None, nivel_bombo=0.55):
    # 6/8: cada compás = 6 corcheas. bpm de negra con puntillo.
    corchea = 60 / bpm / 3
    compas = corchea * 6
    if progresion is None:
        progresion = [['A2', 'E3', 'A3', 'C4', 'E4'],   # Am
                      ['F2', 'C3', 'F3', 'A3', 'C4'],   # F
                      ['C3', 'G3', 'C4', 'E4', 'G4'],   # C
                      ['G2', 'D3', 'G3', 'B3', 'D4']]   # G
    total = int(SR * (dur + 3))
    L = np.zeros(total)
    R = np.zeros(total)
    patron = [0, 2, 3, 4, 3, 2]          # bajo-cuerdas arpegiadas por corchea
    t = 0.0
    ncomp = 0
    while t < dur + compas:
        acorde = progresion[ncomp % len(progresion)]
        for k, idx in enumerate(patron):
            inicio = t + k * corchea + rng.uniform(-0.006, 0.006)
            if inicio < 0:
                continue
            f = nota_hz(acorde[idx])
            amp = 0.9 if k == 0 else rng.uniform(0.45, 0.6)
            s = cuerda(f, 2.4 if k == 0 else 1.6, brillo=0.35 if k == 0 else 0.55) * amp
            i0 = int(inicio * SR)
            s = s[:max(0, total - i0)]
            pan = 0.5 + (idx - 2) * 0.12
            L[i0:i0 + len(s)] += s * (1 - pan)
            R[i0:i0 + len(s)] += s * pan
        # rasguido suave en el 4to tiempo (acento de chacarera, bien bajito)
        if ncomp % 2 == 1:
            for j, nn in enumerate(acorde[1:]):
                f = nota_hz(nn)
                i0 = int((t + 3 * corchea + j * 0.012) * SR)
                s = cuerda(f, 1.0, 0.7) * 0.18
                s = s[:max(0, total - i0)]
                L[i0:i0 + len(s)] += s * 0.5
                R[i0:i0 + len(s)] += s * 0.5
        # bombo: 1 y 4 (con el 4 más suave)
        for pos, a in [(0, 1.0), (3, 0.55), (5, 0.3)]:
            b = cajon(0.6) * a * nivel_bombo
            i0 = int((t + pos * corchea) * SR)
            b = b[:max(0, total - i0)]
            L[i0:i0 + len(b)] += b
            R[i0:i0 + len(b)] += b
        # shaker en cada corchea
        for k in range(6):
            n_ = int(SR * 0.07)
            sh = hp(rng.standard_normal(n_), 6000) * env_ad(n_, 0.01, 0.05) * (0.045 if k % 3 == 0 else 0.025)
            i0 = int((t + k * corchea + 0.004) * SR)
            sh = sh[:max(0, total - i0)]
            L[i0:i0 + len(sh)] += sh * 0.6
            R[i0:i0 + len(sh)] += sh
        t += compas
        ncomp += 1
    L = reverb(L, 2.0, 0.22)[:total]
    R = reverb(R, 2.1, 0.22)[:total]
    x = np.stack([L, R], 1)[:int(SR * dur)]
    # fade in corto y fade out de 2.5 s
    n = len(x)
    fi, fo = int(SR * 0.3), int(SR * 2.5)
    x[:fi] *= np.linspace(0, 1, fi)[:, None]
    x[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
    # compresión suave
    x = np.tanh(x / (np.abs(x).max() + 1e-9) * 1.6) / np.tanh(1.6)
    guardar(nombre, x, 0.8, 'musica')


if __name__ == '__main__':
    print('Efectos:')
    guardar('whoosh', whoosh())
    guardar('whoosh_corto', whoosh(0.32, 500, 8000, 0.55), 0.75)
    guardar('whoosh_largo', whoosh(0.95, 200, 5000, 0.7))
    guardar('impacto', impacto())
    guardar('pop', pop(), 0.7)
    guardar('pop_agudo', pop(1400, 500, 0.06), 0.6)
    guardar('tick', tick(), 0.5)
    guardar('maquina', maquina(), 0.55)
    guardar('campana', campana(), 0.7)
    guardar('acierto', acierto(), 0.7)
    guardar('error', error(), 0.6)
    guardar('burbujas', burbujas(), 0.7)
    guardar('chisporroteo', chisporroteo(), 0.6)
    guardar('subida', subida(), 0.75)
    guardar('tap', tap(), 0.6)
    guardar('bombo', cajon(), 0.85)
    guardar('cebar', cebar(), 0.65)
    print('Música:')
    musica(62, 84, 'folk_chill')
    musica(62, 92, 'folk_alegre', [['D3', 'A3', 'D4', 'F#4', 'A4'],
                                   ['B2', 'F#3', 'B3', 'D4', 'F#4'],
                                   ['G2', 'D3', 'G3', 'B3', 'D4'],
                                   ['A2', 'E3', 'A3', 'C#4', 'E4']], 0.6)
