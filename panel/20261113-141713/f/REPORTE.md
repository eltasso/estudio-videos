# REPORTE — Pulgones en la acelga: cómo detectarlos y cuándo no intervenir · Don Genaro

## Resultado
- `final.mp4` — 1920x1080, 30 fps, H.264 CRF 20, AAC 192k. **Duración: 16 min 03 s (963 s)**, igual que la voz.
- `meta.json` — título + descripción de YouTube (3 párrafos, voz del presentador, sin links ni hashtags).
- Guion de 13.897 caracteres (control guion OK, pedían 13.500–17.250).
- `avatar_ranges.json`: 82 ventanas de avatar, 432 s = **45 % del video**; nunca más de 15 s sin avatar; ninguna ventana de más de 6 s.
- Control `validar.py --etapa final`: **OK**.

## Cómo está armado
- **Modo Ahorro:** 12 fotos de gpt-image (low, Batch) + 108 planos con clip de stock (Pexels, con juez de visión). Las fotos quedaron repartidas de punta a punta: el gancho, los sobres de semilla, el cuaderno, la etiqueta del frasco, el calendario de marzo, la albahaca entre las acelgas, la foto de Elena y la firma de la hoja.
- **Gancho:** 3 variantes pedidas (p001_a/b/c). Quedó **p001_c**, el frasco de mermelada con pulgones en alcohol, la etiqueta «Pulgones - acelga - 12/3» legible y la lupa encima: es el objeto que trae la prueba del video. Las otras dos se borraron.
- **Fotos con el presentador (`cara: true`):** 4 (p001, p002, p008, p090), dentro del tope.
- **Creativas (§4b):** página del cuaderno con la hoja mirada de los dos lados (p018), cuaderno con «No tocar hasta los 7 días» y el conteo tachado (p058), calendario de marzo marcado a lápiz (p070), la etiqueta de la albahaca clavada en el cantero (p074), la foto de Elena con «dejá de fumigar, Genaro» en el dorso (p106) y la firma de la hoja de acelga (p122).
- **Escenas firma:** es01 quedó construida sobre el cuaderno (capa de edición extrema en la línea de render). es02 y es03 caían sobre ventanas del avatar, así que esos planos van con su foto normal.
- **Sonido:** 8 efectos bajos (papel, lupa, agua, tijera, golpe de madera) clavados a palabras de `captions.json`.
- **Avatar:** primera llamada FAILED («job timed out») — no cobra; se relanzó y salió completa, con el desfase medido y corregido (máx. 300 ms).

## Gasto (registro del Estudio, `gasto.jsonl`)
- Fotos gpt-image: US$ 0,045 aprox. (12 fotos)
- Escenas (ficha + descripción): US$ 0,008
- Juez de stock + revisor: US$ 0,020
- Edición extrema (escena firma): US$ 0,033
- Avatar InfiniteTalk: 1 llamada (precio fijo del servicio, ~US$ 0,25)
- **Total módulos del Estudio: ~US$ 0,36 + la llamada del avatar.**

## Problemas y cómo se resolvieron
- El Batch de imágenes tardó mucho más de lo normal (la tanda de las escenas, 87 min): el video se armó igual en paralelo, con clips de stock ya elegidos.
- Fotos que fallaron por el filtro: p042 (terminó sirviendo el clip p036, mariquita en la hoja) y p113 de escena (es02 quedó con su foto). Tres fotos creativas salieron con cara o estilo de estudio y se cambiaron por clips más literales.
- En el render de prueba se detectaron ventanas del avatar que duraban un suspiro y hacían parpadear la escena: se sacaron esas ventanas dentro de un mismo plano.
- `assemble.py`: los tramos 28 y 31 no salieron y cayó al armado completo (más lento pero correcto).
- **Revisor final:** marcó «misma foto del presentador repetida» en ~1:00, 1:30, 2:00, 2:30 y 3:00. Revisé esos segundos: son los clips de avatar (la cara se mueve, los gestos cambian); el revisor compara cuadros parecidos del mismo encuadre del galpón. No hay foto del presentador repetida — las 4 fotos con cara son distintas. No se puede rendir una segunda revisión, así que quedó anotado en `gates/correcciones_hechas.txt`.

## Qué haría distinto
- Pedir las fotos del gancho y las creativas en el **primer** pedido del día: el Batch fue lo que más tiempo demoró.
- Dejar más variedad de encuadre en las ventanas del avatar (más pantalla partida con fotos) para que el presentador no quede tanto tiempo en el mismo plano del galpón: es justo lo que confundió al revisor.
- Agregar dos o tres fotos más de variedad en el tramo 4–7 minutos, que es donde el revisor ve más repetición de cuadro.
