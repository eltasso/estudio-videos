// REPRODUCTOR DE ESCENAS FIRMA. No es una escena: filma CUALQUIER escena que el director describe como capas (tools/escenas.py).
// Una capa = (qué foto, con qué efecto) × (qué parte: todo / sujeto) × (por qué VENTANA se ve, que aparece, viaja y crece en su palabra)
//            × (encogida dentro de la ventana o en su lugar) × (detrás o delante del sujeto recortado).
// También: la foto CORTADA por sus bordes reales en paneles que entran, se apartan o se quedan con el cuadro; una sola cámara continua;
// palabras que llegan en su palabra; un charco de luz. Todo es función pura del cuadro. Los tiempos vienen en segundos desde el inicio de la pieza.
// Las reglas de oficio están ACÁ (no en el prompt): difuminado nunca mayor que la ventana, boca oscura para un mundo dentro de un objeto,
// nunca un cuadro casi negro, una capa que crece pasa detrás del sujeto, la cámara nunca deja borde vacío.
import React from 'react';
import {AbsoluteFill, Img, staticFile, spring, useCurrentFrame} from 'remotion';
import {F, Grano} from '../kit';

const FPS = 30;
const fr = (s: number) => Math.round(s * FPS);
const cl = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ez = (x: number) => { const t = cl(x); return t * t * (3 - 2 * t); };
const sp = (f: number, at: number, damping = 13, stiffness = 140) => spring({frame: f - at, fps: FPS, config: {damping, stiffness, mass: 0.8}});
const FULL: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, objectFit: 'fill'};

type Fx = {bw?: number; dark?: number; blur?: number; warm?: number};
type Caja = {x0: number; y0: number; x1: number; y1: number; o?: number};
type Capa = {foto: string; fx?: Fx; parte?: 'todo' | 'sujeto'; enc?: boolean; prof?: 'detras' | 'delante'; forma?: 'ellipse' | 'rect'; feather?: number; keys: [number, Caja][]};
type Txt = {txt: string; t: number; hasta?: number; x: number; y: number; size?: number; font?: 'hand' | 'serif' | 'label'; color?: string; rot?: number; prof?: 'detras' | 'delante' | 'pantalla'; w?: number};
type Lz = {t0: number; t1?: number; x: number; y: number; r: number};
type Paso = {t: number; hoja: number; acc: 'entra_izq' | 'entra_der' | 'entra_arriba' | 'entra_abajo' | 'aparta' | 'sale' | 'llena' | 'vuelve'};
type Hojas = {dir: 'col' | 'fil'; cortes: number[]; pasos: Paso[]};
export type EscenaP = {base: string; baseFx?: [number, Fx][]; sujetoFx?: [number, Fx][]; cam: [number, {x: number; y: number; z: number}][];
  capas?: Capa[]; textos?: Txt[]; luz?: Lz[]; hojas?: Hojas; sinSujeto?: boolean};

const css = (e?: Fx) => !e ? undefined :
  `grayscale(${cl(e.bw ?? 0)}) brightness(${1 - 0.75 * cl(e.dark ?? 0)}) blur(${e.blur ?? 0}px) sepia(${0.6 * cl(e.warm ?? 0)}) saturate(${1 + 0.25 * cl(e.warm ?? 0)})`;
const Foto: React.FC<{k: string; fx?: Fx; o?: number}> = ({k, fx, o = 1}) => <Img src={staticFile(`fotos/${k}.jpg`)} style={{...FULL, filter: css(fx), opacity: o}} />;
const Sujeto: React.FC<{k: string; fx?: Fx}> = ({k, fx}) => <Img src={staticFile(`fotos/_m/${k}.png`)} style={{...FULL, filter: css(fx)}} />;

const Zona: React.FC<Caja & {shape?: 'rect' | 'ellipse'; feather?: number; children: React.ReactNode}> = ({x0, y0, x1, y1, shape = 'ellipse', feather = 60, o = 1, children}) => {
  let mask: string, comp: React.CSSProperties = {};
  if (shape === 'ellipse') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.max(1, (x1 - x0) / 2), ry = Math.max(1, (y1 - y0) / 2);
    mask = `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}px ${cy}px, #000 0%, #000 ${Math.max(0.05, 1 - feather / Math.max(rx, ry)) * 100}%, transparent 100%)`;
  } else {
    const f = feather / 2;
    mask = `linear-gradient(to right, transparent ${x0 - f}px, #000 ${x0 + f}px, #000 ${x1 - f}px, transparent ${x1 + f}px), linear-gradient(to bottom, transparent ${y0 - f}px, #000 ${y0 + f}px, #000 ${y1 - f}px, transparent ${y1 + f}px)`;
    comp = {WebkitMaskComposite: 'source-in', maskComposite: 'intersect'} as React.CSSProperties;
  }
  return <AbsoluteFill style={{opacity: o, WebkitMaskImage: mask, maskImage: mask, ...comp}}>{children}</AbsoluteFill>;
};

const Dentro: React.FC<Caja & {children: React.ReactNode}> = ({x0, y0, x1, y1, children}) => {
  const w = Math.max(2, x1 - x0), h = Math.max(2, y1 - y0), s = Math.max(w / 1920, h / 1080);
  return <div style={{position: 'absolute', left: x0, top: y0, width: w, height: h, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: (w - 1920 * s) / 2, top: (h - 1080 * s) / 2, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${s})`}}>{children}</div>
  </div>;
};

const Cam: React.FC<{f: number; keys: [number, {x: number; y: number; z: number}][]; children: React.ReactNode}> = ({f, keys, children}) => {
  const K = keys.map(([t, k]) => ({t, x: k.x ?? 960, y: k.y ?? 540, z: Math.max(1, k.z ?? 1)}));
  let a = K[0], b = K[K.length - 1];
  for (let i = 0; i < K.length - 1; i++) if (f >= K[i].t) { a = K[i]; b = K[i + 1]; }
  if (f <= K[0].t) b = a = K[0];
  if (f >= K[K.length - 1].t) a = b = K[K.length - 1];
  const u = a === b ? 0 : ez((f - a.t) / Math.max(1, b.t - a.t));
  const z = a.z + (b.z - a.z) * u, x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
  const tx = Math.min(0, Math.max(1920 - 1920 * z, 960 - x * z)), ty = Math.min(0, Math.max(1080 - 1080 * z, 540 - y * z));
  return <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#0b0906'}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>{children}</div>
  </AbsoluteFill>;
};

const Texto: React.FC<{t: Txt; f: number}> = ({t, f}) => {
  const at = fr(t.t), hasta = t.hasta != null ? fr(t.hasta) : null;
  if (f < at || (hasta != null && f > hasta + 8)) return null;
  const u = sp(f, at, 13, 150) * (hasta != null ? cl((hasta + 8 - f) / 8) : 1);
  const fam = t.font === 'hand' ? F.Caveat : t.font === 'label' ? F.Oswald : F.Fraunces;
  return <div style={{position: 'absolute', left: t.x, top: t.y, width: t.w, opacity: cl(u * 1.6), transform: `translateY(${(1 - u) * 60}px) rotate(${t.rot ?? 0}deg)`, transformOrigin: '0 50%',
    fontFamily: fam, fontWeight: 700, letterSpacing: t.font === 'label' ? 4 : 0, textTransform: t.font === 'label' ? 'uppercase' : undefined, fontSize: t.size ?? 96, lineHeight: 1.05,
    color: t.color ?? '#FBF8F2', textShadow: '0 6px 26px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.6)', whiteSpace: t.w ? 'normal' : 'nowrap'}}>{t.txt}</div>;
};

// cada clave EMPIEZA en su palabra y llega en ~12 cuadros
const mixFx = (ks: [number, Fx][] | undefined, f: number): Fx | undefined => {
  if (!ks || !ks.length) return undefined;
  const v: Required<Fx> = {bw: 0, dark: 0, blur: 0, warm: 0};
  for (const [t, k] of ks) { const u = ez((f - fr(t)) / 12); (Object.keys(v) as (keyof Fx)[]).forEach((p) => { v[p] = v[p] + ((k[p] ?? 0) - v[p]) * u; }); }
  return v;
};
// la ventana aparece en su primera clave; cada clave siguiente empieza a viajar en su palabra y llega en ~20 cuadros
const cajaEn = (keys: [number, Caja][], f: number): (Required<Caja> & {vis: number}) | null => {
  if (f < fr(keys[0][0])) return null;
  const c = {...keys[0][1], o: keys[0][1].o ?? 1};
  for (let i = 1; i < keys.length; i++) {
    const u = ez((f - fr(keys[i][0])) / 20), k = keys[i][1];
    c.x0 += (k.x0 - c.x0) * u; c.y0 += (k.y0 - c.y0) * u; c.x1 += (k.x1 - c.x1) * u; c.y1 += (k.y1 - c.y1) * u; c.o += ((k.o ?? 1) - c.o) * u;
  }
  return {...c, vis: cl((f - fr(keys[0][0])) / 7)};
};

const Paneles: React.FC<{k: string; h: Hojas; f: number}> = ({k, h, f}) => {
  const L = h.dir === 'col' ? 1920 : 1080, lim = [0, ...h.cortes, L], n = lim.length - 1;
  return (
    <>
      <Foto k={k} fx={{blur: 26, dark: 0.3, bw: 0.25}} />
      {Array.from({length: n}, (_, i) => {
        const p0 = lim[i], p1 = lim[i + 1], w = p1 - p0, c = (p0 + p1) / 2;
        let d = 0, sc = 1, vis = 1, cx = 0;
        const mios = h.pasos.filter((p) => p.hoja === i || p.hoja === -1).sort((x, y) => x.t - y.t);
        const entra = mios.find((p) => p.acc.startsWith('entra'));
        if (entra) vis = f >= fr(entra.t) ? 1 : 0;
        for (const p of mios) {
          const u = sp(f, fr(p.t), 15, 110), ya = f >= fr(p.t) ? 1 : 0;
          if (p.acc === 'entra_izq' || p.acc === 'entra_arriba') d += (1 - u) * -(p1 + 80) * ya;
          if (p.acc === 'entra_der' || p.acc === 'entra_abajo') d += (1 - u) * (L - p0 + 80) * ya;
          if (p.acc === 'aparta') d += u * (i - (n - 1) / 2) * 46;
          if (p.acc === 'vuelve') { d *= 1 - u; sc += (1 - sc) * u; cx *= 1 - u; }
          if (p.acc === 'sale') d += u * (c < L / 2 ? -(p1 + 120) : L - p0 + 120);
          if (p.acc === 'llena') { sc += (L / w - sc) * u; cx += (L / 2 - c - cx) * u; }
        }
        const llena = h.pasos.find((p) => p.acc === 'llena' && p.hoja !== i && p.hoja !== -1);      // cuando un panel se queda con el cuadro, los demás se van
        if (llena) { const u = sp(f, fr(llena.t), 15, 110); d += u * (i < llena.hoja ? -(p1 + 200) : L - p0 + 200); }
        if (!vis) return null;
        const col = h.dir === 'col';
        return (
          <div key={i} style={{position: 'absolute', left: col ? p0 : 0, top: col ? 0 : p0, width: col ? w : 1920, height: col ? 1080 : w, overflow: 'hidden', zIndex: sc > 1.01 ? 5 : 1,
            transform: `translate(${col ? d + cx : 0}px, ${col ? 0 : d + cx}px) scale(${sc})`, transformOrigin: '50% 50%', boxShadow: '0 30px 70px rgba(0,0,0,0.55)'}}>
            <div style={{position: 'absolute', left: col ? -p0 : 0, top: col ? 0 : -p0, width: 1920, height: 1080}}><Foto k={k} /></div>
          </div>
        );
      })}
    </>
  );
};

export const Escena: React.FC<{p: EscenaP}> = ({p}) => {
  const f = useCurrentFrame();
  const {base, baseFx, sujetoFx, cam, capas = [], textos = [], luz = [], hojas, sinSujeto} = p;
  const capa = (c: Capa, i: number, lado: 'detras' | 'delante') => {
    const b = cajaEn(c.keys, f);
    if (!b || b.o * b.vis <= 0.01) return null;
    const w = b.x1 - b.x0, h = b.y1 - b.y0, area = (Math.min(1920, w) * Math.min(1080, h)) / (1920 * 1080);
    const g = cl((area - 0.12) / 0.25);                       // 0 = chica (sobre el objeto) · 1 = grande (ya es "el cuarto")
    const peso = sinSujeto ? (lado === 'detras' ? 1 : 0) : (c.prof ?? 'detras') === 'detras' ? (lado === 'detras' ? 1 : 0) : (lado === 'detras' ? g : 1 - g);
    if (peso <= 0.01) return null;
    const feather = Math.max(10, Math.min(c.feather ?? 60, 0.16 * Math.min(w, h)));
    const efx = c.enc ? {...c.fx, dark: Math.min(c.fx?.dark ?? 0, 0.42 + 0.3 * g)} : c.fx;
    const cont = c.parte === 'sujeto' ? <Sujeto k={c.foto} fx={efx} /> : <Foto k={c.foto} fx={efx} />;
    return (
      <React.Fragment key={lado + i}>
        {c.enc && g < 0.9 ? <Zona x0={b.x0 - 14} y0={b.y0 - 14} x1={b.x1 + 14} y1={b.y1 + 14} shape={c.forma ?? 'ellipse'} feather={16} o={0.85 * b.o * b.vis * peso * (1 - g)}><AbsoluteFill style={{backgroundColor: '#07060a'}} /></Zona> : null}
        <Zona x0={b.x0} y0={b.y0} x1={b.x1} y1={b.y1} shape={c.forma ?? 'ellipse'} feather={feather} o={b.o * b.vis * peso}>
          {c.enc ? <Dentro x0={Math.max(0, b.x0)} y0={Math.max(0, b.y0)} x1={Math.min(1920, b.x1)} y1={Math.min(1080, b.y1)}>{cont}</Dentro> : cont}
        </Zona>
      </React.Fragment>
    );
  };
  return (
    <AbsoluteFill style={{backgroundColor: '#0b0906'}}>
      <Cam f={f} keys={cam.map(([t, k]) => [fr(t), k] as [number, {x: number; y: number; z: number}])}>
        {hojas ? <Paneles k={base} h={hojas} f={f} /> : <Foto k={base} fx={mixFx(baseFx, f)} />}
        {capas.map((c, i) => capa(c, i, 'detras'))}
        {textos.filter((t) => t.prof === 'detras').map((t, i) => <Texto key={'a' + i} t={t} f={f} />)}
        {sinSujeto || hojas ? null : <Sujeto k={base} fx={mixFx(sujetoFx, f)} />}
        {capas.map((c, i) => capa(c, i, 'delante'))}
        {textos.filter((t) => t.prof === 'delante').map((t, i) => <Texto key={'b' + i} t={t} f={f} />)}
        {luz.map((l, i) => {
          const u = cl((f - fr(l.t0)) / 10) * (l.t1 != null ? cl((fr(l.t1) + 10 - f) / 10) : 1) * 0.72;
          return u > 0 ? <AbsoluteFill key={'l' + i} style={{background: `radial-gradient(circle ${l.r}px at ${l.x}px ${l.y}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 45%, rgba(6,5,12,${0.9 * u}) 100%)`}} /> : null;
        })}
      </Cam>
      {textos.filter((t) => !t.prof || t.prof === 'pantalla').map((t, i) => <Texto key={'c' + i} t={t} f={f} />)}
      <AbsoluteFill style={{pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,236,200,0.07) 0%, rgba(255,236,200,0) 40%, rgba(24,18,36,0.13) 100%), radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(14,10,22,0.36) 100%)'}} />
      <Grano o={0.05} />
    </AbsoluteFill>
  );
};
