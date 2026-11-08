# Ejemplo: cómo se le pide un video

**No hace falta escribir esto a mano.** En "Nuevo video" ponés el título (y, si querés, una idea de una línea) y el
panel arma solo el brief completo con `plantilla_brief.md` + la biblia del canal. Las reglas que importan no dependen
del prompt: el guardián (`tools/guard.py`) y el validador (`tools/validar.py`) las hacen cumplir aunque el pedido sea malo.

Este archivo sirve para que vos (o tu Claude Code) veas qué recibe la sesión y qué conviene poner en cada campo.

## Lo que escribís en el panel
| Campo | Ejemplo flojo (igual sale bien) | Ejemplo bueno (sale mejor) |
|---|---|---|
| Título | `tomates` | `7 errores que matan tus tomates antes de julio` |
| Idea | *(vacío)* | `contalo como lo que me pasó a mí el verano pasado: perdí 20 plantas por regar de noche` |
| Extra | *(vacío)* | `más planos de manos en la tierra; nada de fotos de supermercado` |

Lo que más sube la calidad, en orden:
1. **Un título concreto** (número + objeto + resultado). El guion entero se cuelga de eso.
2. **La biblia del canal bien escrita** (se carga una vez en "Mis canales"): quién es el presentador, edad, dónde vive,
   cómo habla, qué nunca dice, anécdotas recurrentes. Ejemplo:
   > Marta, 64, jardinera de toda la vida en Mendoza. Habla de tú, cálida y directa, con anécdotas de su abuela Rosa y
   > de su vecino Hugo. Cada video: un problema real de la huerta, la causa explicada simple y lo que hacer hoy con
   > cosas de la casa. Nunca promete milagros, nunca habla de química ni de marcas. Cierra siempre preguntando qué
   > les pasó a ellos.
3. **Presentador y escena en inglés** (los usa el avatar): `a warm woman in her 60s with short grey hair and a green
   cardigan` / `her kitchen with plants by the window`.

## Lo que la sesión recibe (resumen del brief armado)
- Apertura: el avatar hablando desde el segundo 0, después la imagen más fuerte (3 variantes, elige la mejor).
- Guion de ~N minutos: gancho con número, credencial, cada punto = problema → anécdota → por qué → qué hacer hoy.
- Voz con el clon del canal (Fish) → tiempos por palabra (whisper) → plan de cortes cada 3-4 s.
- Avatar: ~25-30 % del video en ventanas de 3-6 s, **una sola llamada** a RunPod.
- Fotos: gpt-image **low + Batch**, cada una cuenta un momento (JSON con momento, gesto, 6-10 objetos, cámara variada).
  Primero 6 de prueba + hoja de contacto, después el resto.
- Render de prueba → hoja → render completo → validador → `final.mp4`, `meta.json` (título + descripción) y `REPORTE.md`.

## Si querés pedir algo fuera del molde
Usá **Chat libre** (por ejemplo "rehacé las fotos 12 a 20 con más luz de día") o escribile al chat del video mientras
trabaja: los mensajes se ponen en cola y los aplica antes del armado final.
