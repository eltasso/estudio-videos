# -*- coding: utf-8 -*-
"""Antes de guardar la caché: que no quede ninguna clave en la carpeta de datos.
No imprime claves ni nombres de archivo con contenido: solo cuántos arreglos hizo."""
import os, sys

BASE = sys.argv[1]
NOMBRES = ("DEEPSEEK_API_KEY", "OPENAI_API_KEY", "FISH_API_KEY", "RUNPOD_API_KEY", "GROQ_API_KEY", "PEXELS_API_KEY", "GH_TOKEN")
SECRETOS = [v.strip().encode() for v in (os.environ.get(n, "") for n in NOMBRES) if len(v.strip()) >= 8]
MEDIA = (".mp4", ".mov", ".webm", ".mkv", ".wav", ".mp3", ".m4a", ".aac", ".flac", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".tflite", ".ttf", ".otf")
borrados = tapados = 0
for raiz, _, archivos in os.walk(BASE):
    for f in archivos:
        p = os.path.join(raiz, f)
        if os.path.islink(p): continue
        if f == "config.json" or f.startswith("config.json.") or f == ".env":
            os.remove(p); borrados += 1; continue
        if f.lower().endswith(MEDIA): continue
        with open(p, "rb") as a: b = a.read()
        n = b
        for s in SECRETOS: n = n.replace(s, b"[oculto]")
        if n != b:
            with open(p, "wb") as a: a.write(n)
            tapados += 1
print(f"limpieza: {borrados} archivos de claves borrados, {tapados} archivos tapados")
