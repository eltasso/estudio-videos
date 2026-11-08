# BRIEF — {TITULO} · {CANAL}

Hacé un video terminado, sin preguntar nada y sin frenar: `{CWD}/final.mp4` + `{CWD}/REPORTE.md` + `{CWD}/meta.json`. Trabajá todo dentro de `{CWD}`.
Tus herramientas y reglas están en el KIT (system prompt). Esto es lo específico de este video.

## ✅ PUNTOS DE CONTROL (no frenan el video)
En **guion**, **fotos**, **render** y **final**: corré `python {APP}/tools/validar.py {CWD} --etapa <etapa> --min {MIN}`, arreglá lo que marque ✗,
mirá la hoja de contacto con Read y escribí `gates/<etapa>_auto.txt` (qué miraste, qué arreglaste). **Seguí trabajando: nunca termines el turno para esperar.**

## 0. APERTURA: lo PRIMERO que se ve es SIEMPRE el AVATAR
- El video arranca con el presentador hablando desde el cuadro 1. Nunca una foto ni un título antes. Primera ventana de `avatar_ranges.json` con `startMs: 0`, cortada en una pausa (4-10 s).
- **Justo después** va la imagen más fuerte del video: el resultado o el problema del título visto de cerca, a mitad del gesto, con una cara que reacciona o un detalle que choca. Que se entienda sin audio y en chico.
- Esa foto es el plano `p001`. Pedí **3 variantes** (`p001_a/b/c`) en la primera tanda, miralas, quedate con la más impactante y copiala como `fotos/p001.png` + `fotos/p001.json` (anotá por qué en `gates/fotos_auto.txt`).
- Primeros 30 s: corte cada 2-3 s, alternando fotos del gancho con el avatar.

## Qué video es
- Canal: **{CANAL}** · Idioma: **{IDIOMA}** · Largo: **~{MIN} min = unos {CHARS} caracteres de guion**
- Título: **{TITULO}**
- La idea / el ángulo:
{IDEA}
- Biblia del canal (presentador, tono, reglas, serie):
{BIBLIA}

## 1. Guion ({IDIOMA}, ~{MIN} min = unos {CHARS} caracteres)
- **El largo es un pedido del usuario: unos {CHARS} caracteres (~1.000 por minuto).** El control los cuenta y frena si no llega. Si te quedás corto, sumá puntos nuevos con su anécdota y su cambio concreto: nunca relleno ni repetir lo mismo.
- Gancho 0-45 s con número + objeto concreto; credencial del presentador; una prueba interactiva ~min 4; cada punto = problema → anécdota con fecha/nombre/lugar → por qué pasa → cambio concreto con precio o medida → algo para hacer hoy. Pedido de like/suscripción antes del último punto. Cierre con una pregunta para comentar y el gancho al próximo video.
- Prohibido: relleno, sermonear, "honestly/genuinely", consejos médicos o legales, mencionar IA.
- Guardá `guion.txt` (sólo lo que se dice, con 2-4 tags de emoción donde sumen). **✅ Control guion** y seguí.

## 2. Voz → `python {APP}/tools/voz.py {CWD} > {CWD}/voz/voz.log 2>&1 &` (clon de la voz del canal).
## 3. Tiempos → `python {APP}/tools/tiempos.py {CWD} {IDI}` → `captions.json`. Todo el montaje se clava a estos tiempos.

## 4. Avatar — InfiniteTalk, 1 sola llamada (KIT §3)
- La foto del presentador es `refs/avatar.png` (máxima calidad): no la regeneres. Presentador: {PRESENTADOR}. Escena: {ESCENA}.
- Ventanas: **~50 % del video** (máx. 560 s en total), en las frases importantes; nunca > 15 s sin avatar. La primera en `startMs: 0`.
  Dinámico: a pantalla completa ≤ 6 s por vez; los tramos de 7-12 s van en **pantalla partida** (`"foto"` + `"lado"` izq/der alternando, KIT §3).
  El avatar es UNA llamada de precio fijo: más avatar = menos fotos = más barato.
- Cuando el plan está CERRADO (después del render de prueba): `python {APP}/tools/avatar_it.py {CWD} > {CWD}/avatar/it.log 2>&1 &`. Una sola llamada. Mientras corre, seguí.

## 5. Fotos — gpt-image low + Batch, CADA FOTO CUENTA UN MOMENTO (KIT §4)
- Con `captions.json` y `avatar_ranges.json` listos: `python {APP}/tools/planos.py {CWD}` → `planos.json` (≈ {NFOTOS} planos de ~5 s, con el texto de cada uno). No armes los planos a mano.
- **Un plano = una foto distinta: CERO fotos repetidas** (el validador lo frena). UN prompt por plano, con `"id"` = el del plano. Cada foto ilustra lo que se dice en ese segundo. Con el presentador: `"cara": true` (sólo el gancho y ≤ 15 % del resto: ya está en el avatar).
- **4 a 6 de esos planos son IMÁGENES CREATIVAS** (KIT §4b): ideas tuyas sacadas del guion, cada una con su `"detalle_narrativo"`.
- **Primero 6 de prueba** (variadas) + las 3 del gancho → hoja `qc/hoja_fotos.jpg` → **✅ Control fotos**. Después el resto en 1-2 pedidos grandes.
- Cuando están todas: UNA sola ronda de rehechas con todas las malas juntas y `python {APP}/tools/planos.py {CWD} --shots` → `shots_timed.json`.

## 5b. Sonido
- Efectos puntuales y muy bajos con `sonidos.py` + `cues.json` (KIT §5b). Pocos y bien elegidos; si no aparece un buen sonido, sin efecto.

## 6. Armado, QC, final
- `planos.py {CWD} --shots` → `render.py {CWD} --limit 10` → hoja `qc/hoja_render.jpg` → **✅ Control render** → `render.py {CWD}` + `assemble.py {CWD}`.
- `meta.json` = {"title": "{TITULO}", "description": "<descripción de YouTube, 3 párrafos, en la voz del presentador, sin links ni hashtags>"}.
- **Revisor:** `python {APP}/tools/revisor.py {CWD}` (deja los cuadros cada 30 s en `qc/`). Aplicá `gates/correcciones.txt`, anotalas en `gates/correcciones_hechas.txt` → **✅ Control final**: `validar.py --etapa final` tiene que dar OK.
- `REPORTE.md`: duración, fotos, repedidas, gasto, problemas, qué mejorar.

{EXTRA}
