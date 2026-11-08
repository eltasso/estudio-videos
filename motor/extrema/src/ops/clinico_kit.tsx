// Materiales compartidos de la familia clínica: color, tiempos, sala con profundidad, cámara viva y texto a medida.
import React from 'react';
import {useCurrentFrame, random} from 'remotion';
import {Acto, Foto as FotoT, Look, Linea, ANCHO, esSerif, fam} from './base';
import {FondoFoto, Palabras, Polvo, va, salta, curva} from '../kit';

/* ─────────── color ─────────── */
const rgb = (h: string) => { const x = (h || '#000000').replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) || 0); };
export const rgba = (h: string, a: number) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
export const mezclar = (a: string, b: string, t: number) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
export const lum = (h: string) => { const [r, g, b] = rgb(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
/** Tinta legible encima de un color de fondo. */
export const sobre = (fondo: string) => (lum(fondo) > 0.58 ? '#10181d' : '#ffffff');
/** El acento, o una tinta oscura si el acento no se lee sobre papel blanco. */
export const legibleEnClaro = (look: Look, c: string) => (lum(c) > 0.6 ? (look.oscuro ? (look.fondo || '#10181d') : look.tinta) : c);
export const color2 = (look: Look) => look.acento2 || look.acento;

/* ─────────── tiempo ─────────── */
/** Impulso amortiguado que arranca en f0 (temblor de impacto). */
export const impulso = (fr: number, f0: number, amp = 1, caida = 3.2, frec = 2.3) => { const d = fr - f0; return d < 0 || d > 16 ? 0 : amp * Math.exp(-d / caida) * Math.sin(d * frec); };
/** Lista de cuadros estrictamente creciente, a partir de cuadros sueltos o ausentes. */
export const crecientes = (xs: (number | null | undefined)[], desde: number, hasta: number) => {
  const n = xs.length, out: number[] = []; let u = desde - 1;
  for (let i = 0; i < n; i++) { const def = desde + ((hasta - desde) * (i + 1)) / (n + 1), v = Math.round(typeof xs[i] === 'number' ? (xs[i] as number) : def); u = Math.max(u + 1, v); out.push(u); }
  return out;
};
export const lineasDe = (ac: Acto, rol: 'lead' | 'golpe') => (ac.lineas || []).filter((l) => l.rol === rol);
export const palabrasDe = (ls: Linea[], desde = 0): [string, number][] => ls.flatMap((l) => l.w.map(([t, f]) => [t, Math.max(f, desde)] as [string, number]));

/* ─────────── texto ─────────── */
/** Tamaño que entra en `ancho` en hasta `renglones` renglones; nunca baja de 44. */
export const tamFit = (txt: string, ancho: number, fuente: string, max: number, mayus: boolean, renglones = 2) => {
  const palabras = txt.split(/\s+/).filter(Boolean), larga = Math.max(1, ...palabras.map((x) => x.length));
  const por = Math.max(larga + 1, Math.ceil((txt.length + 1) / renglones) + 1);
  return Math.max(44, Math.min(max, ancho / (por * (ANCHO[fuente] ?? 0.56) * (mayus ? 1.2 : 1.04))));
};
/** La línea golpe, en su cuadro exacto, midiendo sola lo que ocupa. */
export const GolpeTexto: React.FC<{ac: Acto; look: Look; ancho: number; max: number; color: string; desde?: number; alin?: 'left' | 'center' | 'right'; renglones?: number; sombra?: string}> = ({ac, look, ancho, max, color, desde = 0, alin = 'center', renglones = 2, sombra}) => {
  const fr = useCurrentFrame(), g = lineasDe(ac, 'golpe'); if (!g.length) return null;
  const serif = esSerif(look.display), pal = palabrasDe(g, desde).map(([t, f]) => [(serif ? t : t.toUpperCase()).replace(/[,;:]+$/, ''), f] as [string, number]);
  const tam = tamFit(pal.map((x) => x[0]).join(' '), ancho, look.display, max, !serif, renglones), hit = salta(fr, pal[0][1], {damping: 12, stiffness: 300, mass: 0.7});
  return <div style={{transform: `scale(${0.8 + 0.2 * hit})`, transformOrigin: '50% 55%', textShadow: sombra}}><Palabras palabras={pal} tam={tam} fuente={fam(look.display)} italica={serif} color={color} ancho={ancho} alin={alin} interlinea={0.98} tracking={serif ? '-0.02em' : '0.005em'} /></div>;
};
/** Las líneas lead, chicas pero legibles, en su cuadro exacto. */
export const LeadTexto: React.FC<{ac: Acto; look: Look; ancho: number; max?: number; color?: string; hasta?: number; alin?: 'left' | 'center' | 'right'; sombra?: string}> = ({ac, look, ancho, max = 66, color, hasta = 1e9, alin = 'center', sombra}) => {
  const fr = useCurrentFrame(), pal = palabrasDe(lineasDe(ac, 'lead'), ac.a); if (!pal.length) return null;
  const tam = tamFit(pal.map((x) => x[0]).join(' '), ancho, look.texto, max, false, 2);
  return <div style={{opacity: 1 - va(fr, hasta - 3, 7, 0, 1, curva.suave), textShadow: sombra}}><Palabras palabras={pal} tam={tam} fuente={fam(look.texto)} color={color || look.tinta} ancho={ancho} alin={alin} peso={600} interlinea={1.08} tracking="-0.015em" /></div>;
};

/* ─────────── escena ─────────── */
/** Sala con profundidad: la foto desenfocada atrás, piso con charco de luz, haz cónico que respira y polvo. Nunca fondo vacío. */
export const Sala: React.FC<{look: Look; foto?: FotoT; piso?: number; haz?: number; halo?: string; semilla?: string}> = ({look, foto, piso = 800, haz = 960, halo, semilla = 'cli'}) => {
  const fr = useCurrentFrame(), osc = !!look.oscuro, base = look.fondo || look.papel, resp = 0.82 + 0.18 * Math.sin(fr / 23);
  const pisoC = osc ? mezclar(base, '#ffffff', 0.09) : mezclar(base, '#ffffff', 0.55), hondo = osc ? mezclar(base, '#000000', 0.45) : mezclar(base, look.tinta, 0.12);
  return (<div style={{position: 'absolute', inset: 0, background: `radial-gradient(90% 90% at 50% 34%, ${osc ? mezclar(base, '#ffffff', 0.05) : '#ffffff'}, ${base} 58%, ${hondo} 120%)`}}>
    {foto && <div style={{position: 'absolute', inset: 0, opacity: osc ? 0.42 : 0.3}}><FondoFoto id={foto.id} blur={44} brillo={osc ? 0.62 : 1.04} /></div>}
    {halo && <div style={{position: 'absolute', inset: 0, background: `radial-gradient(760px 620px at ${haz}px 470px, ${rgba(halo, osc ? 0.32 : 0.2)}, transparent 72%)`}} />}
    <div style={{position: 'absolute', left: 0, right: 0, top: piso, bottom: 0, background: `linear-gradient(180deg, ${rgba(pisoC, 0.95)}, ${rgba(hondo, osc ? 0.85 : 0.5)})`, borderTop: `1px solid ${rgba(osc ? '#ffffff' : look.tinta, 0.1)}`}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: piso, height: 240, background: `radial-gradient(52% 100% at ${(haz / 1920) * 100}% 0%, ${rgba(osc ? '#ffffff' : '#ffffff', osc ? 0.14 : 0.55)}, transparent 76%)`}} />
    <div style={{position: 'absolute', left: haz - 760, top: -60, width: 1520, height: piso + 120, opacity: resp * (osc ? 0.2 : 0.4), clipPath: 'polygon(38% 0, 62% 0, 100% 100%, 0 100%)', background: `linear-gradient(180deg, ${rgba('#ffffff', 0.85)}, transparent 88%)`}} />
    <Polvo n={12} color={osc ? '#ffffff' : look.acento} semilla={semilla} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(80% 80% at 50% 46%, transparent 58%, ${rgba(osc ? '#000000' : look.tinta, osc ? 0.5 : 0.16)} 112%)`}} />
  </div>);
};
/** Cámara viva con curvas, entrada desde la profundidad, temblor opcional y salida fundida (la sala queda, el objeto se va). */
export const Camara: React.FC<{ac: Acto; temblor?: number; G?: number; origen?: string; empuje?: number; children: React.ReactNode}> = ({ac, temblor = 0, G = -999, origen = '50% 52%', empuje = 0, children}) => {
  const fr = useCurrentFrame(), t = fr - ac.a, dur = ac.b - ac.a, dEnt = Math.min(16, Math.max(7, dur * 0.28)), dSal = Math.min(7, Math.max(3, dur * 0.14));
  const ent = va(fr, ac.a, dEnt, 0, 1, curva.expo), sal = va(fr, ac.b - dSal, dSal, 0, 1, curva.suave), dx = Math.sin(t / 37) * 7 + impulso(fr, G, temblor), dy = Math.cos(t / 43) * 5 + impulso(fr, G, temblor * 0.7, 3.2, 3.1);
  const esc = 1.09 - 0.09 * ent + 0.011 * Math.sin(t / 29) + empuje * va(fr, G, 40, 0, 1, curva.ios) - 0.05 * sal;
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(ent * 1.6, 1) * (1 - sal), transformOrigin: origen, transform: `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${esc.toFixed(4)})`}}>{children}</div>;
};
export const azar = (s: string) => random('cli-' + s);
