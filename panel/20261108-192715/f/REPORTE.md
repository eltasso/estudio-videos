# Reporte — Trasplante de tomate: por qué se caen los plantines al pasarlos

## Estado
Video terminado: `final.mp4` 1920x1080, 30 fps, H.264 + AAC, duración 9:36 (576,6 s), igual a la voz.
Guion de 1.570 palabras en español rioplatense, voz clonada del canal, 43 ventanas de avatar (290 s, 50 % del video) y 76 planos de b-roll con fotos distintas.
Validación final: **OK**, sin errores; el revisor automático revisó 20 cuadros y no encontró fallas.

## Qué se hizo
- **Guion** (1.570 palabras): gancho con número y objeto (42 plantines, 37 caídos), credencial, cinco puntos con problema → anécdota con fecha y lugar → por qué pasa → medida concreta → algo para hacer hoy, prueba interactiva en el minuto 4, pedido de like/suscripción antes del último punto y cierre con pregunta y gancho al video de hojas amarillas.
- **Voz**: `voz.py` con el clon de Fish, 4 bloques, 9,6 min.
- **Tiempos**: `captions.json`, 1.543 palabras con marcas por palabra; todo el montaje clavado ahí.
- **Avatar**: una sola llamada a InfiniteTalk (`avatar_it.py`), 43 ventanas en un reel de 307 s, cortadas en pausas, con pantalla partida en 17 tramos largos y una ventana inicial convertida en pantalla partida de 10,26 s.
- **Fotos**: 76 planos (59 de b-roll + 17 de pantalla partida) + 1 foto extra para la primera ventana partida (s18, reutilizando una variante ya generada). Cada plano con su prompt propio y su `.json` al lado. Seis imágenes creativas con `detalle_narrativo`: cuaderno de los 5 pasos (s01), triptico de la prueba de la maceta (s07), grilla de los 7 días de endurecimiento (s09), nota "1 puño = 1 pan de tierra" (p018), cuaderno con la línea de entierro (p043) y antes/después del pan de tierra (s12).
- **Sonido**: 6 cues muy bajos (agua, viento, pájaros) tomados de Mixkit, mezclados por `assemble.py`.
- **Render**: 102 segmentos, movimiento aleatorio por foto, escala 4K antes del zoom, fundidos de 0,6 s en el avatar y 0,3 s entre fotos.

## Fotos: elección y rehechas
- **p001** (la imagen más fuerte, justo después de la ventana inicial): se pidieron 3 variantes. Elegida **p001_a**: una mujer de cara preocupada sostiene un plantín caído sobre la bandeja, con treinta plantines más caídos detrás; se entiende sin audio y en chico.
- **Ronda de rehechas (10 fotos, una sola ronda)**:
  - Texto en inglés en un video en español: s01, s07, s15, s16, p018 y p043. Se repidieron con el texto exacto en español y quedaron legibles.
  - p019 repetía el concepto de p002 (regadera inundando una bandeja); se rehízo con el agua saliendo por las ranuras.
  - p029, p047 y p058 tenían `cara: true`, pero la cara generada no coincidía con la de `refs/avatar.png`. Se reemplazaron por tomas de manos y por encima del hombro para no cortar la identidad del presentador.
- Resultado: 59 planos de b-roll, 59 fotos distintas, cero repetidas (validado). No quedó ninguna foto con texto en inglés.

## Gasto
- Fotos gpt-image (Batch, low): US$0,194 (88 imágenes).
- Avatar InfiniteTalk: US$0,25 (una sola llamada).
- Whisper: US$0,058.
- Revisor final: menos de US$0,01.
- **Total: ~US$0,51.**

## Problemas y cosas a mejorar
- InfiniteTalk tardó en salir de la cola de RunPod (unos 40 minutos de cola y casi una hora de generación, en total ~1 h 30 min); mientras tanto se adelantó todo el resto del trabajo.
- Las primeras fotos con `cara: true` no mantienen la identidad exacta del avatar: se decidió no usar fotos del presentador y dejar que la cara la dé el avatar. Para futuros videos conviene directamente no pedir `cara: true` si la identidad importa.
- La primera ventana de avatar se armó originalmente de 14,4 s; se corrigió a 10,26 s y se pasó a pantalla partida con una foto propia.
- La transcripción automática confundió algunas palabras del guion (por ejemplo "Berazategui" y "septiembre"), pero eso no afecta a la voz ni al montaje: las fotos se armaron desde el guion, no desde el texto transcripto.
- Si hubiera que mejorarlo: más variedad de planos en la anécdota de Don Aurelio y una foto más del cierre entre los surcos.
