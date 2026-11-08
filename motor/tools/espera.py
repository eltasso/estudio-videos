# -*- coding: utf-8 -*-
"""HERRAMIENTA DEL ESTUDIO: cartel elegante para lo que todavía no llegó (avatar, imagen). Sólo para la vista previa:
validar.py no deja entregar un video que tenga alguno de estos carteles."""
import glob, hashlib, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H = 1920, 1080


def fuente(tam):
    L = (glob.glob("/usr/share/fonts/**/Inter*SemiBold*", recursive=True) + glob.glob("/usr/share/fonts/**/Inter*Medium*", recursive=True)
         + glob.glob("/usr/share/fonts/**/Inter*", recursive=True) + ["C:/Windows/Fonts/seguisb.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"])
    for f in L:
        try: return ImageFont.truetype(f, tam)
        except Exception: pass
    return ImageFont.load_default(size=tam)


def _fondo(origen):
    if origen:
        return ImageOps.fit(Image.open(origen).convert("RGB"), (W, H), Image.LANCZOS, centering=(0.5, 0.4))
    g = Image.linear_gradient("L").resize((W, H))                       # sin foto: un fondo grafito con luz arriba
    return ImageOps.colorize(g, (44, 44, 50), (14, 14, 17))


def cartel(origen, texto, destino):
    """Foto + velo suave + píldora de vidrio esmerilado con el texto. Si ya existe y la foto no cambió, no la rehace."""
    if os.path.exists(destino) and (not origen or os.path.getmtime(destino) >= os.path.getmtime(origen)):
        return destino
    im = _fondo(origen)
    velo = Image.linear_gradient("L").resize((W, H)).point(lambda v: 26 + v * 0.42)   # 10 % arriba, 52 % abajo
    im = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, velo)

    S, f = 3, fuente(40 * 3)                                            # se dibuja al triple y se achica: bordes perfectos
    tw = f.getbbox(texto)[2] / S
    PX, PUNTO, GAP, PH = 46, 14, 20, 92
    PW = round(PX * 2 + PUNTO + GAP + tw)
    x0, y0 = (W - PW) // 2, H - 124 - PH
    caja = (x0, y0, x0 + PW, y0 + PH)

    m = Image.new("L", (PW * S, PH * S), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, PW * S - 1, PH * S - 1), PH * S // 2, fill=255)
    m = m.resize((PW, PH), Image.LANCZOS)

    sombra = Image.new("L", (W, H), 0); sombra.paste(m.point(lambda v: v * 0.55), (x0, y0 + 14))
    sombra = sombra.filter(ImageFilter.GaussianBlur(34))
    im = Image.composite(Image.new("RGB", (W, H), (0, 0, 0)), im, sombra)

    vidrio = im.crop(caja).filter(ImageFilter.GaussianBlur(38))
    vidrio = Image.blend(vidrio, Image.new("RGB", (PW, PH), (255, 255, 255)), 0.16)
    im.paste(vidrio, (x0, y0), m)

    capa = Image.new("RGBA", (PW * S, PH * S), (0, 0, 0, 0)); d = ImageDraw.Draw(capa)
    d.rounded_rectangle((0, 0, PW * S - 1, PH * S - 1), PH * S // 2, outline=(255, 255, 255, 64), width=S)   # filo de luz
    cy, px = PH * S // 2, PX * S
    d.ellipse((px, cy - PUNTO * S // 2, px + PUNTO * S, cy + PUNTO * S // 2), fill=(255, 255, 255, 255))
    d.text(((PX + PUNTO + GAP) * S, cy), texto, font=f, fill=(255, 255, 255, 250), anchor="lm")
    capa = capa.resize((PW, PH), Image.LANCZOS)
    im.paste(capa, (x0, y0), capa)

    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, "JPEG", quality=93, subsampling=0)
    return destino


def ruta(B, tipo, clave):
    """El de avatar va dentro de avatar/ para que el plan lo cuente como tramo de avatar sin clip."""
    return "%s/%s/espera/%s.jpg" % (B, "avatar" if tipo == "avatar" else "fotos", hashlib.sha1(clave.encode("utf8")).hexdigest()[:10])
