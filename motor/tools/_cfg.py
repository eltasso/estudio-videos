# -*- coding: utf-8 -*-
"""Configuración compartida del Estudio: dónde viven los datos y las claves del usuario.
Las claves se guardan SOLO en <DATOS>/config.json (fuera del repo). Nunca se imprimen."""
import json, os

DATOS = os.path.abspath(os.environ.get("ESTUDIO_DATA") or os.path.join(os.path.expanduser("~"), "EstudioVideos")).replace("\\", "/")
CONFIG = os.path.abspath(os.environ.get("ESTUDIO_CONFIG") or DATOS + "/config.json").replace("\\", "/")   # en la nube va fuera de la carpeta que se guarda
CANALES = DATOS + "/canales"
VIDEOS = DATOS + "/videos"
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__))).replace("\\", "/")
TOOLS = APP + "/tools"

CLAVES = ["deepseek", "openai", "fish", "runpod", "github"]
OPCIONALES = ["groq"]   # groq: tiempos por palabra GRATIS (si no está, se usa OpenAI whisper)
DEFAULTS = {
    "modelo": "deepseek-flash",                       # modelo de DeepSeek en su endpoint compatible con Anthropic
    "precio": {"hit": 0.003, "miss": 0.15, "out": 0.6},  # US$ por 1M tokens (valle); hora pico x2
    "fish_backend": "s2.1-pro-free",
    "imagen_modelo": "gpt-image-2",
    "imagen_size": "1088x608",
    "avatar_repo": "estudio-avatar-inputs",          # repo PÚBLICO de su GitHub donde se suben cara+audio un rato
}

def leer():
    try: c = json.load(open(CONFIG, encoding="utf8"))
    except Exception: c = {}
    for k, v in DEFAULTS.items(): c.setdefault(k, v)
    return c

def guardar(c):
    os.makedirs(os.path.dirname(CONFIG), exist_ok=True)
    tmp = CONFIG + ".tmp"
    json.dump(c, open(tmp, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    os.replace(tmp, CONFIG)

def clave(nombre):
    v = (leer().get(nombre) or os.environ.get(nombre.upper() + "_API_KEY") or "").strip()
    if not v: raise SystemExit(f"⛔ falta la clave de {nombre}: cargala en el panel → Configuración")
    return v

PUENTE = (os.environ.get("ESTUDIO_PUENTE") or "").rstrip("/")   # en la nube la sesión no tiene claves: el puente las agrega del otro lado
_SERVICIOS = {"api.openai.com": "openai", "api.groq.com": "groq", "api.fish.audio": "fish", "api.runpod.ai": "runpod", "api.github.com": "github", "api.deepseek.com": "deepseek"}
def url(u):
    if not PUENTE: return u
    h, _, r = u.split("://", 1)[1].partition("/")
    if h not in _SERVICIOS: raise SystemExit("⛔ ese servicio no está permitido")
    return f"{PUENTE}/k/{_SERVICIOS[h]}" + ("/" + r if r else "")

def gasto(carpeta, tag, usd, **extra):
    """Anota un gasto en <carpeta>/gasto.jsonl (el panel lo suma al costo del video)."""
    import time
    with open(os.path.join(carpeta, "gasto.jsonl"), "a", encoding="utf8") as f:
        f.write(json.dumps(dict(t=time.time(), tag=tag, usd=round(float(usd), 5), **extra)) + "\n")

ALERTAS = DATOS + "/alertas.json"
def alerta(servicio, msg=None):
    """Avisa al panel (msg=None la borra). Ej.: OpenAI sin crédito mientras una herramienta espera."""
    import time
    try: a = json.load(open(ALERTAS, encoding="utf8"))
    except Exception: a = {}
    if msg: a[servicio] = {"msg": msg, "t": time.time()}
    else: a.pop(servicio, None)
    try:
        tmp = ALERTAS + ".%d.tmp" % os.getpid(); json.dump(a, open(tmp, "w", encoding="utf8"), ensure_ascii=False); os.replace(tmp, ALERTAS)
    except Exception: pass

SIN_CREDITO = r"quota|billing|insufficient|credit_balance|credits remaining"
def esperar_credito(servicio, intento, maximo_h=3):
    """Sin crédito: avisa y espera 5 min. Devuelve False si ya pasó el máximo (entonces la herramienta corta)."""
    import time
    if intento * 5 >= maximo_h * 60:
        alerta(servicio, f"{servicio} sigue sin crédito después de {maximo_h} h: cargá saldo y relanzá el paso"); return False
    alerta(servicio, f"{servicio} sin crédito: cargá saldo. Las herramientas esperan y siguen solas.")
    print(f"⏸ {servicio} sin crédito: espero 5 min y reintento (cargá saldo y sigue solo) [{intento + 1}]", flush=True)
    time.sleep(300); return True
