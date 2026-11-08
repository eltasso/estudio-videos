// Materiales de la familia archivo: mesa, hoja, clip, grapa, chinche, tiempos y medidas. Colores siempre derivados de `look`.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {Acto, Linea, Look, ANCHO, golpeDe} from './base';
import {FondoFoto, Polvo, va, curva} from '../kit';

const hex = (h: string) => { if (h.startsWith('rgb')) return (h.match(/\d+/g) as string[]).slice(0, 3).map(Number); const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
export const mix = (a: string, b: string, t: number) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
export const alfa = (h: string, a: number) => { const A = hex(h); return `rgba(${A.join(',')},${a})`; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const limita = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Paleta física: la hoja siempre es clara y la tinta siempre oscura, también en estilos oscuros. */
export const materia = (look: Look) => {
  const claro = look.claro || '#fff9ec', tinta = look.oscuro ? look.papel : look.tinta, fondo = look.fondo || look.papel;
  return {
    hoja: claro, hojaB: look.oscuro ? mix(claro, look.acento, 0.16) : mix(claro, look.papel, 0.72), tinta,
    carpeta: look.oscuro ? mix(claro, look.acento, 0.34) : mix(look.papel, look.acento, 0.14),
    madera: look.oscuro ? mix(fondo, look.acento, 0.1) : mix(mix(look.tinta, fondo, 0.2), look.acento, 0.12),
    maderaB: look.oscuro ? mix(fondo, '#000000', 0.45) : mix(look.tinta, fondo, 0.1),
    metal: mix(tinta, claro, 0.5), metalB: mix(tinta, claro, 0.12), marcador: alfa(look.acento, look.oscuro ? 0.72 : 0.42), niebla: fondo,
    tintaA: look.oscuro ? mix(look.acento, tinta, 0.5) : look.acento, laton: look.oscuro ? mix(look.acento, claro, 0.2) : mix(fondo, look.tinta, 0.34), latonB: look.oscuro ? mix(look.acento, '#000000', 0.55) : mix(fondo, look.tinta, 0.82),
    corcho: look.oscuro ? mix(fondo, look.acento, 0.26) : mix(mix(look.papel, look.tinta, 0.3), look.acento, 0.14),
  };
};

/** Tiempos seguros aunque el acto dure 22 cuadros o el golpe caiga pegado a un borde. */
export const tiempos = (ac: Acto) => {
  const a = ac.a, b = ac.b, dur = Math.max(1, b - a);
  const G = Math.round(limita(golpeDe(ac), a + Math.min(9, dur * 0.3), b - Math.min(12, dur * 0.34)));
  return {a, b, dur, G, ent: Math.max(5, Math.min(20, (G - a) * 0.8)), sal: Math.max(4, Math.min(10, Math.round(dur * 0.2)))};
};
export const partes = (ac: Acto): {g?: Linea; leads: Linea[]} => {
  const g = ac.lineas.find((l) => l.rol === 'golpe');
  if (g) return {g, leads: ac.lineas.filter((l) => l !== g)};
  return {g: ac.lineas[ac.lineas.length - 1], leads: ac.lineas.slice(0, -1)};
};
export const txt = (l?: Linea) => (l ? l.w.map((x) => x[0]).join(' ') : '');
const k = (f: string) => ANCHO[f] ?? 0.6;
/** Tamaño de letra para que `t` entre en `renglones` de ancho `w`. Nunca baja de `min`. */
export const cabe = (t: string, w: number, fuente: string, max: number, renglones = 1, min = 44, mayus = false) => {
  const larga = Math.max(...t.split(/\s+/).map((x) => x.length), 1), por = Math.max(larga, Math.ceil((t.length * 1.12) / renglones));
  return Math.max(min, Math.min(max, w / (por * k(fuente) * (mayus ? 1.22 : 1.06))));
};
export const renglonesDe = (t: string, w: number, fuente: string, tam: number) => Math.max(1, Math.ceil(((t.length + 1) * tam * k(fuente) * 1.08) / w));

/** Mesa de trabajo: madera, charco de luz que respira y polvo. */
export const Mesa: React.FC<{look: Look; foto?: string; luz?: [number, number]; o?: number; polvo?: number}> = ({look, foto, luz = [50, 44], o = 0.18, polvo = 9}) => {
  const fr = useCurrentFrame(), M = materia(look), dx = Math.sin(fr / 48) * 2.6, dy = Math.cos(fr / 61) * 1.8;
  return (<div style={{position: 'absolute', inset: 0, background: M.madera}}>
    {foto ? <FondoFoto id={foto} blur={42} brillo={0.62} style={{opacity: o}} /> : null}
    <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(91deg, rgba(0,0,0,.075) 0 3px, transparent 3px 13px, rgba(255,255,255,.03) 13px 15px, transparent 15px 47px)'}} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(58% 66% at ${luz[0] + dx}% ${luz[1] + dy}%, ${alfa(look.claro || '#fff9ec', 0.28)}, transparent 74%)`}} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(82% 86% at 50% 46%, transparent 52%, ${M.maderaB} 118%)`}} />
    <Polvo n={polvo} color={look.claro || '#fff'} semilla="arc" />
  </div>);
};
/** Todo lo que está encima de la mesa se aleja y se funde al terminar el acto. */
export const Sale: React.FC<{b: number; sal: number; children: React.ReactNode}> = ({b, sal, children}) => {
  const fr = useCurrentFrame(), s = va(fr, b - sal, sal, 0, 1, curva.suave);
  return <div style={{position: 'absolute', inset: 0, opacity: 1 - s, transform: `scale(${1 - 0.07 * s})`}}>{children}</div>;
};

/** Renglones de escritura sin leer: dan cuerpo de documento sin inventar ningún texto. */
export const Renglones: React.FC<{x: number; y: number; w: number; n: number; paso?: number; alto?: number; color: string; semilla?: string}> = ({x, y, w, n, paso = 42, alto = 12, color, semilla = 'r'}) => (
  <>{Array.from({length: n}).map((_, i) => <div key={i} style={{position: 'absolute', left: x, top: y + i * paso, height: alto, borderRadius: 2, width: w * (i === n - 1 ? 0.46 : 0.8 + 0.2 * random(`${semilla}-${i}`)), background: color}} />)}</>
);
export const Clip: React.FC<{x: number; y: number; color: string; rot?: number; h?: number}> = ({x, y, color, rot = 0, h = 150}) => (
  <svg viewBox="0 0 44 130" style={{position: 'absolute', left: x, top: y, height: h, width: h * 0.34, transform: `rotate(${rot}deg)`, overflow: 'visible', filter: 'drop-shadow(2px 5px 3px rgba(0,0,0,.42))'}}>
    <path d="M12 26 V102 a10 10 0 0 0 20 0 V16 a14 14 0 0 0 -28 0 V104 a18 18 0 0 0 36 0 V36" fill="none" stroke={color} strokeWidth={4.4} strokeLinecap="round" />
    <path d="M12 26 V102 a10 10 0 0 0 20 0 V16" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth={1.3} strokeLinecap="round" />
  </svg>
);
export const Grapa: React.FC<{x: number; y: number; w?: number; rot?: number; color: string}> = ({x, y, w = 84, rot = -3, color}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: 9, borderRadius: 4, transform: `rotate(${rot}deg)`, background: `linear-gradient(180deg, rgba(255,255,255,.8), ${color} 55%, rgba(0,0,0,.5))`, boxShadow: '0 3px 3px rgba(0,0,0,.42)'}} />
);
export const Chinche: React.FC<{x: number; y: number; color: string; r?: number}> = ({x, y, color, r = 19}) => (
  <div style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.85), ${color} 42%, rgba(0,0,0,.62) 112%)`, boxShadow: '6px 11px 8px rgba(0,0,0,.45)'}} />
);

const circulos = (sem: string, n: number, lado: number, rMax: number, col: string) => Array.from({length: n}).map((_, i) => `<circle cx="${(random(`${sem}x${i}`) * lado).toFixed(1)}" cy="${(random(`${sem}y${i}`) * lado).toFixed(1)}" r="${(0.5 + random(`${sem}r${i}`) * rMax).toFixed(1)}" fill="${col}"/>`).join('');
const uri = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
/** Textura de corcho: una sola imagen fija que se repite, no cuesta nada por cuadro. */
export const CORCHO = uri(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">${circulos('co', 520, 300, 2.8, 'rgba(50,28,8,.3)')}${circulos('cl', 260, 300, 2.1, 'rgba(255,232,190,.2)')}</svg>`);
/** Máscara de tinta gastada para lo que queda estampado. */
export const TINTA = uri(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420"><defs><mask id="m"><rect width="420" height="420" fill="#fff"/>${circulos('ti', 620, 420, 3.2, '#000')}</mask></defs><rect width="420" height="420" fill="#000" mask="url(#m)"/></svg>`);
