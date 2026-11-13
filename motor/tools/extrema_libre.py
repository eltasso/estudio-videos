# -*- coding: utf-8 -*-
"""EDICIÓN EXTREMA LIBRE: DeepSeek lee el video entero, decide qué momentos merecen motion graphics y programa cada componente en Remotion.
Sin catálogo ni receta de diseño: sólo recibe el video, las fotos, los clips y los datos técnicos.
Dos tipos: "full" (escena completa, sólo fuera del avatar) y "overlay" (fondo transparente, encima de lo que ya está en pantalla).
SEGURIDAD: el código que escribe DeepSeek se compila, se prueba y se renderiza SIEMPRE como el usuario sin claves (ESTUDIO_USUARIO_SESION),
con entorno por lista blanca. Si ese usuario no existe, no se ejecuta nada.
Cualquier pieza que falle queda con el b-roll normal: nunca rompe el video."""
import concurrent.futures as cf, json, os, re, shutil, subprocess, threading, time

FPS = 30
MAX_ESCENAS = 7
RES_DIRECTOR = 0.026        # lo máximo que puede costar cada llamada: el tope de gasto es duro
RES_CODIGO = 0.037
PERMITIDOS = re.compile(r"^(react(/.*)?|remotion|@remotion/[\w-]+(/.*)?|three(/.*)?|@react-three/[\w-]+(/.*)?)$")
TEC = """Technical facts of the project (the only fixed things):
- Remotion 4.0.472, React 19. 1920x1080, 30 fps. One single .tsx file with `export default function Scene()`, no props. It plays full screen over the narration.
- Installed packages you may import: remotion, @remotion/three, three, @react-three/fiber, @remotion/google-fonts/<FontName> (e.g. import {loadFont} from '@remotion/google-fonts/Fraunces'; const {fontFamily} = loadFont();). Nothing else is installed.
- Photos are 16:9 in public/: <Img src={staticFile('fotos/p001.jpg')} />, or as three.js textures (THREE.TextureLoader + delayRender/continueRender).
- Stock video clips are in public/ too: <OffthreadVideo muted src={staticFile('clips/s123.mp4')} /> from remotion (it is a video element you can layer, mask, transform and place in CSS 3D like an image).
- Write every photo and clip id literally in the code, never build ids by computing them.
- Everything is a pure function of useCurrentFrame(): no CSS animations or transitions, no Math.random (use random('seed') from remotion), no Date, no setTimeout.
- Any text on screen is in the language of the transcript."""


def usuario(): return os.environ.get("ESTUDIO_USUARIO_SESION") or ""


def aislado(cmd):
    """El comando corre como el usuario sin claves, con un entorno armado por lista blanca."""
    u = usuario()
    if not u: raise RuntimeError("sin usuario aislado")
    pasa = {x: os.environ[x] for x in ("PATH", "LANG", "LC_ALL", "TZ") if x in os.environ}
    pasa.update(HOME="/home/" + u, USER=u)
    return ["sudo", "-n", "-H", "-u", u, "--", "env", "-i", *["%s=%s" % kv for kv in pasa.items()], "sh", "-c", 'umask 000; exec "$0" "$@"', *cmd]


def parar_aislados():
    """Si se corta el render, no quedan Chrome ni node dando vueltas."""
    if not usuario(): return
    try: subprocess.run(["sudo", "-n", "pkill", "-9", "-u", usuario(), "-f", "/tmp/extrema_pkg"], capture_output=True, timeout=30)      # sólo el render: la sesión del video sigue viva
    except Exception: pass


def preparar(T, PKG, log):
    if not os.path.exists(T + "/node_modules/remotion"):
        shutil.rmtree(T, ignore_errors=True); shutil.copytree(PKG, T, ignore=shutil.ignore_patterns("node_modules", "gen"))
        r = subprocess.run(["npm", "i", "--no-audit", "--no-fund", "--loglevel=error"], cwd=T, capture_output=True, text=True, timeout=900)
        if r.returncode: log("npm falló, queda el b-roll normal:", r.stderr[-400:]); return False
    else:
        shutil.copytree(PKG + "/src", T + "/src", dirs_exist_ok=True, ignore=shutil.ignore_patterns("gen"), copy_function=shutil.copyfile)
        for f in ("render.mjs", "smoke.mjs"): shutil.copyfile(PKG + "/" + f, T + "/" + f)
    shutil.rmtree(T + "/src/gen", ignore_errors=True); os.makedirs(T + "/src/gen"); shutil.rmtree(T + "/public", ignore_errors=True); os.makedirs(T + "/public/fotos"); os.makedirs(T + "/public/clips")
    subprocess.run(["chmod", "-R", "a+rwX", T], check=True)      # lo usa el usuario sin claves; el dueño nunca ejecuta lo que quede acá
    return True


def verifica(T, f, frames):
    r = subprocess.run(aislado(["node", T + "/smoke.mjs", f, str(frames)]), cwd=T, capture_output=True, text=True, encoding="utf8", errors="replace", timeout=240)
    out = (r.stdout or r.stderr or "").strip()
    return "" if out.startswith("OK") else (out[:1800] or "the file did not run")


def importa_raro(c):
    malos = [m for m in re.findall(r"""(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]""", c) if not PERMITIDOS.match(m)]
    return "These imports do not exist in this project: %s. Use only the installed packages." % ", ".join(sorted(set(malos))) if malos else ""


def transcripcion(W):
    ren, act, t0 = [], [], 0
    for w in W:
        if not act: t0 = w["startMs"]
        act.append(w["text"].strip())
        if w["endMs"] - t0 > 8000 or (act[-1][-1:] in ".?!" and w["endMs"] - t0 > 3000): ren.append("[%d-%d] %s" % (t0, w["endMs"], " ".join(act))); act = []
    if act: ren.append("[%d-%d] %s" % (t0, W[-1]["endMs"], " ".join(act)))
    return "\n".join(ren)


def huecos(AV, total):
    B, t = [], 0
    for r in sorted(AV, key=lambda x: x["startMs"]):
        if r["startMs"] - t >= 2000: B.append((t, r["startMs"]))
        t = max(t, r["endMs"])
    if total - t >= 2000: B.append((t, total))
    return B


def duracion(f):
    try: return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True, timeout=60).stdout.strip())
    except Exception: return 0.0


def limpiar_escenas(E, AV, total, log):
    """Lo que el director pidió y el video permite: dentro del video, sin encimarse, sin tapar al avatar con una escena completa."""
    pisa = lambda a, b, rs: any(a < r["endMs"] and b > r["startMs"] for r in rs)
    out = []
    for e in sorted([x for x in E if isinstance(x, dict)], key=lambda x: int(x.get("startMs") or 0)):
        try: a, b = max(0, int(e["startMs"])), min(total, int(e["endMs"]))
        except Exception: continue
        tipo = "overlay" if e.get("tipo") == "overlay" else "full"
        if not (2000 <= b - a <= 35000) or not str(e.get("idea") or "").strip(): continue
        if tipo == "full" and (a < 3000 or pisa(a, b, AV)): log("escena completa sobre el avatar, se descarta:", a, b); continue
        if tipo == "overlay" and pisa(a, b, [r for r in AV if r.get("foto")]): log("capa sobre pantalla partida, se descarta:", a, b); continue
        if any(a < x["endMs"] and b > x["startMs"] for x in out): continue
        out.append({"tipo": tipo, "startMs": a, "endMs": b, "idea": str(e["idea"])})
    return out[:MAX_ESCENAS]


def componer(B, X, T, W, AV, FT, fotos, clips, cara, caja, total, nmax, ia, log):
    GUION = transcripcion(W); pres = "the presenter is framed so the face is at x %d-%d%%, y 2-42%% of the frame, with the body below it; the rest of the frame is free" % (max(0, round((cara - .13) * 100)), min(100, round((cara + .13) * 100)))
    desc = lambda i: re.sub(r"\s+", " ", str(FT.get(i, {}).get("_d") or ""))[:150]
    FOTOS = "\n".join("fotos/%s.jpg - %s" % (i, desc(i)) for i in sorted(fotos))
    CLIPS = "\n".join("clips/%s.mp4 - %ds - %s" % (i, d, desc(i)) for i, d in sorted(clips.items())) or "(none in this video)"
    AVR = ", ".join("%d-%d" % (r["startMs"], r["endMs"]) for r in AV) or "(none)"
    LIBRE = ", ".join("%d-%d" % h for h in huecos(AV, total))
    n = min(nmax, MAX_ESCENAS)
    ped = ("You are the motion designer of this YouTube video. Below is the whole video: transcript with times in ms, the time ranges where the presenter is on camera, the time ranges with b-roll, and the real photos and clips of the video.\n\n"
           "Decide the %d moments where custom motion graphics would be the most impressive. Two kinds, you choose which one each moment deserves, and use both: 'full' = a complete full-screen scene (only inside the b-roll ranges); 'overlay' = graphics on a transparent background that appear ON TOP of what is already on screen, the presenter or a b-roll photo or clip (a photo card popping in beside the presenter, a growing list of the things being named, a big number, a floating product shot, a word that lands beside the presenter, a strip of photos, anything). Overlays are shorter and there should be more of them. The best scenes are made WITH the real images and stock video of the video: several layers, depth, photos and clips moving at different distances, things happening on top of and inside the images. Anything you can imagine: for example a 3D carousel of the photos, or a grid with nine blurred images where, when the presenter says 'number one', that image comes into focus and the camera zooms into it, all as one continuous scene. Those are only examples: invent your own for what this video says. Each one should be different from the others and born from this content. A scene can last as long as it needs (roughly 4 to 30 s) and can span the whole list if that is the idea.\n\n"
           "TRANSCRIPT:\n%s\n\nPRESENTER ON CAMERA (ms): %s\nWhen on camera: %s.\n\nB-ROLL RANGES (ms): %s\n\nPHOTOS:\n%s\n\nSTOCK VIDEO CLIPS:\n%s\n\n"
           'Return JSON only: {"escenas":[{"tipo":"full or overlay","startMs":0,"endMs":0,"idea":"what the scene is and how it moves, concretely, moment by moment"}]}') % (n, GUION, AVR, pres, LIBRE, FOTOS, CLIPS)
    try: j = ia(caja, [{"role": "user", "content": ped}], RES_DIRECTOR, 30000, True, True, 600, 2)
    except Exception as e: log("el director no respondió, queda el b-roll normal:", e); return []
    E = limpiar_escenas(j.get("escenas") or [], AV, total, log)
    log("director: %d escenas (%d encima)" % (len(E), sum(e["tipo"] == "overlay" for e in E)))

    def crea(k, e):
        i = "xm%02d" % (k + 1); a, b = e["startMs"], e["endMs"]; fr = round((b - a) * FPS / 1000); f = T + "/src/gen/%s.tsx" % i
        pal = " ".join("%s@%d" % (w["text"].strip(), max(0, round((w["startMs"] - a) * FPS / 1000))) for w in W if a - 50 <= w["startMs"] < b)
        sobre = next(("the presenter on camera: " + pres for r in AV if a < r["endMs"] and b > r["startMs"]), "a b-roll photo or clip of the video")
        extra = "" if e["tipo"] != "overlay" else "\n\nThis is an OVERLAY: the root must have NO background, everything outside your graphics stays fully transparent, because it plays on top of %s. Do not cover the presenter's face." % sobre
        msgs = [{"role": "user", "content": ("Build this scene for my YouTube video. Make it look incredible.\n\nThe whole video, for context:\n%s\n\nTHE SCENE (your own idea):\n%s\n\nIt lasts %d frames (30 fps). Narration during the scene, word@frame:\n%s\n\nThe photos of the video:\n%s\n\nStock video clips of the video:\n%s\n\nBuild it with these real images and clips as the main material (layers, depth, parallax), not with drawn shapes that imitate them. The images stay large, bright and clearly visible.\n\n%s\n\nReply with the complete file in one ```tsx block.") % (GUION, e["idea"], fr, pal, FOTOS, CLIPS, TEC + extra)}]
        for n_ in range(2):
            try: c = ia(caja, msgs, RES_CODIGO, 42000, True, False, 900, 1)
            except RuntimeError as x:
                if str(x) == "tope": log(i, "no alcanzó el tope de gasto: queda el b-roll"); return None
                log(i, "sin respuesta:", x); continue
            bl = re.search(r"```(?:tsx|typescript|ts|jsx)?\s*\n(.*?)```", c, re.S)
            if not bl: msgs.append({"role": "user", "content": "Reply with the complete file in one ```tsx block."}); continue
            err = importa_raro(bl.group(1))
            if not err:
                open(f, "w", encoding="utf8").write(bl.group(1)); os.chmod(f, 0o666)
                try: err = verifica(T, f, fr)
                except subprocess.TimeoutExpired: err = "the scene takes too long to run"
            if not err: log(i, e["tipo"], "listo:", e["idea"][:90]); return {"id": i, "tipo": e["tipo"], "startMs": a, "endMs": b, "frames": fr, "idea": e["idea"]}
            log(i, "intento", n_ + 1, "con error:", err[:160].replace("\n", " | "))
            msgs += [{"role": "assistant", "content": c}, {"role": "user", "content": err + "\nFix it and reply with the complete file in one ```tsx block."}]
        return None

    with cf.ThreadPoolExecutor(4) as ex: res = [r for r in ex.map(lambda x: crea(*x), enumerate(E)) if r]
    os.makedirs(X + "/gen", exist_ok=True)
    for g in res: shutil.copyfile(T + "/src/gen/%s.tsx" % g["id"], X + "/gen/%s.tsx" % g["id"])
    json.dump(res, open(X + "/libre.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)     # otra máquina las reusa: no se paga dos veces
    return res


def capa_ok(f, frames, caja_cara):
    """La capa tiene que ser transparente de verdad y no tapar la cara."""
    from PIL import Image
    Wd, Hd = 240, 135
    for p in (.15, .35, .55, .75, .95):
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % (frames / FPS * p), "-i", f, "-frames:v", "1", "-vf", "scale=%d:%d,format=rgba" % (Wd, Hd), "-f", "rawvideo", "-"], capture_output=True, timeout=120)
        if len(r.stdout) != Wd * Hd * 4: return "no se pudo leer"
        a = Image.frombytes("RGBA", (Wd, Hd), r.stdout).getchannel("A")
        tot = sum(1 for v in a.getdata() if v > 40) / (Wd * Hd)
        if tot > .6: return "tapa el %d%% del cuadro" % (tot * 100)
        if caja_cara:
            x0, y0, x1, y1 = caja_cara; cr = a.crop((int(x0 * Wd), int(y0 * Hd), int(x1 * Wd), int(y1 * Hd))); datos = list(cr.getdata())
            cara = sum(1 for v in datos if v > 80) / max(1, len(datos))
            if cara > .15: return "tapa la cara (%d%%)" % (cara * 100)
    return ""


def renderizar(B, X, T, G, fotos, clips, cara, AV, log):
    from PIL import Image
    pub = T + "/public"; codigo = "\n".join(open(T + "/src/gen/%s.tsx" % g["id"], encoding="utf8").read() for g in G)
    usa = lambda i: re.search(r"(?<![\w-])%s(?![\w-])" % re.escape(i), codigo)
    for i, p in fotos.items():
        if usa(i):
            im = Image.open(p).convert("RGB"); im.thumbnail((1920, 1080)); im.save(pub + "/fotos/" + i + ".jpg", quality=86)
    for i in clips:
        if usa(i): shutil.copyfile(B + "/clips/" + i + ".mp4", pub + "/clips/" + i + ".mp4")
    open(T + "/src/gen/manifest.ts", "w", encoding="utf8").write("".join("import c%d from './%s';\n" % (k, g["id"]) for k, g in enumerate(G)) +
        "export const comps = [%s];\n" % ",".join("{id:'%s',C:c%d,frames:%d}" % (g["id"], k, g["frames"]) for k, g in enumerate(G)))
    json.dump([g["id"] for g in G if g["tipo"] == "overlay"], open(T + "/src/gen/capas.json", "w"))
    subprocess.run(["chmod", "-R", "a+rwX", T + "/src", T + "/public"], check=True)
    ext = lambda g: "mov" if g["tipo"] == "overlay" else "mp4"
    json.dump([{"id": g["id"], "startMs": g["startMs"], "endMs": g["endMs"], "texto": g["idea"][:120], "arch": "extrema/%s.%s" % (g["id"], ext(g))} for g in G], open(X + "/momentos.json", "w", encoding="utf8"), ensure_ascii=False)
    subprocess.run(["chmod", "a+rwx", X], check=False)
    t0 = time.time()
    def _local(ids):       # el camino de siempre: en esta máquina, una atrás de otra, como el usuario sin claves
        try:
            r = subprocess.run(aislado(["node", T + "/render.mjs", pub, X, ",".join(ids)]), cwd=T, capture_output=True, text=True, timeout=4200)
            print(r.stdout[-1500:], r.stderr[-800:], flush=True)
        except subprocess.TimeoutExpired: log("el render tardó demasiado: van las piezas que llegaron")
        finally: parar_aislados()
    import granja
    granja.render(T, pub, X, [g["id"] for g in G], log, _local)      # una máquina de GitHub por pieza; lo que no vuelva, acá
    try: res = json.load(open(X + "/render.json", encoding="utf8"))
    except Exception: res = {}
    man, capas = [], []
    caja_cara = (max(0, cara - .13), .02, min(1, cara + .13), .42)
    for g in G:
        i, f = g["id"], X + "/%s.%s" % (g["id"], ext(g))
        if not (res.get(i) or {}).get("ok") or not os.path.exists(f): log(i, "no se renderizó: queda el b-roll", str((res.get(i) or {}).get("error") or "")[:160]); continue
        if abs(duracion(f) * FPS - g["frames"]) > 6: log(i, "duración rara: queda el b-roll"); continue
        if g["tipo"] == "overlay":
            sobre = any(g["startMs"] < r["endMs"] and g["endMs"] > r["startMs"] for r in AV)
            mal = capa_ok(f, g["frames"], caja_cara if sobre else None)
            if mal: log(i, "capa descartada:", mal); continue
            capas.append({"mov": "extrema/%s.mov" % i, "startMs": g["startMs"], "endMs": g["endMs"]})
        else: man.append({"mp4": "extrema/%s.mp4" % i, "startMs": g["startMs"], "endMs": g["endMs"], "texto": g["idea"][:120]})
    for nom, dat in (("manifest.json", man), ("capas.json", capas)):
        json.dump(dat, open(X + "/" + nom + ".tmp", "w", encoding="utf8"), ensure_ascii=False, indent=1); os.replace(X + "/" + nom + ".tmp", X + "/" + nom)      # render.py puede estar leyéndolo
    shutil.rmtree(pub, ignore_errors=True)
    log("%d escenas y %d capas listas en %.0f s" % (len(man), len(capas), time.time() - t0))


def correr(B, X, W, AV, FT, fotos, PKG, caja, nmax, ia, log, gasto):
    if not os.environ.get("GITHUB_ACTIONS"): log("el código generado sólo corre en GitHub Actions"); return
    if not usuario(): log("sin usuario aislado no se ejecuta código generado: queda el b-roll normal"); return
    T = os.environ.get("EXTREMA_TRABAJO") or "/tmp/extrema_pkg"
    if not preparar(T, PKG, log): return
    total = W[-1]["endMs"]
    try: cara = float(json.load(open(B + "/refs/canal.json", encoding="utf8")).get("cara_cx") or .5)
    except Exception: cara = .5
    clips = {}
    d = B + "/clips"
    for f in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        i, e = os.path.splitext(f)
        if e.lower() == ".mp4" and not i.startswith("_") and len(clips) < 60:
            s = duracion(d + "/" + f)
            if s > 1: clips[i] = round(s)
    try: G = json.load(open(X + "/libre.json", encoding="utf8"))
    except Exception: G = None
    if G and all(os.path.exists(X + "/gen/%s.tsx" % g["id"]) for g in G):
        for g in G: shutil.copyfile(X + "/gen/%s.tsx" % g["id"], T + "/src/gen/%s.tsx" % g["id"])
        log("reuso las %d piezas ya programadas" % len(G))
    else:
        G = componer(B, X, T, W, AV, FT, fotos, clips, cara, caja, total, nmax, ia, log)
        if caja.gastado > 0: gasto(B, "edicion_extrema", caja.gastado, llamadas=caja.n)
        log("programadas %d piezas · US$%.4f" % (len(G), caja.gastado))
    if G: renderizar(B, X, T, G, fotos, clips, cara, AV, log)
