# -*- coding: utf-8 -*-
"""Registro de inicio y fin de cada etapa del video: <carpeta>/gates/etapas.jsonl. nube.py lo junta y lo muestra en el panel.
Nunca frena nada: si no puede escribir, sigue. No lleva claves ni texto del guion."""
import contextlib, json, os, time


def marca(B, etapa, que, **extra):
    try:
        os.makedirs(os.path.join(B, "gates"), exist_ok=True)
        with open(os.path.join(B, "gates", "etapas.jsonl"), "a", encoding="utf8") as f:
            f.write(json.dumps(dict(extra, t=round(time.time(), 1), e=etapa, q=que)) + "\n")
    except Exception: pass


@contextlib.contextmanager
def etapa(B, nombre, **extra):
    marca(B, nombre, "ini", **extra)
    try: yield
    finally: marca(B, nombre, "fin", **extra)
