// Kit mínimo: tipografías, fotos del video y curvas. Todo lo demás lo inventa cada componente.
import {GRANO, FIBRA} from './texturas';
import React from 'react';
import {Img, staticFile, interpolate, spring, Easing, useCurrentFrame, random} from 'remotion';
import {loadFont as a} from '@remotion/google-fonts/Inter';
import {loadFont as b} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as c} from '@remotion/google-fonts/Anton';
import {loadFont as d} from '@remotion/google-fonts/BebasNeue';
import {loadFont as e} from '@remotion/google-fonts/CormorantGaramond';
import {loadFont as f} from '@remotion/google-fonts/DMSerifDisplay';
import {loadFont as g} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as h} from '@remotion/google-fonts/Syne';
import {loadFont as i} from '@remotion/google-fonts/Fraunces';
import {loadFont as j} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as k} from '@remotion/google-fonts/Oswald';
import {loadFont as l} from '@remotion/google-fonts/InstrumentSerif';
import {loadFont as m1} from '@remotion/google-fonts/Caveat';
import {loadFont as m2} from '@remotion/google-fonts/SpecialElite';
import {loadFont as m3} from '@remotion/google-fonts/JetBrainsMono';
const op = {subsets: ['latin'] as any};
export const F = {
  Inter: a('normal', {weights: ['400', '600', '800'], ...op}).fontFamily,
  Playfair: b('normal', {weights: ['400', '700', '900'], ...op}).fontFamily,
  Anton: c('normal', {weights: ['400'], ...op}).fontFamily,
  Bebas: d('normal', {weights: ['400'], ...op}).fontFamily,
  Cormorant: e('normal', {weights: ['400', '600'], ...op}).fontFamily,
  DMSerif: f('normal', {weights: ['400'], ...op}).fontFamily,
  SpaceGrotesk: g('normal', {weights: ['400', '700'], ...op}).fontFamily,
  Syne: h('normal', {weights: ['400', '800'], ...op}).fontFamily,
  Fraunces: i('normal', {weights: ['400', '700', '900'], ...op}).fontFamily,
  ArchivoBlack: j('normal', {weights: ['400'], ...op}).fontFamily,
  Oswald: k('normal', {weights: ['400', '700'], ...op}).fontFamily,
  InstrumentSerif: l('normal', {weights: ['400'], ...op}).fontFamily,
  Caveat: m1('normal', {weights: ['700'], ...op}).fontFamily,
  SpecialElite: m2('normal', {weights: ['400'], ...op}).fontFamily,
  JetBrainsMono: m3('normal', {weights: ['400', '700'], ...op}).fontFamily,
};
/** Una foto de este video, a cubrir su caja. `id` como "p012". */
export const Foto: React.FC<{id: string; style?: React.CSSProperties}> = ({id, style}) => (
  <Img src={staticFile(`fotos/${id}.jpg`)} style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style}} />
);
export const curva = {
  ios: Easing.bezier(0.32, 0.72, 0, 1), expo: Easing.bezier(0.16, 1, 0.3, 1), suave: Easing.bezier(0.45, 0, 0.25, 1), entra: Easing.bezier(0.7, 0, 0.84, 0),
};
/** Va de `a` a `b` entre los cuadros f0 y f0+dur, con curva (por defecto expo). */
export const va = (fr: number, f0: number, dur: number, a = 0, b = 1, ease = curva.expo) =>
  interpolate(fr, [f0, f0 + dur], [a, b], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
/** Resorte que arranca en el cuadro f0. */
export const salta = (fr: number, f0: number, cfg: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: fr - f0, fps: 30, config: {damping: 16, stiffness: 120, mass: 0.9, ...cfg}});
/** Grano fílmico sutil, encima de todo. */
export const Grano: React.FC<{o?: number}> = ({o = 0.07}) => {
  const fr = useCurrentFrame(), k = (fr % 24) * 7919;
  return <div style={{position: 'absolute', inset: 0, opacity: o * 1.6, mixBlendMode: 'overlay', pointerEvents: 'none', backgroundImage: `url(${GRANO})`, backgroundSize: '256px 256px', backgroundPosition: `${k % 256}px ${(k >> 8) % 256}px`}} />;
};

/** Losa física: foto con grosor real, canto iluminado y brillo. El padre lleva perspective y preserve-3d. */
export const Losa: React.FC<{id: string; w: number; h: number; grosor?: number; radio?: number; canto?: string; foco?: string; style?: React.CSSProperties}> = ({id, w, h, grosor = 24, radio = 6, canto = '#d9d4cb', foco, style}) => {
  const n = Math.max(6, Math.round(grosor / 2));
  return (<div style={{position: 'absolute', width: w, height: h, transformStyle: 'preserve-3d', ...style}}>
    {Array.from({length: n}).map((_, i) => (<div key={i} style={{position: 'absolute', inset: 0, borderRadius: radio, background: canto, filter: `brightness(${0.62 + 0.38 * (1 - i / n)})`, transform: `translateZ(${-(i + 1) * (grosor / n)}px)`}} />))}
    <div style={{position: 'absolute', inset: 0, borderRadius: radio, overflow: 'hidden'}}>
      <Foto id={id} style={{filter: foco}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 34%, rgba(0,0,0,.14) 100%)'}} />
    </div>
  </div>);
};
/** Fondo: la foto desenfocada, enorme y moviéndose apenas. */
export const FondoFoto: React.FC<{id: string; blur?: number; brillo?: number; style?: React.CSSProperties}> = ({id, blur = 38, brillo = 0.75, style}) => {
  const fr = useCurrentFrame();
  return (<div style={{position: 'absolute', inset: -140, ...style}}><div style={{position: 'absolute', left: 0, top: 0, width: '25%', height: '25%', transformOrigin: '0 0', transform: 'scale(4)'}}><Foto id={id} style={{filter: `blur(${blur / 4}px) brightness(${brillo}) saturate(1.15)`, transform: `scale(${1.08 + fr * 0.0006}) translateX(${Math.sin(fr / 70) * 5.5}px)`}} /></div></div>);
};
/** Polvo fuera de foco que flota con paralaje. */
export const Polvo: React.FC<{n?: number; color?: string; semilla?: string}> = ({n = 36, color = '#fff', semilla = 'p'}) => {
  const fr = useCurrentFrame();
  return (<div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>{Array.from({length: n}).map((_, i) => {
    const r = (s: string) => random(`${semilla}-${s}-${i}`), z = 0.3 + r('z') * 0.7, t = 3 + r('t') * 26;
    const x = ((r('x') * 2100 + fr * (r('v') - 0.5) * 1.6 * z) % 2100 + 2100) % 2100 - 90, y = ((r('y') * 1260 - fr * 0.7 * z) % 1260 + 1260) % 1260 - 90;
    return <div key={i} style={{position: 'absolute', left: x, top: y, width: t, height: t, borderRadius: '50%', background: color, opacity: 0.1 + 0.28 * z * (0.6 + 0.4 * Math.sin(fr / 11 + i)), filter: `blur(${t * 0.28}px)`}} />;
  })}</div>);
};
/** Barrido de luz diagonal en un golpe. */
export const Barrido: React.FC<{f0: number; dur?: number; o?: number}> = ({f0, dur = 18, o = 0.65}) => {
  const fr = useCurrentFrame(), p = va(fr, f0, dur, -0.4, 1.4, curva.suave);
  if (fr < f0 || fr > f0 + dur) return null;
  return <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: o, pointerEvents: 'none', background: `linear-gradient(112deg, transparent ${p * 100 - 14}%, rgba(255,250,240,.9) ${p * 100}%, transparent ${p * 100 + 14}%)`}} />;
};
/** Sombra de contacto blanda bajo un objeto. */
export const SombraPiso: React.FC<{w?: number; o?: number; style?: React.CSSProperties}> = ({w = 700, o = 0.45, style}) => (
  <div style={{position: 'absolute', width: w, height: w * 0.16, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(0,0,0,${o}), transparent)`, filter: 'blur(14px)', ...style}} />
);
const ANCHO_FUENTE: Record<string, number> = {[F.Anton]: 0.47, [F.Bebas]: 0.42, [F.Oswald]: 0.5, [F.Cormorant]: 0.48, [F.InstrumentSerif]: 0.46, [F.DMSerif]: 0.56, [F.Fraunces]: 0.6, [F.Playfair]: 0.6, [F.Inter]: 0.6, [F.SpaceGrotesk]: 0.62, [F.ArchivoBlack]: 0.72, [F.Syne]: 0.74};
/** Una línea de tipografía que se achica sola para no pasarse de `ancho`. */
export const Titular: React.FC<{texto: string; ancho: number; tam: number; fuente: string; style?: React.CSSProperties}> = ({texto, ancho, tam, fuente, style}) => {
  const mayus = texto === texto.toUpperCase() ? 1.16 : 1, ls = typeof style?.letterSpacing === 'string' && style.letterSpacing.endsWith('em') ? parseFloat(style.letterSpacing) : 0;
  const t = Math.min(tam, ancho / (Math.max(1, texto.length) * ((ANCHO_FUENTE[fuente] ?? 0.65) * mayus + ls)));
  return <div style={{fontFamily: fuente, fontSize: t, lineHeight: 1, whiteSpace: 'nowrap', ...style}}>{texto}</div>;
};

/* ═══════════ MATERIALES (no son ideas: cada video los combina distinto) ═══════════ */
/** Foto encuadrada: `foco` [x,y] en 0..1 es el punto de la foto que queda en el centro de su caja, `zoom` acerca sobre ese punto. */
export const Encuadre: React.FC<{id: string; foco?: [number, number]; zoom?: number; filtro?: string; style?: React.CSSProperties}> = ({id, foco = [0.5, 0.5], zoom = 1, filtro, style}) => (
  <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...style}}>
    <Img src={staticFile(`fotos/${id}.jpg`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${foco[0] * 100}% ${foco[1] * 100}%`, transformOrigin: `${foco[0] * 100}% ${foco[1] * 100}%`, transform: `scale(${zoom})`, filter: filtro}} />
  </div>
);
/** Papel luminoso: fondo claro con fibra y luz de ventana. Sustituye a cualquier fondo oscuro o plano. */
export const Papel: React.FC<{color?: string; luz?: string; o?: number}> = ({color = '#F4EFE5', luz = 'rgba(255,252,244,.95)', o = 0.32}) => (
  <div style={{position: 'absolute', inset: 0, background: color}}>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(90% 80% at 30% 18%, ${luz}, transparent 70%)`}} />
    <div style={{position: 'absolute', inset: 0, opacity: o * 0.8, mixBlendMode: 'multiply', backgroundImage: `url(${FIBRA})`, backgroundSize: '100% 100%'}} />
  </div>
);
/** Texto DETRÁS de lo que hay en la foto: la tipografía sólo se ve sobre las zonas claras (paredes, shoji, tela), los objetos oscuros le pasan por delante. `invertir` hace lo contrario (fondo oscuro, objetos claros). Va en la MISMA caja y con la misma transformación que una foto a pantalla completa. `umbral` 0..1 (luminancia desde la que hay pared). */
export const TextoDetras: React.FC<{id: string; texto: string; x: number; y: number; tam: number; fuente: string; color?: string; umbral?: number; invertir?: boolean; anchor?: 'start' | 'middle' | 'end'; peso?: number; tracking?: number; opacidad?: number; recorte?: number}> = ({id, texto, x, y, tam, fuente, color = '#1d1a16', umbral = 0.62, invertir = false, anchor = 'start', peso = 400, tracking = 0, opacidad = 1, recorte = 1}) => {
  const uid = `td-${id}-${texto.replace(/\W/g, '')}-${x}-${y}`, s = 9, o = invertir ? [-s, s * umbral + 1] : [s, -s * umbral];
  const k = (o[0] / 3).toFixed(3);
  return (<svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none'}}>
    <defs><filter id={uid + 'f'} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%"><feGaussianBlur stdDeviation="1.1" /><feColorMatrix type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${k} ${k} ${k} 0 ${o[1].toFixed(3)}`} /></filter>
      <mask id={uid} maskUnits="userSpaceOnUse" x="-200" y="-200" width="2320" height="1480"><image href={staticFile(`fotos/${id}.jpg`)} x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice" filter={`url(#${uid}f)`} /></mask>
      <clipPath id={uid + 'c'}><rect x="-200" y="-400" width={2400 * recorte} height="2000" /></clipPath></defs>
    <g mask={`url(#${uid})`} clipPath={`url(#${uid}c)`}><text x={x} y={y} fontFamily={fuente} fontSize={tam} fontWeight={peso} letterSpacing={tracking} textAnchor={anchor} fill={color} opacity={opacidad}>{texto}</text></g>
  </svg>);
};
/** Foto dentro de una forma. `puntos` en porcentaje [[x,y],...]. Interpolá los puntos con `mezcla` para que una forma se convierta en otra. */
export const FotoForma: React.FC<{id: string; puntos: [number, number][]; foco?: [number, number]; zoom?: number; filtro?: string; dx?: number; style?: React.CSSProperties}> = ({id, puntos, foco, zoom, filtro, dx = 0, style}) => (
  <div style={{position: 'absolute', inset: 0, clipPath: `polygon(${puntos.map((p) => `${p[0].toFixed(3)}% ${p[1].toFixed(3)}%`).join(',')})`, ...style}}><div style={{position: 'absolute', inset: 0, transform: `translateX(${dx}%)`}}><Encuadre id={id} foco={foco} zoom={zoom} filtro={filtro} /></div></div>
);
/** Mezcla listas de puntos de igual longitud (para transformar una forma en otra). */
export const mezcla = (a: [number, number][], b: [number, number][], t: number): [number, number][] => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
/** Palabra o número con una foto adentro. */
export const TextoFoto: React.FC<{id: string; texto: string; tam: number; fuente: string; foco?: [number, number]; peso?: number; filtro?: string; style?: React.CSSProperties}> = ({id, texto, tam, fuente, foco = [0.5, 0.5], peso = 400, filtro, style}) => (
  <div style={{fontFamily: fuente, fontSize: tam, fontWeight: peso, lineHeight: 1, whiteSpace: 'nowrap', color: 'transparent', backgroundImage: `url(${staticFile(`fotos/${id}.jpg`)})`, backgroundSize: 'cover', backgroundPosition: `${foco[0] * 100}% ${foco[1] * 100}%`, WebkitBackgroundClip: 'text', backgroundClip: 'text', filter: filtro, ...style}}>{texto}</div>
);
/** Foto cortada en tiras. `tira(i,n)` devuelve el estilo (transform, opacity) de cada una. Con transform none la foto se ve entera y perfecta. */
export const Tiras: React.FC<{id: string; n: number; vertical?: boolean; foco?: [number, number]; zoom?: number; filtro?: string; tira: (i: number, n: number) => React.CSSProperties; style?: React.CSSProperties}> = ({id, n, vertical = true, foco, zoom, filtro, tira, style}) => (
  <div style={{position: 'absolute', inset: 0, ...style}}>{Array.from({length: n}).map((_, i) => {
    const a = (i / n) * 100, b = ((i + 1) / n) * 100, cp = vertical ? `polygon(${a}% 0,${b + 0.08}% 0,${b + 0.08}% 100%,${a}% 100%)` : `polygon(0 ${a}%,100% ${a}%,100% ${b + 0.08}%,0 ${b + 0.08}%)`;
    return <div key={i} style={{position: 'absolute', inset: 0, clipPath: cp, ...tira(i, n)}}><Encuadre id={id} foco={foco} zoom={zoom} filtro={filtro} /></div>;
  })}</div>
);
/** Lente: círculo que muestra un detalle ampliado, con borde de vidrio. (cx,cy) en px sobre el cuadro, (fx,fy) el punto de la foto en 0..1, `aumento` 2-4. */
export const Lente: React.FC<{id: string; cx: number; cy: number; r: number; fx: number; fy: number; aumento?: number; escala?: number}> = ({id, cx, cy, r, fx, fy, aumento = 2.6, escala = 1}) => {
  const W = 1920 * aumento, H = 1080 * aumento;
  return (<div style={{position: 'absolute', left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, transform: `scale(${escala})`}}>
    <div style={{position: 'absolute', inset: -2, borderRadius: '50%', boxShadow: '0 40px 80px rgba(35,25,10,.38), 0 8px 18px rgba(35,25,10,.3)'}} />
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: '#eee'}}>
      <Img src={staticFile(`fotos/${id}.jpg`)} style={{position: 'absolute', width: W, height: H, left: r - fx * W, top: r - fy * H, objectFit: 'cover', maxWidth: 'none'}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,.34), transparent 34%), radial-gradient(circle at 50% 50%, transparent 62%, rgba(20,14,6,.28) 100%)'}} />
    </div>
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', border: '5px solid rgba(255,255,255,.92)'}} />
  </div>);
};
/** Carrusel 3D de Losas. `giro` en vueltas (0 = la primera al frente; 1/n pasa a la siguiente). Escala, desenfoque y brillo salen de la profundidad. */
export const Carrusel3D: React.FC<{ids: string[]; giro: number; w?: number; h?: number; radioX?: number; radioZ?: number; alturaY?: number; cx?: number; cy?: number; grosor?: number; desenfoque?: number; inclina?: number; entra?: (i: number) => number; canto?: string}> = ({ids, giro, w = 720, h = 460, radioX = 760, radioZ = 620, alturaY = 26, cx = 960, cy = 540, grosor = 22, desenfoque = 9, inclina = 26, entra, canto}) => {
  const n = ids.length;
  const it = ids.map((id, i) => { const th = ((i / n) - giro) * Math.PI * 2, d = (Math.cos(th) + 1) / 2; return {id, i, th, d}; });
  return (<div style={{position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: `${cx}px ${cy - 60}px`}}><div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d'}}>
    {it.map(({id, i, th, d}) => { const p = entra ? entra(i) : 1, x = Math.sin(th) * radioX, z = (Math.cos(th) - 1) * radioZ, y = -Math.cos(th) * alturaY + (1 - p) * 700;
      return (<div key={id + i} style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transformStyle: 'preserve-3d', transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${(-Math.sin(th) * inclina).toFixed(2)}deg)`}}>
        <Losa id={id} w={w} h={h} grosor={grosor} canto={canto} foco={`blur(${((1 - d) * desenfoque).toFixed(2)}px) brightness(${(0.84 + 0.18 * d).toFixed(3)})`} />
      </div>); })}
  </div></div>);
};
/** Número que rueda como cuentakilómetros. `valor` puede ser decimal (animalo interpolándolo). */
export const Rodillo: React.FC<{valor: number; digitos?: number; tam: number; fuente: string; color?: string; peso?: number}> = ({valor, digitos = 1, tam, fuente, color = '#191612', peso = 400}) => {
  const h = tam * 1.08;
  return (<div style={{display: 'flex', fontFamily: fuente, fontSize: tam, fontWeight: peso, color, lineHeight: `${h}px`, height: h, overflow: 'hidden'}}>
    {Array.from({length: digitos}).map((_, k) => { const p = 10 ** (digitos - 1 - k), v = valor / p; const ent = Math.floor(v), fr = v - ent, cae = p === 1 ? fr : (fr > 0.9 ? (fr - 0.9) * 10 : 0), pos = ((ent % 10) + cae) % 10;
      return (<div key={k} style={{height: h * 11, transform: `translateY(${-pos * h}px)`}}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((x, i) => <div key={i} style={{height: h, textAlign: 'center'}}>{x}</div>)}</div>); })}
  </div>);
};
/** Palabras que entran una a una en su cuadro exacto: suben, se enfocan y asientan. `palabras` = [["My",0],["mother",7]...]. */
export const Palabras: React.FC<{palabras: [string, number][]; tam: number; fuente: string; color?: string; ancho?: number; peso?: number; tracking?: string; interlinea?: number; alin?: 'left' | 'center' | 'right'; italica?: boolean; style?: React.CSSProperties}> = ({palabras, tam, fuente, color = '#191612', ancho = 1500, peso = 400, tracking = '-0.02em', interlinea = 1.04, alin = 'left', italica = false, style}) => {
  const fr = useCurrentFrame();
  return (<div style={{fontFamily: fuente, fontSize: tam, fontWeight: peso, color, width: ancho, lineHeight: interlinea, letterSpacing: tracking, textAlign: alin, fontStyle: italica ? 'italic' : 'normal', ...style}}>
    {palabras.map(([t, f], i) => { const p = salta(fr, f, {damping: 18, stiffness: 150, mass: 0.8}), o = va(fr, f, 7, 0, 1), b = va(fr, f, 9, 10, 0);
      return <span key={i} style={{display: 'inline-block', marginRight: '0.24em', opacity: o, filter: `blur(${b}px)`, transform: `translateY(${(1 - p) * 0.42}em) rotate(${(1 - p) * 2.4}deg)`}}>{t}</span>; })}
  </div>);
};
/** Bloom: repite lo claro de una foto con desenfoque y modo pantalla. Encima de la foto, misma caja. */
export const Bloom: React.FC<{id: string; o?: number; blur?: number; foco?: [number, number]; zoom?: number}> = ({id, o = 0.45, blur = 34, foco, zoom}) => (
  <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: o, pointerEvents: 'none'}}><div style={{position: 'absolute', left: 0, top: 0, width: '25%', height: '25%', transformOrigin: '0 0', transform: 'scale(4)'}}><Encuadre id={id} foco={foco} zoom={zoom} filtro={`blur(${blur / 4}px) brightness(1.15) contrast(1.5)`} /></div></div>
);
/** Viñeta cálida y suave, nunca negra. */
export const Vineta: React.FC<{o?: number; color?: string}> = ({o = 0.2, color = '48,34,18'}) => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(75% 75% at 50% 48%, transparent 56%, rgba(${color},${o}) 100%)`}} />
);
