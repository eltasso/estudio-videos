# -*- coding: utf-8 -*-
"""Copia la salida de la sesión (stream-json) al .jsonl SIN los eventos "thinking_tokens":
son ~3.000 por minuto y no sirven para nada (el log pasaba de 50 MB por hora). Corre suelto junto a la sesión."""
import sys
out = open(sys.argv[1], "ab", buffering=0)
for ln in sys.stdin.buffer:
    if b'"subtype":"thinking_tokens"' in ln[:80]: continue
    out.write(ln)
