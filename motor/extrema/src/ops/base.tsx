// Base compartida del motor: tipos, rótulos y medidas de texto. La usan motor.tsx y todas las familias de ops/.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {F, Palabras, va, salta, curva} from '../kit';

export type Foto = {id: string; foco?: [number, number]; zona?: string; clara?: boolean};
export type Linea = {w: [string, number][]; rol: 'lead' | 'golpe'};
export type Acto = {op: string; a: number; b: number; fotos: Foto[]; lineas: Linea[]; var?: string; texto?: string; datos?: any; look?: Look};
export type OpProps = {ac: Acto; look: Look; sig?: Foto};
export type Look = {acento: string; tinta: string; papel: string; display: string; texto: string; acento2?: string; fondo?: string; claro?: string; oscuro?: boolean; mano?: string; mono?: string};
export type Partitura = {frames: number; look: Look; actos: Acto[]};

export const SERIF = ['InstrumentSerif', 'Fraunces', 'Playfair', 'Cormorant', 'DMSerif'];
export const ANCHO: Record<string, number> = {InstrumentSerif: 0.43, Fraunces: 0.52, Playfair: 0.52, Cormorant: 0.42, DMSerif: 0.5, Anton: 0.42, Bebas: 0.38, Inter: 0.55, ArchivoBlack: 0.7, Oswald: 0.46, Syne: 0.62, SpaceGrotesk: 0.56};
export const fam = (n: string) => (F as any)[n] || F.InstrumentSerif;
export const esSerif = (n: string) => SERIF.includes(n);
export const SOMBRA = '0 3px 30px rgba(25,16,6,.82), 0 1px 6px rgba(25,16,6,.5)';
export const CLARO = '#fff9ec';
export const golpeDe = (ac: Acto) => { const g = ac.lineas.find((l) => l.rol === 'golpe'); return g && g.w.length ? g.w[0][1] : Math.round(ac.a + (ac.b - ac.a) * 0.45); };
export const tamQueEntra = (txt: string, ancho: number, fuente: string, max: number, mayus: boolean, renglones = 3) => { const larga = Math.max(...txt.split(/\s+/).map((x) => x.length), 1), por = Math.max(larga, Math.ceil(txt.length / renglones)); return Math.max(96, Math.min(max, ancho / (por * (ANCHO[fuente] ?? 0.55) * (mayus ? 1.22 : 1)))); };

export type Area = {x: number; y?: number; bottom?: number; w: number; alin?: 'left' | 'center' | 'right'};
/** Zonas tranquilas de una foto a pantalla completa (vienen de la ficha) */
export const zonaArea = (z = 'bottom-left'): Area => {
  z = (z || '').toLowerCase();
  const izq = z.includes('left'), der = z.includes('right'), arr = z.includes('top'), ab = z.includes('bottom');
  const w = izq || der ? 980 : 1400;
  const x = der ? 1920 - 90 - w : izq ? 90 : (1920 - w) / 2;
  const alin = der ? 'right' : izq ? 'left' : (arr || ab) ? 'center' : 'left';
  if (arr) return {x, y: 76, w, alin};
  if (ab) return {x, bottom: 84, w, alin};
  if (izq || der) return {x, y: 300, w, alin};
  return {x: 90, bottom: 84, w: 1100, alin: 'left'};
};

/** Bloque de líneas: lead chico, golpe enorme en acento. Cada palabra entra en su cuadro exacto. */
export const Rotulo: React.FC<{lineas: Linea[]; area: Area; look: Look; sobreFoto?: boolean; desde?: number; hasta?: number; maxGolpe?: number; lead?: number; renglones?: number}> = ({lineas, area, look, sobreFoto, desde = 0, hasta = 1e9, maxGolpe = 300, lead = 0, renglones = 3}) => {
  const fr = useCurrentFrame();
  if (!lineas.length) return null;
  const serif = esSerif(look.display);
  const fuera = 1 - va(fr, hasta - 5, 5, 0, 1); if (!lead) lead = sobreFoto ? 96 : 88;
  const k = (ANCHO[look.display] ?? 0.55) * (serif ? 1 : 1.22), kl = 0.5;
  const renglonesDe = (txt: string, tam: number, kk: number) => { let n = 1, act = 0; for (const p of txt.split(/\s+/)) { const w = (p.length + 1) * tam * kk; if (act + w > area.w && act > 0) { n++; act = w; } else act += w; } return n; };
  const disp = area.w < 700 ? 1e9 : (area.y !== undefined ? 1080 - area.y - 50 : 1080 - (area.bottom || 0) - 50);
  const altoLeads = lineas.filter((l) => l.rol !== 'golpe').reduce((u, l) => u + renglonesDe(l.w.map((x) => x[0]).join(' '), lead!, kl) * lead! * 1.08 + 6, 0);
  return (<div style={{position: 'absolute', left: area.x, top: area.y, bottom: area.bottom, width: area.w, display: 'flex', flexDirection: 'column', alignItems: area.alin === 'right' ? 'flex-end' : area.alin === 'center' ? 'center' : 'flex-start', gap: 6, textShadow: sobreFoto ? SOMBRA : undefined, opacity: fuera}}>
    {lineas.map((l, i) => {
      const g = l.rol === 'golpe', txt = l.w.map((x) => x[0]).join(' ');
      const pal = l.w.map(([t, f]) => [g && !serif ? t.toUpperCase() : t, Math.max(f, desde)] as [string, number]);
      let tam = g ? tamQueEntra(txt, area.w, look.display, maxGolpe, !serif, area.w >= 1300 ? Math.min(2, renglones) : renglones) : lead!;
      if (g) while (tam > 72 && altoLeads + renglonesDe(txt, tam, k) * tam * 0.98 > disp) tam *= 0.92;
      const f0 = pal[0][1], hit = g ? salta(fr, f0, {damping: 13, stiffness: 330, mass: 0.65}) : 1;
      return (<div key={i} style={{transform: g ? `scale(${0.86 + 0.14 * hit})` : undefined, transformOrigin: area.alin === 'right' ? '100% 60%' : area.alin === 'center' ? '50% 60%' : '0 60%'}}>
        <Palabras palabras={pal} tam={tam} fuente={fam(g ? look.display : (serif ? look.display : look.texto))} italica={g && serif} color={g ? (sobreFoto ? CLARO : look.acento) : (sobreFoto ? CLARO : look.tinta)} ancho={area.w} alin={area.alin} interlinea={g ? 0.98 : 1.08} tracking={g && !serif ? '0.005em' : '-0.02em'} />
      </div>);
    })}
  </div>);
};
/** Velo cálido local detrás del texto sobre foto */
export const Velo: React.FC<{area: Area}> = ({area}) => {
  const cy = area.y !== undefined ? area.y + 140 : 1080 - (area.bottom || 0) - 140, cx = area.x + area.w / 2;
  return <div style={{position: 'absolute', inset: 0, background: `radial-gradient(${area.w * 0.75}px 300px at ${cx}px ${cy}px, rgba(28,18,8,.42), transparent 75%)`, pointerEvents: 'none'}} />;
};
export const entradaFoto = (fr: number, a: number) => va(fr, a, 18, 1.1, 1, curva.expo);
