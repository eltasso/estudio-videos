# -*- coding: utf-8 -*-
"""Validador automático de un video DeepSeek. Uso:
   python <APP>/tools/validar.py <carpeta> --etapa guion|fotos|render|final [--min 15]
Sale con código 1 SÓLO con errores importantes (✗): guion fuera de largo, video roto o vacío, sin audio, desincronizado con la voz, no arranca
   con el avatar, avatar congelado, huecos negros > 0,5 s, menciones de IA, sin título. Todo lo demás es aviso (!):
   se anota y se mejora, pero NO frena la entrega."""
import json, os, re, subprocess, sys, glob
try: sys.stdout.reconfigure(encoding="utf-8")
except Exception: pass

cwd = os.path.abspath(sys.argv[1]).replace("\\", "/")
etapa = sys.argv[sys.argv.index("--etapa") + 1] if "--etapa" in sys.argv else "final"
MIN = float(sys.argv[sys.argv.index("--min") + 1]) if "--min" in sys.argv else 15
ORDEN = ["guion", "fotos", "render", "final"]
hasta = ORDEN.index(etapa)
fallos, avisos, oks = [], [], []
F = lambda m: fallos.append(m)
A = lambda m: avisos.append(m)
OK = lambda m: oks.append(m)
P = lambda *a: os.path.join(cwd, *a)
IMG = (".jpg", ".jpeg", ".png", ".webp")

def probe(p, q="format=duration"):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", q, "-of", "json", p], capture_output=True, text=True)
    try: return json.loads(r.stdout)
    except Exception: return {}

# ── 1. guion ──────────────────────────────────────────────
g = P("guion.txt")
if not os.path.exists(g): F("falta guion.txt")
else:
    t = open(g, encoding="utf8").read(); w = len(re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", t))
    car = len(re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]|\([^)]*\)", "", t)).strip())   # lo que se dice, sin tags de emoción
    lo, hi = MIN * 900, MIN * 1150
    (OK if lo <= car <= hi else (F if etapa == "guion" else A))("guion: %d caracteres, %d palabras (hacen falta %d-%d para %g min: %s)" % (car, w, lo, hi, MIN, "bien" if lo <= car <= hi else "alargalo con puntos nuevos" if car < lo else "recortalo"))
    for bad in [r"as an ai", r"artificial intelligence", r"inteligencia artificial", r"soy una ia", r"generado por ia"]:
        n = len(re.findall(r"\b" + bad + r"\b", t, re.I))
        if n: F("guion menciona IA ('%s' %d vez/veces)" % (bad, n))
    # palabras que el canal no quiere nunca (Mis canales → "Palabras prohibidas"; viaja en refs/canal.json)
    try: proh = json.load(open(P("refs", "canal.json"), encoding="utf8")).get("prohibidas") or ""
    except Exception: proh = ""
    for bad in [x.strip() for x in re.split(r"[,;\n]", proh) if x.strip()]:
        n = len(re.findall(r"\b" + re.escape(bad) + r"\b", t, re.I))
        if n: F("guion usa '%s' %d vez/veces (palabra prohibida del canal)" % (bad, n))
    tags = len(re.findall(r"\[[a-z ]+\]|\((carraspea|chasquido)[^)]*\)", t))
    if tags > 8: A("guion tiene %d tags de Fish (lo ideal 2-6)" % tags)

# ── 2. fotos ─────────────────────────────────────────────
if hasta >= 1:
    # 2a. cada foto del b-roll tiene que salir de tools/fotos.py (prompt JSON guardado al lado: fotos/<id>.json)
    fotos = [f.replace("\\", "/") for f in glob.glob(P("fotos", "*")) if f.lower().endswith(IMG)]
    if not fotos: A("no hay fotos en fotos/")
    else:
        sin, malos, creativas = 0, 0, 0
        for f in fotos:
            side = os.path.splitext(f)[0] + ".json"
            if not os.path.exists(side): sin += 1; continue
            try: pj = json.load(open(side, encoding="utf8")).get("prompt")
            except Exception: pj = None
            if not isinstance(pj, dict) or "nothing blurred out" not in json.dumps(pj).lower(): malos += 1
            elif pj.get("detalle_narrativo"): creativas += 1
        (OK if sin == 0 else A)("fotos: %d · %d sin su prompt al lado (no salieron de tools/fotos.py)" % (len(fotos), sin))
        (OK if malos == 0 else A)("fotos: %d con prompt incompleto" % malos)
        if hasta >= 2: (OK if creativas >= 4 else A)("fotos: %d imágenes creativas con detalle_narrativo (lo pedido: 4 a 6, KIT §4b)" % creativas)
    if os.path.exists(P("avatar_ranges.json")) and not os.path.exists(P("planos.json")):
        A("no hay planos.json: corré tools/planos.py (un plano = una foto, sin repetir) en vez de armar los planos a mano.")
    # 2c. revisión visual propia (no frena: Claude revisa en paralelo)
    if not os.path.exists(P("gates", "fotos_auto.txt")):
        A("falta tu revisión visual de las fotos de prueba: mirá qc/hoja_fotos.jpg con Read y escribí gates/fotos_auto.txt (después SEGUÍ, no esperes).")

# ── 3. render ────────────────────────────────────────────
if hasta >= 2:
    rs = glob.glob(P("tools", "render*.py")) + glob.glob(P("render*.py"))
    if not rs or glob.glob(P("segments", "*.mp4.src")): rs = [os.path.join(os.path.dirname(os.path.abspath(__file__)), "render.py")]   # la herramienta del Estudio
    src = "".join(open(f, encoding="utf8", errors="ignore").read() for f in rs if "_v1" not in f)
    (OK if "plan_motion" in src else A)("render: movimiento al azar (plan_motion de tools/render.py)")
    if re.search(r"idx\s*%\s*\d|i\s*%\s*[2-9]\b", src): A("render: hay un ciclo fijo de movimiento (i % N) — tiene que ser al azar")
    (OK if "3840" in src else A)("render: escala 3840x2160 antes de zoompan (anti-temblequeo)")
    (OK if os.path.exists(P("segments", "xf.json")) else A)("render: segments/xf.json (fundidos avatar 0,6 s / foto 0,3 s)")
    pl = P("plan.json")
    if not os.path.exists(pl): F("falta plan.json (el panel lo dibuja)")
    else:
        try:
            pj = json.load(open(pl, encoding="utf8")); segs = sorted(pj["segments"], key=lambda s: s["t0"])
            huecos = [(a["t1"], b["t0"]) for a, b in zip(segs, segs[1:]) if b["t0"] - a["t1"] > 0.15]
            grandes = [h for h in huecos if h[1] - h[0] > 0.5]
            (OK if not huecos else F if grandes else A)("plan.json: %d huecos sin imagen%s" % (len(huecos), (" (ej. %.1f-%.1f s)" % (grandes or huecos)[0]) if huecos else ""))
            largos = [s for s in segs if s["t1"] - s["t0"] > 8 and str(s.get("kind", "")).startswith("foto")]
            if largos: A("plan.json: %d fotos duran más de 8 s (cortes cada 3-6 s)" % len(largos))
            # un video JAMÁS repite una imagen: la misma foto en tramos no seguidos, en una pantalla partida o copiada con otro nombre
            es_foto = lambda s: "/fotos/" in str(s.get("file", "")).replace("\\", "/")
            vistos, rep, prev = {}, [], None
            for s in segs:
                f = os.path.basename(str(s.get("file", ""))).lower()
                if not es_foto(s): prev = None; continue
                if f != prev and f in vistos: rep.append("%s en %ds y %ds" % (f, vistos[f], s["t0"]))
                vistos.setdefault(f, s["t0"]); prev = f
            try: _rg = json.load(open(P("avatar_ranges.json"), encoding="utf8"))
            except Exception: _rg = []
            _usadas = {str(s["file"]) for s in segs if es_foto(s)}
            for r in _rg:
                if not r.get("foto"): continue
                f = next((x for x in glob.glob(P("fotos", str(r["foto"]) + ".*")) if x.lower().endswith(IMG)), "")
                if f and f.replace("\\", "/") in {u.replace("\\", "/") for u in _usadas}: rep.append("%s también en la pantalla partida de %ds" % (os.path.basename(f), r["startMs"] / 1000))
                if f: _usadas.add(f)
            import hashlib
            _hash = {}
            for f in sorted(_usadas):
                try: h = hashlib.md5(open(f, "rb").read()).hexdigest()
                except OSError: continue
                if h in _hash: rep.append("%s y %s son la misma imagen" % (os.path.basename(_hash[h]), os.path.basename(f)))
                _hash.setdefault(h, f)
            (OK if not rep else F)("fotos repetidas: %s" % ("ninguna (cada plano con su foto)" if not rep else "%d — un video nunca repite imagen (ej. %s). Usá tools/planos.py: un plano = una foto" % (len(rep), rep[0])))
            s0 = segs[0] if segs else {}
            (OK if s0 and str(s0.get("kind", "")).startswith("av") and str(s0.get("file", "")).lower().endswith(".mp4") and s0.get("t0", 9) <= 0.3 else F)("apertura: lo primero que se ve es el AVATAR hablando (clip real) desde el segundo 0 (nunca una foto antes)")
            largos_av = [s for s in segs if str(s.get("kind", "")).startswith("av") and s["t0"] < 30 and s["t1"] - s["t0"] > (10.5 if s["t0"] <= 0.3 else 6.5)]
            (OK if not largos_av else A)("apertura: tramos de avatar de ≤ 6 s en los primeros 30 s%s" % ((" (hay uno de %.1f s en %.1f)" % (largos_av[0]["t1"] - largos_av[0]["t0"], largos_av[0]["t0"])) if largos_av else ""))
            avs = [s for s in segs if str(s.get("kind", "")).startswith("av")]
            FB = A   # ritmo del avatar: aviso, no frena
            av = sum(s["t1"] - s["t0"] for s in avs); tot = max(1, segs[-1]["t1"])
            pct = 100 * av / tot
            largos = [x for x in avs if not x.get("split") and x["t1"] - x["t0"] > 6.6]
            (OK if not largos else FB)("dinámico: avatar a pantalla completa ≤ 6 s por vez%s" % ((" (%d tramos más largos, ej. %.1f s en %.0f s → partilo o usá pantalla partida)" % (len(largos), largos[0]["t1"] - largos[0]["t0"], largos[0]["t0"])) if largos else ""))
            meta_pct = min(50, 100 * 560 / tot)   # ~50 %, o lo que entre en los 560 s de una sola llamada
            (OK if meta_pct - 12 <= pct <= meta_pct + 10 else FB)("ritmo del avatar: avatar %.0f s = %.0f %% del video (ideal ~%.0f %%: más avatar = menos fotos)" % (av, pct, meta_pct))
            # huecos sin avatar (se juntan los pedazos contiguos del mismo tramo)
            sin, ult = [], 0.0
            for s in avs:
                if s["t0"] - ult > 15.5: sin.append((ult, s["t0"]))
                ult = max(ult, s["t1"])
            if tot - ult > 25: sin.append((ult, tot))
            (OK if not sin else FB)("ritmo del avatar: nunca más de 15 s sin avatar%s" % ((" (%d huecos, ej. %.0f-%.0f s)" % (len(sin), sin[0][0], sin[0][1])) if sin else ""))
            esperas = [s for s in segs if "/espera/" in str(s.get("file", "")).replace("\\", "/")]
            if etapa == "final": (OK if not esperas else F)("sin carteles de espera%s" % ((" — hay %d tramos con «Esperando…» (el primero en %.0f s): no se entrega hasta que llegue lo que falta y vuelvas a renderizar" % (len(esperas), esperas[0]["t0"])) if esperas else ""))
            quietos = [s for s in segs if str(s.get("kind", "")).startswith("av") and not str(s.get("file", "")).lower().endswith(".mp4")]
            if etapa == "final": (OK if not quietos else F)("avatar: %d de %d tramos son FOTO FIJA (falta el clip del avatar: %s) — no se entrega hasta que estén los clips" % (len(quietos), len([s for s in segs if str(s.get("kind", "")).startswith("av")]), ", ".join(sorted(set(os.path.basename(str(s.get("file", ""))) for s in quietos)))) if quietos else "avatar: todos los tramos son clips reales")
        except Exception as e: F("plan.json ilegible: %s" % e)
    if etapa == "final" and os.path.exists(P("avatar_ranges.json")):
        sj = P("avatar", "it_sync.json"); lj = P("avatar", "it_llamada.json")
        if os.path.exists(sj):
            sy = json.load(open(sj, encoding="utf8")); mx = max([abs(c.get("lag_ms", 0)) for c in sy.get("cortes", [])] or [0])
            OK("avatar: desfase medido y corregido por avatar_it.py (máx %d ms)" % mx)
            if sy.get("perdidas"): A("avatar: el reel salió corto, sin clip: %s → sacalas de avatar_ranges.json (van con foto) y re-renderizá" % sy["perdidas"])
        else: A("avatar: no hay avatar/it_sync.json (el avatar no salió de avatar_it.py: el desfase no está medido)")
    try: _ng = json.load(open(P("segments", "_malos.json"), encoding="utf8"))
    except Exception: _ng = []
    _ngs = [x for x in _ng if x.get("stock")]
    (OK if not _ngs else F)("clips de stock sin negro ni roturas%s" % ((" — %d malos (ej. %s en %.0f s): borrá ese clips/<id>.mp4, pedí ese id con otra búsqueda en stock.py y corré render.py + assemble.py" % (len(_ngs), _ngs[0]["file"], _ngs[0]["t0"])) if _ngs else ""))
    if len(_ng) > len(_ngs): A("%d planos que no son de stock con partes casi negras (ej. %s): miralos" % (len(_ng) - len(_ngs), [x for x in _ng if not x.get("stock")][0]["file"]))
    if not os.path.exists(P("gates", "render_auto.txt")):
        A("falta tu revisión visual de los 10 segmentos de prueba: mirá qc/hoja_render.jpg con Read y escribí gates/render_auto.txt (después SEGUÍ).")

# ── 4. final ─────────────────────────────────────────────
if hasta >= 3:
    fin, mas = P("final.mp4"), P("voz", "master.wav")
    if not os.path.exists(fin): F("falta final.mp4")
    else:
        v = probe(fin, "stream=width,height,r_frame_rate,codec_type:format=duration")
        st = [s for s in v.get("streams", []) if s.get("codec_type") == "video"]
        if st:
            s = st[0]; (OK if (s.get("width"), s.get("height")) == (1920, 1080) else F)("final: %sx%s" % (s.get("width"), s.get("height")))
            (OK if s.get("r_frame_rate") in ("30/1", "30000/1000") else A)("final: fps %s" % s.get("r_frame_rate"))
        if not any(s.get("codec_type") == "audio" for s in v.get("streams", [])): F("final: sin audio")
        if os.path.exists(mas):
            a = float(probe(mas).get("format", {}).get("duration", 0)); d = float(v.get("format", {}).get("duration", 0))
            (OK if abs(a - d) <= 0.3 else F)("final %.2f s vs voz %.2f s" % (d, a))
            (OK if d >= MIN * 60 * 0.85 else A)("duración real: %.1f min (pedidos: %g)" % (d / 60, MIN))
    m = P("meta.json")
    if not os.path.exists(m): F("falta meta.json")
    else:
        mj = json.load(open(m, encoding="utf8"))
        (OK if mj.get("title") else F)("meta.json con title") ; (OK if len(mj.get("description", "")) > 200 else A)("meta.json con title y description (>200 caracteres)")
        if re.search(r"\bAI\b|artificial|generated", mj.get("description", ""), re.I): F("meta.json menciona IA")
    (OK if os.path.exists(P("REPORTE.md")) else A)("REPORTE.md")
    if not os.path.exists(P("gates", "final_auto.txt")):
        A("falta tu revisión visual del final (cuadros cada 30 s en qc/): escribí gates/final_auto.txt.")
    if not os.path.exists(P("gates", "revisor_final.json")): A("falta el revisor final: python tools/revisor.py <carpeta> (no frena, pero mira cosas que vos no ves).")
    co, ch = P("gates", "correcciones.txt"), P("gates", "correcciones_hechas.txt")
    if os.path.exists(co) and (not os.path.exists(ch) or os.path.getmtime(ch) < os.path.getmtime(co)):
        A("hay correcciones sin aplicar (gates/correcciones.txt es más nuevo que gates/correcciones_hechas.txt): aplicalas y anotalas.")
    if os.path.exists(P("cues.json")):
        try: _fal = [c["file"] for c in json.load(open(P("cues.json"), encoding="utf8")) if not os.path.exists(P("sfx", c["file"]))]
        except Exception: _fal = ["cues.json ilegible"]
        (OK if not _fal else A)("sonido: cues.json con sus archivos%s" % ((" (faltan: %s)" % ", ".join(_fal[:5])) if _fal else ""))
    else: A("no hay cues.json: el video sale sin efectos de sonido (KIT §5b).")

print("VALIDAR %s · etapa %s" % (cwd, etapa))
for m in oks: print("  ✓", m)
for m in avisos: print("  ! ", m)
for m in fallos: print("  ✗", m)
print("RESULTADO:", "FALLA (%d)" % len(fallos) if fallos else "OK")
if etapa == "final" and not fallos:        # nube.py lo mira para no dejar que la sesión siga inventando vueltas después de un control que pasó
    try:
        os.makedirs(P("gates"), exist_ok=True); json.dump({"final_mtime": os.path.getmtime(fin), "t": __import__("time").time()}, open(P("gates", "qc_ok.json"), "w"))
    except Exception: pass
sys.exit(1 if fallos else 0)
