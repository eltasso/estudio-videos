# -*- coding: utf-8 -*-
# Estudio de videos — cada video es un chat de Claude Code con DeepSeek como modelo, que usa las herramientas de tools/
# (voz clonada con Fish, tiempos con Whisper, fotos gpt-image low+Batch, avatar InfiniteTalk en RunPod, armado con ffmpeg).
#   python server.py   →  abre http://127.0.0.1:8790/?k=<clave local>   (ESTUDIO_PORT / ESTUDIO_PROXY_PORT)
# Las claves de las APIs viven en <DATOS>/config.json (fuera del repo; ver INSTALAR_CON_CLAUDE.md). La página exige una
# clave local al azar (token.txt) y sólo escucha en 127.0.0.1. El proxy mide el gasto EXACTO de DeepSeek por video.
import json, os, re, sys, time, glob, socket, shutil, hashlib, secrets, hmac, threading, subprocess, mimetypes, webbrowser
import http.client, http.server, socketserver, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone

BASE = os.path.dirname(os.path.abspath(__file__)).replace("\\", "/")
sys.path.insert(0, BASE + "/tools")
import _cfg

D = _cfg.DATOS
RUNS = D + "/runs"; BRAIN = D + "/brain"
for p in (D, RUNS, BRAIN, _cfg.CANALES, _cfg.VIDEOS): os.makedirs(p, exist_ok=True)
PORT = int(os.environ.get("ESTUDIO_PORT", 8790)); PROXY_PORT = int(os.environ.get("ESTUDIO_PROXY_PORT", 8791))
UPSTREAM_HOST, UPSTREAM_PATH = "api.deepseek.com", "/anthropic"
DISALLOWED = "Task,Agent,WebFetch,WebSearch,NotebookEdit"
LOCK = threading.Lock()
TOKEN_FILE = D + "/token.txt"
if not os.path.exists(TOKEN_FILE): open(TOKEN_FILE, "w").write(secrets.token_urlsafe(24))
TOKEN = open(TOKEN_FILE).read().strip()
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp")
STEPS = [("guion", "Guion"), ("voz", "Voz"), ("tiempos", "Tiempos"), ("avatar", "Avatar"), ("fotos", "Fotos"), ("armado", "Armado"), ("qc", "QC")]
CACHE, PROBE = {}, {}


def jload(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d
def jsave(p, o):
    tmp = p + ".tmp"; json.dump(o, open(tmp, "w", encoding="utf8"), ensure_ascii=False, indent=1); os.replace(tmp, p)
def norm(p): return os.path.normcase(os.path.abspath(p)).replace("\\", "/")
def cached(key, ttl, fn):
    c = CACHE.get(key)
    if c and time.time() - c[0] < ttl: return c[1]
    v = fn(); CACHE[key] = (time.time(), v); return v
def short(x, n):
    x = x if isinstance(x, str) else json.dumps(x, ensure_ascii=False)
    return x if len(x) <= n else x[:n] + " …"


# ───────────── cerebro de las sesiones: settings con el guardián ─────────────
def preparar_brain():
    guard = f'"{sys.executable}" "{BASE}/tools/guard.py"'.replace("\\", "/")
    jsave(BRAIN + "/settings.json", {
        "skipDangerousModePermissionPrompt": True, "skipWorkflowUsageWarning": True,
        "hooks": {"PreToolUse": [{"matcher": "Bash|PowerShell|Write|Edit|MultiEdit|Read", "hooks": [{"type": "command", "command": guard, "timeout": 10}]}]},
        "env": {"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}})


# ───────────── precios y gasto ─────────────
def peak(ts):
    d = datetime.fromtimestamp(ts, timezone.utc)
    return d.weekday() < 5 and (1 <= d.hour < 4 or 6 <= d.hour < 10)
def cost(u, ts):
    pr = _cfg.leer()["precio"]
    hit = u.get("cache_read_input_tokens", 0) or 0
    miss = (u.get("input_tokens", 0) or 0) + (u.get("cache_creation_input_tokens", 0) or 0)
    out = u.get("output_tokens", 0) or 0
    return (hit * pr["hit"] + miss * pr["miss"] + out * pr["out"]) / 1e6 * (2 if peak(ts) else 1)
def rdir(rid): return os.path.join(RUNS, re.sub(r"[^\w.-]", "", rid))
def spent(rid):
    t = {"usd": 0.0, "hit": 0, "miss": 0, "out": 0, "calls": 0, "peak_calls": 0, "ctx": 0}
    try:
        for l in open(os.path.join(rdir(rid), "usage.jsonl"), encoding="utf8"):
            u = json.loads(l)
            t["usd"] += u["usd"]; t["calls"] += 1; t["peak_calls"] += u.get("peak", 0)
            t["hit"] += u.get("cache_read_input_tokens", 0) or 0
            t["miss"] += (u.get("input_tokens", 0) or 0) + (u.get("cache_creation_input_tokens", 0) or 0)
            t["out"] += u.get("output_tokens", 0) or 0
            if u.get("main"): t["ctx"] = (u.get("cache_read_input_tokens", 0) or 0) + (u.get("input_tokens", 0) or 0) + (u.get("cache_creation_input_tokens", 0) or 0)
    except FileNotFoundError: pass
    return t
def gasto_carpeta(cwd):
    g = {"fotos_gpt": 0.0, "fotos_n": 0, "whisper": 0.0, "avatar_runpod": 0.0}
    try:
        for l in open(os.path.join(cwd, "gasto.jsonl"), encoding="utf8"):
            x = json.loads(l); k = x.get("tag")
            if k in g: g[k] += float(x.get("usd") or 0)
            if k == "fotos_gpt": g["fotos_n"] += int(x.get("n") or 0)
    except Exception: pass
    return g


# ───────────── proxy de medición (sólo 127.0.0.1) ─────────────
# Puente de claves (nube): la sesión llama a /k/<servicio>/... y la clave se agrega ACÁ; solo estas rutas pasan.
PUENTE_RUTAS = {
    "openai": ("api.openai.com", r"^/v1/(files|batches|audio/transcriptions)(/|\?|$)"),
    "groq": ("api.groq.com", r"^/openai/v1/audio/transcriptions(\?|$)"),
    "fish": ("api.fish.audio", r"^/(v1/tts|model)(/|\?|$)"),
    "runpod": ("api.runpod.ai", r"^/v2/infinitetalk/"),
    "github": ("api.github.com", r"^/repos/{REPO}(/contents/|\?|$)"),
    "deepseek": ("api.deepseek.com", r"^/chat/completions(\?|$)"),
    "pexels": ("api.pexels.com", r"^/videos/search\?"),
}
def _secretos():
    c = _cfg.leer()
    return [v.encode() for v in (str(c.get(k) or "").strip() for k in _cfg.CLAVES + _cfg.OPCIONALES) if len(v) >= 8 and v != "via-puente"]
def _sin_claves(b):
    for s in _secretos(): b = b.replace(s, b"[oculto]")
    return b


class Proxy(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self): self.fwd()
    def do_POST(self): self.fwd()
    def do_PUT(self): self.fwd()
    def do_DELETE(self): self.fwd()
    def cuerpo(self):
        if "chunked" in (self.headers.get("Transfer-Encoding") or "").lower():
            data = b""
            while True:
                n = int(self.rfile.readline().split(b";")[0], 16)
                if not n: self.rfile.readline(); return data
                data += self.rfile.read(n); self.rfile.readline()
        n = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(n) if n else None
    def puente(self):
        m = re.match(r"^/k/(\w+)(/[^#]*)$", self.path)
        reg = PUENTE_RUTAS.get(m.group(1)) if m else None
        rest = m.group(2) if m else ""
        patron = reg[1].replace("{REPO}", re.escape(os.environ.get("GITHUB_REPOSITORY") or "-")) if reg else ""
        key = (_cfg.leer().get(m.group(1)) or "").strip() if reg else ""
        if not reg or not key or ".." in rest or "%2e" in rest.lower() or not re.match(patron, rest): self.send_error(403); return
        data = self.cuerpo()
        fuera = ("host", "content-length", "transfer-encoding", "accept-encoding", "connection", "authorization", "x-api-key")
        hdr = {k: v for k, v in self.headers.items() if k.lower() not in fuera}
        hdr["Authorization"] = key if m.group(1) == "pexels" else f"Bearer {key}"; hdr["Accept-Encoding"] = "identity"
        try:
            c = http.client.HTTPSConnection(reg[0], timeout=900); c.request(self.command, rest, body=data, headers=hdr); r = c.getresponse()
        except Exception:
            self.send_error(502); return
        self.send_response(r.status)
        for k, v in r.getheaders():
            if k.lower() not in ("content-length", "transfer-encoding", "connection", "content-encoding"): self.send_header(k, v)
        self.send_header("Connection", "close"); self.end_headers()
        kb = key.encode()
        while True:
            ch = r.read1(65536)
            if not ch: break
            try: self.wfile.write(ch.replace(kb, b"[oculto]")); self.wfile.flush()
            except Exception: break
        c.close()
    def fwd(self):
        if self.path.startswith("/k/"): return self.puente()
        m = re.match(r"^/r/([\w.-]+)(/.*)$", self.path)
        if not m or not os.path.exists(os.path.join(rdir(m.group(1)), "meta.json")): self.send_error(404); return
        rid, rest = m.group(1), m.group(2)
        cap = float(jload(os.path.join(rdir(rid), "meta.json"), {}).get("cap", 0) or 0)
        if cap and spent(rid)["usd"] >= cap:
            body = json.dumps({"type": "error", "error": {"type": "billing_error", "message": f"Tope del video alcanzado (US${cap})"}}).encode()
            self.send_response(402); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
        data = self.cuerpo()
        if data: data = _sin_claves(data)        # última red: ninguna clave le llega al modelo aunque aparezca en un texto
        key = (_cfg.leer().get("deepseek") or "").strip()
        hdr = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "content-length", "accept-encoding", "connection", "authorization", "x-api-key")}
        hdr["Authorization"] = f"Bearer {key}"; hdr["x-api-key"] = key; hdr["Accept-Encoding"] = "identity"
        main = False
        try: main = len(json.loads(data).get("tools") or []) > 3
        except Exception: pass
        t0 = time.time()
        while True:
            c = http.client.HTTPSConnection(UPSTREAM_HOST, timeout=900)
            c.request(self.command, UPSTREAM_PATH + rest, body=data, headers=hdr)
            r = c.getresponse()
            if r.status != 402: break
            r.read(); c.close()   # DeepSeek sin saldo: avisar en el panel y esperar en vez de matar la sesión
            _cfg.alerta("DeepSeek", "DeepSeek sin saldo: cargá crédito en platform.deepseek.com. El video está en pausa y sigue solo.")
            if time.time() - t0 > 480:   # antes del timeout del cliente: le digo "saturado" y Claude Code reintenta solo
                body = json.dumps({"type": "error", "error": {"type": "overloaded_error", "message": "DeepSeek sin saldo (esperando)"}}).encode()
                self.send_response(529); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body); return
            time.sleep(60)
        if r.status == 200 and "DeepSeek" in (jload(_cfg.ALERTAS, {}) or {}): _cfg.alerta("DeepSeek", None)
        self.send_response(r.status)
        for k, v in r.getheaders():
            if k.lower() not in ("content-length", "transfer-encoding", "connection", "content-encoding"): self.send_header(k, v)
        self.send_header("Connection", "close"); self.end_headers()
        usage, buf, sse = {}, b"", "event-stream" in (r.getheader("Content-Type") or "")
        while True:
            ch = r.read1(65536)
            if not ch: break
            try: self.wfile.write(ch); self.wfile.flush()
            except Exception: pass
            buf += ch
            if sse:
                *lines, buf = buf.split(b"\n")
                for ln in lines:
                    if ln.startswith(b"data:"):
                        try: ev = json.loads(ln[5:])
                        except Exception: continue
                        u = (ev.get("message") or {}).get("usage") or ev.get("usage")
                        if u:
                            for k, v in u.items():
                                if isinstance(v, int): usage[k] = max(usage.get(k, 0), v)
        if not sse:
            try: usage = json.loads(buf).get("usage") or {}
            except Exception: usage = {}
        if usage and "messages" in rest and "count_tokens" not in rest:
            ts = time.time(); rec = dict(usage); rec.update(ts=ts, usd=cost(usage, ts), peak=int(peak(ts)), main=main)
            with LOCK:
                with open(os.path.join(rdir(rid), "usage.jsonl"), "a", encoding="utf8") as f: f.write(json.dumps(rec) + "\n")


# ───────────── chats (sesiones de Claude Code con DeepSeek) ─────────────
def claude_bin():
    c = shutil.which("claude.cmd")
    if c:   # el .exe directo: claude.cmd corta los argumentos con saltos de línea
        exe = os.path.join(os.path.dirname(c), "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe")
        if os.path.exists(exe): return exe
    return shutil.which("claude") or shutil.which("claude.exe") or os.path.expanduser("~/.local/bin/claude.exe")

if os.name == "nt":
    import ctypes
    _k32 = ctypes.windll.kernel32
    def alive(pid):
        try: pid = int(pid)
        except Exception: return False
        if pid <= 0: return False
        h = _k32.OpenProcess(0x1000, False, pid)
        if not h: return False
        code = ctypes.c_ulong(); ok = _k32.GetExitCodeProcess(h, ctypes.byref(code)); _k32.CloseHandle(h)
        return bool(ok) and code.value == 259
else:
    def alive(pid):
        try: os.kill(int(pid), 0); return True
        except PermissionError: return True      # en la nube el proceso es de otro usuario
        except Exception: return False

def run_files(d): return sorted(x for x in os.listdir(d) if re.match(r"^run\d*\.jsonl$", x))
def session_id(d):
    for f in run_files(d):
        for l in open(os.path.join(d, f), encoding="utf8"):
            if '"subtype":"init"' in l:
                try: return json.loads(l)["session_id"]
                except Exception: pass
    return None

def kit():
    return open(BASE + "/KIT.md", encoding="utf8").read().replace("{APP}", BASE)

def launch(rid, text):
    d = rdir(rid); meta = jload(os.path.join(d, "meta.json"), {})
    turns = meta.setdefault("turns", []); k = len(turns)
    M = _cfg.leer()["modelo"]
    env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY", "OPENAI_API_KEY", "FISH_API_KEY", "RUNPOD_API_KEY", "GROQ_API_KEY", "PEXELS_API_KEY", "GH_TOKEN", "GITHUB_TOKEN")}   # ninguna clave en el entorno del agente
    env.update(CLAUDE_CONFIG_DIR=BRAIN, ANTHROPIC_BASE_URL=f"http://127.0.0.1:{PROXY_PORT}/r/{rid}", ANTHROPIC_AUTH_TOKEN="via-proxy",
               ANTHROPIC_MODEL=M, ANTHROPIC_DEFAULT_OPUS_MODEL=M, ANTHROPIC_DEFAULT_SONNET_MODEL=M, ANTHROPIC_DEFAULT_HAIKU_MODEL=M,
               ANTHROPIC_SMALL_FAST_MODEL=M, CLAUDE_CODE_SUBAGENT_MODEL=M, API_TIMEOUT_MS="600000",
               CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="1", CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=str(meta.get("compact", 40)),
               BASH_MAX_TIMEOUT_MS="600000", BASH_DEFAULT_TIMEOUT_MS="300000", ESTUDIO_DATA=D)
    cmd = [claude_bin(), "-p", "--dangerously-skip-permissions", "--disallowedTools", DISALLOWED, "--output-format", "stream-json", "--verbose",
           "--append-system-prompt", kit()]
    sid = session_id(d)
    if sid: cmd += ["--resume", sid]
    sesion = os.environ.get("ESTUDIO_USUARIO_SESION")
    if sesion:       # nube: otro usuario de Linux, sin acceso a las claves, y con entorno armado por lista blanca
        pasa = {x: v for x, v in env.items() if x in ("PATH", "LANG", "LC_ALL", "TZ", "GITHUB_REPOSITORY", "GITHUB_SERVER_URL", "API_TIMEOUT_MS", "BASH_MAX_TIMEOUT_MS", "BASH_DEFAULT_TIMEOUT_MS", "ESTUDIO_DATA") or x.startswith(("ANTHROPIC_", "CLAUDE_"))}
        pasa.update(HOME="/home/" + sesion, USER=sesion, ESTUDIO_CONFIG=os.environ["ESTUDIO_CONFIG_PUB"], ESTUDIO_PUENTE=f"http://127.0.0.1:{PROXY_PORT}")
        cmd = ["sudo", "-n", "-H", "-u", sesion, "--", "env", "-i", *[f"{x}={v}" for x, v in pasa.items()], "sh", "-c", 'umask 002; exec "$0" "$@"', *cmd]
    out = open(os.path.join(d, f"run{k:02d}.jsonl"), "w", encoding="utf8"); err = open(os.path.join(d, f"run{k:02d}.err"), "w", encoding="utf8")
    kw = {"creationflags": 0x00000200 | 0x08000000} if os.name == "nt" else {"start_new_session": True}
    out.close()   # lo escribe el filtro (saca los miles de eventos thinking_tokens que no sirven)
    filt = subprocess.Popen([sys.executable, "-u", BASE + "/tools/filtro_log.py", os.path.join(d, f"run{k:02d}.jsonl")],
                            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=err, **kw)
    p = subprocess.Popen(cmd, cwd=meta.get("cwd") or d, env=env, stdin=subprocess.PIPE, stdout=filt.stdin, stderr=err, **kw)
    filt.stdin.close()
    try: p.stdin.write(text.encode("utf8")); p.stdin.close()
    except Exception: pass
    turns.append({"t": time.time(), "text": text, "pid": p.pid}); meta["pid"] = p.pid
    jsave(os.path.join(d, "meta.json"), meta)

def new_chat(title, text, cwd, cap, compact, extra=None):
    rid = datetime.now().strftime("%m%d-%H%M%S"); d = rdir(rid)
    while os.path.exists(d): time.sleep(1); rid = datetime.now().strftime("%m%d-%H%M%S"); d = rdir(rid)
    os.makedirs(d)
    if cwd: os.makedirs(cwd, exist_ok=True)
    m = {"id": rid, "title": title or text[:60], "cwd": cwd or d, "cap": cap, "compact": compact, "created": time.time(), "turns": []}
    m.update(extra or {}); jsave(os.path.join(d, "meta.json"), m)
    launch(rid, text); return rid

def stop(rid):
    meta = jload(os.path.join(rdir(rid), "meta.json"), {})
    if meta.get("pid"):
        if os.name == "nt": subprocess.run(["taskkill", "/T", "/F", "/PID", str(meta["pid"])], capture_output=True)
        else:
            if os.environ.get("ESTUDIO_USUARIO_SESION"): subprocess.run(["sudo", "-n", "pkill", "-9", "-u", os.environ["ESTUDIO_USUARIO_SESION"]], capture_output=True); return
            try: os.killpg(int(meta["pid"]), 9)
            except Exception: pass


# lectura INCREMENTAL de los registros (pesan decenas de MB por las imágenes)
_EV, _TC, _EVL = {}, {}, threading.Lock()
def _line_ev(l):
    try: e = json.loads(l)
    except Exception: return []
    out, t = [], e.get("type")
    if t == "assistant":
        for c in e["message"].get("content", []):
            if c.get("type") == "text" and c["text"].strip(): out.append({"k": "ai", "t": short(c["text"], 6000)})
            elif c.get("type") == "tool_use":
                a = c.get("input", {})
                out.append({"k": "tool", "n": c.get("name"), "d": short(a.get("description") or a.get("file_path") or a.get("pattern") or "", 160),
                            "t": short(a.get("command") or a.get("content") or a.get("new_string") or a, 2500)})
    elif t == "user":
        cs = e.get("message", {}).get("content", [])
        for c in cs if isinstance(cs, list) else []:
            if c.get("type") == "tool_result":
                r = c.get("content")
                if isinstance(r, list): r = " ".join(x.get("text", "[imagen]") for x in r if isinstance(x, dict))
                out.append({"k": "res", "err": bool(c.get("is_error")), "t": short(r or "", 2000)})
    elif t == "result":
        out.append({"k": "end", "t": short(e.get("result", ""), 6000), "err": bool(e.get("is_error"))})
    return out

def events(rid):
    d = rdir(rid); meta = jload(os.path.join(d, "meta.json"), {}); out = []; tl = meta.get("turns", [])
    for i, f in enumerate(run_files(d)):
        if i < len(tl): out.append({"k": "user", "t": short(tl[i]["text"], 20000)})
        path = os.path.join(d, f)
        with _EVL:
            size = os.path.getsize(path); c = _EV.get(path)
            if not c or size < c[0]: c = [0, [], b""]
            if size > c[0]:
                with open(path, "rb") as fh: fh.seek(c[0]); data = c[2] + fh.read(size - c[0])
                c[0] = size; ls = data.split(b"\n"); c[2] = ls.pop()
                for l in ls:
                    if l.strip(): c[1].extend(_line_ev(l.decode("utf8", "replace")))
                _EV[path] = c
            out.extend(c[1])
    return out

def _turns(fp):
    with _EVL:
        size = os.path.getsize(fp); c = _TC.get(fp)
        if not c or size < c[0]: c = [0, 0, b""]
        if size > c[0]:
            with open(fp, "rb") as fh: fh.seek(c[0]); data = c[2] + fh.read(size - c[0])
            c[0] = size; ls = data.split(b"\n"); c[2] = ls.pop(); c[1] += sum(1 for l in ls if b'"type":"assistant"' in l)
            _TC[fp] = c
        return c[1]

def summary(rid):
    d = rdir(rid); meta = jload(os.path.join(d, "meta.json"), {}); s = spent(rid)
    running = alive(meta.get("pid"))
    last = meta.get("created", 0); turns = 0
    for f in run_files(d):
        fp = os.path.join(d, f); last = max(last, os.path.getmtime(fp)); turns += _turns(fp)
    return {"id": rid, "title": meta.get("title", rid), "running": running, "usd": round(s["usd"], 4), "cap": meta.get("cap"),
            "calls": s["calls"], "peak_calls": s["peak_calls"], "hit": s["hit"], "miss": s["miss"], "out": s["out"], "ctx": s["ctx"],
            "turns": turns, "created": meta.get("created", 0), "last": last, "cwd": meta.get("cwd"), "compact": meta.get("compact", 40), "legacy": False}

BAL = {"t": 0, "v": None}
def balance():
    if time.time() - BAL["t"] > 60:
        BAL["t"] = time.time()
        try:
            q = urllib.request.Request("https://api.deepseek.com/user/balance", headers={"Authorization": "Bearer " + (_cfg.leer().get("deepseek") or "")})
            BAL["v"] = float(json.load(urllib.request.urlopen(q, timeout=15))["balance_infos"][0]["total_balance"])
        except Exception: BAL["v"] = None
    return BAL["v"]


# ───────────── escaneo de la carpeta del video → pipeline ─────────────
def dur(f):
    try: m = os.path.getmtime(f)
    except OSError: return 0.0
    k = (f, m)
    if k not in PROBE:
        try: PROBE[k] = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, timeout=20).stdout.strip() or 0)
        except Exception: PROBE[k] = 0.0
    return PROBE[k]

def scan(cwd):
    r = {"guion": None, "voz_blocks": [], "master": None, "captions": None, "plan": None, "av_img": [], "av_vid": [], "fotos": [],
         "clips": [], "sfx": [], "segments": [], "final": None, "reporte": None, "meta": None, "qc": []}
    if not cwd or not os.path.isdir(cwd): return r
    for d, dirs, files in os.walk(cwd):
        rel = os.path.relpath(d, cwd).replace("\\", "/"); depth = 0 if rel == "." else rel.count("/") + 1
        dirs[:] = [x for x in dirs if x.lower() not in {"refs", "_asr", "it", "_t", "xf_tmp"} and not x.startswith(".") and depth < 3]
        parts = set(rel.lower().split("/"))
        is_av = "avatar" in parts; is_qc = "qc" in parts
        for f in files:
            fl = f.lower(); full = os.path.join(d, f).replace("\\", "/"); rf = f if rel == "." else rel + "/" + f
            if depth == 0:
                if fl == "guion.txt": r["guion"] = full
                elif fl == "final.mp4": r["final"] = full
                elif fl == "reporte.md": r["reporte"] = full
                elif fl == "meta.json": r["meta"] = full
                elif fl == "plan.json": r["plan"] = full
                elif fl == "captions.json": r["captions"] = full
            if fl.endswith(IMG_EXT):
                if is_qc: r["qc"].append(rf)
                elif is_av: r["av_img"].append(rf)
                elif depth > 0: r["fotos"].append(rf)
            elif fl.endswith(".mp4") and fl != "final.mp4" and not fl.endswith(".tmp.mp4"):
                if "segments" in parts: r["segments"].append(rf)
                elif is_av: r["av_vid"].append(rf)
                elif depth > 0: r["clips"].append(rf)
            elif fl.endswith((".wav", ".mp3")):
                if "sfx" in parts: r["sfx"].append(rf)
                elif "voz" in parts:
                    if fl == "master.wav": r["master"] = full
                    elif fl.startswith("blk"): r["voz_blocks"].append(rf)
    return r

def pipeline(cwd, running):
    s = cached(("scan", cwd), 4, lambda: scan(cwd))
    words = 0
    if s["guion"]:
        try: words = len(open(s["guion"], encoding="utf8", errors="ignore").read().split())
        except Exception: pass
    vdur = dur(s["master"]) if s["master"] else 0
    has = {"guion": bool(s["guion"]), "voz": bool(s["master"] or s["voz_blocks"]), "tiempos": bool(s["captions"]),
           "avatar": bool(s["av_vid"]), "fotos": bool(s["fotos"]), "armado": bool(s["segments"] or s["final"]), "qc": bool(s["reporte"])}
    info = {"guion": f"{words:,} palabras".replace(",", ".") if words else "",
            "voz": (f"{int(vdur // 60)}:{int(vdur % 60):02d} min" if vdur else (f"{len(s['voz_blocks'])} bloques" if s["voz_blocks"] else "")),
            "tiempos": "por palabra" if s["captions"] else "",
            "avatar": f"{len(s['av_vid'])} clips" if s["av_vid"] else "",
            "fotos": f"{len(s['fotos'])} fotos" if s["fotos"] else "",
            "armado": ("final.mp4 · " + f"{dur(s['final']) / 60:.1f} min") if s["final"] else (f"{len(s['segments'])} segmentos" if s["segments"] else ""),
            "qc": "REPORTE.md" if s["reporte"] else ""}
    last = max([i for i, (k, _) in enumerate(STEPS) if has[k]], default=-1)
    complete = bool(s["final"] and s["reporte"])
    steps = []
    for i, (k, n) in enumerate(STEPS):
        if complete or i < last: st = "done" if has[k] else "skip"
        elif i == last: st = "active" if running else "done"
        else: st = "pending"
        steps.append({"k": k, "n": n, "st": st, "info": info[k]})
    done = sum(1 for x in steps if x["st"] in ("done", "skip"))
    return {"steps": steps, "done": done, "total": len(STEPS), "complete": complete, "voice_dur": vdur,
            "counts": {"fotos": len(s["fotos"]), "clips": len(s["clips"]), "avatar": len(s["av_vid"]), "segments": len(s["segments"])},
            "final": bool(s["final"]), "reporte": bool(s["reporte"]), "meta_ok": bool(s["meta"])}

def video(rid):
    s = summary(rid); meta = jload(os.path.join(rdir(rid), "meta.json"), {})
    cwd = meta.get("cwd") or rdir(rid)
    pl = pipeline(cwd, s["running"]); g = gasto_carpeta(cwd)
    c = {"deepseek": s["usd"], "gpt": round(g["fotos_gpt"], 4), "gpt_img": g["fotos_n"], "whisper": round(g["whisper"], 4), "avatar": round(g["avatar_runpod"], 2)}
    c["total"] = round(c["deepseek"] + c["gpt"] + c["whisper"] + c["avatar"], 4)
    sc = cached(("scan", cwd), 4, lambda: scan(cwd))
    rel = lambda f: os.path.relpath(f, cwd).replace("\\", "/") if f else None
    files = {k: rel(sc[k]) for k in ("guion", "master", "final", "reporte", "captions", "plan", "meta")}
    v = dict(s); v.update(pipeline=pl, files=files, cost=c, canal=meta.get("canal"), card_title=meta.get("video_title"), cwd=cwd,
                          slug=os.path.basename(norm(cwd)), cola=len(meta.get("cola") or []),
                          cover=(sorted(sc["fotos"])[len(sc["fotos"]) // 3] if sc.get("fotos") else None))
    m = manual(rid, cwd); v["manual"] = {"total": len(m), "faltan": sum(1 for x in m if not x["lista"])} if m else None
    stalled = s["running"] and time.time() - s["last"] > 900
    v["estado"] = "tope" if (s.get("cap") and s["usd"] >= float(s["cap"]) * 0.98) else ("trabado" if stalled else ("trabajando" if s["running"] else ("listo" if pl["complete"] else "parado")))
    return v

IMG_EXT = (".png", ".jpg", ".jpeg", ".webp")
def manual(rid, cwd=None):
    """Fotos "Las hago yo": la lista que escribió fotos.py, con lo que ya se subió."""
    if not cwd: cwd = jload(os.path.join(rdir(rid), "meta.json"), {}).get("cwd") or rdir(rid)
    L = jload(os.path.join(cwd, "fotos", "_manual.json"), None)
    if not isinstance(L, list): return []
    for x in L: x["lista"] = any(os.path.exists(os.path.join(cwd, "fotos", x["id"] + e)) for e in IMG_EXT)
    return L

def subir_foto(rid, fid, data, nombre):
    cwd = jload(os.path.join(rdir(rid), "meta.json"), {}).get("cwd") or rdir(rid)
    if fid not in {x["id"] for x in manual(rid, cwd)}: raise ValueError("esa foto no está en la lista")
    ext = os.path.splitext(nombre or "")[1].lower()
    if ext not in IMG_EXT: raise ValueError("tiene que ser .png, .jpg o .webp")
    if len(data) < 1000: raise ValueError("el archivo está vacío")
    for e in IMG_EXT:   # una sola versión por id
        old = os.path.join(cwd, "fotos", fid + e)
        if os.path.exists(old): os.remove(old)
    open(os.path.join(cwd, "fotos", fid + (".jpg" if ext == ".jpeg" else ext)), "wb").write(data)

def gallery(rid):
    v = video(rid); cwd = v["cwd"]; s = cached(("scan", cwd), 4, lambda: scan(cwd))
    items = []
    for rel in s["fotos"] + s["av_img"]:
        try: items.append({"p": rel, "m": os.path.getmtime(os.path.join(cwd, rel)), "av": rel in s["av_img"]})
        except OSError: pass
    items.sort(key=lambda x: -x["m"])
    clips = []
    for rel in s["av_vid"] + s["clips"]:
        try: clips.append({"p": rel, "m": os.path.getmtime(os.path.join(cwd, rel)), "av": rel in s["av_vid"]})
        except OSError: pass
    clips.sort(key=lambda x: -x["m"])
    return {"fotos": items, "clips": clips, "qc": sorted(s["qc"])[:80]}

def timeline(rid):
    v = video(rid); cwd = v["cwd"]; s = cached(("scan", cwd), 4, lambda: scan(cwd))
    out = {"dur": v["pipeline"]["voice_dur"], "lanes": [], "sent": [], "final": bool(s["final"]), "master": None}
    if s["master"]: out["master"] = os.path.relpath(s["master"], cwd).replace("\\", "/")
    if s["plan"]:
        try:
            pj = json.load(open(s["plan"], encoding="utf8"))
            out["dur"] = out["dur"] or pj.get("voice_dur") or 0
            for g in pj.get("segments") or []:
                k = str(g.get("kind", "")).lower(); k = "avatar" if k.startswith("av") else ("clip" if "clip" in k else "foto")
                f = g.get("file") or ""
                out["lanes"].append({"t0": g["t0"], "t1": g["t1"], "k": k, "f": os.path.relpath(f, cwd).replace("\\", "/") if f and os.path.isabs(f) else f})
        except Exception as e: out["err"] = str(e)
    if not out["lanes"]:   # plan a medio hacer: shots_timed.json (+ avatar_ranges.json) antes del render
        try:
            for g in jload(os.path.join(cwd, "shots_timed.json"), []) or []:
                if "startMs" not in g: continue
                f = next((f"fotos/{g.get('id')}{e}" for e in (".png", ".jpg") if os.path.exists(os.path.join(cwd, "fotos", str(g.get("id")) + e))), "")
                out["lanes"].append({"t0": g["startMs"] / 1000, "t1": g.get("endMs", g["startMs"]) / 1000, "k": "foto", "f": f, "pend": not f})
            for g in jload(os.path.join(cwd, "avatar_ranges.json"), []) or []:
                out["lanes"].append({"t0": g["startMs"] / 1000, "t1": g["endMs"] / 1000, "k": "avatar", "f": g.get("file", "")})
        except Exception as e: out["err"] = str(e)
    if not s["final"]:   # lo que el avatar todavía no trajo: el visor muestra su cuadro fijo con «Esperando avatar»
        try:
            R = jload(os.path.join(cwd, "avatar_ranges.json"), []) or []
            for x in out["lanes"]:
                if x["k"] != "avatar": continue
                r = next((g for g in R if g.get("startMs", 0) / 1000 - .05 <= x["t0"] < g.get("endMs", 0) / 1000), None)
                if r and r.get("frame") and os.path.exists(os.path.join(cwd, r["frame"])): x["fr"] = r["frame"]
                if not (str(x.get("f") or "").lower().endswith(".mp4") and os.path.exists(os.path.join(cwd, x["f"]))): x["pend"] = True
        except Exception as e: out["err"] = str(e)
    if s["captions"]:
        try:
            cj = json.load(open(s["captions"], encoding="utf8")); cur, s0 = [], None
            for w in cj:
                if s0 is None: s0 = w["startMs"] / 1000
                cur.append(w["text"].strip())
                if re.search(r"[.!?]$", w["text"].strip()) or len(cur) > 25:
                    out["sent"].append({"t": " ".join(cur), "s": s0, "e": w["endMs"] / 1000}); cur, s0 = [], None
            if cur: out["sent"].append({"t": " ".join(cur), "s": s0, "e": cj[-1]["endMs"] / 1000})
            out["dur"] = out["dur"] or cj[-1]["endMs"] / 1000
        except Exception: pass
    return out

def prompt_for(cwd, rel):
    side = os.path.join(cwd, os.path.splitext(rel)[0] + ".json")
    try: return open(side, encoding="utf8").read()
    except Exception: return None

def cola_loop():   # entrega los mensajes en cola cuando el chat termina su turno
    while True:
        time.sleep(8)
        try:
            for rid in os.listdir(RUNS):
                f = os.path.join(rdir(rid), "meta.json"); m = jload(f, {})
                if not m.get("cola") or summary(rid)["running"]: continue
                txt = "\n\n".join(m["cola"]); m["cola"] = []; jsave(f, m); launch(rid, txt)
        except Exception as e: print("cola:", e)


# ───────────── configuración: claves (se guardan SÓLO en config.json de esta PC; nunca se devuelven enteras) ─────────────
NOMBRES = {"deepseek": "DeepSeek (el cerebro que arma el video)", "openai": "OpenAI (fotos gpt-image low+Batch y tiempos por palabra)",
           "fish": "Fish Audio (clon de tu voz)", "runpod": "RunPod (avatar InfiniteTalk)", "github": "GitHub (aloja la cara y el audio un rato para RunPod)",
           "groq": "Groq (opcional: tiempos por palabra GRATIS en vez de OpenAI)",
           "pexels": "Pexels (opcional y gratis: clips del modo Ahorro)"}
def silencio_mp3():
    f = os.path.join(D, "_silencio.mp3")
    if not os.path.exists(f): subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "1", f], check=True)
    return open(f, "rb").read()
def whisper_minimo(url, key, modelo):   # transcribe 1 s de silencio: la única forma de saber si hay CRÉDITO (cuesta ~US$0,0001)
    import uuid
    b = uuid.uuid4().hex
    body = (f'--{b}\r\nContent-Disposition: form-data; name="model"\r\n\r\n{modelo}\r\n--{b}\r\nContent-Disposition: form-data; name="file"; filename="s.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n').encode() + silencio_mp3() + f"\r\n--{b}--\r\n".encode()
    urllib.request.urlopen(urllib.request.Request(url, data=body, headers={"Authorization": "Bearer " + key, "Content-Type": "multipart/form-data; boundary=" + b, "User-Agent": "estudio-videos/1.0"}), timeout=60)
def probar(k):
    v = (_cfg.leer().get(k) or "").strip()
    if not v: return {"ok": False, "msg": "falta"}
    def get(url, hd):
        return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=dict(hd, **{"User-Agent": "estudio-videos/1.0"})), timeout=20))
    try:
        if k == "deepseek":
            b = get("https://api.deepseek.com/user/balance", {"Authorization": "Bearer " + v})
            return {"ok": True, "msg": "saldo US$" + str(b["balance_infos"][0]["total_balance"])}
        if k == "openai":
            whisper_minimo("https://api.openai.com/v1/audio/transcriptions", v, "whisper-1"); return {"ok": True, "msg": "clave válida y con crédito"}
        if k == "groq":
            whisper_minimo("https://api.groq.com/openai/v1/audio/transcriptions", v, "whisper-large-v3-turbo"); return {"ok": True, "msg": "anda (tiempos gratis)"}
        if k == "pexels":
            get("https://api.pexels.com/videos/search?query=sea&per_page=1", {"Authorization": v}); return {"ok": True, "msg": "anda (clips gratis)"}
        if k == "fish":
            try: j = get("https://api.fish.audio/wallet/self/api-credit", {"Authorization": "Bearer " + v}); return {"ok": True, "msg": "crédito " + str(j.get("credit", "ok"))}
            except urllib.error.HTTPError as e:
                if e.code in (401, 403): raise
                return {"ok": True, "msg": "clave aceptada"}
        if k == "runpod":
            q = urllib.request.Request("https://api.runpod.io/graphql", data=json.dumps({"query": "query{myself{clientBalance}}"}).encode(),
                                       headers={"Content-Type": "application/json", "Authorization": "Bearer " + v})
            b = (json.load(urllib.request.urlopen(q, timeout=20)).get("data") or {}).get("myself") or {}
            return {"ok": "clientBalance" in b, "msg": ("saldo US$%.2f" % b["clientBalance"]) if "clientBalance" in b else "no pude leer el saldo"}
        if k == "github":
            u = get("https://api.github.com/user", {"Authorization": "Bearer " + v, "User-Agent": "estudio-videos"}); return {"ok": True, "msg": "usuario " + u.get("login", "?")}
    except urllib.error.HTTPError as e:
        t = e.read().decode("utf8", "ignore")
        if re.search(_cfg.SIN_CREDITO, t, re.I): return {"ok": False, "msg": "la clave anda pero NO TIENE CRÉDITO: cargá saldo"}
        return {"ok": False, "msg": f"la rechazó ({e.code})"}
    except Exception as e: return {"ok": False, "msg": "sin respuesta: " + str(e)[:80]}
    return {"ok": False, "msg": "?"}

def requeridas(c=None):
    """Lo que hace falta depende de cómo se hacen las fotos: con "Las hago yo" OpenAI sólo sirve para los tiempos (y Groq lo reemplaza gratis)."""
    c = c or _cfg.leer(); manual = (c.get("fotos_motor") or "openai") == "manual"
    return [k for k in _cfg.CLAVES if not (k == "openai" and manual and (c.get("groq") or "").strip())]

def guardar_config(b):
    c = _cfg.leer()
    for k, v in (b.get("claves") or {}).items():
        if k not in _cfg.CLAVES + _cfg.OPCIONALES: continue
        v = re.sub(r"\s+", "", str(v or ""))
        if v == "-": c.pop(k, None)              # "-" = borrar
        elif v: c[k] = v
    if b.get("fotos_motor") in ("openai", "manual", "ahorro"): c["fotos_motor"] = b["fotos_motor"]
    c = {k: v for k, v in c.items() if k not in _cfg.DEFAULTS or v != _cfg.DEFAULTS[k]}
    _cfg.guardar(c)

def config_estado(probar_ya=False):
    c = _cfg.leer(); req = requeridas(c)
    fin = lambda v: ("••••" + v[-4:]) if len(v) > 8 else "••••"
    out = [{"k": k, "n": NOMBRES[k], "set": bool((c.get(k) or "").strip()), "fin": fin((c.get(k) or "").strip()), "opc": k not in req}
           for k in _cfg.CLAVES + _cfg.OPCIONALES]
    if probar_ya:
        from concurrent.futures import ThreadPoolExecutor
        for x, r in zip(out, ThreadPoolExecutor(6).map(lambda x: probar(x["k"]) if x["set"] else {"ok": False, "msg": "falta"}, out)): x.update(r)
    herr = {h: bool(shutil.which(h)) for h in ("ffmpeg", "ffprobe", "node")}
    herr["claude"] = bool(claude_bin() and os.path.exists(claude_bin()))
    try: import fish_audio_sdk, numpy; herr["python_libs"] = True   # noqa
    except Exception: herr["python_libs"] = False
    return {"claves": out, "herramientas": herr, "datos": D, "config": _cfg.CONFIG, "fotos_motor": c.get("fotos_motor") or "openai"}


# ───────────── canales: avatar, cara, voz, biblia ─────────────
def slugify(t, n=40):
    import unicodedata
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:n] or "x"
def cdir(cid): return os.path.join(_cfg.CANALES, re.sub(r"[^\w-]", "", cid))
def canal_info(cid):
    d = cdir(cid); c = jload(os.path.join(d, "canal.json"), {}) or {}
    c["id"] = cid
    c["tiene"] = {x: os.path.exists(os.path.join(d, x)) for x in ("avatar.png", "cara.png", "voz.wav")}
    c["voz_txt"] = os.path.exists(os.path.join(d, "voz.txt"))
    c["listo"] = all(c["tiene"].values()) and bool(c.get("nombre"))
    return c
def canales(): return [canal_info(x) for x in sorted(os.listdir(_cfg.CANALES)) if os.path.exists(os.path.join(cdir(x), "canal.json"))]

def guardar_canal(b):
    cid = b.get("id") or slugify(b.get("nombre") or "canal")
    d = cdir(cid); os.makedirs(d, exist_ok=True)
    c = jload(os.path.join(d, "canal.json"), {}) or {}
    for k in ("nombre", "idioma", "presentador", "escena", "biblia", "prohibidas", "min"):
        if k in b: c[k] = b[k]
    jsave(os.path.join(d, "canal.json"), c); return cid

def subir_canal(cid, tipo, data, nombre):
    d = cdir(cid)
    if not os.path.exists(os.path.join(d, "canal.json")): raise ValueError("canal inexistente")
    ext = os.path.splitext(nombre or "")[1].lower() or ".bin"
    tmp = os.path.join(d, "_subida" + ext); open(tmp, "wb").write(data)
    try:
        if tipo == "avatar":
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-frames:v", "1", os.path.join(d, "avatar.png")], check=True)
            for x in ("cara.png",):   # la cara se vuelve a marcar sobre la foto nueva
                if os.path.exists(os.path.join(d, x)): os.remove(os.path.join(d, x))
        elif tipo == "voz":
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-t", "30", "-ac", "1", "-ar", "44100", os.path.join(d, "voz.wav")], check=True)
            try:
                import tiempos
                _, txt = tiempos.transcribir(os.path.join(d, "voz.wav"), (jload(os.path.join(d, "canal.json"), {}) or {}).get("idioma", ""))
                open(os.path.join(d, "voz.txt"), "w", encoding="utf8").write(txt.strip())
            except BaseException as e: print("transcribir muestra:", e)   # sin texto también anda (un poco menos fiel)
        else: raise ValueError("tipo inválido")
    finally:
        try: os.remove(tmp)
        except OSError: pass

def recortar_cara(cid, x, y, w):
    """x, y, w en fracciones de la foto (0-1): recuadro 2:3 de la cara → cara.png 128x192 (lo que pide gpt-image para la identidad)."""
    d = cdir(cid); src = os.path.join(d, "avatar.png")
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", src], capture_output=True, text=True).stdout)["streams"][0]
    W, H = pr["width"], pr["height"]; cw = max(16, int(w * W)); ch = int(cw * 1.5)
    cx, cy = max(0, min(W - cw, int(x * W))), max(0, min(H - ch, int(y * H)))
    if ch > H: ch = H; cw = int(ch / 1.5)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"crop={cw}:{ch}:{cx}:{cy},scale=128:192", os.path.join(d, "cara.png")], check=True)
    c = jload(os.path.join(d, "canal.json"), {}) or {}; c["cara_cx"] = round((cx + cw / 2) / W, 4)   # centro horizontal de la cara
    jsave(os.path.join(d, "canal.json"), c)


# ───────────── nuevo video desde un canal ─────────────
def alertas():
    a = jload(_cfg.ALERTAS, {}) or {}
    return [x["msg"] for x in a.values() if time.time() - x.get("t", 0) < 3 * 3600]

def faltan_para_video():
    c = _cfg.leer(); return [NOMBRES[k] for k in requeridas(c) if not (c.get(k) or "").strip()]

AHORRO = ("\n**MODO AHORRO (lo eligió el usuario):** seguí el §4c del KIT. Alrededor de la mitad de los planos va con foto de gpt-image (incluidas las del presentador y las creativas), repartidas por todo el video para que el canal no pierda su identidad; "
          "los demás planos van con clips de stock por tools/stock.py. Esto manda sobre lo que el brief diga de la cantidad de fotos.")

def nuevo_video(b):
    f = faltan_para_video()
    if f: raise ValueError("faltan claves: " + "; ".join(f) + ". Cargalas en Configuración.")
    c = canal_info(b["canal"])
    if not c["listo"]: raise ValueError("el canal no está completo: subí la foto, marcá la cara y subí la voz")
    titulo = (b.get("titulo") or "").strip()
    if not titulo: raise ValueError("falta el título")
    mins = float(b.get("min") or c.get("min") or 10)
    cwd = os.path.join(_cfg.VIDEOS, slugify(titulo)).replace("\\", "/"); base, i = cwd, 2
    while os.path.exists(cwd): cwd = f"{base}-{i}"; i += 1
    if not os.path.exists(os.path.join(cdir(c["id"]), "voz.txt")):   # la muestra se subió antes de tener la clave de OpenAI
        try:
            import tiempos
            _, txt = tiempos.transcribir(os.path.join(cdir(c["id"]), "voz.wav"), c.get("idioma", ""))
            open(os.path.join(cdir(c["id"]), "voz.txt"), "w", encoding="utf8").write(txt.strip())
        except BaseException as e: print("transcribir muestra:", e)
    os.makedirs(cwd + "/refs"); os.makedirs(cwd + "/voz"); os.makedirs(cwd + "/avatar"); os.makedirs(cwd + "/fotos")
    for x in ("avatar.png", "cara.png", "voz.wav", "voz.txt", "canal.json"):
        s = os.path.join(cdir(c["id"]), x)
        if os.path.exists(s): shutil.copy2(s, os.path.join(cwd, "refs", x))
    idi = (c.get("idioma") or "es").strip()
    IDN = {"es": "español", "en": "inglés", "pt": "portugués", "fr": "francés", "it": "italiano", "de": "alemán"}
    rep = {"{TITULO}": titulo, "{CANAL}": c.get("nombre", ""), "{IDIOMA}": IDN.get(idi, idi), "{IDI}": idi, "{MIN}": f"{mins:g}", "{CHARS}": f"{int(mins * 1000):,}".replace(",", "."), "{CHARS}": f"{int(mins * 1000):,}".replace(",", "."),
           "{IDEA}": (b.get("idea") or "").strip() or "(sin indicación: elegí vos el mejor ángulo para ese título)",
           "{BIBLIA}": (c.get("biblia") or "").strip() or "(no hay biblia: inventá lo mínimo y anotalo en el REPORTE)",
           "{PRESENTADOR}": c.get("presentador") or "el presentador de la foto", "{ESCENA}": c.get("escena") or "su casa",
           "{NFOTOS}": str(int(mins * 60 * (1 - min(0.5, 560 / (mins * 60))) / 4.5)), "{EXTRA}": ((b.get("extra") or "").strip() + (AHORRO if _cfg.leer().get("fotos_motor") == "ahorro" else "") + ("\nPalabras PROHIBIDAS en el guion (el validador frena si aparecen): " + c["prohibidas"] if (c.get("prohibidas") or "").strip() else "")).strip(), "{CWD}": cwd, "{APP}": BASE}
    brief = open(BASE + "/plantilla_brief.md", encoding="utf8").read()
    for k, v in rep.items(): brief = brief.replace(k, v)
    open(cwd + "/BRIEF.md", "w", encoding="utf8").write(brief)
    msg = ("Hacé este video completo de punta a punta, solo, sin preguntar y sin frenar. Tus herramientas están en el KIT del system prompt. "
           f"Este es el brief entero (también quedó en {cwd}/BRIEF.md por si lo necesitás releer después de una compactación):\n\n" + brief)
    return new_chat(f"{c.get('nombre')} · {titulo[:50]}", msg, cwd, float(b.get("cap") or 2), 40, {"canal": c.get("nombre"), "video_title": titulo})


# ───────────── HTTP ─────────────
def safe_path(rid, rel):
    m = jload(os.path.join(rdir(rid), "meta.json"), {}); cwd = m.get("cwd") or rdir(rid)
    full = os.path.abspath(os.path.join(cwd, rel))
    if not norm(full).startswith(norm(cwd) + "/") or not os.path.isfile(full): return None
    return full

def thumb(src, w, outdir):
    os.makedirs(outdir, exist_ok=True)
    h = hashlib.sha1(f"{src}|{os.path.getmtime(src)}|{w}".encode()).hexdigest()[:16]; out = os.path.join(outdir, h + ".jpg")
    if not os.path.exists(out):
        for ss in ((["-ss", "1"] if src.lower().endswith(".mp4") else []), []):
            subprocess.run(["ffmpeg", "-v", "error", "-y"] + ss + ["-i", src, "-frames:v", "1", "-vf", f"scale={w}:-2", "-q:v", "4", out], capture_output=True, timeout=30)
            if os.path.exists(out): break
    return out if os.path.exists(out) else None

def wave(rid):
    v = video(rid); m = v["files"].get("master")
    src = safe_path(rid, m) if m else None
    if not src: return None
    out = os.path.join(rdir(rid), "_t", "wave_" + hashlib.sha1(f"{src}|{os.path.getmtime(src)}".encode()).hexdigest()[:12] + ".png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if not os.path.exists(out):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", "aformat=channel_layouts=mono,compand=gain=4,showwavespic=s=2400x120:colors=white", "-frames:v", "1", out], capture_output=True, timeout=120)
    return out if os.path.exists(out) else None

class App(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def ok(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get("k", [""])[0]
        return hmac.compare_digest((self.headers.get("X-K") or q).encode(), TOKEN.encode())
    def send(self, body, ct="application/json", code=200, extra=None):
        b = body.encode("utf8") if isinstance(body, str) else body
        self.send_response(code); self.send_header("Content-Type", ct); self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)
    def js(self, o, code=200): self.send(json.dumps(o, ensure_ascii=False), code=code)
    def file(self, full, cache=True, nombre=None):
        size = os.path.getsize(full); ct = mimetypes.guess_type(full)[0] or "application/octet-stream"
        rng = self.headers.get("Range"); a, b = 0, size - 1
        m = re.match(r"bytes=(\d*)-(\d*)", rng or "")
        if m and not nombre:
            if m.group(1): a = int(m.group(1))
            if m.group(2): b = min(int(m.group(2)), size - 1)
            elif not m.group(1): a = size - int(m.group(2) or 0)
            self.send_response(206); self.send_header("Content-Range", f"bytes {a}-{b}/{size}")
        else: self.send_response(200)
        self.send_header("Content-Type", ct); self.send_header("Accept-Ranges", "bytes"); self.send_header("Content-Length", str(b - a + 1))
        if nombre: self.send_header("Content-Disposition", f'attachment; filename="{nombre}"')
        self.send_header("Cache-Control", "private, max-age=3600" if cache else "no-store"); self.end_headers()
        with open(full, "rb") as f:
            f.seek(a); left = b - a + 1
            while left > 0:
                ch = f.read(min(1 << 20, left))
                if not ch: break
                try: self.wfile.write(ch)
                except Exception: return
                left -= len(ch)
    def do_GET(self):
        if not self.ok(): self.send("Falta la clave local: abrí el Estudio con iniciar.bat", "text/plain; charset=utf-8", 403); return
        p = urllib.parse.urlparse(self.path); q = {k: v[0] for k, v in urllib.parse.parse_qs(p.query).items()}
        try:
            if p.path == "/": self.send(open(BASE + "/estudio.html", encoding="utf8").read(), "text/html; charset=utf-8")
            elif p.path == "/api/home":
                ids = [r for r in os.listdir(RUNS) if os.path.exists(os.path.join(rdir(r), "meta.json"))]
                vids, porcwd = [video(r) for r in ids], {}
                for v in sorted(vids, key=lambda c: -c["last"]):   # una tarjeta por carpeta
                    k = norm(v["cwd"]).lower()
                    if k in porcwd:
                        u = porcwd[k]; u["cost"]["deepseek"] = round(u["cost"]["deepseek"] + v["cost"]["deepseek"], 4)
                        u["cost"]["total"] = round(u["cost"]["total"] + v["cost"]["deepseek"], 4)
                    else: porcwd[k] = v
                vids = sorted(porcwd.values(), key=lambda c: (c["estado"] not in ("trabajando", "trabado", "tope"), -c["last"]))
                self.js({"videos": vids, "q": {"balance": balance(), "peak_now": peak(time.time()), "utc": datetime.now(timezone.utc).strftime("%H:%M")},
                         "faltan": faltan_para_video(), "canales": len(canales()), "alertas": alertas()})
            elif p.path == "/api/video": self.js(video(q["id"]))
            elif p.path == "/api/manual": self.js({"fotos": manual(q["id"])})
            elif p.path == "/api/gallery": self.js(gallery(q["id"]))
            elif p.path == "/api/timeline": self.js(timeline(q["id"]))
            elif p.path == "/api/prompt": self.js({"p": prompt_for(video(q["id"])["cwd"], q["p"])})
            elif p.path == "/api/chat":
                ev = events(q["id"]); d = int(q.get("desde", 0)); self.js({"total": len(ev), "ev": ev[d:], "s": summary(q["id"])})
            elif p.path == "/api/config": self.js(config_estado(q.get("probar") == "1"))
            elif p.path == "/api/canales": self.js(canales())
            elif p.path == "/canal_img":
                f = os.path.join(cdir(q["id"]), "cara.png" if q.get("f") == "cara" else "avatar.png")
                if not os.path.exists(f): self.send("404", "text/plain", 404); return
                self.file(f, cache=False)
            elif p.path == "/canal_voz":
                f = os.path.join(cdir(q["id"]), "voz.wav")
                if not os.path.exists(f): self.send("404", "text/plain", 404); return
                self.file(f, cache=False)
            elif p.path == "/f":
                full = safe_path(q["id"], q["p"])
                if not full: self.send("404", "text/plain", 404); return
                self.file(full, cache=not full.lower().endswith((".json", ".md", ".txt")))
            elif p.path == "/descargar":
                v = video(q["id"]); full = safe_path(q["id"], "final.mp4")
                if not full: self.send("todavía no hay final.mp4", "text/plain; charset=utf-8", 404); return
                self.file(full, cache=False, nombre=v["slug"] + ".mp4")
            elif p.path == "/wave":
                w = wave(q["id"])
                if not w: self.send("404", "text/plain", 404); return
                self.file(w)
            elif p.path == "/t":
                src = safe_path(q["id"], q["p"]); t = thumb(src, int(q.get("w", 420)), os.path.join(rdir(q["id"]), "_t")) if src else None
                if not t: self.send("404", "text/plain", 404); return
                self.file(t)
            else: self.send("404", "text/plain", 404)
        except (BrokenPipeError, ConnectionResetError): pass
        except Exception as e:
            try: self.js({"error": str(e)}, 500)
            except Exception: pass
    def do_POST(self):
        if not self.ok(): self.send("403", "text/plain", 403); return
        p = urllib.parse.urlparse(self.path); q = {k: v[0] for k, v in urllib.parse.parse_qs(p.query).items()}
        n = int(self.headers.get("Content-Length") or 0)
        if n > 200 * 1024 * 1024: self.js({"error": "archivo muy grande (máx 200 MB)"}, 413); return
        raw = self.rfile.read(n) if n else b""
        try:
            if p.path == "/api/foto_subir":
                subir_foto(q["id"], q["foto"], raw, q.get("nombre", "")); self.js({"fotos": manual(q["id"])}); return
            if p.path == "/api/canal_subir":
                subir_canal(q["id"], q["tipo"], raw, q.get("nombre", "")); self.js(canal_info(q["id"])); return
            b = json.loads(raw or b"{}")
            if p.path == "/api/new":
                cwd = (b.get("cwd") or "").strip() or os.path.join(_cfg.VIDEOS, "chat-" + datetime.now().strftime("%m%d-%H%M%S")).replace("\\", "/")
                self.js({"id": new_chat(b.get("title", ""), b["text"], cwd, float(b.get("cap") or 1), int(b.get("compact") or 40))})
            elif p.path == "/api/send":
                s = summary(b["id"]); t = (b.get("text") or "").strip()
                if not t: self.js({"error": "mensaje vacío"}, 400); return
                if s["running"]:
                    f = os.path.join(rdir(b["id"]), "meta.json"); m = jload(f, {}); m.setdefault("cola", []).append(t); jsave(f, m)
                    self.js({"ok": True, "cola": len(m["cola"])}); return
                launch(b["id"], t); self.js({"ok": True})
            elif p.path == "/api/stop": stop(b["id"]); self.js({"ok": True})
            elif p.path == "/api/cap":
                f = os.path.join(rdir(b["id"]), "meta.json"); m = jload(f, {}); m["cap"] = float(b["cap"]); jsave(f, m); self.js({"ok": True})
            elif p.path == "/api/nuevo": self.js({"id": nuevo_video(b)})
            elif p.path == "/api/canal": self.js(canal_info(guardar_canal(b)))
            elif p.path == "/api/config": guardar_config(b); self.js(config_estado(bool(b.get("probar"))))
            elif p.path == "/api/canal_cara": recortar_cara(b["id"], float(b["x"]), float(b["y"]), float(b["w"])); self.js(canal_info(b["id"]))
            elif p.path == "/api/canal_borrar":
                shutil.rmtree(cdir(b["id"]), ignore_errors=True); self.js({"ok": True})
            else: self.js({"error": "?"}, 404)
        except Exception as e:
            import traceback; traceback.print_exc(); self.js({"error": str(e)}, 500)

class TS(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True

if __name__ == "__main__":
    preparar_brain()
    threading.Thread(target=TS(("127.0.0.1", PROXY_PORT), Proxy).serve_forever, daemon=True).start()
    threading.Thread(target=cola_loop, daemon=True).start()
    url = f"http://127.0.0.1:{PORT}/?k={TOKEN}"
    open(D + "/url.txt", "w").write(url)
    print(f"Estudio listo en {url}\n(datos y claves en {D})", flush=True)
    if os.environ.get("ESTUDIO_NO_BROWSER") != "1": threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    TS(("127.0.0.1", PORT), App).serve_forever()
