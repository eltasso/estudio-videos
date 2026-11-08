# KIT DE HERRAMIENTAS — videos con avatar (leer ANTES de empezar)

Herramientas del Estudio: `{APP}/tools/`. Trabajá SOLO en tu carpeta de video (la del brief). No toques nada fuera de ella.
Las claves ya están configuradas: las herramientas las leen solas. **Nunca las busques, leas ni imprimas.**

## 🚀 CAMINO RECTO (hacelo de primera: cada vuelta extra atrasa la entrega)
1. **Guion** → `guion.txt` (largo del brief). Validá `--etapa guion` UNA vez.
2. **Voz** (§1) en segundo plano y, **en paralelo**, pensá el gancho y las 4-6 imágenes creativas (§4b).
3. **Tiempos** (§2) → `captions.json`. Con eso escribí de UNA `avatar_ranges.json` (§3) y corré `python {APP}/tools/planos.py <carpeta>` → `planos.json` (un plano de b-roll cada ~5 s, con el texto de cada uno). **No escribas scripts propios de planos ni `shots_timed.json` a mano.**
4. **Fotos**: UN prompt por plano (`id` = el del plano: p001, p002…). 6 de prueba → hoja → mirala → resto del lote en 1 o 2 pedidos grandes (§4; el Batch tarda: pedilo temprano). Mientras llegan, seguí. Cuando están todas: UNA sola ronda de rehechas con todas las malas juntas y `python {APP}/tools/planos.py <carpeta> --shots` → `shots_timed.json`.
   ⛔ **CERO FOTOS REPETIDAS:** un plano = una foto distinta. El validador lo frena con ✗.
5. **Avatar**: con el plan cerrado, `avatar_it.py` en segundo plano (1 sola llamada, §3).
6. **Sonido** (§5b) mientras llega el avatar: `sonidos.py` + `cues.json`.
7. **Render de prueba** (`render.py --limit 10`) → hoja → mirala. Después `render.py` completo + `assemble.py`.
8. **Final**: corré el **revisor** (`revisor.py`, §6), aplicá lo que marque, validá `--etapa final`, `meta.json`, `REPORTE.md`. Listo: el usuario lo descarga desde el panel.

Reglas anti-vueltas:
- **Esperar = SÓLO `python {APP}/tools/esperar.py`** (hasta 9 min de una: `--log render.log`, `--cuenta "fotos/*.png" 120`, `--existe final.mp4`; llamala con timeout 600000). **Prohibido `sleep` en bucle** y mirar con `ls`/`tail` cada minuto.
- Todo lo que tarde > 1 min (voz, fotos, avatar, render, assemble) va en segundo plano con log (`nohup … > x.log 2>&1 &`) y lo esperás con `esperar.py` mientras hacés otra cosa.
- Antes de escribir un script propio, fijate si ya hay herramienta (voz, tiempos, planos, fotos, avatar_it, sonidos, render, assemble, hoja, esperar, validar, revisor). No reinventes.
- Leé cada archivo UNA vez. El validador: arreglá sólo los **✗**; los **!** son avisos (mejoralos si es rápido o anotalos en REPORTE.md y SEGUÍ). Máximo 2 corridas por etapa.

## ⛔ Reglas duras
- **Nunca imprimas, copies ni leas claves** (el guardián lo bloquea).
- No usar: git push, YouTube, ni APIs directo. RunPod SÓLO por `tools/avatar_it.py`; imágenes SÓLO por `tools/fotos.py`.
- **gpt-image SIEMPRE quality low + Batch** (lo hace `fotos.py`; no hay otra forma).
- Nunca marcar el contenido como IA dentro del video ni en la descripción. Sin claims médicos ni legales.
- **Scripts y JSON largos: escribilos con Write a un archivo y después corré `python archivo.py`.** Nunca en heredoc ni `python -c '…'` (los apóstrofos rompen las comillas).
- **Matar un proceso:** `kill <pid>` o `taskkill //F //PID <pid>` (el pid sale de `echo $!` al lanzarlo).
- **Texto en ffmpeg prohibido** (`drawtext` puede no tener fuentes). Hojas de contacto: `python {APP}/tools/hoja.py <salida.jpg> <fotos o videos…>` (hasta 12).
- **Nada frena el video.** Si una herramienta falla 3 veces, poné un reemplazo (otra foto, el cuadro del presentador en vez de avatar), anotalo en REPORTE.md y seguí.

## 1. Voz — el clon de la voz del canal (Fish)
```
python {APP}/tools/voz.py <carpeta> > <carpeta>/voz/voz.log 2>&1 &
```
- Lee `guion.txt` + la muestra `refs/voz.wav`. Salida: `voz/master.wav`. Si falla, relanzala: rehace sólo los bloques que faltan.
- Tags de emoción que suman (2-4 en todo el guion): `[whispering]`, `[excited]`, `[emphatically]`, `(laughs)`. Nada de más.

## 2. Tiempos por palabra
```
python {APP}/tools/tiempos.py <carpeta> <es|en|pt>
```
- Salida `captions.json`: una entrada por PALABRA `{text,startMs,endMs}`. **Clavá cada imagen en el segundo exacto** en que se dice la palabra.

## 3. Avatar — InfiniteTalk, UNA sola llamada por video
```
python {APP}/tools/avatar_it.py <carpeta> > <carpeta>/avatar/it.log 2>&1 &
```
- Lee `avatar_ranges.json` (TODAS las ventanas), hace **1 solo /run** con la foto `refs/avatar.png` y corta cada ventana en su `file` (`avatar/A0.mp4`, `A1.mp4`…), midiendo y corrigiendo el desfase. Tarda 10-60 min: seguí con todo lo demás.
- ⛔ **El plan de ventanas tiene que estar CERRADO antes.** Hay UNA llamada por video; la herramienta se niega a una 2ª. Si después movés ventanas, las nuevas van con FOTO. Un FAILED no cobra: ahí sí podés repetirla. Si `avatar_ranges.json` cambia, corré `planos.py` otra vez.
- Total de ventanas ≤ 590 s. Cada ventana ≥ 3 s.
- **Ritmo:** el avatar cuesta lo MISMO (1 llamada) dure lo que dure, y cada foto cuesta: **~50 % del video con avatar** (máx. 560 s en total),
  en ventanas CORTAS de **3-6 s** que entran y salen, con 1-2 fotos entre ventana y ventana; **nunca más de 15 s seguidos sin avatar**.
  ⛔ Que siga siendo DINÁMICO: nunca más de 6 s de avatar a pantalla completa. Para tramos más largos (7-12 s) usá **pantalla
  partida**: en la ventana agregá `"foto":"<id>","lado":"izq"` (o `"der"`, alternando) → avatar de un lado y la foto de lo que
  dice del otro. Mezclá: avatar entero, foto, partida, foto, avatar entero… Las ventanas van en las FRASES IMPORTANTES (la promesa, un número, un "pero", la conclusión de cada parte).
- ⛔ **Lo PRIMERO que se ve es SIEMPRE el avatar hablando desde el segundo 0** (primera ventana `startMs: 0`, ≤ 10 s; en los primeros 30 s las demás ≤ 6 s). El validador lo controla.
- Cada ventana: `{"file":"avatar/A0.mp4","frame":"refs/avatar.png","startMs":0,"endMs":7400}` (el `frame` se usa como foto fija con el cartel «Esperando avatar» mientras el clip no llega; si falta una imagen sale «Esperando imagen». Son sólo vista previa: validar no deja entregar un video con carteles).

## 4. Fotos del b-roll — gpt-image low + Batch, CADA FOTO CUENTA UN MOMENTO
```
python {APP}/tools/fotos.py <carpeta> <carpeta>/pedidos_01.json > <carpeta>/fotos/fotos_01.log 2>&1 &
```
- `pedidos = [{"id":"p001","cara":true,"prompt":{…JSON…}}]` (`id` = el id del plano en `planos.json`; las fotos de pantalla partida vienen ahí con su propio id). `cara: true` = sale el presentador (se le agrega su descripción física; NUNCA va una foto de referencia); `false` = escena sin él.
  El presentador ya aparece en el avatar la mitad del video: usá `cara: true` sólo en el gancho y en pocas fotos más (≤ 15 %).
  Lo demás: manos, objetos, lugares, otras personas.
- Si el usuario eligió **"Las hago yo"** (Configuración), fotos.py NO gasta: escribe `fotos/PROMPTS.md` y espera a que él las suba desde el panel. Corrélo igual en segundo plano, seguí con lo demás y esperá con `esperar.py --cuenta "fotos/*.*" N`. No le pidas que use otro programa ni le expliques: el panel ya le muestra la lista.
- El Batch tarda (de minutos a un par de horas): **pedí temprano y en pocos pedidos grandes**, no de a una. Mientras tanto, seguí.
- La herramienta tiene una **COMPUERTA**: si falta algo, no manda nada y te dice qué arreglar. Reescribí, no la saltees.
- ⛔ **Prohibidas las fotos aburridas.** Un cuarto vacío, un objeto solo o un "plano general a 2 m" NO sirven. Cada foto: alguien haciendo algo a mitad del gesto (o el rastro fresco de lo que pasó), en un lugar real LLENO de cosas, con una emoción que se entiende sin audio.
- **Campos obligatorios:** `type, moment, subject, action, props, setting, light, camera, color, avoid` (+ `person`/`hands`, `clothing` si hay alguien).
  - `type` = `"amateur phone photo, mild JPEG compression, real skin texture with pores, uneven ordinary indoor light, slightly crooked framing, everyday clutter, nothing blurred out, everything in focus, 16:9"` (la frase **nothing blurred out** es obligatoria).
  - `moment`: QUÉ pasa en ese segundo y POR QUÉ importa (atado a la frase del guion que suena ahí), ≥ 70 caracteres.
  - `action`: el gesto a medias (la mano entrando al agua, la taza a mitad de camino a la boca).
  - `props`: **6 a 10 objetos concretos con detalle** (material, color, desgaste): "a dented aluminium kettle", no "kettle".
  - `camera`: **variá en cada foto**: manos a 40 cm, plano medio, cenital de la mesa, por encima del hombro, desde la puerta. ≥30 % primeros planos, ≥60 % con persona o manos.
  - `avoid` = `"cinematic lighting, dramatic shadows, studio look, perfect plastic skin, empty clean background, depth-of-field blur, date stamp, watermark"`.
  - Prohibido en el resto del prompt: cinematic, photorealistic, 35mm, bokeh, 8k, golden hour, stock photo (dan look de IA).
- **Imágenes creativas:** 4 a 6 por video, ver §4b.
- **Vos SÍ podés ver imágenes** (Read sobre un .png). Después de cada tanda armá una hoja de 12 con `hoja.py` y mirala. Repedí las que tengan manos rotas, la cara cambiada o look de publicidad. **El texto legible en una foto (carteles, papeles, pantallas) está BIEN: nunca lo prohíbas ni la rechaces por eso.** Para repedir: borrá `fotos/<id>.png` y pedí el MISMO id en un pedido nuevo (fotos.py sólo pide las que faltan), todas las malas juntas en UNA ronda.

## 4b. Imágenes creativas — ideas TUYAS, nunca sólo "foto del tema"
gpt-image puede hacer cualquier cosa. **4 a 6 por video**, en los momentos clave: son 4-6 planos de `planos.json` (mismo id del plano). **Inventá ideas a partir del guion**: preguntate "¿qué objeto, gesto o papel de la vida real de este personaje mostraría esto mejor que una foto suelta?".
- ⛔ **Realismo:** toda imagen con el presentador lleva en el `type` esta cláusula: `amateur phone photo, mild JPEG compression, real skin texture with pores, uneven ordinary indoor light, slightly crooked framing, everyday clutter, nothing blurred out, everything in focus` (si es una persona mayor sumá `wrinkles, age spots, flyaway grey hairs`). Nada de fondos lisos de estudio, piel de porcelana ni bloques flotando con sombras perfectas: tiene que parecer que alguien de la casa sacó la foto con el celular.
- ⭐ **Detalle narrativo (OBLIGATORIO en cada una):** en el JSON un campo `"detalle_narrativo"` con 2-3 detalles que cuenten una historia y que NADIE te pidió. Nivel esperado (no los copies, inventá los de este video):
  - En una grilla de rutina: la HORA en letra blanca chica abajo de cada fotito (6:12, 6:20, 7:05…) y en una sola foto algo que sólo se ve si mirás dos veces (el gato dormido en la toalla, el té enfriándose de foto en foto).
  - En un cuaderno: una corrección tachada a mano, una fecha vieja, una mancha de té justo sobre el paso 2.
  - En un flat lay: el ticket de la tienda con precio y fecha, una etiqueta con un nombre bordado.
  - En un antes/después: la misma taza en las dos fotos, pero vacía en la segunda.
  Si al mirar tu prompt no hay nada que sorprenda, no está terminado.
- **Menú (usalas Y sumá las tuyas):** el cuaderno viejo abierto a cámara con pasos numerados, flechas y acuarelas · el abanico de muestras bajo el mentón · la selfie en el espejo con post-its del plan de la semana · la foto vieja en blanco y negro en la mano y el mismo objeto hoy en el regazo · el flat lay con tarjetitas de papel rasgado escritas a mano (la "fórmula") · el antes/después como collage de celular de 2 fotos con línea blanca, mismo encuadre y luz · por encima del hombro señalando su sistema con etiquetas de papel colgadas · la nota escrita a mano para quien mira (1 frase) con la lapicera al lado · la tira de 3 fotos numeradas del paso a paso con las mismas manos · la grilla de rutina (collage de celular de 6 o 9 fotos con bordes blancos finos) · la ilustración en acuarela simple sobre papel crema, sólo si lo que explica es abstracto (rótulos ≤ 5 palabras).
- **Cómo pedirla:** por `fotos.py`, como cualquier foto. El `type` dice QUÉ es + la cláusula de realismo. Texto legible: escribí el texto EXACTO entre comillas, corto y en el idioma del video, y en `avoid` poné `"misspelled words, extra text, watermark"`. Con `"detalle_narrativo"` la compuerta sólo te exige `type`, `subject`, `avoid` y la cláusula. Con el presentador: `"cara": true` (nunca foto de referencia).
- Revisalas con Read: repedí si hay palabras mal escritas, cambia la cara, manos rotas o se ve "de stock". No dos seguidas. Pueden ir en el lado libre de una pantalla partida.

## 5. Armado (herramientas del Estudio: no las copies ni las edites)
```
python {APP}/tools/render.py <carpeta> [--limit 10]
python {APP}/tools/assemble.py <carpeta>
```
- `shots_timed.json` = `[{"id":"p001","startMs":0,"endMs":3200}]` — lo escribe `planos.py <carpeta> --shots` (un plano = una foto, sin huecos); no lo armes a mano.
- `avatar_ranges.json` (§3) tapa las fotos que haya debajo.
- Fotos con movimiento al azar, fundidos (avatar 0,6 s / foto 0,3 s), escala 4K antes del zoom: ya está hecho. render.py escribe `plan.json` solo (el panel lo dibuja): no lo escribas a mano.
- Si un clip de avatar todavía no existe, NO esperes: render.py pone la foto del presentador. Cuando llegue el clip, corré render.py y assemble.py otra vez (sólo rehace lo que cambió).
- Salida: `final.mp4` 1920x1080 30 fps, H.264 CRF 20 bt709 rango tv, keyframe cada 2 s, AAC 192k estéreo 48 kHz (lista para YouTube). Duración = la de la voz.

## 5b. Efectos de sonido (gratis, sin clave)
```
python {APP}/tools/sonidos.py <carpeta> <carpeta>/sfx_pedidos.json --tomas 3 > <carpeta>/sonidos.log 2>&1
```
- `sfx_pedidos.json` = `[{"id":"agua","tags":["water","splash"],"q":"water pour","min":0.5,"max":6}]` (`tags` = etiquetas de Mixkit en inglés; `q` = palabras del título; `min`/`max` = duración en s). Baja a `sfx/<id>.mp3` y alternativas `<id>_2`, `<id>_3`; `sfx/_sfx_fuentes.json` dice el título y la duración de cada una.
- **La etiqueta no garantiza el sonido.** Elegí la toma por su título y duración, y ante la duda usá MENOS: mejor 6 bien puestos que 15 raros.
- `cues.json` = `[{"file":"agua.mp3","t":171100,"gain":0.05,"fade":0.4}]` (`t` en ms, tomado del `startMs` de la palabra en `captions.json`; `gain` 0,035-0,08). Bajos y sólo en momentos puntuales. `assemble.py` los mezcla solo.
- Si `sonidos.py` no trae nada, seguí sin efectos y anotalo en REPORTE.md: nunca frena el video.

## 6. Control de calidad (no frena)
- `python {APP}/tools/validar.py <carpeta> --etapa guion|fotos|render|final --min <minutos>`. Sólo frena con ✗ (video roto, sin audio, desincronizado, no arranca con el avatar, avatar congelado, hueco negro > 0,5 s, fotos repetidas, menciones de IA, sin título).
- En fotos/render/final mirá la hoja con Read y escribí en `gates/<etapa>_auto.txt` qué miraste y qué arreglaste. Después SEGUÍ.
- **Revisor final:** con `final.mp4` listo, `python {APP}/tools/revisor.py <carpeta>`. Deja los cuadros en `qc/f_*.jpg`, mide los huecos negros y mira con visión si hay fallas claras (cara deforme, glitch del avatar, marca de agua, foto repetida). Lo que encuentra queda en `gates/correcciones.txt`: aplicalo, anotalo en `gates/correcciones_hechas.txt`, volvé a armar y corrélo una vez más. Máximo 2 revisiones. Si algo de eso no se puede arreglar, anotalo en REPORTE.md y SEGUÍ.
- Si el usuario te escribe correcciones en el chat, aplicalas antes del armado final.
- `REPORTE.md`: qué se hizo, gasto, problemas y qué falta.

## 7. Carpetas (el panel las lee para dibujar el pipeline — respetalas)
`guion.txt` · `voz/master.wav` · `captions.json` · `planos.json` · `avatar/` · `fotos/` (cada foto con su `.json`) · `sfx/` · `gates/` · `plan.json` · `segments/` · `qc/` · `final.mp4` · `meta.json` · `REPORTE.md` · `refs/` (avatar, cara, voz, canal: NO los toques).
