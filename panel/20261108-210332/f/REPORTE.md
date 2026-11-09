# REPORTE — Mito o verdad: consejos de huerta que pueden arruinar tus tomates

## Qué se hizo
- **Guion**: 16.161 caracteres (3.049 palabras), en la voz de Don Genaro. Abre con «¡Hola, gente de YouTube! ¿Cómo andan?», gancho con número y objeto (3 de cada 4 consejos / tomate con el culito negro), credencial, prueba del dedo y prueba de la flor, 15 consejos con anécdota fechada y cambio concreto, pedido de like antes del último punto y cierre con «Nos vemos entre los surcos.». Validado sin ✗.
- **Voz**: clon del canal (Fish), `voz/master.wav`. Duración de la voz: **19:12** (1.152,3 s). El video final dura lo mismo.
- **Tiempos**: `captions.json`, 3.080 palabras.
- **Avatar**: una sola llamada a InfiniteTalk, 103 ventanas, **548,9 s de avatar (48 % del video)**, reel de 579,8 s. Primera ventana en 0 s, cortada a 5,1 s; huecos máximos de 8,2 s (nunca más de 15 s sin avatar); 5 tramos largos en pantalla partida (s01-s05).
- **Fotos**: **17 fotos finales** con gpt-image low + Batch (tope Ahorro: 20). 3 con el presentador (p001 gancho, p006 credencial, p103 confesión), 5 creativas propias (p005 grilla «3 DE 4», p024 30 cáscaras, p030 libreta del azúcar, p077 termómetro «15 °C», p098 foto vieja de la huerta) más s04 con detalle narrativo; 4 de detalle que un clip no muestra (p011 dedo en la tierra, p036 clavo oxidado, p050 balde de ceniza, p099 sal en el hoyo); 5 de pantalla partida. **Cero fotos repetidas.**
- **B-roll de stock**: 95 clips de Pexels (modo Ahorro), cada plano con su clip. Se revisaron con hojas de contacto y se rehicieron 44 clips en cuatro rondas puntuales.
- **Sonido**: 4 efectos bajos y puntuales (`cues.json`): agua en «regar profundo», cáscara de huevo, tijera en «poda» y rocío en «ducha a presión».
- **Epílogo**: `meta.json` con título y descripción de YouTube en tres párrafos, sin links ni hashtags.

## Gasto
- Fotos gpt-image (21 generaciones: 19 + 2 rehechas): **US$ 0,051**.
- InfiniteTalk (1 llamada fija): **US$ 0,25**.
- Voz, Pexels y Mixkit: gratis.
- **Total estimado: US$ 0,30.**

## Problemas y decisiones
- El gancho p001 se generó en 3 variantes; la primera versión de la variante elegida salió con una cara más redonda que el avatar. Se rehizo con la descripción exacta del presentador de `refs/avatar.png` y quedó coincidente. El clavo de p036 tampoco se veía en el primer intento: se rehízo con el clavo en diagonal y más grande.
- Las fotos p006 y p103 respetan el vestuario de la biblia del canal (gorra azul gastada y camisa de pana marrón), mientras que el avatar y p001 usan gorra verde y camisa gris verde. La cara es la misma; el cambio de ropa se lee como otro día en el galpón.
- Algunos clips de Pexels son genéricos (calendario en inglés en p021, herramientas de suelo en p078). Se eligieron los que al menos ilustran el tema; no hay marcas grandes ni carteles en otro idioma que distraigan.
- El validador de la etapa render marca «avatar a pantalla completa de más de 6 s» en los 5 tramos de pantalla partida porque todavía no estaban los clips reales; cuando llegan, render.py aplica la mitad de foto y el tramo deja de ser pantalla completa.

## Qué mejorar
- Unificar desde el arranque la descripción del vestuario con la foto real del avatar (gorra verde / camisa gris) para que las fotos del presentador no cambien de ropa.
- Para el modo Ahorro, pedir los clips de detalles muy específicos (termómetro de varilla, mildiú, sobre de semillas) con búsquedas aún más literales o directamente con foto.
- El guion quedó en 19:12 de voz para ~16.000 caracteres; si se busca exactamente 15 min, conviene recortar unos 2.000 caracteres o subir un poco la velocidad de la voz.
