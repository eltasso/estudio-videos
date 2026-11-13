# -*- coding: utf-8 -*-
"""ESCENAS FIRMA — la edición se piensa AL PRINCIPIO, con el video entero, y las fotos de esas escenas se ENCARGAN para ellas.
  1) python <APP>/tools/escenas.py <carpeta> ficha [--n 3]
       Después de planos.py y ANTES de pedir las fotos. Lee el guion entero y decide: la tesis, un recurso propio del video y
       las escenas firma (2 a 4), cada una con la FOTO compuesta para que su idea se pueda filmar.
       → escenas/ficha.json y escenas/pedidos_escenas.json (formato de fotos.py). Pedí esas fotos TAL CUAL: no escribas otro prompt para esos planos.
  2) python <APP>/tools/escenas.py <carpeta> construir [--fondo] [--sin-render]
       Con esas fotos ya bajadas. Mira cada foto, ubica las cosas con precisión, describe la escena en CAPAS (no se programa nada)
       y la renderiza. → extrema/manifest.json: render.py la mete sola en la línea, nunca sobre el avatar.
Nunca rompe el video: la escena que no sale queda con su foto normal (que ya estaba pedida). Tope de gasto: --tope 0.10 (US$).
El render a MP4 corre donde corre la edición extrema (en la PC usá --sin-render)."""
import base64, hashlib, io, json, os, re, shutil, subprocess, sys, time, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg, etapas
for _x in (sys.stdout, sys.stderr):
    if hasattr(_x, "reconfigure"): _x.reconfigure(encoding="utf-8", errors="replace")

FPS = 30
PKG = os.path.join(_cfg.APP, "extrema")
MODELO = os.environ.get("ESCENAS_MODELO") or "deepseek-flash"      # el que VE imágenes; sin razonamiento (medido: razonando es 6 veces más lento y no mejora)
IMG = (".png", ".jpg", ".jpeg", ".webp")
TODO = {"x0": -320, "y0": -320, "x1": 2240, "y1": 1400}
TIPO = "amateur phone photo, mild JPEG compression, uneven ordinary indoor light, slightly crooked framing, nothing blurred out, everything in focus, 16:9"
EVITAR = "cinematic lighting, dramatic shadows, studio look, depth-of-field blur, date stamp, watermark, text, letters"


def log(*a): print(time.strftime("%H:%M:%S"), "escenas:", *a, flush=True)
def jl(p, d=None):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return d


class Tope(Exception): pass
class Caja:
    def __init__(s, B, tope): s.B, s.tope, s.usd, s.n = B, float(tope), 0.0, 0
    def sumar(s, u):
        p = _cfg.leer().get("precio") or {"hit": 0.003, "miss": 0.15, "out": 0.6}
        hit = u.get("prompt_cache_hit_tokens", 0); miss = u.get("prompt_cache_miss_tokens", u.get("prompt_tokens", 0) - hit)
        s.usd += (hit * p.get("hit", 0.003) + miss * p["miss"] + u.get("completion_tokens", 0) * p["out"]) / 1e6; s.n += 1
    def cerrar(s):
        if s.usd > 0: _cfg.gasto(s.B, "escenas", s.usd, llamadas=s.n)


def ia(caja, msgs, max_tokens=8000, temperature=0.5):
    """DeepSeek, respuesta JSON, sin razonar. Los mensajes pueden llevar imágenes."""
    if caja.usd >= caja.tope: raise Tope()
    body = {"model": MODELO, "messages": msgs, "max_tokens": max_tokens, "temperature": temperature, "response_format": {"type": "json_object"}, "thinking": {"type": "disabled"}}
    rq = urllib.request.Request(_cfg.url("https://api.deepseek.com/chat/completions"), data=json.dumps(body).encode(),
                                headers={"Authorization": "Bearer " + _cfg.clave("deepseek"), "Content-Type": "application/json", "User-Agent": "estudio-videos/1.0"})
    err = ""
    for k in range(4):
        try:
            r = json.load(urllib.request.urlopen(rq, timeout=280)); caja.sumar(r.get("usage", {}))
            t = r["choices"][0]["message"].get("content") or ""
            try: return json.loads(t)
            except Exception: return json.loads(t[t.find("{"):t.rfind("}") + 1])
        except urllib.error.HTTPError as e:
            err = "HTTP %d" % e.code
            if e.code in (401, 402, 403): raise SystemExit("⛔ DeepSeek rechazó la llamada (%s): revisá la clave y el saldo" % err)
        except Exception as e: err = type(e).__name__
        time.sleep(6 * (k + 1))
    raise RuntimeError("DeepSeek no respondió (%s)" % err)


def con_img(texto, jpgs):
    return [{"type": "text", "text": texto}] + [{"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(j).decode()}} for j in jpgs]


def foto_de(B, pid):
    for e in IMG:
        if os.path.exists(f"{B}/fotos/{pid}{e}"): return f"{B}/fotos/{pid}{e}"
    return None


# ═══════════════════════════════ 1) FICHA: el video entero, antes de las fotos ═══════════════════════════════
SIS_FICHA = """You are the creative director AND editor of a YouTube video. You have the WHOLE script in your head before a single photo exists. That is your advantage: you decide the signature scenes now and you ORDER the photo each one needs, composed so the scene can be filmed.

HOW A GREAT EDITOR THINKS
- The idea comes out of the sentence AND of a photo composed for it. For "One hundred and twelve pieces." the editor ordered an overhead photo of a floor covered with clothes laid out in neat ROWS, with the floor visible between rows; then the photo is cut along those real gaps and each row arrives on screen. For "I made three piles" he ordered an overhead photo of three separate piles with a free strip of floor between them; the photo opens along those strips and the first pile stays alone on screen.
- So the photo is ordered WITH its mechanism in mind: where the camera is (overhead / side / wide), how things are arranged (in a row with free space between them, in N separate groups, one object alone on a surface, an opening such as a window, a mirror, a bowl, a box, a doorway, that can hold another image), and what stays empty (a calm wall or table for words).
- Signature scenes are FEW and sit on sentences that say something concrete and physical: things named one after another, a comparison, a turn of the story, a reveal. Never on abstract advice. Each one uses a DIFFERENT mechanism.
- The photo is a plain, real, still photo. Never ask it for effects (sparks, glows, light rays, motion blur, floating things) and never for something that only exists while moving.
- When a scene cuts the photo into panels, each panel holds ONE separate thing: order them clearly apart, side by side (or one above another), with free space between.
- A video has ONE device of its own that can come back (in a video about nine garments it was a clothes rail that gains one hanger per chapter). It is made of a real photo of this video's world, never a graphic.

WHAT CAN BE FILMED (the player; nothing else exists)
- Photos are STILL. Nothing inside moves by itself; nothing is generated (no liquids, steam, stains growing, objects travelling, hands moving).
- a) the whole photo, a soft zone of it, or the room versus the main subject can lose colour / go dark / blur / go warm, on a word;
- b) a WINDOW (ellipse or rectangle placed on a real thing) through which the same photo changed is seen; it appears on a word, travels, and can GROW until it fills the frame; the photo can also be drawn shrunk inside a real object (a small world inside it);
- c) the photo can be CUT along real straight gaps into 2-7 panels (columns or rows); each panel arrives, slides apart, leaves or takes the whole frame on its word;
- d) ONE continuous camera that travels and pushes to a real thing; e) 1-2 short texts, the speaker's literal words; f) a pool of light.

Answer in JSON only. Write photo fields in English; quote the narration in its own language."""


def ficha(B, n, caja):
    W = [w for w in (jl(f"{B}/captions.json") or []) if str(w.get("text", "")).strip()]
    P = [p for p in (jl(f"{B}/planos.json") or []) if not p.get("split")]
    if len(W) < 20 or not P: raise SystemExit("⛔ faltan captions.json o planos.json: primero tiempos.py y planos.py")
    canal = jl(f"{B}/refs/canal.json", {}) or {}
    guion = open(f"{B}/guion.txt", encoding="utf8").read() if os.path.exists(f"{B}/guion.txt") else " ".join(w["text"].strip() for w in W)
    grupos, g = [], [P[0]]                       # planos seguidos (sin avatar en el medio) = un hueco donde cabe una escena
    for x, y in zip(P, P[1:]):
        if abs(y["startMs"] - x["endMs"]) <= 60: g.append(y)
        else: grupos.append(g); g = [y]
    grupos.append(g)
    L = []
    for k, gr in enumerate(grupos):
        for p in gr: L.append(f"[group {k + 1}] {p['id']} · {p['startMs'] / 1000:.1f}-{p['endMs'] / 1000:.1f}s ({(p['endMs'] - p['startMs']) / 1000:.1f}s) · {p.get('texto', '')}")
    quien = (canal.get("presentador") or "").strip()
    M = jl(f"{B}/mundo.json", {}) or {}        # el mundo del canal (mundo.py): las escenas salen de SUS objetos, no de un catálogo
    mundo = ""
    if M:
        Lk = M.get("4_el_look") or {}
        mundo = ("THIS PERSON'S WORLD (decided before the script; every scene must be made of it):\n"
                 f"- the room: {M.get('1_la_habitacion', '')}\n- what already carries information there: {'; '.join(map(str, M.get('2_lo_que_ya_lleva_informacion', [])))}\n"
                 f"- how they write and mark: {M.get('3_como_escribe_y_marca', '')}\n- the surface everything sits on: {Lk.get('superficie', '')} · signature: {Lk.get('firma', '')}\n"
                 f"- what holds the whole video: {json.dumps(M.get('6_lo_que_sostiene_el_video'), ensure_ascii=False)}\n- never: {(M.get('7_nunca_y_ritmo') or {}).get('nunca')}\n"
                 "Order each scene's photo with THESE objects on THAT surface. The device that holds the whole video is the best candidate for the scene that cuts the photo into panels.\n\n")
    usr = (f"CHANNEL: {canal.get('nombre', '')} {('· ' + str(canal.get('biblia'))[:900]) if canal.get('biblia') else ''}\nPRESENTER: {quien or 'see the script'}\n\n{mundo}THE WHOLE SCRIPT:\n{guion[:24000]}\n\n"
           "THE B-ROLL SHOTS (the only places where a scene can go; the presenter's talking head covers the rest). Shots of the same group are consecutive:\n" + "\n".join(L) +
           f"\n\nWrite the FICHA of this video with exactly {n} signature scenes, spread over the whole video (not two in the same minute, none in the first 20 seconds). "
           "A scene takes 1 or 2 CONSECUTIVE shots of the SAME group and lasts 4 to 11 seconds in total.\n"
           '{"tesis":"one line: what the viewer must believe at the end",\n'
           ' "recurso":{"que":"the ONE device of this video that could come back in every part, made of a real photo of this world","como_vuelve":"what changes each time"},\n'
           ' "escenas":[{"planos":["p012"] or ["p012","p013"],"dice":"the words spoken there","por_que":"what the sentence makes physical",\n'
           '   "mecanismo":"one line: how it works, using a/b/c/d/f above",\n'
           '   "se_ve":"what the viewer sees, beat by beat, each beat on a quoted word of the sentence",\n'
           '   "cosas":["2-6 short noun phrases: the real things of the photo the scene points at"],\n'
           '   "presentador":false,\n'
           '   "foto":{"moment":"what happens in that second and why it matters (70+ characters)","subject":"what is in the photo","action":"the fresh trace of what just happened, or a gesture halfway (30+ characters)",\n'
           '           "props":["6 to 10 concrete objects with material, colour and wear"],"setting":"the real place, full of ordinary things","light":"where the light comes from",\n'
           '           "camera":"the camera position AND the arrangement the mechanism needs (overhead / side; in a row with free space between; separate groups; the opening that will hold another image; what stays empty)","color":"the palette",\n'
           '           "detalle_narrativo":"2 small details that tell a story and that nobody asked for"}}]}\n'
           "At least one scene of type c (cut into panels) if the script names things one after another, and at least one of type b or d. Prefer photos without the presenter's face (hands, objects, the place) unless the scene needs the presenter.")
    msgs = [{"role": "system", "content": SIS_FICHA}, {"role": "user", "content": usr}]
    r = ia(caja, msgs, 9000, 0.8)
    porid = {p["id"]: p for p in P}; grupo_de = {p["id"]: k for k, gr in enumerate(grupos) for p in gr}
    ok, peds, usados = [], [], set()
    cand, mal, vuelta = list(r.get("escenas") or []), [], 0
    while True:
        if not cand:                               # las que no pasaron vuelven UNA vez con el motivo, para llegar a las n pedidas
            if len(ok) >= n or vuelta >= 2 or not mal: break
            vuelta += 1
            libres = [f"{p['id']} ({(p['endMs'] - p['startMs']) / 1000:.1f}s)" for p in P if p["id"] not in usados and p["startMs"] >= 15000 and 3800 <= p["endMs"] - p["startMs"] <= 12000]
            try:
                r2 = ia(caja, msgs + [{"role": "assistant", "content": json.dumps({"escenas": [{"planos": e.get("planos")} for e in (r.get("escenas") or [])]})},
                                      {"role": "user", "content": "Scenes that did not pass, and why:\n" + "\n".join(mal) + f"\n\nWrite {n - len(ok)} MORE scene(s), same format {{\"escenas\":[...]}}, on shots not used yet ({', '.join(sorted(usados)) or 'none'} are taken), "
                                       "each lasting 4 to 11 seconds in total, none in the first 20 seconds. Shots that fit on their own: " + ", ".join(libres[:60])}], 6000, 0.8)
            except SystemExit: raise
            except Exception: break
            cand, mal = list(r2.get("escenas") or []), []
            continue
        e = cand.pop(0)
        if len(ok) >= n: continue
        ped = e.get("planos") or []
        ids = [i for i in ped if i in porid][:2]
        if not ids: mal.append(f"- {ped}: those shot ids do not exist"); continue
        if any(i in usados for i in ids): mal.append(f"- {ped}: already taken by another scene"); continue
        if len(ids) == 2 and (grupo_de[ids[0]] != grupo_de[ids[1]] or abs(porid[ids[1]]["startMs"] - porid[ids[0]]["endMs"]) > 60): ids = ids[:1]
        a, b = porid[ids[0]]["startMs"], porid[ids[-1]]["endMs"]
        if len(ids) == 2 and b - a > 12000: ids = ids[:1]; b = porid[ids[0]]["endMs"]
        if a < 15000: mal.append(f"- {ped}: starts at {a / 1000:.1f}s, inside the first 20 seconds"); continue
        if not 3800 <= b - a <= 12000: mal.append(f"- {ped}: lasts {(b - a) / 1000:.1f}s, it must last 4 to 11 seconds"); continue
        f = e.get("foto") if isinstance(e.get("foto"), dict) else {}
        if not f.get("subject"): mal.append(f"- {ped}: the photo has no subject"); continue
        props = f.get("props") if isinstance(f.get("props"), list) else [x.strip() for x in re.split(r"[;,]", str(f.get("props", ""))) if x.strip()]
        prompt = {"type": ("overhead " if re.search(r"overhead|top-down|from above", str(f.get("camera", "")), re.I) else "") + TIPO,
                  "moment": str(f.get("moment", ""))[:400], "subject": str(f["subject"])[:500], "action": str(f.get("action", ""))[:300], "props": props[:10],
                  "setting": str(f.get("setting", ""))[:300], "light": str(f.get("light", "daylight from a window"))[:160], "camera": str(f.get("camera", ""))[:400],
                  "color": str(f.get("color", "true-to-life colours"))[:160], "detalle_narrativo": str(f.get("detalle_narrativo") or "one small thing out of place that only shows on a second look")[:300], "avoid": EVITAR}
        usados.update(ids)
        ok.append({"id": "es%02d" % (len(ok) + 1), "planos": ids, "foto": ids[0], "startMs": a, "endMs": b, "dice": str(e.get("dice", ""))[:400], "por_que": str(e.get("por_que", ""))[:300],
                   "mecanismo": str(e.get("mecanismo", ""))[:400], "se_ve": str(e.get("se_ve", ""))[:900], "cosas": [str(c)[:60] for c in (e.get("cosas") or [])][:6], "presentador": bool(e.get("presentador"))})
        peds.append({"id": ids[0], "cara": bool(e.get("presentador")), "prompt": prompt})
    os.makedirs(f"{B}/escenas", exist_ok=True)
    json.dump({"tesis": r.get("tesis"), "recurso": r.get("recurso"), "escenas": ok}, open(f"{B}/escenas/ficha.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    json.dump(peds, open(f"{B}/escenas/pedidos_escenas.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print(f"✓ escenas/ficha.json: {len(ok)} escenas firma · tesis: {r.get('tesis')}")
    for e in ok: print(f"  {e['id']} · planos {'+'.join(e['planos'])} · {(e['endMs'] - e['startMs']) / 1000:.1f}s · {e['mecanismo'][:110]}")
    print(f"→ Pedí esas {len(peds)} fotos TAL CUAL (ya pasan la compuerta): python {_cfg.TOOLS}/fotos.py {B} {B}/escenas/pedidos_escenas.json\n"
          f"  Para los planos {', '.join(p['id'] for p in peds)} NO escribas otro prompt. El resto de los planos, como siempre.\n"
          f"  Cuando estén las fotos: python {_cfg.TOOLS}/escenas.py {B} construir --fondo")
    return ok


# ═══════════════════════════════ 2) CONSTRUIR: mirar la foto, describir en capas, validar ═══════════════════════════════
def _fuente(tam):
    from PIL import ImageFont
    try: return ImageFont.truetype("DejaVuSans-Bold.ttf", tam)
    except OSError:
        try: return ImageFont.truetype("arialbd.ttf", tam)
        except OSError: return ImageFont.load_default()


def _rejilla(im, nx, ny, tam):
    from PIL import ImageDraw
    im = im.copy(); d = ImageDraw.Draw(im, "RGBA"); W, H = im.size; cw, ch = W / nx, H / ny; C = {}; fn = _fuente(tam)
    for j in range(ny):
        for i in range(nx):
            x0, y0 = i * cw, j * ch; k = f"{chr(65 + j)}{i + 1}"; C[k] = (x0, y0, x0 + cw, y0 + ch)
            d.rectangle([x0, y0, x0 + cw, y0 + ch], outline=(255, 235, 0, 200), width=2)
            d.text((x0 + 6, y0 + 4), k, font=fn, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0, 255))
    return im, C


def _jpg(im, q=84):
    b = io.BytesIO(); im.convert("RGB").save(b, "JPEG", quality=q); return b.getvalue()


def localizar(caja, im, cosa, cache, clave):
    """Dónde está EXACTAMENTE una cosa (cuadro 1920x1080). Pedir píxeles falla por cientos de px; elegir CELDAS numeradas en dos pasos acierta."""
    k = hashlib.md5(f"{clave}|{cosa}".encode()).hexdigest()
    if k in cache: return cache[k]
    from PIL import Image
    def celdas(g, C):
        r = ia(caja, [{"role": "user", "content": con_img('The image has a yellow grid; every cell has a label at its top-left corner (A1, A2, ... rows are letters, columns are numbers). '
                f'Which cells contain any part of: "{cosa}"? List ONLY the cells it really occupies (usually 1 to 6). If it is not visible, return an empty list. JSON: {{"cells":["B3"],"visible":true}}', [_jpg(g)])}], 1500, 0)
        return [c for c in (r.get("cells") or []) if c in C] if r.get("visible", True) else []
    g, C = _rejilla(im.resize((1280, 720)), 8, 5, 30); cs = celdas(g, C); res = None
    if cs:
        q = 1.5; x0 = max(0, min(C[c][0] for c in cs) * q - 60); y0 = max(0, min(C[c][1] for c in cs) * q - 60); x1 = min(1920, max(C[c][2] for c in cs) * q + 60); y1 = min(1080, max(C[c][3] for c in cs) * q + 60)
        rec = im.crop((int(x0), int(y0), int(x1), int(y1))); s = 1100 / max(rec.size); rec = rec.resize((int(rec.size[0] * s), int(rec.size[1] * s)), Image.LANCZOS)
        g2, C2 = _rejilla(rec, 6, 6, 22); c2 = celdas(g2, C2)
        if c2: x0, y0, x1, y1 = x0 + min(C2[c][0] for c in c2) / s, y0 + min(C2[c][1] for c in c2) / s, x0 + max(C2[c][2] for c in c2) / s, y0 + max(C2[c][3] for c in c2) / s
        res = {"x0": round(x0), "y0": round(y0), "x1": round(x1), "y1": round(y1)}
    cache[k] = res; return res


def sujeto(B, pid, im):
    """El sujeto principal recortado por su contorno real (si rembg está instalado). Devuelve su caja o None: sin recorte, la escena va sin capa de sujeto."""
    d = f"{B}/escenas/_m"; os.makedirs(d, exist_ok=True); o = f"{d}/{pid}.png"; meta = f"{d}/{pid}.json"
    if os.path.exists(o) and os.path.exists(meta): return jl(meta)
    try: from rembg import remove, new_session
    except Exception: return None
    try:
        fg = remove(im, session=new_session("isnet-general-use")); a = fg.split()[3].point(lambda v: 0 if v < 24 else v); fg.putalpha(a); bb = a.getbbox()
        if not bb: return None
        fg.save(o, optimize=True); m = {"x0": bb[0], "y0": bb[1], "x1": bb[2], "y1": bb[3]}; json.dump(m, open(meta, "w")); return m
    except Exception as e: log("recorte del sujeto falló:", type(e).__name__); return None


LENGUAJE = """HOW YOU WRITE THE SCENE: as LAYERS in JSON (a player films it; you never write code, pixel coordinates or seconds).
You point at TIME with word numbers (the narration comes numbered) or "inicio". You point at PLACES by NAMING a thing that is visible in the photo; it is located precisely for you.
{
 "cosas": ["short noun phrase", ...],     // every thing of the photo you point at below (max 6). Real, clearly visible things.
 "camara": [ {"en": "inicio", "mira": "todo", "zoom": 1.05}, {"en": <word>, "mira": "<cosa>", "zoom": 1.5} ],   // ONE continuous camera, 2 to 4 keys. zoom 1 = whole photo, 2 = very tight.
 "cuarto": [ {"en": <word>, "efecto": {"gris": 1, "oscuro": 0.6}} ],     // the ROOM (everything except the cut-out subject) changes tone on that word. efecto: gris 0-1, oscuro 0-1, desenfoque 0-12, calido 0-1. A later key {} brings it back.
 "sujeto": [ {"en": <word>, "efecto": {"gris": 1}} ],                    // the main SUBJECT (cut out along its real contour) changes tone, independently of the room. Only if the brief says a cut-out exists.
 "capas": [ { "efecto": {"gris": 1, "oscuro": 0.7},     // how the photo looks inside the window ({} = normal colour, useful when the room around has changed)
              "encogida": true | false,                 // true = the WHOLE photo shrunk to fit inside the window (a small world inside an object) · false = the photo stays in place and the window shows that part of it differently
              "profundidad": "detras" | "delante",      // behind the cut-out subject, or in front of it
              "forma": "elipse" | "rect",
              "ventana": [ {"en": <word>, "sobre": "<cosa>" | "todo" | "mitad_izq" | "mitad_der" | "nada"}, ... ] } ],    // it APPEARS at the first key, then travels/grows to the next ("todo" = fills the frame, "nada" = closes)
 "hojas": { "direccion": "columnas" | "filas",          // OPTIONAL, instead of cuarto/sujeto/capas: the photo CUT along its real gaps into panels that move. Only when things sit in a row with free space between them.
            "objetos": ["<cosa>", ...],                 // 2 to 7 things, one per panel; the cuts fall in the free space between neighbours
            "pasos": [ {"en": <word>, "hoja": "<cosa>" | "todas", "accion": "entra_izq" | "entra_der" | "entra_arriba" | "entra_abajo" | "aparta" | "sale" | "llena" | "vuelve"} ] },
                                                        // entra_* = that panel arrives from that side on its word (before that it is not there) · aparta = panels slide slightly apart · llena = that panel takes the whole frame, the others leave
 "luz": [ {"sobre": "<cosa>", "desde": <word>, "hasta": <word or null>} ],     // everything goes dark except a pool of light on that thing
 "textos": [ {"txt": "the speaker's literal words, max 28 characters", "en": <word>, "donde": "pantalla_arriba" | "pantalla_abajo" | "<cosa>", "estilo": "mano" | "serif" | "rotulo"} ]     // max 2
}
WHAT MAKES IT WORK
- ONE mechanism, bold: the key change is big on screen and lands exactly on the word that names it.
- Something changes at least every 2.5 seconds (a camera arrival, a window appearing or growing, a panel arriving, a tone change, a text).
- The scene starts as the plain photo (nothing changed at "inicio") so the cut into it is invisible.
- Effects at full strength (gris 1, oscuro 0.6 or more). Timid = invisible.
- A window over a small object is hard to read: let it GROW ("todo", a half, or a bigger thing) on the key word.
- Texts: the speaker's literal words, in the language of the narration, short. Never the whole sentence."""


def _fx(e):
    e = e if isinstance(e, dict) else {}
    num = lambda k: float(e.get(k, 0) or 0) if isinstance(e.get(k, 0), (int, float)) else 0.0
    return {"bw": num("gris"), "dark": num("oscuro"), "blur": num("desenfoque"), "warm": num("calido")}
def _timido(f): return any(f.values()) and f["bw"] + f["dark"] + f["warm"] + f["blur"] / 8 < 0.6


def resolver(sp, E0, W, lo, hi, cosas, suj, dicho):
    """JSON del director → props del reproductor (segundos desde el inicio de la pieza, cajas en px). Devuelve (props, errores)."""
    E = []; a, b = 0.0, (E0["endMs"] - E0["startMs"]) / 1000
    def T(v, donde):
        if v in ("inicio", None, 0): return 0.0
        if not isinstance(v, int) or isinstance(v, bool) or not lo <= v <= hi: E.append(f'{donde}: {v!r} must be "inicio" or a word number between {lo} and {hi}'); return None
        return round(max(0.0, (W[v]["startMs"] - E0["startMs"]) / 1000), 2)
    sbox = suj or {"x0": 600, "y0": 100, "x1": 1300, "y1": 1080}
    def caja(n, donde):
        if n == "todo": return dict(TODO)
        if n == "mitad_izq": return {"x0": -320, "y0": -320, "x1": (sbox["x0"] + sbox["x1"]) / 2, "y1": 1400}
        if n == "mitad_der": return {"x0": (sbox["x0"] + sbox["x1"]) / 2, "y0": -320, "x1": 2240, "y1": 1400}
        if n not in cosas: E.append(f'{donde}: "{n}" is not one of the located things. Use exactly one of {list(cosas) + ["todo", "mitad_izq", "mitad_der", "nada"]}'); return None
        c = cosas[n]; w, h = c["x1"] - c["x0"], c["y1"] - c["y0"]; gx, gy = max((190 - w) / 2, 0), max((190 - h) / 2, 0)      # una ventana más chica que 190 px no se lee
        return {"x0": c["x0"] - gx, "y0": c["y0"] - gy, "x1": c["x1"] + gx, "y1": c["y1"] + gy}
    ev = [a]; hj = sp.get("hojas") if isinstance(sp.get("hojas"), dict) and sp["hojas"].get("objetos") else None
    cam = []
    for i, k in enumerate(sp.get("camara") or []):
        if not isinstance(k, dict): continue
        t = T(k.get("en"), f"camara[{i}].en"); z = k.get("zoom", 1.1)
        if t is None: continue
        if not isinstance(z, (int, float)) or not 1 <= z <= 2.2: E.append(f"camara[{i}].zoom must be between 1 and 2.2"); continue
        if k.get("mira", "todo") == "todo": x, y = 960, 540
        else:
            c = caja(k["mira"], f"camara[{i}].mira")
            if not c: continue
            x, y = (c["x0"] + c["x1"]) / 2, (c["y0"] + c["y1"]) / 2
        cam.append([t, {"x": round(x), "y": round(y), "z": float(z)}]); ev.append(t + 0.5)
    cam.sort(key=lambda k: k[0])
    for x, y in zip(cam, cam[1:]):                      # un viaje de cámara nunca dura menos de 1 s (si no, es un salto)
        if y[0] - x[0] < 1.0: y[0] = round(x[0] + 1.0, 2)
    cam = [k for k in cam if k[0] < b - 0.4] or cam[:1]
    if not cam or cam[0][0] > 0.3: cam.insert(0, [0.0, {"x": 960, "y": 540, "z": 1.04}])
    if len(cam) < 2 and not hj: E.append('camara needs 2 to 4 keys: the first at "inicio" and at least one arrival on a word')
    elif not hj and not (max(abs(k[1]["z"] - cam[0][1]["z"]) for k in cam) >= 0.22 or max(abs(k[1]["x"] - cam[0][1]["x"]) + abs(k[1]["y"] - cam[0][1]["y"]) for k in cam) >= 280):
        E.append("camara: the camera barely moves. Travel to a real thing (mira) or change zoom by at least 0.25")
    cam.append([round(b, 2), {**cam[-1][1], "z": round(cam[-1][1]["z"] + 0.06, 2)}])       # nunca queda quieta
    def tono(lista, nombre):
        out = []
        for i, k in enumerate(lista or []):
            if not isinstance(k, dict): continue
            t = T(k.get("en"), f"{nombre}[{i}].en")
            if t is None: continue
            f_ = _fx(k.get("efecto"))
            if _timido(f_): E.append(f"{nombre}[{i}].efecto is too timid to be seen: use gris 1 and/or oscuro 0.6 or more")
            out.append([t, f_]); ev.append(t)
        return sorted(out, key=lambda k: k[0])
    baseFx, sujFx = tono(sp.get("cuarto"), "cuarto"), (tono(sp.get("sujeto"), "sujeto") if suj else [])
    if baseFx and baseFx[0][0] <= 0.2 and any(baseFx[0][1].values()): E.append("cuarto: the scene must START as the plain photo; the first change comes on a word, not at inicio")
    caps = []
    for i, c in enumerate((sp.get("capas") or [])[:3]):
        if not isinstance(c, dict): continue
        Dn = f"capas[{i}]"; ks = []; prev = None
        for j, v in enumerate(c.get("ventana") or []):
            if not isinstance(v, dict): continue
            t = T(v.get("en"), f"{Dn}.ventana[{j}].en")
            if t is None: continue
            if v.get("sobre") == "nada":
                if not prev: E.append(f'{Dn}.ventana[{j}]: "nada" can only come after the window exists'); continue
                cx, cy = (prev["x0"] + prev["x1"]) / 2, (prev["y0"] + prev["y1"]) / 2; bx = {"x0": cx - 20, "y0": cy - 20, "x1": cx + 20, "y1": cy + 20, "o": 0}
            else:
                bx = caja(v.get("sobre"), f"{Dn}.ventana[{j}].sobre")
                if not bx: continue
                prev = bx
            ks.append([t, {k: (round(x) if k != "o" else x) for k, x in bx.items()}]); ev.append(t + (0.6 if j else 0))
        ks.sort(key=lambda k: k[0])
        if not ks: E.append(f"{Dn}.ventana needs at least one key"); continue
        if ks[0][0] <= 0.2: E.append(f"{Dn}: the window must APPEAR on a word, not at inicio (the scene starts as the plain photo)")
        f_ = _fx(c.get("efecto"))
        if not c.get("encogida") and not any(f_.values()) and not baseFx: E.append(f"{Dn}: the same photo, in place, with no efecto, over an unchanged room, shows nothing. Give it an efecto, make it encogida, or change the room (cuarto)")
        if _timido(f_): E.append(f"{Dn}.efecto is too timid: use gris 1 and/or oscuro 0.6 or more")
        f_["dark"] = min(f_["dark"], 0.55)
        caps.append({"foto": E0["foto"], "fx": f_, "parte": "todo", "enc": bool(c.get("encogida")), "prof": "delante" if c.get("profundidad") == "delante" else "detras", "forma": "rect" if c.get("forma") == "rect" else "ellipse", "feather": 70, "keys": ks})
    luz = []
    for i, l in enumerate((sp.get("luz") or [])[:2]):
        if not isinstance(l, dict): continue
        c = caja(l.get("sobre"), f"luz[{i}].sobre"); t0 = T(l.get("desde"), f"luz[{i}].desde"); t1 = T(l.get("hasta"), f"luz[{i}].hasta") if l.get("hasta") else None
        if c and t0 is not None:
            luz.append({"t0": t0, **({"t1": t1} if t1 else {}), "x": round((c["x0"] + c["x1"]) / 2), "y": round((c["y0"] + c["y1"]) / 2), "r": round(max(260, (c["x1"] - c["x0"]) * 1.1))}); ev.append(t0)
    hojas = None
    if hj:
        col = hj.get("direccion") != "filas"; obs = [o for o in hj["objetos"] if o in cosas]; falt = [o for o in hj["objetos"] if o not in cosas]
        if falt: E.append(f"hojas.objetos: {falt} were not found in the photo: use only located things")
        if len(obs) < 2: E.append("hojas needs at least 2 located objetos")
        else:
            k0, k1 = ("x0", "x1") if col else ("y0", "y1")
            orden = sorted(obs, key=lambda o: cosas[o][k0] + cosas[o][k1])
            cortes = [round((cosas[x][k1] + cosas[y][k0]) / 2) for x, y in zip(orden, orden[1:])]; lim = [0] + cortes + [1920 if col else 1080]
            if any(q - p < 110 for p, q in zip(lim, lim[1:])): E.append("hojas: those objetos are too close together to cut between them. Use fewer objetos, or the other direccion")
            Lh = 1920 if col else 1080
            anchos = [o for o in orden if cosas[o][k1] - cosas[o][k0] > 0.55 * Lh]
            if anchos: E.append(f"hojas.objetos: {anchos} is not ONE thing, it spans most of the photo. Name each thing separately (one per panel: e.g. 'the woman on the left', 'the woman on the right')")
            pasos = []
            for i, p in enumerate(hj.get("pasos") or []):
                if not isinstance(p, dict): continue
                t = T(p.get("en"), f"hojas.pasos[{i}].en")
                if t is None: continue
                if p.get("accion") not in ("entra_izq", "entra_der", "entra_arriba", "entra_abajo", "aparta", "sale", "llena", "vuelve"): E.append(f"hojas.pasos[{i}].accion is not valid"); continue
                if p.get("hoja") == "todas": n_ = -1
                elif p.get("hoja") in orden: n_ = orden.index(p["hoja"])
                else: E.append(f'hojas.pasos[{i}].hoja must be "todas" or one of {orden}'); continue
                if p["accion"] == "llena" and n_ == -1: E.append(f"hojas.pasos[{i}]: 'llena' needs ONE hoja, not todas"); continue
                if p["accion"] == "llena" and lim[n_ + 1] - lim[n_] < 0.45 * Lh: E.append(f"hojas.pasos[{i}]: the panel of \"{p['hoja']}\" is too narrow to take the whole frame (it would become a blur). Use 'aparta' or 'sale' for the others instead"); continue
                pasos.append({"t": t, "hoja": n_, "acc": p["accion"]}); ev.append(t)
            if len(pasos) < 2: E.append("hojas.pasos needs at least 2 steps, each on the word that names its thing")
            hojas = {"dir": "col" if col else "fil", "cortes": cortes, "pasos": pasos}; baseFx, sujFx, caps = [], [], []
            cam = [[0.0, {"x": 960, "y": 540, "z": 1.03}], [round(b, 2), {"x": 960, "y": 540, "z": 1.1}]]      # con paneles la cámara no viaja: el movimiento es de los paneles (si no, se van de cuadro)
    txs = []
    tt = sorted([t for t in (sp.get("textos") or []) if isinstance(t, dict) and isinstance(t.get("en"), int)], key=lambda t: t["en"])[:2]
    norm = lambda s: re.sub(r"[^\w$]", "", s.lower(), flags=re.U)
    for i, t in enumerate(tt):
        Dn = f"textos[{i}]"; s = str(t.get("txt", "")).strip(); ta = T(t.get("en"), Dn + ".en")
        if ta is None: continue
        if not s or len(s) > 30: E.append(f'{Dn}.txt must have 1 to 28 characters ("{s}" has {len(s)})'); continue
        ws = [norm(x) for x in s.split() if len(norm(x)) > 2]
        if ws and sum(x in dicho for x in ws) / len(ws) < 0.6: E.append(f'{Dn}: "{s}" is not what is said in this scene: copy the exact words, in the language of the narration, or delete this text'); continue
        size = 104 if len(s) <= 16 else 88; ancho = 0.5 * size * len(s); d = t.get("donde", "pantalla_abajo")
        if d in cosas and max(k[1]["z"] for k in cam) <= 1.25:
            c = cosas[d]; x = c["x1"] + 50 if c["x1"] + 50 + ancho < 1860 else max(60, c["x0"] - 50 - ancho); y = max(60, min(940, (c["y0"] + c["y1"]) / 2 - size / 2)); prof = "delante"
        else: x, y, prof = 110, (96 if d == "pantalla_arriba" else 850), "pantalla"
        txs.append({"txt": s, "t": ta, "x": round(max(60, min(1860 - ancho, x))), "y": round(y), "size": size, "font": {"mano": "hand", "rotulo": "label"}.get(t.get("estilo"), "serif"), "prof": prof, "rot": -2 if t.get("estilo") == "mano" else 0}); ev.append(ta)
    for x, y in zip(txs, txs[1:]): x["hasta"] = round(min(y["t"] - 0.15, x["t"] + 2.6), 2)      # un texto dura lo que tarda en decirse, nunca se queda
    if txs: txs[-1]["hasta"] = round(min(b - 0.4, txs[-1]["t"] + 2.6), 2)
    if not caps and not baseFx and not sujFx and not luz and not hojas: E.append("the scene has no mechanism: only camera and text. Add what makes the sentence happen (cuarto / capas / hojas / luz)")
    ev = sorted(set(round(e, 1) for e in ev if 0 <= e <= b)) + [b]
    for x, y in zip(ev, ev[1:]):
        if y - x > 3.3:
            ws = [i for i in range(lo, hi + 1) if x + 0.8 < (W[i]["startMs"] - E0["startMs"]) / 1000 < y - 0.6]
            E.append(f"nothing changes between {x:.1f}s and {y:.1f}s of the scene: add an event on one of the words {sorted(set(ws[:1] + ws[len(ws) // 2:len(ws) // 2 + 1] + ws[-1:]))}")
    if E: return None, E
    baseFx = [[t, {**f_, "dark": min(f_["dark"], 0.45)}] for t, f_ in baseFx]       # nunca un cuadro casi negro
    sujFx = [[t, {**f_, "dark": min(f_["dark"], 0.25)}] for t, f_ in sujFx]
    if any(f_["dark"] > 0.2 for _, f_ in baseFx): luz = []
    return {"base": E0["foto"], "baseFx": baseFx, "sujetoFx": sujFx, "cam": cam, "capas": caps, "textos": txs, "luz": luz, **({"hojas": hojas} if hojas else {}), **({} if suj else {"sinSujeto": True})}, []


def construir(B, caja):
    from PIL import Image
    F = jl(f"{B}/escenas/ficha.json") or {}
    W = [w for w in (jl(f"{B}/captions.json") or []) if str(w.get("text", "")).strip()]
    R = jl(f"{B}/avatar_ranges.json") or []
    cache = jl(f"{B}/escenas/_punteria.json", {}) or {}
    listas = []
    for E0 in F.get("escenas") or []:
        try:
            f = foto_de(B, E0["foto"])
            if not f: log(E0["id"], "todavía no está su foto: queda la foto normal"); continue
            if any(not (E0["endMs"] <= r["startMs"] or E0["startMs"] >= r["endMs"]) for r in R): log(E0["id"], "ahora pisa una ventana del avatar: queda la foto normal"); continue
            im = Image.open(f).convert("RGB").resize((1920, 1080), Image.LANCZOS)
            idx = [i for i, w in enumerate(W) if E0["startMs"] - 60 <= w["startMs"] < E0["endMs"] - 80]
            if len(idx) < 4: continue
            lo, hi = idx[0], idx[-1]; dicho = {re.sub(r"[^\w$]", "", W[i]["text"].lower(), flags=re.U) for i in range(max(0, lo - 4), min(len(W), hi + 5))}
            suj = sujeto(B, E0["foto"], im) if not E0.get("sin_sujeto") else None
            g, _ = _rejilla(im.resize((1280, 720)), 8, 5, 30)
            pal = " ".join(f"{i}:{W[i]['text'].strip()}" for i in idx)
            usr = (f"THE NARRATOR SAYS ({(E0['endMs'] - E0['startMs']) / 1000:.1f} s), with word numbers:\n{pal}\n\nTHE IDEA decided when the video was planned (this photo was ordered for it):\n- mechanism: {E0['mecanismo']}\n- what the viewer sees: {E0['se_ve']}\n"
                   f"- things the scene points at: {E0['cosas']}\n\nAttached: the photo, with a yellow grid only to help you look (never write coordinates). "
                   f"{'A cut-out of its main subject exists (you may use sujeto, and capas detras/delante).' if suj else 'There is NO cut-out subject for this photo: do not use sujeto; every capa is simply on the photo.'}\n"
                   "LOOK at what really came out in the photo, then write the scene in the JSON language. Keep the idea, make it bold and clear; if a beat cannot be expressed, simplify it, do not drop the mechanism. JSON only.")
            msgs = [{"role": "system", "content": "You are a senior video editor building ONE signature scene from a real photo.\n\n" + LENGUAJE}, {"role": "user", "content": con_img(usr, [_jpg(g)])}]
            props = None
            for paso in range(8):
                sp = ia(caja, msgs, 6000, 0.4 if paso == 0 else 0.7)
                cosas = {}
                for c in (sp.get("cosas") or [])[:6]:
                    bx = localizar(caja, im, str(c), cache, E0["foto"])
                    if bx: cosas[str(c)] = bx
                perdidas = [str(c) for c in (sp.get("cosas") or [])[:6] if str(c) not in cosas]
                props, err = resolver(sp, E0, W, lo, hi, cosas, suj, dicho)
                if perdidas and err: err = [f'cosas: {perdidas} are not clearly visible in the photo: name things that are really there'] + err
                if not err: break
                if paso >= 3 and all("textos[" in e for e in err):      # el texto no sale: la escena va sin texto antes que dar vueltas
                    sp["textos"] = []; props, err = resolver(sp, E0, W, lo, hi, cosas, suj, dicho)
                    if not err: break
                props = None
                msgs = msgs[:2] + [{"role": "assistant", "content": json.dumps(sp, ensure_ascii=False)}, {"role": "user", "content": "The checker rejected it. Fix exactly this and return the FULL JSON again:\n- " + "\n- ".join(err[:10])}]
            json.dump(cache, open(f"{B}/escenas/_punteria.json", "w"))
            if not props: log(E0["id"], "no pasó el validador: queda la foto normal"); continue
            json.dump({"sp": sp, "props": props}, open(f"{B}/escenas/{E0['id']}.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
            listas.append((E0, props, im)); log(E0["id"], "lista ·", "paneles" if props.get("hojas") else f"{len(props['capas'])} capas", "· cámara", len(props["cam"]) - 1, "viajes")
        except Tope: log("se llegó al tope de gasto: las que faltan quedan con su foto normal"); break
        except Exception as e: log(E0.get("id"), "falló, queda la foto normal:", type(e).__name__, str(e)[:160])
    return listas


def renderizar(B, listas):
    """Mismas reglas que la edición extrema: paquete en una carpeta de trabajo, mp4 por pieza, manifest que lee render.py."""
    X = f"{B}/extrema"; os.makedirs(X, exist_ok=True)
    T = (os.environ.get("EXTREMA_TRABAJO") or "/tmp/extrema_pkg") + "_esc"
    if not os.path.exists(T + "/node_modules/remotion"):
        shutil.rmtree(T, ignore_errors=True); shutil.copytree(PKG, T, ignore=shutil.ignore_patterns("node_modules", "gen"))
        r = subprocess.run(["npm", "i", "--no-audit", "--no-fund", "--loglevel=error"], cwd=T, capture_output=True, text=True, timeout=900, shell=os.name == "nt")
        if r.returncode: log("npm falló, quedan las fotos normales:", r.stderr[-300:]); return
    else:
        shutil.copytree(PKG + "/src", T + "/src", dirs_exist_ok=True, ignore=shutil.ignore_patterns("gen"), copy_function=shutil.copyfile); shutil.copyfile(PKG + "/render.mjs", T + "/render.mjs")
    G = T + "/src/gen"; shutil.rmtree(G, ignore_errors=True); os.makedirs(G)
    pub = T + "/public"; shutil.rmtree(pub, ignore_errors=True); os.makedirs(pub + "/fotos/_m")
    ids = []
    for E0, props, im in listas:
        im.save(f"{pub}/fotos/{E0['foto']}.jpg", quality=88)
        if os.path.exists(f"{B}/escenas/_m/{E0['foto']}.png"): shutil.copyfile(f"{B}/escenas/_m/{E0['foto']}.png", f"{pub}/fotos/_m/{E0['foto']}.png")
        fr = max(30, round((E0["endMs"] - E0["startMs"]) / 1000 * FPS)); ids.append((E0["id"], fr))
        open(f"{G}/{E0['id']}.tsx", "w", encoding="utf8").write("import React from 'react';\nimport {Escena} from '../escena/Escena';\nconst P: any = %s;\nexport default function Component() { return <Escena p={P} />; }\n" % json.dumps(props, ensure_ascii=False))
    open(G + "/manifest.ts", "w", encoding="utf8").write("".join("import c%d from './%s';\n" % (i, x) for i, (x, _) in enumerate(ids)) + "export const comps = [%s];\n" % ",".join("{id:'%s',C:c%d,frames:%d}" % (x, i, f) for i, (x, f) in enumerate(ids)))
    t0 = time.time()
    def _local(faltan):
        try:
            r = subprocess.run(["node", "render.mjs", pub, X, ",".join(faltan)], cwd=T, capture_output=True, text=True, timeout=3600)
            print(r.stdout[-1200:], r.stderr[-600:])
        except subprocess.TimeoutExpired: log("el render tardó demasiado: van las piezas que llegaron")
    import granja
    granja.render(T, pub, X, [x for x, _ in ids], log, _local)      # una máquina de GitHub por escena; lo que no vuelva, acá
    res = jl(X + "/render.json", {}) or {}
    man = [m for m in (jl(X + "/manifest.json", []) or []) if not str(m.get("mp4", "")).startswith("extrema/es")]
    for (E0, props, im), (mid, fr) in zip(listas, ids):
        f = f"{X}/{mid}.mp4"
        if not (res.get(mid) or {}).get("ok") or not os.path.exists(f): log(mid, "no se renderizó: queda la foto normal"); continue
        if any(not (E0["endMs"] <= m["startMs"] or E0["startMs"] >= m["endMs"]) for m in man): log(mid, "ese tramo ya tiene otra pieza: no entra"); continue
        man.append({"mp4": f"extrema/{mid}.mp4", "startMs": E0["startMs"], "endMs": E0["endMs"], "texto": E0.get("dice", "")[:120]})
    json.dump(sorted(man, key=lambda m: m["startMs"]), open(X + "/manifest.tmp", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    os.replace(X + "/manifest.tmp", X + "/manifest.json")      # render.py puede estar leyéndolo: nunca a medio escribir
    shutil.rmtree(pub, ignore_errors=True)
    log("%d escenas en la línea en %.0f s" % (sum(1 for m in man if str(m["mp4"]).startswith("extrema/es")), time.time() - t0))


if __name__ == "__main__":
    arg = sys.argv[1:]
    if len(arg) < 2 or arg[1] not in ("ficha", "construir"): print(__doc__); sys.exit(0)
    B = os.path.abspath(arg[0]).replace("\\", "/").rstrip("/")
    opt = lambda k, d: (arg[arg.index(k) + 1] if k in arg and arg.index(k) + 1 < len(arg) else d)
    caja = Caja(B, opt("--tope", "0.10"))
    marca = os.path.join(B, "extrema", "EN_CURSO") if "--fondo" in arg else None
    try:
        if arg[1] == "ficha":
            with etapas.etapa(B, "escenas_ficha"): ficha(B, int(opt("--n", "3")), caja)
        else:
            if marca: os.makedirs(os.path.dirname(marca), exist_ok=True); open(marca, "w").write(str(os.getpid()))
            with etapas.etapa(B, "escenas"):
                L = construir(B, caja)
                if L and "--sin-render" not in arg: renderizar(B, L)
                elif L: log("%d escenas descritas (sin render)" % len(L))
    except SystemExit: raise
    except Exception as e: log("falló, quedan las fotos normales:", type(e).__name__, str(e)[:300])      # nunca rompe el video
    finally:
        caja.cerrar()
        if caja.n: log("gasto US$%.4f en %d llamadas" % (caja.usd, caja.n))
        if marca:
            try: os.remove(marca)
            except OSError: pass
