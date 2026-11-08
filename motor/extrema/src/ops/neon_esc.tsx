// Auxiliar de la familia neon: tiempos del acto, escenario con profundidad y medidas de texto.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Acto, Linea, Look, Foto as FotoT, golpeDe, esSerif, fam} from './base';
import {FondoFoto, Palabras, Polvo, va, curva} from '../kit';

export const cl = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const rgba = (h: string, a: number) => { const n = parseInt(h.replace('#', ''), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
export const lum = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
/** Color de texto que se lee encima de un relleno de color `h`. */
export const sobre = (h: string, look: Look) => (lum(h) > 130 ? look.papel : look.claro || '#fff');

/** Duración, golpe, entrada y salida del acto, adaptados a actos cortísimos. */
export const tiempos = (ac: Acto) => {
  const d = Math.max(1, ac.b - ac.a), G = Math.max(ac.a, Math.min(ac.b - 4, golpeDe(ac)));
  return {d, G, ent: Math.round(cl(d * 0.28, 5, 16)), sal: Math.round(cl(d * 0.16, 3, 10))};
};
export const golpeL = (ac: Acto) => ac.lineas.find((l) => l.rol === 'golpe');
export const leads = (ac: Acto) => ac.lineas.filter((l) => l.rol !== 'golpe');
export const txtDe = (l?: Linea) => (l ? l.w.map((x) => x[0]).join(' ') : '');
const sinPunta = (t: string) => t.replace(/[.,;:]+$/, '');

/** Ancho medio de letra (en em) medido a ojo por fuente, con mayúsculas ya contadas. */
const K: Record<string, number> = {Anton: 0.5, Bebas: 0.42, Oswald: 0.54, Syne: 1.12, SpaceGrotesk: 0.76, Playfair: 0.56, Inter: 0.7, ArchivoBlack: 0.8, Fraunces: 0.58, DMSerif: 0.55, Cormorant: 0.46, InstrumentSerif: 0.45};
export const anchoLetra = (f: string) => K[f] ?? 0.66;
export const mayusDe = (look: Look) => !esSerif(look.display);
/** Tamaño de letra para que `txt` entre en `ancho` usando hasta `renglones` renglones. */
export const cabe = (txt: string, ancho: number, look: Look, max: number, renglones = 1, min = 44, fuente?: string) => {
  const n = txt.length || 1, larga = Math.max(1, ...txt.split(/\s+/).map((x) => x.length)), por = Math.max(larga, renglones > 1 ? Math.ceil((n / renglones) * 1.18) : n);
  return Math.round(cl(ancho / (por * (K[fuente || look.display] ?? 0.66)), min, max));
};
export const pesoDe = (f: string) => (f === 'Syne' ? 800 : f === 'SpaceGrotesk' || f === 'Playfair' ? 700 : 400);

/** Una línea dicha: cada palabra entra en su cuadro exacto. Sin rol golpe usa la fuente de texto. */
export const Dicho: React.FC<{l?: Linea; tam: number; ancho: number; look: Look; color?: string; alin?: 'left' | 'center' | 'right'; desde?: number; style?: React.CSSProperties; interlinea?: number; texto?: boolean}> = ({l, tam, ancho, look, color, alin = 'center', desde = 0, style, interlinea = 1, texto}) => {
  if (!l || !l.w.length) return null;
  const g = l.rol === 'golpe' && !texto, up = g && mayusDe(look), nombre = g ? look.display : look.texto;
  const pal = l.w.map(([t, f]) => [up ? sinPunta(t).toUpperCase() : g ? sinPunta(t) : t, Math.max(f, desde)] as [string, number]);
  return <Palabras palabras={pal} tam={tam} fuente={fam(nombre)} peso={pesoDe(nombre)} color={color || (g ? look.acento : look.tinta)} ancho={ancho} alin={alin} interlinea={interlinea} tracking={g && up ? '0.005em' : '-0.01em'} style={style} />;
};

export const SOMBRA_N = '0 4px 26px rgba(0,0,0,.78), 0 1px 5px rgba(0,0,0,.6)';

/** Salida fundida común: se aleja un poco y se apaga. Devuelve estilo para el contenedor raíz. */
export const salida = (fr: number, ac: Acto, sal: number): React.CSSProperties => {
  const k = va(fr, ac.b - sal, sal, 0, 1, curva.entra);
  return {opacity: 1 - k, transform: k > 0 ? `scale(${1 - 0.05 * k})` : undefined};
};

/** Escenario: foto del momento desenfocada al fondo, piso con charco de luz, haz cónico que respira, viñeta y motas. Nunca fondo vacío. */
export const Escena: React.FC<{ac: Acto; look: Look; foto?: FotoT; o?: number; luz?: number; polvo?: number; children: React.ReactNode}> = ({ac, look, foto, o = 0.5, luz = 1, polvo = 10, children}) => {
  const fr = useCurrentFrame(), {sal} = tiempos(ac), f = foto || ac.fotos[0];
  const haz = 0.13 + 0.03 * Math.sin((fr - ac.a) / 18);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: look.fondo || look.papel}}>
    <div style={{position: 'absolute', inset: 0, ...salida(fr, ac, sal)}}>
      {f && <FondoFoto id={f.id} blur={26} brillo={0.62} style={{opacity: o}} />}
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(look.fondo || '#000000', 0.2)} 0%, transparent 42%, ${rgba(look.fondo || '#000000', 0.88)} 80%, ${look.fondo || '#000'} 100%)`}} />
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(44% 15% at 50% 83%, ${rgba(look.acento, 0.2 * luz)}, transparent 72%)`}} />
      <div style={{position: 'absolute', inset: 0, background: `conic-gradient(from 165deg at 50% -14%, transparent 0deg, ${rgba(look.claro || '#ffffff', haz * luz)} 15deg, transparent 30deg)`}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(120% 92% at 50% 50%, transparent 58%, rgba(0,0,0,.5))'}} />
      {children}
      {polvo > 0 && <Polvo n={polvo} color={look.claro || '#fff'} semilla={'neo' + ac.a} />}
    </div>
  </div>);
};

/** Reflejo plano de una caja: copia invertida debajo, que se apaga hacia abajo. */
export const Reflejo: React.FC<{w: number; h: number; alto?: number; o?: number; children: React.ReactNode}> = ({w, h, alto = 240, o = 0.34, children}) => (
  <div style={{position: 'absolute', left: 0, top: h + 4, width: w, height: alto, overflow: 'hidden', opacity: o, WebkitMaskImage: 'linear-gradient(180deg,#000,transparent)', maskImage: 'linear-gradient(180deg,#000,transparent)'} as React.CSSProperties}>
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transform: 'scaleY(-1)'}}>{children}</div>
  </div>
);
