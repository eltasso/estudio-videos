// Piezas reutilizables para todos los reels: fondo, texto cinético, fotos, escenas, sonidos y cierre con llamado a la acción.
import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';
import {C, FUENTE_TEXTO, FUENTE_TITULO, USUARIO} from './marca';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ───────────── sonido ─────────────
// los efectos van un poco más bajos que la voz en off para que no la tapen
export const VOL_SFX = 0.62;
export const Sfx: React.FC<{src: string; en?: number; vol?: number}> = ({src, en = 0, vol = 1}) => (
  <Sequence from={Math.round(en)} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={vol * VOL_SFX} />
  </Sequence>
);

// ───────────── línea de tiempo ─────────────
export type Bloque = {dur: number; el: React.ReactNode; solapa?: number};

export const duracion = (bloques: Bloque[]) => bloques.reduce((a, b, i) => a + b.dur - (i > 0 ? b.solapa ?? 0 : 0), 0);

export const Linea: React.FC<{bloques: Bloque[]}> = ({bloques}) => {
  let t = 0;
  return (
    <>
      {bloques.map((b, i) => {
        const desde = i === 0 ? 0 : t - (b.solapa ?? 0);
        t = desde + b.dur;
        return (
          <Sequence key={i} from={desde} durationInFrames={b.dur}>
            {b.el}
          </Sequence>
        );
      })}
    </>
  );
};

// ───────────── escena con entrada y salida ─────────────
type Mov = 'zoom' | 'derecha' | 'abajo' | 'fade' | 'ninguna' | 'golpe';
export const Escena: React.FC<{children: React.ReactNode; entrada?: Mov; salida?: Mov | 'izquierda'; dur: number}> = ({
  children, entrada = 'zoom', salida = 'zoom', dur,
}) => {
  const f = useCurrentFrame();
  const ent = interpolate(f, [0, 10], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
  const sal = interpolate(f, [dur - 8, dur], [0, 1], {...cl, easing: Easing.in(Easing.cubic)});
  let tx = 0, ty = 0, sc = 1, op = 1, blur = 0;
  if (entrada === 'zoom') { sc *= 1.18 - 0.18 * ent; blur += (1 - ent) * 14; op *= ent; }
  if (entrada === 'golpe') { sc *= 1.6 - 0.6 * ent; blur += (1 - ent) * 10; op *= Math.min(1, ent * 2); }
  if (entrada === 'derecha') { tx += (1 - ent) * 1080; blur += (1 - ent) * 18; }
  if (entrada === 'abajo') { ty += (1 - ent) * 500; op *= ent; }
  if (entrada === 'fade') { op *= ent; }
  if (salida === 'zoom') { sc *= 1 - 0.12 * sal; op *= 1 - sal; blur += sal * 10; }
  if (salida === 'izquierda') { tx -= sal * 1080; blur += sal * 18; }
  if (salida === 'fade') { op *= 1 - sal; }
  if (salida === 'abajo') { ty += sal * 600; op *= 1 - sal; }
  return (
    <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${sc})`, opacity: op, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
      {children}
    </AbsoluteFill>
  );
};

// ───────────── sacudida de cámara en los golpes ─────────────
export const useSacudida = (golpes: number[], fuerza = 18, largo = 12) => {
  const f = useCurrentFrame();
  let x = 0, y = 0, s = 1;
  for (const g of golpes) {
    const d = f - g;
    if (d >= 0 && d < largo) {
      const k = 1 - d / largo;
      x += Math.sin(d * 2.7 + g) * fuerza * k * k;
      y += Math.cos(d * 3.3 + g * 0.7) * fuerza * 0.7 * k * k;
      s += 0.05 * k * k * k;
    }
  }
  return `translate(${x}px, ${y}px) scale(${s})`;
};

// ───────────── fondo: verde monte, luz suave, hojitas de yerba flotando y grano de película ─────────────
const HOJA = 'M0,-34 C 20,-20 20,20 0,34 C -20,20 -20,-20 0,-34 Z';
export const Fondo: React.FC<{luz?: string; hojas?: boolean}> = ({luz = C.fondoClaro, hojas = true}) => {
  const f = useCurrentFrame();
  const {height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse 85% 60% at 50% ${42 + Math.sin(f / 70) * 4}%, ${luz} 0%, ${C.fondo} 55%, ${C.fondoOscuro} 100%)`}}>
      {hojas && (
        <svg width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
          {new Array(16).fill(0).map((_, i) => {
            const x = random(`hx${i}`) * 1080;
            const vel = 0.6 + random(`hv${i}`) * 1.4;
            const y = ((random(`hy${i}`) * (height + 200) - f * vel) % (height + 200) + height + 200) % (height + 200) - 100;
            const r = random(`hr${i}`) * 360 + f * (random(`hg${i}`) - 0.5) * 1.6;
            const s = 0.5 + random(`hs${i}`) * 1.1;
            const op = 0.05 + random(`ho${i}`) * 0.09;
            return (
              <g key={i} transform={`translate(${x + Math.sin(f / 40 + i) * 18}, ${y}) rotate(${r}) scale(${s})`} opacity={op}>
                <path d={HOJA} fill={i % 3 === 0 ? C.dorado : C.yerba} />
                <path d="M0,-30 L0,30" stroke={C.fondo} strokeWidth={2} />
              </g>
            );
          })}
        </svg>
      )}
    </AbsoluteFill>
  );
};

export const Grano: React.FC = () => {
  const f = useCurrentFrame();
  const px = Math.floor(random(`gx${Math.floor(f / 2)}`) * 512);
  const py = Math.floor(random(`gy${Math.floor(f / 2)}`) * 512);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('grano.png')})`, backgroundPosition: `${px}px ${py}px`, opacity: 0.07, mixBlendMode: 'overlay'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 65% at 50% 50%, transparent 55%, rgba(0,0,0,0.5) 100%)'}} />
    </AbsoluteFill>
  );
};

// ───────────── logo chico arriba (marca de agua de la cuenta) ─────────────
export const Marca: React.FC<{y?: number; tam?: number}> = ({y = 190, tam = 104}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 2, fps, config: {damping: 13, stiffness: 160}});
  return (
    <div style={{position: 'absolute', top: y, left: 540 - tam / 2, width: tam, height: tam, transform: `scale(${s})`,
      borderRadius: '50%', boxShadow: `0 0 0 3px ${C.doradoOsc}, 0 10px 30px rgba(0,0,0,.45)`}}>
      <Img src={staticFile('logo.png')} style={{width: tam, height: tam, borderRadius: '50%'}} />
    </div>
  );
};

// ───────────── texto cinético palabra por palabra ─────────────
// *palabra* = color de acento (dorado) con pincelada debajo. "\n" = salto de línea forzado.
type Anim = 'sube' | 'pop' | 'golpe' | 'maquina';
export const Palabras: React.FC<{
  texto: string; desde?: number; cada?: number; tam?: number; color?: string; acento?: string; fuente?: 'titulo' | 'texto';
  peso?: number; ancho?: number; interlineado?: number; mayus?: boolean; tracking?: number; anim?: Anim; alinear?: 'center' | 'left';
  pincel?: boolean; sombra?: boolean; style?: React.CSSProperties;
}> = ({
  texto, desde = 0, cada = 3, tam = 96, color = C.crema, acento = C.dorado, fuente = 'titulo', peso, ancho = 900,
  interlineado = 1.12, mayus = false, tracking = 0, anim = 'sube', alinear = 'center', pincel = true, sombra = true, style,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lineas = texto.split('\n');
  let idx = 0;
  let dentro = false; // *varias palabras marcadas* seguidas
  const fam = fuente === 'titulo' ? FUENTE_TITULO : FUENTE_TEXTO;
  const pw = peso ?? (fuente === 'titulo' ? 600 : 600);
  return (
    <div style={{width: ancho, textAlign: alinear, fontFamily: fam, fontStyle: fuente === 'titulo' ? 'italic' : 'normal', fontWeight: pw,
      fontSize: tam, lineHeight: interlineado, letterSpacing: tracking, color, textTransform: mayus ? 'uppercase' : 'none',
      textShadow: sombra ? '0 4px 24px rgba(0,0,0,.45)' : undefined, ...style}}>
      {lineas.map((ln, li) => (
        <div key={li} style={{display: 'flex', flexWrap: 'wrap', justifyContent: alinear === 'center' ? 'center' : 'flex-start', columnGap: tam * 0.26}}>
          {ln.split(' ').filter(Boolean).map((w0, wi) => {
            const i = idx++;
            const empieza = /^[¿¡"(]*\*/.test(w0);
            if (empieza) dentro = true;
            const marcada = dentro;
            if (/\*[.,!?:;)"]*$/.test(w0) && (!empieza || (w0.match(/\*/g) || []).length >= 2)) dentro = false;
            const w = w0.replace(/\*/g, '');
            const t = f - desde - i * cada;
            const s = spring({frame: t, fps, config: anim === 'pop' ? {damping: 9, stiffness: 200, mass: 0.6} : {damping: 15, stiffness: 170, mass: 0.7}});
            let tr = '', op = 1, bl = 0;
            if (anim === 'sube') { tr = `translateY(${(1 - s) * tam * 0.6}px)`; op = interpolate(t, [0, 6], [0, 1], cl); bl = (1 - Math.min(1, s)) * 10; }
            if (anim === 'pop') { tr = `scale(${0.3 + 0.7 * s})`; op = interpolate(t, [0, 3], [0, 1], cl); }
            if (anim === 'golpe') { const k = interpolate(t, [0, 6], [0, 1], {...cl, easing: Easing.out(Easing.back(2))}); tr = `scale(${2.4 - 1.4 * k})`; op = interpolate(t, [0, 3], [0, 1], cl); bl = (1 - k) * 8; }
            if (anim === 'maquina') { op = t >= 0 ? 1 : 0; }
            const pinc = interpolate(t, [6, 18], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
            return (
              <span key={wi} style={{display: 'inline-block', position: 'relative', transform: tr, opacity: op, filter: bl > 0.3 ? `blur(${bl}px)` : undefined,
                color: marcada ? acento : color}}>
                {marcada && pincel && (
                  <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{position: 'absolute', left: '-4%', width: '108%', bottom: -tam * 0.12, height: tam * 0.22, overflow: 'visible'}}>
                    <path d="M2,12 C 25,6 60,4 98,9" pathLength={1} stroke={acento} strokeWidth={5} fill="none" strokeLinecap="round"
                      strokeDasharray={1} strokeDashoffset={1 - pinc} opacity={0.85} />
                  </svg>
                )}
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ───────────── etiqueta chica en mayúsculas (como "MATES · BOMBILLONES · TERMOS") ─────────────
export const Etiqueta: React.FC<{texto: string; desde?: number; color?: string; tam?: number; style?: React.CSSProperties}> = ({
  texto, desde = 0, color = C.dorado, tam = 34, style,
}) => {
  const f = useCurrentFrame();
  const t = f - desde;
  const op = interpolate(t, [0, 10], [0, 1], cl);
  const sp = interpolate(t, [0, 16], [18, 6], {...cl, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{fontFamily: FUENTE_TEXTO, fontWeight: 600, fontSize: tam, letterSpacing: sp, color, opacity: op, textTransform: 'uppercase', textAlign: 'center', ...style}}>
      {texto}
    </div>
  );
};

// ───────────── botón tipo píldora crema (como "ESCRIBINOS POR DM") ─────────────
export const Pildora: React.FC<{texto: string; desde?: number; tam?: number; fondo?: string; color?: string; latido?: boolean; style?: React.CSSProperties}> = ({
  texto, desde = 0, tam = 44, fondo = C.crema, color = C.fondo, latido = true, style,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - desde, fps, config: {damping: 11, stiffness: 170}});
  const lat = latido ? 1 + Math.max(0, Math.sin((f - desde - 20) / 9)) * 0.035 * (f - desde > 20 ? 1 : 0) : 1;
  return (
    <div style={{display: 'inline-block', background: fondo, color, fontFamily: FUENTE_TEXTO, fontWeight: 700, fontSize: tam, letterSpacing: 1,
      padding: `${tam * 0.42}px ${tam * 1.1}px`, borderRadius: 999, transform: `scale(${s * lat})`, boxShadow: '0 12px 30px rgba(0,0,0,.35)', textTransform: 'uppercase', ...style}}>
      {texto}
    </div>
  );
};

// ───────────── chip numerado ("1 de 3") ─────────────
export const Numero: React.FC<{n: string; desde?: number; tam?: number; color?: string}> = ({n, desde = 0, tam = 300, color = C.dorado}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - desde, fps, config: {damping: 10, stiffness: 140}});
  return (
    <div style={{fontFamily: FUENTE_TITULO, fontStyle: 'italic', fontWeight: 700, fontSize: tam, lineHeight: 1, color,
      transform: `scale(${0.2 + 0.8 * s}) rotate(${(1 - s) * -25}deg)`, opacity: Math.min(1, s * 2), textShadow: '0 10px 40px rgba(0,0,0,.5)'}}>
      {n}
    </div>
  );
};

// ───────────── foto de producto en tarjeta (borde crema, Ken Burns) ─────────────
export const FotoCard: React.FC<{
  src: string; x: number; y: number; ancho: number; alto: number; desde?: number; rot?: number; etiqueta?: string;
  zoom?: [number, number]; foco?: string; borde?: number; desdeAbajo?: boolean;
}> = ({src, x, y, ancho, alto, desde = 0, rot = 0, etiqueta, zoom = [1.04, 1.16], foco = '50% 50%', borde = 12, desdeAbajo = true}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = f - desde;
  const s = spring({frame: t, fps, config: {damping: 14, stiffness: 120, mass: 0.9}});
  const kb = interpolate(f, [0, durationInFrames], zoom, cl);
  const ty = desdeAbajo ? (1 - s) * 700 : 0;
  const sc = desdeAbajo ? 0.85 + 0.15 * s : 0.6 + 0.4 * s;
  const lab = spring({frame: t - 10, fps, config: {damping: 12, stiffness: 180}});
  return (
    <div style={{position: 'absolute', left: x - ancho / 2, top: y - alto / 2, width: ancho, height: alto,
      transform: `translateY(${ty}px) rotate(${rot + (1 - s) * 10}deg) scale(${sc})`, opacity: t < 0 ? 0 : Math.min(1, s * 3)}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 30, background: C.crema, padding: borde, boxShadow: '0 30px 70px rgba(0,0,0,.55)'}}>
        <div style={{width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', position: 'relative'}}>
          <Img src={staticFile(`fotos/${src}`)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: foco, transform: `scale(${kb})`}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,.25) 100%)'}} />
        </div>
      </div>
      {etiqueta && (
        <div style={{position: 'absolute', left: 0, right: 0, bottom: -34, display: 'flex', justifyContent: 'center'}}>
          <div style={{background: C.crema, color: C.fondo, fontFamily: FUENTE_TEXTO, fontWeight: 600, fontSize: Math.max(30, ancho * 0.065),
            padding: '12px 30px', borderRadius: 999, transform: `scale(${lab})`, boxShadow: '0 8px 20px rgba(0,0,0,.35)', whiteSpace: 'nowrap'}}>
            {etiqueta}
          </div>
        </div>
      )}
    </div>
  );
};

// ───────────── foto a pantalla completa con texto encima ─────────────
export const FotoFondo: React.FC<{src: string; zoom?: [number, number]; foco?: string; oscuro?: number; desenfoque?: number}> = ({
  src, zoom = [1.15, 1.0], foco = '50% 50%', oscuro = 0.45, desenfoque = 0,
}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const kb = interpolate(f, [0, durationInFrames], zoom, cl);
  return (
    <AbsoluteFill>
      <Img src={staticFile(`fotos/${src}`)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: foco, transform: `scale(${kb})`,
        filter: desenfoque ? `blur(${desenfoque}px)` : undefined}} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(17,26,16,${oscuro + 0.35}) 0%, rgba(17,26,16,${oscuro * 0.4}) 38%, rgba(17,26,16,${oscuro * 0.5}) 60%, rgba(17,26,16,${oscuro + 0.4}) 100%)`}} />
    </AbsoluteFill>
  );
};

// ───────────── sellos ✓ y ✗ ─────────────
export const Sello: React.FC<{tipo: 'bien' | 'mal'; desde?: number; tam?: number}> = ({tipo, desde = 0, tam = 200}) => {
  const f = useCurrentFrame();
  const t = f - desde;
  const k = interpolate(t, [0, 7], [0, 1], {...cl, easing: Easing.out(Easing.back(2.2))});
  const dib = interpolate(t, [3, 14], [0, 1], {...cl, easing: Easing.out(Easing.cubic)});
  const col = tipo === 'bien' ? C.ok : C.rojo;
  return (
    <svg width={tam} height={tam} viewBox="0 0 200 200" style={{transform: `scale(${2.2 - 1.2 * k}) rotate(${tipo === 'mal' ? -8 : 6}deg)`, opacity: t < 0 ? 0 : Math.min(1, k * 2), overflow: 'visible'}}>
      <circle cx={100} cy={100} r={86} fill={`${col}22`} stroke={col} strokeWidth={10} />
      {tipo === 'bien' ? (
        <path d="M55,104 L88,136 L148,70" pathLength={1} fill="none" stroke={col} strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1} strokeDashoffset={1 - dib} />
      ) : (
        <>
          <path d="M64,64 L136,136" pathLength={1} stroke={col} strokeWidth={18} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - Math.min(1, dib * 2)} />
          <path d="M136,64 L64,136" pathLength={1} stroke={col} strokeWidth={18} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - Math.max(0, dib * 2 - 1)} />
        </>
      )}
    </svg>
  );
};

// ───────────── barra de progreso finita abajo (da ganas de llegar al final) ─────────────
export const Progreso: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: 0, bottom: 0, height: 8, width: `${(f / durationInFrames) * 100}%`, background: C.dorado, opacity: 0.9}} />
  );
};

// ───────────── cierre: guardalo + seguinos + escribinos ─────────────
export const Cierre: React.FC<{titulo: string; dur: number; boton?: string}> = ({titulo, dur, boton = 'Escribinos por DM'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logo = spring({frame: f - 14, fps, config: {damping: 12, stiffness: 110}});
  const giro = f * 0.6;
  const TAP = 58;
  const tapeado = f >= TAP;
  const dedo = interpolate(f, [TAP - 18, TAP - 2, TAP, TAP + 14], [140, 0, -6, 60], cl);
  const dedoOp = interpolate(f, [TAP - 18, TAP - 10, TAP + 8, TAP + 16], [0, 1, 1, 0], cl);
  const onda = interpolate(f, [TAP, TAP + 14], [0, 1], cl);
  const btn = spring({frame: f - 36, fps, config: {damping: 12, stiffness: 170}});
  const presion = f >= TAP - 2 && f < TAP + 4 ? 0.92 : 1;
  const usr = interpolate(f, [26, 36], [0, 1], cl);
  return (
    <Escena dur={dur} entrada="zoom" salida="fade">
      <AbsoluteFill style={{alignItems: 'center'}}>
        <div style={{position: 'absolute', top: 300}}>
          <Palabras texto={titulo} tam={92} ancho={880} cada={3} />
        </div>
        <div style={{position: 'absolute', top: 590, width: 460, height: 460, transform: `scale(${logo})`}}>
          <svg width={460} height={460} viewBox="0 0 400 400" style={{position: 'absolute', inset: 0, transform: `rotate(${giro}deg)`}}>
            <circle cx={200} cy={200} r={190} fill="none" stroke={C.dorado} strokeWidth={3} strokeDasharray="4 14" strokeLinecap="round" opacity={0.8} />
          </svg>
          <Img src={staticFile('logo.png')} style={{position: 'absolute', left: 34, top: 34, width: 392, height: 392, borderRadius: '50%', boxShadow: `0 0 0 5px ${C.doradoOsc}, 0 20px 60px rgba(0,0,0,.6)`}} />
        </div>
        <div style={{position: 'absolute', top: 1110, fontFamily: FUENTE_TEXTO, fontWeight: 600, fontSize: 60, color: C.crema, opacity: usr,
          transform: `translateY(${(1 - usr) * 20}px)`}}>
          {USUARIO}
        </div>
        <div style={{position: 'absolute', top: 1220, transform: `scale(${btn * presion})`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', borderRadius: 999, fontFamily: FUENTE_TEXTO, fontWeight: 700, fontSize: 48,
            background: tapeado ? 'transparent' : C.dorado, color: tapeado ? C.crema : C.fondoOscuro, border: `4px solid ${C.dorado}`, position: 'relative'}}>
            {tapeado && (
              <svg width={44} height={44} viewBox="0 0 44 44"><path d="M8,23 L18,33 L36,12" fill="none" stroke={C.dorado} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
            {tapeado ? 'Siguiendo' : 'Seguir'}
            {onda > 0 && onda < 1 && (
              <div style={{position: 'absolute', left: '50%', top: '50%', width: 300 * onda, height: 300 * onda, marginLeft: -150 * onda, marginTop: -150 * onda,
                borderRadius: '50%', border: `4px solid ${C.crema}`, opacity: 1 - onda}} />
            )}
          </div>
          {/* dedo que toca */}
          <div style={{position: 'absolute', left: '62%', top: 40 + dedo, opacity: dedoOp, width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(244,230,200,.85)', boxShadow: '0 6px 20px rgba(0,0,0,.4)', transform: `scale(${f >= TAP - 2 && f < TAP + 4 ? 0.8 : 1})`}} />
        </div>
        <div style={{position: 'absolute', top: 1420}}>
          <Pildora texto={boton} desde={TAP + 16} tam={44} fondo={C.crema} />
        </div>
      </AbsoluteFill>
      <Sfx src="whoosh_largo" en={0} vol={0.7} />
      <Sfx src="bombo" en={14} vol={0.9} />
      <Sfx src="pop" en={36} vol={0.6} />
      <Sfx src="tap" en={TAP} vol={0.9} />
      <Sfx src="acierto" en={TAP + 2} vol={0.5} />
      <Sfx src="pop_agudo" en={TAP + 16} vol={0.6} />
    </Escena>
  );
};

export const Centro: React.FC<{children: React.ReactNode; top?: number; style?: React.CSSProperties}> = ({children, top, style}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', flexDirection: 'column', alignItems: 'center', ...style}}>{children}</div>
);
