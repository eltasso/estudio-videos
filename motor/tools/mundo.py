# -*- coding: utf-8 -*-
"""EL MUNDO DEL CANAL — lo primero de todo, antes del guion. Piensa como un director: las ideas salen de la PERSONA y de su lugar.
   python <APP>/tools/mundo.py <carpeta> "<título del video>" ["<idea o temas>"]
Lee refs/canal.json (quién es, biblia) y responde, en orden: el cuarto donde pasa el día · qué objetos de ahí YA llevan información ·
cómo escribe y marca · el look (cada color es el color de algo de ese cuarto) · punto por punto si se MUESTRA o es un DATO (y qué objeto de
su mundo lo dice) · qué sostiene el video entero · qué nunca aparece y a qué ritmo vive · lo que se tira por ser plantilla o decoración.
→ <carpeta>/mundo.json. Leelo UNA vez y usalo en todo: guion, cada prompt de foto, escenas firma. Cuesta menos de US$0,01."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _cfg, etapas, escenas

MENTE = """You are the director who designs the edit of a YouTube channel's video from zero. You do not pick from a catalogue and you do not start from "what graphics does a video have". Your ideas come out of the PERSON and their WORLD. This is how you think, in this order. Do not skip ahead: each answer is the raw material of the next.

1. STAND IN THE ROOM. Who is this person, and where do they spend their day? See the room or workshop as if you were there: the surfaces, the materials, the tools within reach, what hangs on the wall, what is on the counter, what is worn out from use, where the light comes from, what it sounds like.

2. FIND WHAT ALREADY CARRIES INFORMATION THERE. Every real workplace is full of things that already tell numbers, names, times, prices and lists, long before any video: a ledger, a price tag, a label on a jar, a measuring tool, a calendar on a nail, a ticket, a stamp, a chalk mark, a sign-in sheet, a card in a box. List them. These are the only "graphics" this channel is allowed to have, because they are the ones that exist in this life.

3. SEE HOW THIS PERSON WRITES AND MARKS. By hand or with a machine? Pencil, chalk, ballpoint, brush, a rubber stamp, a label maker, a stitched tag? In which language or script? Neat or hurried? The lettering and the one mark that signs everything come from here, never from fashion.

4. NOW THE LOOK EXISTS, AND YOU CAN SAY WHY. The surface everything sits on, three or four colours you can point at in the room, the way things are written. If you cannot say "this colour is the colour of THAT thing in the room", it does not belong.

5. GO THROUGH WHAT THE VIDEO SAYS, ONE POINT AT A TIME, and ask of each: is this something to SHOW (then it is a real photo of exactly that, and you add nothing), or is it a FACT (a number, a time, a proportion, a price, a rule, a list, a place, a memory, something someone said, a before/after)? For each fact ask the director's question: "In THIS person's world, which object would tell me this?" The time she wakes is not a caption, it is the clock on her wall. A proportion is the bowl she eats from. A memory is the photograph she keeps, as a physical print. Take the object from step 2 whenever one fits.

6. FIND WHAT HOLDS THE WHOLE VIDEO. Most videos are N things in order. What, in this world, naturally holds N things side by side or in sequence (a rail of hangers, a shelf of jars, a rack of tools, a row of boxes, the pages of a notebook)? That becomes the index at the start, the small progress marker during, and the recap at the end. One device, three uses.

7. DECIDE WHAT NEVER APPEARS, and how quiet it is. What would be a lie in this room (neon, glass panels, corporate bars, emoji, a font from another decade)? How fast or slow does this person live? The rhythm and the amount of text come from the person.

8. THROW AWAY WHAT FAILS THE TWO TESTS. (a) Would this idea look exactly the same on a different channel? Then it is a template: throw it away. (b) Could you have written it without knowing this person? Then it is decoration: throw it away.

ONE WORKED CASE, to show the chain (never copy its answers; another person's world gives other answers):
An 88-year-old woman who lives alone in an old wooden house in Kyoto and tells her ten daily habits.
1 → tatami, paper screens, a low table, cedar, a kettle, indigo cotton, a wall clock, morning light through paper.
2 → the paper of the screens, letters she writes by hand every Sunday, a wall calendar, the seal she signs with, the thermometer by the bath, the kitchen timer she uses for her nap.
3 → by hand, with ink, in Japanese; she signs with a small red seal.
4 → so: cream paper and black ink, the red of the seal, the indigo of her clothes. Nothing else.
5 → "I wake at five-thirty" is a FACT → her wall clock, hands at 5:30. "Eat until you are eighty percent full" → her own rice bowl filled to eighty percent, with the words she would actually write for it. "Forty degrees, ten minutes" → the bath thermometer. "Every Sunday I write one letter" → the letter in her hand. But "I fold my futon in three" is something to SHOW → hands folding a futon, and nothing added.
6 → ten habits → a fan of ten photographs laid out like prints on the tatami; a small "3 / 10" in the corner; the same fan, ticked, at the end.
7 → never anything bright or fast; one new thing at a time; long quiet shots, because she is 88.
8 → thrown away: a glowing progress bar (any channel), animated icons for each habit (decoration).

Write in English. Answer with JSON only."""

PEDIDO = """THE CHANNEL: {canal}
THE VIDEO: {titulo}
{idea}
Think it through in the order above and answer:
{{"1_la_habitacion":"what you see, hear and touch there (concrete, 60-100 words)",
 "2_lo_que_ya_lleva_informacion":["8-12 real objects of that place that already carry numbers, names, times, prices or lists"],
 "3_como_escribe_y_marca":"...",
 "4_el_look":{{"superficie":"what everything sits on, and where it is in the room","colores":[{{"hex":"#000000","es_el_color_de":"the exact thing in the room"}}],"letra":"how titles, small labels and handwriting look, and why","firma":"the one mark that signs everything"}},
 "5_punto_por_punto":[{{"lo_que_dice":"the point of the video","es":"MOSTRAR | DATO","si_es_mostrar":"the exact real photo","si_es_dato":{{"objeto_de_su_mundo":"which object tells it","como_se_ve":"what the photo of that object looks like, with the exact words or numbers written on it, in the language of the video","por_que_pertenece":"why it could only be this channel"}}}}],
 "6_lo_que_sostiene_el_video":{{"que_es":"...","al_empezar":"...","durante":"...","al_final":"..."}},
 "7_nunca_y_ritmo":{{"nunca":["..."],"ritmo":"..."}},
 "8_descartadas":[{{"idea":"...","por_que_se_tira":"..."}}]}}
Cover every point of the video in step 5."""

if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(0)
    B = os.path.abspath(a[0]).replace("\\", "/").rstrip("/"); titulo = a[1]; idea = a[2] if len(a) > 2 else ""
    c = escenas.jl(f"{B}/refs/canal.json", {}) or {}
    canal = f"{c.get('nombre', '')}. {c.get('biblia', '')} The presenter: {c.get('presentador', '')}. Usual setting: {c.get('escena', '')}. Language of the video: {c.get('idioma', 'en')}."
    guion = open(f"{B}/guion.txt", encoding="utf8").read()[:14000] if os.path.exists(f"{B}/guion.txt") else ""
    caja = escenas.Caja(B, 0.05)
    with etapas.etapa(B, "mundo"):
        r = escenas.ia(caja, [{"role": "system", "content": MENTE}, {"role": "user", "content": PEDIDO.format(canal=canal, titulo=titulo, idea=("NOTES: " + idea + "\n" if idea else "") + ("THE SCRIPT:\n" + guion + "\n" if guion else ""))}], 10000, 0.8)
    json.dump(r, open(f"{B}/mundo.json", "w", encoding="utf8"), ensure_ascii=False, indent=1); caja.cerrar()
    L = r.get("4_el_look", {}) or {}; S = r.get("6_lo_que_sostiene_el_video", {}) or {}
    print("✓ mundo.json")
    print("EL CUARTO:", r.get("1_la_habitacion"))
    print("YA LLEVA INFORMACIÓN:", " · ".join(map(str, r.get("2_lo_que_ya_lleva_informacion", []))))
    print("ESCRIBE Y MARCA:", r.get("3_como_escribe_y_marca"))
    print("LOOK:", L.get("superficie"), "|", " · ".join(f"{x.get('hex')} = {x.get('es_el_color_de')}" for x in L.get("colores", []) if isinstance(x, dict)), "| firma:", L.get("firma"))
    print("SOSTIENE EL VIDEO:", S.get("que_es"), "| al empezar:", S.get("al_empezar"), "| durante:", S.get("durante"), "| al final:", S.get("al_final"))
    print("NUNCA:", (r.get("7_nunca_y_ritmo") or {}).get("nunca"), "| RITMO:", (r.get("7_nunca_y_ritmo") or {}).get("ritmo"))
    n = sum(1 for p in r.get("5_punto_por_punto", []) if isinstance(p, dict) and not str(p.get("es", "")).upper().startswith("MOSTRAR"))
    print(f"PUNTO POR PUNTO: {len(r.get('5_punto_por_punto', []))} puntos, {n} son DATOS con su objeto (leé mundo.json §5 al escribir cada prompt de foto).")
