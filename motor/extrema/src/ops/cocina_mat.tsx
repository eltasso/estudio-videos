// Materiales de la familia cocina: madera, metal, papel y escritura a mano. Todo color sale del look; negro y blanco sólo como luz y sombra.
import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {Acto, Linea, Look, ANCHO, fam, golpeDe} from './base';
import {va, curva} from '../kit';

const canales = (c: string) => { if (c.startsWith('rgb')) return (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number); const h = c.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
/** Mezcla dos colores hex: t=0 da `a`, t=1 da `b`. */
export const mez = (a: string, b: string, t: number) => { const x = canales(a), y = canales(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
export const alfa = (c: string, o: number) => `rgba(${canales(c).join(',')},${o})`;

/** Paleta de materiales derivada del look. */
export const mat = (l: Look) => {
  const os = l.oscuro ? l.papel : l.tinta, cl = l.oscuro ? l.tinta : l.papel, claro = l.claro || cl;
  return {os, cl, claro, acento: l.acento, acento2: l.acento2 || l.acento,
    madera: mez(mez(os, cl, 0.36), l.acento, 0.2), maderaOs: mez(mez(os, cl, 0.16), l.acento, 0.14), maderaCl: mez(mez(os, cl, 0.56), l.acento, 0.2),
    metal: mez(claro, os, 0.24), metalOs: mez(claro, os, 0.58), metalCl: mez(claro, '#ffffff', 0.7),
    calido: mez(l.acento, claro, 0.52), mano: fam(l.mano || 'Caveat'), disp: fam(l.display), rDisp: ANCHO[l.display] ?? 0.55};
};
export const R_MANO = 0.41;

/** Cuadros clave del acto, a prueba de actos cortísimos. */
export const tiempos = (ac: Acto) => {
  const a = ac.a, b = ac.b, d = Math.max(1, b - a), sal = Math.min(9, Math.round(d * 0.18));
  const G = Math.round(Math.min(b - Math.min(12, d * 0.34), Math.max(a + Math.min(7, d * 0.22), golpeDe(ac))));
  return {a, b, d, sal, G};
};
export const leadsDe = (ac: Acto) => ac.lineas.filter((l) => l.rol !== 'golpe');
export const golpesDe = (ac: Acto) => ac.lineas.filter((l) => l.rol === 'golpe');
export const textoDe = (ls: Linea[]) => ls.map((l) => l.w.map((x) => x[0]).join(' ')).join(' ');
/** Palabras con su cuadro. `desde` adelanta las que caerían antes de que el objeto exista. */
export const pals = (ls: Linea[], desde = -1e9): [string, number][] => ls.flatMap((l) => l.w.map(([t, f]) => [t, Math.max(f, desde)] as [string, number]));
export const pulso = (fr: number, f0: number, dur = 16) => interpolate(fr, [f0, f0 + 3, f0 + dur], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
export const lim = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** El tamaño más grande con el que el texto entra en la caja, cortando por palabras. */
export const cabe = (txt: string, ancho: number, alto: number, r: number, inter = 1.05, max = 200, min = 44) => {
  for (let t = max; t > min; t -= 3) {
    let n = 1, act = 0, ok = true;
    for (const p of txt.split(/\s+/)) { const w = (p.length + 0.55) * t * r; if (w > ancho) { ok = false; break; } if (act + w > ancho && act > 0) { n++; act = w; } else act += w; }
    if (ok && n * t * inter <= alto) return t;
  }
  return min;
};

/** Salida fundida común: el objeto se aleja apenas y se funde con el plano siguiente. */
export const Salida: React.FC<{ac: Acto; children: React.ReactNode}> = ({ac, children}) => {
  const fr = useCurrentFrame(), {b, sal} = tiempos(ac), k = va(fr, b - sal, sal, 0, 1, curva.suave);
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', opacity: 1 - k, transform: `scale(${1 - k * 0.035})`}}>{children}</div>;
};

/** Tapa de mesa en fuga: tablas de madera con luz de ventana. */
export const Mesa: React.FC<{look: Look; dx?: number; dy?: number; inclina?: number}> = ({look, dx = 0, dy = 0, inclina = 30}) => {
  const m = mat(look);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: m.madera}}>
    <div style={{position: 'absolute', left: '-30%', right: '-30%', top: '-40%', bottom: '-40%', transform: `translate(${dx}px,${dy}px) perspective(1700px) rotateX(${inclina}deg)`,
      background: `repeating-linear-gradient(90deg, rgba(0,0,0,.3) 0 4px, rgba(255,240,215,.1) 4px 6px, transparent 6px 318px), repeating-linear-gradient(90deg, rgba(0,0,0,.06) 0 2px, transparent 2px 23px, rgba(255,240,215,.05) 23px 25px, transparent 25px 61px), linear-gradient(180deg, ${m.maderaOs}, ${m.madera} 45%, ${m.maderaCl})`}} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(70% 62% at 36% 28%, ${alfa(m.claro, 0.42)}, transparent 72%)`}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(85% 85% at 50% 46%, transparent 55%, rgba(20,12,4,.34) 100%)'}} />
  </div>);
};

/** Letra a mano que corre: cada palabra se escribe de izquierda a derecha en su cuadro exacto. `tacha` = cuadro en que una raya la cruza. */
export const Mano: React.FC<{palabras: [string, number][]; tam: number; fuente: string; color: string; ancho: number; alin?: 'left' | 'center' | 'right'; inter?: number; tacha?: number; colorTacha?: string; style?: React.CSSProperties}> = ({palabras, tam, fuente, color, ancho, alin = 'left', inter = 1.05, tacha, colorTacha, style}) => {
  const fr = useCurrentFrame();
  return (<div style={{fontFamily: fuente, fontWeight: 700, fontSize: tam, lineHeight: inter, color, width: ancho, textAlign: alin, ...style}}>
    {palabras.map(([t, f], i) => {
      const p = va(fr, f, lim(2 + t.length, 4, 10), 0, 1, curva.suave), q = tacha === undefined ? 0 : va(fr, tacha + i * 1.5, 7, 0, 1, curva.suave);
      return (<span key={i} style={{display: 'inline-block', position: 'relative', marginRight: '0.24em', clipPath: `inset(-30% ${(1 - p) * 110 - 6}% -40% -8%)`}}>{t}
        {q > 0 && <span style={{position: 'absolute', left: '-5%', top: '56%', height: '0.11em', width: `${q * 110}%`, borderRadius: 9, background: colorTacha || color, transform: 'rotate(-2deg)'}} />}
      </span>);
    })}
  </div>);
};

export type P2 = [number, number];
/** Elipse dibujada a pulso, más de una vuelta para que cierre cruzándose. */
export const elipseMano = (cx: number, cy: number, rx: number, ry: number, n = 90, vueltas = 1.14, ini = -2.4): P2[] => Array.from({length: n + 1}, (_, i) => {
  const s = i / n, th = ini + s * vueltas * Math.PI * 2, k = 1 + 0.035 * Math.sin(th * 3 + 1) - 0.05 * s;
  return [cx + Math.cos(th) * rx * k, cy + Math.sin(th) * ry * k];
});
/** Curva cuadrática como lista de puntos. */
export const curvaPts = (a: P2, c: P2, b: P2, n = 30): P2[] => Array.from({length: n + 1}, (_, i) => { const s = i / n, u = 1 - s; return [u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], u * u * a[1] + 2 * u * s * c[1] + s * s * b[1]]; });
/** Corta la lista de puntos en la fracción t; devuelve el trazo y dónde está la punta. */
export const trazo = (pts: P2[], t: number) => {
  const x = lim(t, 0, 1) * (pts.length - 1), k = Math.floor(x), u = x - k, q = pts[Math.min(k + 1, pts.length - 1)], cab: P2 = [pts[k][0] + (q[0] - pts[k][0]) * u, pts[k][1] + (q[1] - pts[k][1]) * u];
  return {puntos: [...pts.slice(0, k + 1), cab].map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '), punta: cab};
};
