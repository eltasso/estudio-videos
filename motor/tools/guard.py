#!/usr/bin/env python
"""Guardián (hook PreToolUse) de las sesiones de DeepSeek del Estudio. Reglas duras que NO dependen de que el modelo se acuerde:
  1. Nadie toca las herramientas, el KIT, la plantilla, el panel ni el registro de la llamada al avatar (it_llamada.json).
  2. Nadie lee ni imprime las claves (config.json).
  3. Avatar: SÓLO tools/avatar_it.py (1 llamada por video). Nada de RunPod directo.
  4. Imágenes: SÓLO tools/fotos.py (gpt-image low + Batch). Nada de llamar a la API de imágenes directo ni otra calidad.
  5. Nada de git push / publicar."""
import json, os, re, sys

try: data = json.load(sys.stdin)
except Exception: sys.exit(0)
ti = data.get("tool_input") or {}
cmd = str(ti.get("command") or "")
path = str(ti.get("file_path") or ti.get("path") or "").replace("\\", "/")
tool = str(data.get("tool_name") or "")
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace("\\", "/")


def bloquear(msg):
    sys.stderr.write("BLOQUEADO (regla dura del Estudio): " + msg + "\n"); sys.exit(2)


A = re.escape(APP).replace("/", r"[/\\]+")
PROT = "(" + A + r"|it_llamada\.json|it_sync\.json|[/\\]brain[/\\]settings\.json)"
PROTEGIDO = r"(?i)" + PROT
CLAVES = r"(?i)(config\.json|EstudioVideos[/\\]+config)"

if path:
    if re.search(CLAVES, path) and re.search(r"(?i)estudio|EstudioVideos", path) and not re.search(r"(?i)[/\\](videos|canales)[/\\]", path):
        bloquear("config.json tiene las claves: no se lee ni se edita desde un video.")
    if tool in ("Write", "Edit", "MultiEdit", "NotebookEdit") and re.search(PROTEGIDO, path):
        bloquear(f"no se edita {path}. Si una herramienta falla, anotalo en REPORTE.md y seguí con un reemplazo.")
if cmd:
    if re.search(CLAVES, cmd) and not re.search(r"(?i)(meta|plan|captions|canal|pedidos)\w*\.json", cmd.replace("config.json", "")):
        bloquear("config.json tiene las claves: no se lee ni se imprime.")
    if re.search(r"(?i)(_API_KEY|api[_-]?key|Bearer\s+sk-|\$env:|printenv|\benv\b\s*$|/proc/|/privado|estado_git|\.git/config|\bsudo\b)", cmd):
        bloquear("no se leen ni se imprimen claves.")
    VERBO = r"(sed\s+-i|>>?|\btee\b|\brm\b|\bcp\b|\bmv\b|Set-Content|Out-File|Add-Content|Remove-Item|Copy-Item|Move-Item|\btruncate\b)"
    if re.search(r"(?i)" + VERBO + r"[^|;&\n]*?" + PROT, cmd):
        bloquear("ese comando escribe o borra una herramienta o el registro del avatar. No se toca.")
    usa_it = re.search(r"tools[/\\]+avatar_it\.py", cmd)
    if re.search(r"(?i)api\.runpod\.(ai|io)|infinitetalk", cmd) and not usa_it:
        bloquear("el avatar va SOLO por `python <APP>/tools/avatar_it.py <carpeta>` (1 llamada por video). Nunca RunPod directo.")
    if re.search(r"(?i)api\.openai\.com|/v1/images|images\.generate|images\.edit|from openai|import openai", cmd) and not re.search(r"tools[/\\]+(fotos|tiempos)\.py", cmd):
        bloquear("las imágenes van SOLO por `python <APP>/tools/fotos.py <carpeta> <pedidos.json>` (gpt-image low + Batch). No llames a OpenAI directo.")
    if re.search(r"(?i)quality\W{0,6}(medium|high|hd|auto)", cmd):
        bloquear("gpt-image siempre en quality low.")
    if re.search(r"(?i)\bgit\s+push\b|\bgh\s+(release|repo|pr)\b|youtube", cmd):
        bloquear("nada se publica desde un video: el video final se descarga desde el panel.")
sys.exit(0)
