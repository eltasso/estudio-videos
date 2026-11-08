// Familia clínica: objetos para salud, ciencia, cuerpo, estudios y productos. Cada op es una cosa física; la palabra vive dentro de la escena.
import React from 'react';
import {useCurrentFrame, interpolate, staticFile, Img} from 'remotion';
import {OpProps, golpeDe, Rotulo, Velo, zonaArea, fam} from './base';
import {Encuadre, SombraPiso, va, salta, curva, Bloom} from '../kit';
import {Sala, Camara, GolpeTexto, LeadTexto, rgba, mezclar, sobre, legibleEnClaro, color2, impulso, crecientes, lineasDe, tamFit, azar, lum} from './clinico_kit';

const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const dur = (ac: {a: number; b: number}) => ac.b - ac.a;

/* ═══════════ ETIQUETA: un frasco de vidrio, el haz recorre la etiqueta y arranca el renglón que importa ═══════════ */
const Frasco: React.FC<{id: string; vidrio: string; tapa: string}> = ({id, vidrio, tapa}) => (
  <svg viewBox="0 0 560 820" width={560} height={820} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <defs>
      <linearGradient id={id + 'v'} x1="0" x2="1"><stop offset="0" stopColor={mezclar(vidrio, '#000000', 0.45)} /><stop offset="0.16" stopColor={vidrio} /><stop offset="0.3" stopColor={mezclar(vidrio, '#ffffff', 0.34)} /><stop offset="0.62" stopColor={vidrio} /><stop offset="1" stopColor={mezclar(vidrio, '#000000', 0.55)} /></linearGradient>
      <linearGradient id={id + 't'} x1="0" x2="1"><stop offset="0" stopColor={mezclar(tapa, '#000000', 0.42)} /><stop offset="0.3" stopColor={mezclar(tapa, '#ffffff', 0.32)} /><stop offset="1" stopColor={mezclar(tapa, '#000000', 0.5)} /></linearGradient>
    </defs>
    <path d="M196 112 L196 160 C196 205 56 212 36 300 L36 742 C36 790 68 812 112 812 L448 812 C492 812 524 790 524 742 L524 300 C504 212 364 205 364 160 L364 112 Z" fill={`url(#${id}v)`} />
    <path d="M86 300 C92 258 130 236 176 222" stroke="rgba(255,255,255,.62)" strokeWidth={12} strokeLinecap="round" fill="none" />
    <rect x={150} y={8} width={260} height={112} rx={16} fill={`url(#${id}t)`} />
    {Array.from({length: 13}).map((_, i) => <rect key={i} x={166 + i * 19} y={20} width={5} height={88} fill="rgba(0,0,0,.2)" />)}
  </svg>
);
const Etiqueta: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], c = ac.var === 'b' ? color2(look) : look.acento, idg = `cli-et-${ac.a}`;
  const BX = 210, BY = 96, LX = BX + 36, LW = 488, LY = BY + 290, LH = 470, FILAS = 6, META = 3, filaY = (i: number) => LY + 232 + i * 37.5;
  const a = ac.a + Math.min(8, dur(ac) * 0.14), mid = a + (G - a) * 0.66, yFin = filaY(META) + 9;
  const yHaz = G <= a + 4 ? yFin : interpolate(fr, [a, mid, G], [LY - 12, LY + LH + 6, yFin], {...CL, easing: curva.suave});
  const prendeHaz = va(fr, ac.a + 2, 7), apagaHaz = va(fr, G + 8, 14), hit = salta(fr, G, {damping: 13, stiffness: 190, mass: 0.75}), sube = salta(fr, ac.a, {damping: 15, stiffness: 95, mass: 1});
  const x0 = 790, y0 = 410, x1 = 1000, y1 = 400, tx = x0 + (x1 - x0) * hit, ty = y0 + (y1 - y0) * hit - Math.sin(Math.min(hit, 1) * Math.PI) * 90, escTag = 0.16 + 0.84 * hit;
  const papel = '#fbf8f1', tinta = legibleEnClaro(look, c), giro = -9 + Math.sin((fr - ac.a) / 40) * 3, r = va(fr, G - 1, 20, 0, 1, curva.ios), zp = 1.6 - 0.6 * r, cx = (800 - zp * (LX + LW / 2)) * (1 - r), cy = (540 - zp * yHaz) * (1 - r), vidrio = mezclar(c, '#070b0e', 0.76);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={A} piso={880} haz={500} halo={c} semilla="etiq" />
    <Camara ac={ac} G={G} temblor={5} empuje={0.022} origen="44% 56%">
      <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px) scale(${zp.toFixed(4)})`}}>
      <SombraPiso w={700} o={0.5} style={{left: BX - 70, top: BY + 772}} />
      <div style={{position: 'absolute', left: BX, top: BY + 822, width: 560, height: 200, opacity: 0.26, transform: 'scaleY(-1)', transformOrigin: '50% 0', WebkitMaskImage: 'linear-gradient(0deg, #000, transparent 72%)', maskImage: 'linear-gradient(0deg, #000, transparent 72%)'}}><div style={{position: 'absolute', left: 0, bottom: 0, width: 560, height: 820}}><Frasco id={idg + 'r'} vidrio={vidrio} tapa={c} /></div></div>
      <div style={{position: 'absolute', left: BX, top: BY, width: 560, height: 820, transformOrigin: '50% 100%', transform: `perspective(1700px) translateY(${(1 - sube) * 150}px) rotateY(${giro + (1 - sube) * 26}deg)`}}>
        <Frasco id={idg} vidrio={vidrio} tapa={c} />
        <div style={{position: 'absolute', left: 36, top: 290, width: LW, height: LH, background: papel, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.3)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: 210}}><Encuadre id={A.id} foco={A.foco} zoom={1.04} /></div>
          {Array.from({length: FILAS}).map((_, i) => { const y = 232 + i * 37.5, esta = i === META, leyo = yHaz > LY + y; return <div key={i} style={{position: 'absolute', left: 28, top: y, height: 18, width: esta ? 430 : [380, 410, 330, 0, 400, 300][i], borderRadius: 4, background: esta && fr >= G ? c : leyo ? rgba(look.oscuro ? '#2a3238' : look.tinta, 0.42) : rgba(look.oscuro ? '#2a3238' : look.tinta, 0.18), transform: esta ? `scaleY(${1 + 0.9 * hit - 0.5 * va(fr, G + 8, 12)})` : undefined}} />; })}
          <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: Math.max(0, yHaz - LY), background: rgba(c, 0.13)}} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,.34), rgba(255,255,255,.08) 24%, rgba(255,255,255,0) 58%, rgba(0,0,0,.4))'}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: BX - 110, top: yHaz - 120, width: 780, height: 120, opacity: prendeHaz * (1 - apagaHaz), background: `linear-gradient(180deg, transparent, ${rgba(c, 0.34)})`}} />
      <div style={{position: 'absolute', left: BX - 110, top: yHaz - 3, width: 780, height: 7, borderRadius: 4, opacity: prendeHaz * (1 - apagaHaz), background: `linear-gradient(90deg, transparent, ${mezclar(c, '#ffffff', 0.72)} 16%, #ffffff 50%, ${mezclar(c, '#ffffff', 0.72)} 84%, transparent)`, boxShadow: `0 0 26px 8px ${rgba(c, 0.55)}`}} />
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}><path d={`M${LX + LW - 30},${yFin} C ${LX + LW + 120},${yFin} ${tx - 130},${ty + 130} ${tx + 8},${ty + 130}`} fill="none" stroke={c} strokeWidth={5} strokeDasharray="1 14" strokeLinecap="round" opacity={r > 0.85 ? 0.9 : 0} /></svg>
      {fr >= G && <div style={{position: 'absolute', left: tx, top: ty, width: 820, height: 260, transformOrigin: '0 50%', transform: `perspective(1500px) scale(${escTag}) rotateY(${-7 - (1 - hit) * 30}deg) rotateZ(${-2 + (1 - hit) * 9}deg)`}}>
        <div style={{position: 'absolute', inset: 0, background: papel, borderRadius: '130px 18px 18px 130px', boxShadow: `0 36px 60px rgba(0,0,0,.32), 0 6px 14px rgba(0,0,0,.2), inset 0 0 0 5px ${rgba(c, 0.5)}`}} />
        <div style={{position: 'absolute', left: 46, top: 108, width: 44, height: 44, borderRadius: '50%', background: rgba('#000000', 0.2), boxShadow: 'inset 0 4px 6px rgba(0,0,0,.4)'}} />
        <div style={{position: 'absolute', left: 120, top: 0, width: 670, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><GolpeTexto ac={ac} look={look} ancho={660} max={130} renglones={1} color={tinta} /></div>
      </div>}
      <div style={{position: 'absolute', left: 1210, top: 720, width: 650}}><LeadTexto ac={ac} look={look} ancho={650} max={68} alin="left" sombra={look.oscuro ? '0 2px 18px rgba(0,0,0,.9)' : undefined} /></div>
    </Camara>
  </div>);
};

/* ═══════════ SELLO: un sello de goma cae sobre la foto impresa y la marca ═══════════ */
const MANCHAS = (() => { const m = Array.from({length: 170}).map((_, i) => `<circle cx='${Math.round(azar('sx' + i) * 1000)}' cy='${Math.round(azar('sy' + i) * 400)}' r='${(0.8 + azar('sr' + i) * azar('sq' + i) * 8).toFixed(1)}'/>`).join(''); return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 400' preserveAspectRatio='none'><defs><mask id='m'><rect width='1000' height='400' fill='white'/><g fill='black'>${m}</g></mask></defs><rect width='1000' height='400' fill='white' mask='url(#m)'/></svg>`)}")`; })();
const Sello: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), [A, B] = ac.fotos, malo = ac.var === 'b', c = malo ? color2(look) : look.acento, ids = `cli-se-${ac.a}`;
  const cx = 960, cy = 470, llega = salta(fr, ac.a, {damping: 14, stiffness: 90, mass: 1.1});
  const hay = G - ac.a >= 26, acecho = hay ? va(fr, ac.a + 14, Math.max(1, G - ac.a - 30), 0, 1, curva.suave) : 0, yH = -395 + 200 * acecho + Math.sin((fr - ac.a) / 13) * 10, baja = hay ? va(fr, ac.a + 4, 18, 0, 1, curva.ios) : 0, yAlto = -1250 + (yH + 1250) * baja - (hay ? 90 * va(fr, G - 16, 8, 0, 1, curva.suave) : 0), cae = interpolate(fr, [G - 8, G], [1, 0], {...CL, easing: curva.entra}), sube = va(fr, G + 4, 18, 0, 1, curva.ios), yS = yAlto * cae - 1250 * sube, apriete = fr >= G && fr < G + 5 ? 1 - 0.05 * Math.sin(((fr - G) / 5) * Math.PI) : 1;
  const tocado = fr >= G, gris = malo ? va(fr, G, 10) : 0, imp = salta(fr, G, {damping: 20, stiffness: 500, mass: 0.5});
  const sombraS = fr < G - 12 ? (0.2 + 0.26 * acecho) * baja : interpolate(fr, [G - 12, G, G + 5, G + 20], [0.46, 0.62, 0.62, 0], CL), tinta = legibleEnClaro(look, c);
  const pal = lineasDe(ac, 'golpe').flatMap((l) => l.w).map(([p, f]) => [p.replace(/[.,;:!?¡¿]+/g, ''), f] as [string, number]), txt = pal.map((p) => p[0].toUpperCase()).join(' ') || '';
  const largo = txt.length > 13 && pal.length > 1, base = largo ? Math.max(Math.ceil(txt.length / 2), ...pal.map((p) => p[0].length)) + 1 : txt.length + 1, tam = Math.max(46, Math.min(largo ? 135 : 180, 760 / Math.max(1, base * 0.62)));
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={A} piso={830} halo={c} semilla="sello" />
    <Camara ac={ac} G={G} temblor={15} empuje={0.03}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 900, transform: `translateY(${(1 - llega) * 520}px)`}}>
        {B && <div style={{position: 'absolute', left: cx - 610, top: cy - 300, width: 1040, height: 600, background: '#fff', padding: 16, boxSizing: 'border-box', transform: 'perspective(1500px) rotateX(20deg) rotateZ(5deg) translate(170px,-30px)', boxShadow: '0 30px 50px rgba(0,0,0,.3)'}}><div style={{position: 'relative', width: '100%', height: '100%'}}><Encuadre id={B.id} foco={B.foco} filtro="brightness(.8)" /></div></div>}
        <div style={{position: 'absolute', left: cx - 530, top: cy - 320, width: 1060, height: 640, transform: `perspective(1500px) rotateX(${20 - impulso(fr, G, 1.4)}deg) rotateZ(${-3 + (1 - llega) * 8}deg)`}}>
          <div style={{position: 'absolute', inset: -24, background: '#fdfbf6', boxShadow: '0 46px 70px rgba(0,0,0,.36), 0 8px 16px rgba(0,0,0,.24)'}} />
          <Encuadre id={A.id} foco={A.foco} zoom={1 + 0.1 * acecho} filtro={gris ? `grayscale(${0.85 * gris}) brightness(${1 - 0.22 * gris})` : undefined} />
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,.2), transparent 34%)'}} />
          {tocado && <div style={{position: 'absolute', left: 90, top: 140, width: 880, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(-7deg) scale(${1.32 - 0.32 * imp})`, WebkitMaskImage: MANCHAS, maskImage: MANCHAS, WebkitMaskSize: '100% 100%', maskSize: '100% 100%'}}>
            <div style={{position: 'absolute', inset: 0, background: 'rgba(255,255,255,.72)', borderRadius: 22}} />
            <div style={{position: 'absolute', inset: 0, border: `15px solid ${tinta}`, borderRadius: 22}} />
            <div style={{position: 'absolute', inset: 26, border: `4px solid ${tinta}`, borderRadius: 10}} />
            <div style={{position: 'relative', width: 800, display: 'flex', flexWrap: largo ? 'wrap' : 'nowrap', justifyContent: 'center', whiteSpace: 'nowrap', fontFamily: fam(look.display === 'DMSerif' || look.display === 'Fraunces' ? 'ArchivoBlack' : look.display), fontSize: tam, color: tinta, lineHeight: 1, letterSpacing: '0.01em'}}>{pal.map(([p, f], i) => <span key={i} style={{opacity: fr >= f ? 1 : 0, marginRight: i < pal.length - 1 ? '0.26em' : 0}}>{p.toUpperCase()}</span>)}</div>
          </div>}
        </div>
      </div>
      {tocado && fr < G + 26 && Array.from({length: 30}).map((_, i) => { const th = azar('p' + i) * Math.PI * 2, d = fr - G, v = 220 + azar('v' + i) * 620, u = 1 - Math.exp(-d / 7), x = cx + Math.cos(th) * (340 + v * u), y = cy + Math.sin(th) * (130 + v * 0.55 * u) + d * d * 0.5, t = 5 + azar('t' + i) * 12; return <div key={i} style={{position: 'absolute', left: x, top: y, width: t, height: t, borderRadius: 2, background: i % 3 ? tinta : '#fff', opacity: 1 - d / 26, transform: `rotate(${d * 13 + i * 40}deg)`}} />; })}
      {tocado && fr < G + 16 && <div style={{position: 'absolute', left: cx - 500, top: cy - 300, width: 1000, height: 600, borderRadius: '50%', border: `8px solid ${rgba(c, 0.7)}`, opacity: 1 - (fr - G) / 16, transform: `scale(${0.7 + (fr - G) * 0.09}) rotateX(58deg)`}} />}
      <div style={{position: 'absolute', left: cx - 400, top: cy - 165, width: 800, height: 330, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,.85), transparent)', opacity: sombraS, transform: `scale(${1 + cae * 1.4 + sube * 1.2})`}} />
      <div style={{position: 'absolute', left: cx - 330, top: cy - 568 + yS + (fr >= G && fr < G + 5 ? 24 : 0), width: 660, height: 660, transform: `scaleY(${apriete})`, transformOrigin: '50% 100%'}}>
        <svg viewBox="0 0 600 600" width={660} height={660} style={{overflow: 'visible'}}>
          <defs><radialGradient id={ids + 'k'} cx=".36" cy=".3" r=".8"><stop offset="0" stopColor={mezclar(c, '#ffffff', 0.5)} /><stop offset=".5" stopColor={c} /><stop offset="1" stopColor={mezclar(c, '#000000', 0.55)} /></radialGradient><linearGradient id={ids + 'm'} x1="0" x2="1"><stop offset="0" stopColor={mezclar(c, '#000000', 0.6)} /><stop offset=".32" stopColor={mezclar(c, '#ffffff', 0.25)} /><stop offset="1" stopColor={mezclar(c, '#000000', 0.62)} /></linearGradient></defs>
          <ellipse cx={300} cy={150} rx={134} ry={116} fill={`url(#${ids}k)`} /><path d="M252 248 C256 310 262 340 232 392 L368 392 C338 340 344 310 348 248 Z" fill={`url(#${ids}m)`} />
          <rect x={92} y={386} width={416} height={104} rx={18} fill={`url(#${ids}m)`} /><rect x={92} y={386} width={416} height={14} rx={7} fill="rgba(255,255,255,.32)" /><rect x={62} y={486} width={476} height={56} rx={10} fill={mezclar(c, '#000000', 0.68)} /><rect x={72} y={540} width={456} height={20} rx={4} fill={tinta} />
        </svg>
      </div>
      <div style={{position: 'absolute', left: 260, top: 880, width: 1400}}><LeadTexto ac={ac} look={look} ancho={1400} max={70} /></div>
    </Camara>
  </div>);
};

/* ═══════════ COHORTE: una multitud de figuritas sobre un piso cuadriculado que se separa en dos grupos, o de la que sale una ═══════════ */
const CUERPO = 'M-15,18 L-15,-6 Q-15,-17 0,-17 Q15,-17 15,-6 L15,18 Z';
const proy = (x: number, z: number) => { const s = 0.72 + 0.6 * z; return {sx: 960 + x * s, sy: 400 + z * 410, s}; };
const TarjetaColgante: React.FC<{id: string; foco?: [number, number]; t?: string | null; x: number; f0: number; look: Look_; c: string; viva: number}> = ({id, foco, t, x, f0, look, c, viva}) => {
  const fr = useCurrentFrame(), p = salta(fr, f0, {damping: 13, stiffness: 110, mass: 1}), d = fr - f0, pend = d > 0 ? Math.exp(-d / 26) * Math.sin(d / 5.2) * 7 : 0;
  if (fr < f0) return null; const W = 450, H = 330, ta = t ? Math.max(44, Math.min(60, (W - 40) / (t.length * 0.58))) : 0;
  return (<div style={{position: 'absolute', left: x - W / 2, top: -470 + p * 490, width: W, height: H + 150, transformOrigin: '50% 0', transform: `rotate(${pend}deg)`, opacity: 0.5 + 0.5 * viva}}>
    <div style={{position: 'absolute', left: 90, top: 0, width: 4, height: 150, background: rgba(look.oscuro ? '#ffffff' : look.tinta, 0.5)}} /><div style={{position: 'absolute', left: W - 94, top: 0, width: 4, height: 150, background: rgba(look.oscuro ? '#ffffff' : look.tinta, 0.5)}} />
    <div style={{position: 'absolute', left: 0, top: 20, width: W, height: H, background: '#fff', padding: 11, boxSizing: 'border-box', boxShadow: `0 26px 44px rgba(0,0,0,.34), 0 0 0 ${viva > 0.5 ? 6 : 0}px ${c}`}}>
      <div style={{position: 'relative', width: '100%', height: t ? H - 94 : H - 22, overflow: 'hidden'}}><Encuadre id={id} foco={foco} /></div>
      {t && <div style={{height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fam(look.texto), fontWeight: 800, fontSize: ta, color: '#14191d', whiteSpace: 'nowrap', letterSpacing: '-0.02em'}}>{t}</div>}
    </div>
  </div>);
};
type Look_ = OpProps['look'];
const Cohorte: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, uno = ac.var === 'uno', ganaIzq = d.gana !== 'der', c = look.acento, neutro = look.oscuro ? '#c9d2da' : mezclar(look.tinta, '#ffffff', 0.34);
  const N = 72, COLS = 12, D = Math.min(18, Math.max(8, (ac.b - G) * 0.5)), pre = Math.max(6, (G - ac.a) * 0.7);
  const orden = (i: number) => azar('o' + i), cuenta = [0, 0];
  const fig = Array.from({length: N}).map((_, i) => {
    const col = i % COLS, fila = Math.floor(i / COLS), filas = Math.ceil(N / COLS), x0 = (col - (COLS - 1) / 2) * 76 + (fila % 2) * 18, z0 = (fila + 0.5) / filas;
    const lado = (orden(i) < 0.5 && cuenta[0] < N / 2) || cuenta[1] >= N / 2 ? -1 : 1, g = lado < 0 ? 0 : 1, j = cuenta[g]++, jc = j % 6, jf = Math.floor(j / 6), tz = 0.1 + (jf / Math.max(1, Math.ceil((N / 2) / 6) - 1)) * 0.86, tx = ((lado * 500) + (jc - 2.5) * 80) / (0.72 + 0.6 * tz);
    const f0 = ac.a + 2 + orden(i + 900) * pre, nace = salta(fr, f0, {damping: 13, stiffness: 180, mass: 0.6}), dl = (uno ? 0 : azar('d' + i) * 6);
    const m = uno ? 0 : va(fr, G - 1 + dl, D, 0, 1, curva.suave), x = x0 + (tx - x0) * m, z = z0 + (tz - z0) * m, arco = Math.sin(m * Math.PI) * 54;
    return {i, x, z, arco, nace, lado};
  }).sort((a, b) => a.z - b.z);
  const elegida = N - Math.floor(COLS / 2), luz = va(fr, G + D * 0.6, 9), luzU = va(fr, G - 1, 10), ident = (l: number) => (l < 0) === ganaIzq;
  const carteles = ac.fotos.slice(0, 2), corteC = look.oscuro ? '#0b0e11' : '#ffffff';
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={ac.fotos[0]} piso={380} halo={c} semilla="coh" />
    <Camara ac={ac} G={G} temblor={3} empuje={0.02}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {Array.from({length: 15}).map((_, i) => { const x = (i - 7) * 150, p = proy(x, -0.05), q = proy(x, 1.1); return <line key={'v' + i} x1={p.sx} y1={p.sy} x2={q.sx} y2={q.sy} stroke={rgba(look.oscuro ? '#ffffff' : look.tinta, 0.13)} strokeWidth={2} />; })}
        {Array.from({length: 7}).map((_, i) => { const z = -0.05 + i * 0.19, p = proy(-1200, z), q = proy(1200, z); return <line key={'h' + i} x1={p.sx} y1={p.sy} x2={q.sx} y2={q.sy} stroke={rgba(look.oscuro ? '#ffffff' : look.tinta, 0.13)} strokeWidth={2} />; })}
        {fig.map(({i, x, z, arco, nace, lado}) => {
          const p = proy(x, z), esc = p.s * 2 * nace, gana = uno ? i === elegida : ident(lado), L = uno ? luzU : luz, col = L > 0 ? mezclar(neutro, gana ? c : (look.oscuro ? '#39424a' : '#b9c0c5'), L) : neutro;
          const extra = uno && i === elegida ? 1 + luzU * 1.7 : 1, baja = uno && i === elegida ? 16 * luzU : 0, opac = L > 0 && !gana ? 1 - 0.45 * L : 1;
          return (<g key={i} transform={`translate(${p.sx},${p.sy + baja})`} opacity={opac}><ellipse cx={0} cy={38 * p.s * extra} rx={30 * p.s * extra} ry={7 * p.s * extra} fill="rgba(0,0,0,.28)" /><g transform={`translate(0,${-arco}) scale(${esc * extra})`}><circle cx={0} cy={-30} r={11} fill={col} stroke={corteC} strokeWidth={1.3} /><path d={CUERPO} fill={col} stroke={corteC} strokeWidth={1.3} /></g></g>);
        })}
      </svg>
      {!uno && carteles[0] && <TarjetaColgante id={carteles[0].id} foco={carteles[0].foco} t={d.a} x={460} f0={G + 2} look={look} c={c} viva={ganaIzq ? 1 : 1 - luz * 0.9} />}
      {!uno && carteles[1] && <TarjetaColgante id={carteles[1].id} foco={carteles[1].foco} t={d.b} x={1460} f0={G + 6} look={look} c={c} viva={!ganaIzq ? 1 : 1 - luz * 0.9} />}
      {uno && carteles[0] && <TarjetaColgante id={carteles[0].id} foco={carteles[0].foco} t={d.a} x={960} f0={G + 3} look={look} c={c} viva={1} />}
      <div style={{position: 'absolute', left: 310, top: 110, width: 1300}}><LeadTexto ac={ac} look={look} ancho={1300} max={74} hasta={G} /></div>
      <div style={{position: 'absolute', left: uno ? 1090 : 400, top: uno ? 640 : 868, width: uno ? 780 : 1120}}><GolpeTexto ac={ac} look={look} ancho={uno ? 780 : 1120} max={uno ? 170 : 150} color={legibleEnClaro(look, c) === c || look.oscuro ? c : look.tinta} renglones={uno ? 2 : 1} /></div>
    </Camara>
  </div>);
};

/* ═══════════ ANILLO: rutina circular con estaciones de foto; un satélite las enciende y cierra el círculo ═══════════ */
const Anillo: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G0 = golpeDe(ac), d = ac.datos || {}, c = look.acento, filas: any[] = (d.filas && d.filas.length ? d.filas : ac.fotos.map(() => ({}))).slice(0, 6);
  const n = Math.max(1, filas.length), fotos = filas.map((f, i) => f.foto || ac.fotos[i % Math.max(1, ac.fotos.length)]), R = 360, CX = 640, CY = 540, idg = `cli-an-${ac.a}`;
  const G = Math.max(G0, ac.a + 8), ens = crecientes(filas.map((f) => f.en), ac.a + 6, Math.max(G - 4, ac.a + 8 + n)), cierre = Math.max(G, ens[n - 1] + 6);
  const xs = [ac.a - 1, ...ens, cierre], as = [-22, ...ens.map((_, i) => (i * 360) / n), 360], ang = interpolate(fr, xs, as, {...CL, easing: curva.suave});
  const pol = (a: number, r = R) => ({x: CX + Math.sin((a * Math.PI) / 180) * r, y: CY - Math.cos((a * Math.PI) / 180) * r});
  const sat = pol(ang), frac = Math.max(0, Math.min(1, ang / 360)), per = 2 * Math.PI * R, activo = ens.reduce((u, f, i) => (fr >= f ? i : u), -1), cerrado = fr >= cierre, hit = salta(fr, cierre, {damping: 11, stiffness: 180, mass: 0.7}), e = salta(fr, ac.a, {damping: 15, stiffness: 100});
  const fondoC = look.oscuro ? '#ffffff' : look.tinta, f1 = Math.max(0, activo), previa = activo > 0 ? fotos[activo - 1] : null, cruza = activo >= 0 ? va(fr, ens[activo], 9) : 1, zoomC = 1.04 + (fr - ac.a) * 0.0007 + 0.09 * (cerrado ? hit : 0);
  const giro = 15 + Math.sin((fr - ac.a) / 44) * 4, xD = 1190, wD = 670, tinta = look.oscuro ? '#fff' : look.tinta;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={fotos[f1]} piso={900} haz={640} halo={c} semilla="anillo" />
    <Camara ac={ac} G={cierre} temblor={7} empuje={0.03}>
      <div style={{position: 'absolute', inset: 0, transform: `perspective(2000px) rotateX(${9 + (1 - e) * 34}deg) rotateY(${giro}deg) scale(${0.9 + 0.1 * e})`, transformOrigin: '50% 50%'}}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs><linearGradient id={idg} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={mezclar(c, '#ffffff', 0.35)} /><stop offset="1" stopColor={c} /></linearGradient></defs>
          {Array.from({length: 96}).map((_, i) => { const a = (i * 360) / 96 - (fr - ac.a) * 0.22, m = i % 8 === 0, p = pol(a, R + 92), q = pol(a, R + (m ? 122 : 108)); return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={rgba(fondoC, m ? 0.42 : 0.2)} strokeWidth={m ? 4 : 2.5} />; })}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={rgba(fondoC, 0.16)} strokeWidth={26} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${idg})`} strokeWidth={26} strokeLinecap="round" strokeDasharray={`${per * frac} ${per}`} transform={`rotate(-90 ${CX} ${CY})`} />
          {cerrado && fr < cierre + 22 && <circle cx={CX} cy={CY} r={R + (fr - cierre) * 26} fill="none" stroke={c} strokeWidth={20 * (1 - (fr - cierre) / 22)} opacity={1 - (fr - cierre) / 22} />}
        </svg>
        <div style={{position: 'absolute', left: CX - 250, top: CY - 250, width: 500, height: 500, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 24px 50px rgba(0,0,0,.34), 0 0 0 10px ${rgba(look.oscuro ? '#ffffff' : '#ffffff', 0.9)}`}}>
          {previa && <div style={{position: 'absolute', inset: 0}}><Encuadre id={previa.id} foco={previa.foco} zoom={zoomC} /></div>}
          {fotos[f1] && <div style={{position: 'absolute', inset: 0, clipPath: `circle(${cruza * 76}% at 50% 50%)`}}><Encuadre id={fotos[f1].id} foco={fotos[f1].foco} zoom={zoomC} /></div>}
          
        </div>
        {filas.map((f, i) => { const a = (i * 360) / n, p = pol(a), on = fr >= ens[i], pop = salta(fr, ens[i], {damping: 10, stiffness: 240, mass: 0.6}), pulso = cerrado ? salta(fr, cierre + i * 2, {damping: 9, stiffness: 240}) : 0, r = n > 5 ? 84 : 98, en = salta(fr, ac.a + i * 2, {damping: 13, stiffness: 130}); return (<div key={i} style={{position: 'absolute', left: p.x - r, top: p.y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', overflow: 'hidden', transform: `scale(${en * (0.86 + (on ? 0.14 * pop : 0) + 0.1 * Math.sin(pulso * Math.PI))})`, boxShadow: `0 16px 30px rgba(0,0,0,.38), 0 0 0 ${on ? 10 : 6}px ${on ? c : mezclar(look.oscuro ? '#3b444c' : '#d3dadd', '#ffffff', 0.05)}`}}>{fotos[i] && <Encuadre id={fotos[i].id} foco={fotos[i].foco} zoom={1.25} filtro={on ? undefined : 'grayscale(.9) brightness(.8)'} />}</div>); })}
        {!cerrado && Array.from({length: 12}).map((_, i) => { const p = pol(ang - i * 2.6); return <div key={i} style={{position: 'absolute', left: p.x - 16, top: p.y - 16, width: 32, height: 32, borderRadius: '50%', background: mezclar(c, '#ffffff', 0.4), opacity: 0.55 * (1 - i / 12), transform: `scale(${1 - i / 15})`}} />; })}
        {!cerrado && <div style={{position: 'absolute', left: sat.x - 26, top: sat.y - 26, width: 52, height: 52, borderRadius: '50%', background: '#fff', boxShadow: `0 0 0 9px ${c}, 0 0 34px 14px ${rgba(c, 0.6)}`}} />}
        </div>
      <div style={{position: 'absolute', left: xD, top: 300, width: wD, height: 480, display: 'flex', alignItems: 'center'}}>
        {!cerrado && activo >= 0 && filas[activo].t && <div key={activo} style={{fontFamily: fam(look.display), fontSize: tamFit(filas[activo].t, wD, look.display, 170, false, 2), color: tinta, lineHeight: 1, width: wD, opacity: va(fr, ens[activo], 5), transform: `translateX(${(1 - salta(fr, ens[activo], {damping: 15, stiffness: 200})) * 70}px)`}}>{filas[activo].t}</div>}
        {cerrado && <GolpeTexto ac={ac} look={look} ancho={wD} max={210} color={look.oscuro ? c : legibleEnClaro(look, c)} alin="left" desde={cierre} />}
      </div>
    </Camara>
  </div>);
};

/* ═══════════ MURO: ladrillos que se levantan y tapan la foto, o una pared hecha de la foto que revienta ═══════════ */
const Muro: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), [A, B] = ac.fotos, cae = ac.var === 'cae', c = look.acento;
  const BW = 310, BH = 150, GAP = 7, COLS = 8, FILAS = 7, WW = COLS * BW, WH = FILAS * BH, X0 = (1920 - WW) / 2, Y0 = (1080 - WH) / 2, yaw = -11 + Math.sin((fr - ac.a) / 46) * 2.5;
  const fotoPared = A, url = staticFile(`fotos/${fotoPared.id}.jpg`), imgH = WW * 9 / 16, offY = (WH - imgH) * (1 - (fotoPared.foco?.[1] ?? 0.5));
  const base = mezclar(c, look.oscuro ? '#101214' : '#f4f1ea', look.oscuro ? 0.42 : 0.34), L: {x: number; y: number; f: number; k: number}[] = [];
  for (let f = FILAS - 1; f >= 0; f--) for (let k = -1; k < COLS; k++) { const x = k * BW + (f % 2 ? BW / 2 : 0); if (x + BW <= 0 || x >= WW) continue; L.push({x, y: f * BH, f, k}); }
  const n = L.length, tira = Math.max(10, G - ac.a - 6), luz = va(fr, G, 14), hitW = salta(fr, G, {damping: 14, stiffness: 260, mass: 0.6}), cxW = WW / 2, cyW = WH / 2;
  const tinta = sobre(base), ideal = cae ? B || A : A;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: look.fondo}}>
    <Img src={url} style={{position: 'absolute', width: 2, height: 2, opacity: 0}} />
    <div style={{position: 'absolute', inset: 0, transform: `scale(${1.04 + (fr - ac.a) * 0.0007})`}}><Encuadre id={ideal.id} foco={ideal.foco} filtro={cae ? undefined : `brightness(${1 - 0.3 * va(fr, ac.a, tira)})`} /></div>
    {cae && fr >= G && <Bloom id={ideal.id} foco={ideal.foco} o={0.5 * (1 - va(fr, G + 4, 26))} />}
    <Camara ac={ac} G={G} temblor={cae ? 20 : 16}>
      <div style={{position: 'absolute', inset: 0, perspective: 1500, perspectiveOrigin: '50% 46%'}}>
        {L.map((b, i) => {
          const tinte = azar('c' + i), col = mezclar(base, tinte > 0.5 ? '#ffffff' : '#000000', Math.abs(tinte - 0.5) * 0.26), ori = `${cxW - b.x}px ${cyW - b.y}px`, grande = {position: 'absolute' as const, left: X0 + b.x, top: Y0 + b.y, width: BW - GAP, height: BH - GAP, transformOrigin: ori, boxShadow: `inset 0 3px 0 ${rgba('#ffffff', 0.28)}, inset 0 -6px 0 ${rgba('#000000', 0.24)}, 0 0 0 ${GAP / 2}px ${rgba(look.oscuro ? '#050607' : '#5b5d5e', 0.92)}`};
          if (cae) { const dist = Math.hypot(b.x + BW / 2 - cxW, b.y + BH / 2 - cyW), t0 = G + dist * 0.012, t = fr - t0, u = t <= 0 ? 0 : 1 - Math.exp(-t / 8); if (t > 34) return null;
            const fArma = ac.a + azar('fa' + i) * Math.min(16, (G - ac.a) * 0.4), arma = salta(fr, fArma, {damping: 15, stiffness: 170, mass: 0.7}), flojo = va(fr, ac.a + (G - ac.a) * 0.5, Math.max(1, (G - ac.a) * 0.5), 0, 1, curva.suave) * (azar('fl' + i) > 0.4 ? 1 : 0.25), zR = 8 + azar('zr' + i) * 44 + flojo * 50, sac = Math.sin(fr * (1.9 + azar('fs' + i)) + i) * flojo * 5, velo = azar('vl' + i); const nx = (b.x + BW / 2 - cxW) / 800, ny = (b.y + BH / 2 - cyW) / 500; return <div key={i} style={{...grande, opacity: t > 20 ? 1 - (t - 20) / 14 : 1, background: `${col}`, backgroundImage: `url(${url})`, backgroundSize: `${WW}px ${imgH}px`, backgroundPosition: `${-b.x}px ${offY - b.y}px`, transform: `rotateY(${yaw}deg) translate3d(${nx * 900 * u + sac}px,${ny * 620 * u + Math.max(0, t) ** 2 * 0.9 + sac * 0.6 - (1 - arma) * 240}px,${zR + u * (380 + azar('z' + i) * 560) + (1 - arma) * 620}px) rotate(${(azar('r' + i) - 0.5) * 80 * u + (1 - arma) * (azar('ra' + i) - 0.5) * 24}deg) rotateX(${(azar('x' + i) - 0.5) * 170 * u}deg)`}}><div style={{position: 'absolute', inset: 0, background: velo > 0.5 ? `rgba(255,255,255,${(velo - 0.5) * 0.2})` : `rgba(0,0,0,${(0.5 - velo) * 0.42})`}} /></div>; }
          const f0 = ac.a + 3 + (tira * i) / Math.max(1, n - 1) - (i === n - 1 ? 0 : 3), p = salta(fr, f0, {damping: 16, stiffness: 240, mass: 0.75}); if (fr < f0) return null;
          return <div key={i} style={{...grande, background: `linear-gradient(170deg, ${mezclar(col, '#ffffff', 0.1)}, ${mezclar(col, '#000000', 0.1)})`, transform: `rotateY(${yaw}deg) translate3d(0,${(1 - p) * -560}px,${(1 - p) * 320}px) rotate(${(1 - p) * (azar('g' + i) - 0.5) * 16}deg)`}} />;
        })}
        {!cae && fr >= G && <div style={{position: 'absolute', left: X0 + 200, top: Y0 + 250, width: WW - 400, height: WH - 500, transformOrigin: '50% 50%', transform: `rotateY(${yaw}deg) scale(${1.2 - 0.2 * hitW})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><GolpeTexto ac={ac} look={look} ancho={1320} max={400} color={tinta} sombra={`0 6px 0 ${rgba(sobre(tinta), 0.25)}`} /></div>}
      </div>
      {!cae && fr >= G && fr < G + 24 && Array.from({length: 34}).map((_, i) => { const d = fr - G, x = azar('px' + i) * 1920, y0 = 300 + azar('py' + i) * 700, r = 26 + azar('pr' + i) * 60; return <div key={i} style={{position: 'absolute', left: x, top: y0 + d * d * 0.5 - d * 8, width: r, height: r, borderRadius: '50%', background: `radial-gradient(closest-side, ${rgba('#ffffff', 0.55)}, transparent)`, opacity: 1 - d / 24}} />; })}
    </Camara>
    {cae && fr < G && <div style={{position: 'absolute', left: 260, bottom: 80, width: 1400}}><LeadTexto ac={ac} look={look} ancho={1400} max={76} color="#fff" hasta={G} sombra="0 3px 24px rgba(0,0,0,.9)" /></div>}
    {cae && fr >= G && <div style={{position: 'absolute', inset: 0, opacity: 1 - va(fr, ac.b - 5, 5)}}><Velo area={zonaArea(ideal.zona)} /><Rotulo lineas={lineasDe(ac, 'golpe')} area={zonaArea(ideal.zona)} look={look} sobreFoto maxGolpe={230} /></div>}
    {cae && fr >= G && luz < 1 && <div style={{position: 'absolute', inset: 0, background: `rgba(255,255,255,${0.75 * (1 - luz)})`}} />}
  </div>);
};

/* ═══════════ CORTE: un bloque cortado con la foto en la cara de arriba; algo baja capa por capa hasta la de abajo ═══════════ */
const Corte: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], d = ac.datos || {}, c = look.acento, gota = color2(look), capas: any[] = (d.capas || []).slice(0, 3);
  const n = capas.length + 1, X = 130, W = 1080, Y0 = 348, H = 560, hC = H / n, idg = `cli-co-${ac.a}`, tinta = look.oscuro ? '#fff' : look.tinta, entra = salta(fr, ac.a, {damping: 15, stiffness: 90, mass: 1.1});
  const ens = crecientes(capas.map((x) => x.en), ac.a + 8, Math.max(G - 8, ac.a + 9 + n)), ty = (i: number) => Y0 + hC * (i + 0.5), xs = [ac.a + 2, ...ens, Math.max(G, ens[ens.length - 1] + 3)], ys = [Y0 - 148, ...capas.map((_, i) => ty(i)), ty(n - 1)];
  const gy = capas.length ? interpolate(fr, xs, ys, {...CL, easing: curva.suave}) : interpolate(fr, [ac.a + 2, Math.max(G, ac.a + 3)], [Y0 - 148, ty(0)], {...CL, easing: curva.suave}), gx = X + W / 2;
  const tono = (i: number) => mezclar(mezclar(c, '#ffffff', look.oscuro ? 0.24 : 0.45), mezclar(c, '#040709', 0.72), n > 1 ? i / (n - 1) : 0.5), impacto = salta(fr, Math.max(G, xs[xs.length - 1]), {damping: 12, stiffness: 170, mass: 0.7}), tocado = fr >= G;
  const borde = (i: number) => { const y = i * hC; let s = `M0,${y}`; for (let x = 0; x <= W; x += 60) s += ` L${x},${y + (i === 0 || i === n ? 0 : Math.sin(x / 94 + i * 2) * 12)}`; return s; };
  const capaP = (i: number) => { const s0 = borde(i), s1 = borde(i + 1).replace('M', 'L').split(' L').filter(Boolean).reverse().join(' L'); return `${s0} L${s1} Z`; };
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={A} piso={910} haz={670} halo={c} semilla="corte" />
    <Camara ac={ac} G={G} temblor={7} empuje={0.02} origen="42% 60%">
      <div style={{position: 'absolute', inset: 0, transform: `perspective(2100px) translateY(${(1 - entra) * 180}px) rotateY(${11 + Math.sin((fr - ac.a) / 47) * 3 + (1 - entra) * 18}deg)`, transformOrigin: '42% 55%'}}>
        <SombraPiso w={1300} o={0.55} style={{left: X - 110, top: Y0 + H - 70}} />
        <div style={{position: 'absolute', left: X, top: Y0 - 470, width: W, height: 470, transformOrigin: '50% 100%', transform: 'perspective(4600px) rotateX(66deg)', overflow: 'hidden', boxShadow: '0 0 0 2px rgba(255,255,255,.4)'}}><Encuadre id={A.id} foco={A.foco} zoom={1.05} /><div style={{position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(255,255,255,.16), transparent 40%)'}} /></div>
        <svg width={W} height={H + 8} style={{position: 'absolute', left: X, top: Y0, overflow: 'visible'}}>
          <defs><clipPath id={idg}><rect width={W} height={H} /></clipPath></defs>
          <g clipPath={`url(#${idg})`}>
            {Array.from({length: n}).map((_, i) => <g key={i}><path d={capaP(i)} fill={tono(i)} />
              {Array.from({length: 46}).map((__, j) => { const x = azar(`x${i}-${j}`) * W, y = i * hC + 14 + azar(`y${i}-${j}`) * (hC - 28), r = 6 + azar(`r${i}-${j}`) * 17; return <circle key={j} cx={x} cy={y} r={r} fill={rgba(i % 2 ? '#ffffff' : '#000000', 0.09)} />; })}
              {(i < n - 1 ? fr >= ens[i] && fr < (ens[i + 1] ?? G) + 8 : tocado) && <path d={capaP(i)} fill={i === n - 1 ? rgba(gota, 0.62 * Math.min(1, impacto)) : rgba('#ffffff', 0.18)} />}
            </g>)}
            <rect width={W} height={H} fill="url(#none)" />
            <line x1={gx - X} y1={-20} x2={gx - X} y2={Math.max(0, gy - Y0 - 40)} stroke={rgba(mezclar(gota, '#ffffff', 0.2), 0.88)} strokeWidth={16} strokeLinecap="round" />
            {tocado && Array.from({length: 3}).map((_, i) => { const t = Math.max(0, fr - G - i * 4), o = Math.max(0, 1 - t / 20); return <ellipse key={i} cx={gx - X} cy={gy - Y0} rx={60 + t * 34} ry={16 + t * 8} fill="none" stroke="#ffffff" strokeWidth={8} opacity={o} />; })}
            {tocado && fr < G + 20 && Array.from({length: 16}).map((_, i) => { const t = fr - G, th = (i / 16) * Math.PI * 2 + 0.2, a = 70 + t * 6, b = a + 80 + t * 22, o = 1 - t / 20; return <line key={'r' + i} x1={gx - X + Math.cos(th) * a} y1={gy - Y0 + Math.sin(th) * a * 0.42} x2={gx - X + Math.cos(th) * b} y2={gy - Y0 + Math.sin(th) * b * 0.42} stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={o} />; })}
          </g>
          <rect width={W} height={H} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={2} /><rect y={0} width={W} height={7} fill="rgba(255,255,255,.55)" />
          <rect width={60} height={H} fill="url(#none)" />
        </svg>
        <div style={{position: 'absolute', left: X, top: Y0, width: W, height: H, background: 'linear-gradient(90deg, rgba(0,0,0,.24), transparent 14%, transparent 80%, rgba(0,0,0,.3))'}} />
        <svg viewBox="-50 -70 100 130" width={118} height={154} style={{position: 'absolute', left: gx - 59, top: gy - 96, overflow: 'visible', transform: `scale(${1 + 0.34 * Math.sin(impacto * Math.PI)})`}}><path d="M0,-66 C16,-34 42,-12 42,20 A42,42 0 1 1 -42,20 C-42,-12 -16,-34 0,-66 Z" fill={gota} stroke="#fff" strokeWidth={5} /><ellipse cx={-14} cy={10} rx={8} ry={15} fill="rgba(255,255,255,.7)" /></svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none'}}>{Array.from({length: n}).map((_, i) => { const on = i < n - 1 ? fr >= ens[i] : tocado; return <line key={i} x1={X + W} y1={ty(i)} x2={X + W + 74} y2={ty(i)} stroke={on ? c : rgba(tinta, 0.2)} strokeWidth={5} />; })}</svg>
        {capas.map((x, i) => { const on = fr >= ens[i], s = salta(fr, ens[i], {damping: 14, stiffness: 180}); return <div key={i} style={{position: 'absolute', left: X + W + 90, top: ty(i) - 40, width: 580, height: 80, display: 'flex', alignItems: 'center', opacity: on ? 0.55 + 0.45 * (fr < (ens[i + 1] ?? G) ? 1 : 0.2) : 0, transform: `translateX(${(1 - s) * 44}px)`, fontFamily: fam(look.texto), fontWeight: 800, color: tinta, fontSize: Math.max(46, Math.min(78, 570 / (String(x.t).length * 0.6))), whiteSpace: 'nowrap', letterSpacing: '-0.02em'}}>{x.t}</div>; })}
        <div style={{position: 'absolute', left: X + W + 90, top: ty(n - 1) - 66, width: 590}}><GolpeTexto ac={ac} look={look} ancho={580} max={118} color={look.oscuro ? c : legibleEnClaro(look, c)} alin="left" /></div>
      </div>
    </Camara>
  </div>);
};

/* ═══════════ RAYOS: una lupa recorre la foto y por el vidrio se ve lo que hay adentro; en el golpe el vidrio se traga el cuadro ═══════════ */
const Rayos: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), [A, B0] = ac.fotos, B = B0 || A, c = look.acento, [fx, fy] = A.foco || [0.5, 0.5];
  const tx = Math.max(420, Math.min(1500, fx * 1920)), ty = Math.max(340, Math.min(720, fy * 1080)), a = ac.a, t = Math.max(8, G - a), s0 = fx < 0.5 ? 1 : -1;
  const px = interpolate(fr, [a, a + t * 0.42, a + t * 0.74, G], [tx + s0 * 900, tx + s0 * 240, tx - s0 * 130, tx], {...CL, easing: curva.suave}), py = interpolate(fr, [a, a + t * 0.42, a + t * 0.74, G], [ty + 520, ty - 150, ty + 110, ty], {...CL, easing: curva.suave});
  const prevx = interpolate(fr - 2, [a, a + t * 0.42, a + t * 0.74, G], [tx + s0 * 900, tx + s0 * 240, tx - s0 * 130, tx], {...CL, easing: curva.suave}), incl = Math.max(-12, Math.min(12, (px - prevx) * 0.14));
  const abre = va(fr, G, 15, 0, 1, Bezier), r = 250 + abre * 1650, oscu = va(fr, a, 12), area = zonaArea(B.zona);
  const areaA = zonaArea(fx < 0.5 ? 'bottom-right' : 'bottom-left');
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: look.fondo}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${1.1 - 0.06 * va(fr, a, 24) + (fr - a) * 0.0005})`}}><Encuadre id={A.id} foco={A.foco} filtro={`saturate(${1 - 0.72 * oscu}) brightness(${1 - 0.3 * oscu})`} /></div>
    <div style={{position: 'absolute', inset: 0, clipPath: `circle(${r - 14}px at ${px}px ${py}px)`, transform: `scale(${1 + (1 - abre) * 0.0})`}}><div style={{position: 'absolute', inset: 0, transform: `scale(${1.42 - 0.38 * abre + (fr - a) * 0.0005})`, transformOrigin: `${(px / 1920) * 100}% ${(py / 1080) * 100}%`}}><Encuadre id={B.id} foco={B.foco} /></div></div>
    <Camara ac={ac} G={G} temblor={0}>
      {abre < 1 && <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <g transform={`rotate(${incl} ${px} ${py})`}>
          <circle cx={px + 26} cy={py + 34} r={r} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth={26} />
          <g transform={`translate(${px},${py}) rotate(${s0 > 0 ? 134 : 46})`}><rect x={r + 2} y={-22} width={70} height={44} rx={8} fill="#454b52" /><rect x={r + 62} y={-34} width={290} height={68} rx={32} fill={mezclar(c, '#000000', 0.42)} /><rect x={r + 74} y={-26} width={260} height={16} rx={8} fill="rgba(255,255,255,.3)" /></g>
          <circle cx={px} cy={py} r={r} fill="none" stroke="#20272c" strokeWidth={30} /><circle cx={px} cy={py} r={r} fill="none" stroke={mezclar(c, '#ffffff', 0.34)} strokeWidth={13} />
          <path d={`M${px - r * 0.72},${py - r * 0.3} A${r * 0.8},${r * 0.8} 0 0 1 ${px - r * 0.12},${py - r * 0.76}`} stroke="#fff" strokeWidth={15} strokeLinecap="round" fill="none" opacity={0.5} />
        </g>
      </svg>}
    </Camara>
    {fr < G && <div style={{position: 'absolute', left: areaA.x, bottom: 90, width: areaA.w}}><LeadTexto ac={ac} look={look} ancho={areaA.w} max={78} color="#fff" hasta={G} alin={fx < 0.5 ? 'right' : 'left'} sombra="0 3px 24px rgba(0,0,0,.85)" /></div>}
    {fr >= G && <><Velo area={area} /><Rotulo lineas={lineasDe(ac, 'golpe')} area={area} look={look} sobreFoto maxGolpe={230} hasta={ac.b} /></>}
    {fr >= G && fr < G + 8 && <div style={{position: 'absolute', inset: 0, background: `rgba(255,255,255,${0.4 * (1 - (fr - G) / 8)})`}} />}
  </div>);
};
const Bezier = curva.expo;

/* ═══════════ BALANZA: una balanza con foto en cada plato; en el golpe un lado se desploma ═══════════ */
const Platillo: React.FC<{x: number; yE: number; id?: string; foco?: [number, number]; f0: number; t?: string | null; look: Look_; dim: number; c: string}> = ({x, yE, id, foco, f0, t, look, dim, c}) => {
  const fr = useCurrentFrame(), pY = yE + 345, W = 520, cae = salta(fr, f0, {damping: 12, stiffness: 180, mass: 0.8}), TW = 420, TH = 300, tam = t ? Math.max(46, Math.min(70, 500 / (t.length * 0.6))) : 0, m = look.oscuro ? '#cfd6dc' : '#6e7880';
  return (<>
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}><line x1={x} y1={yE} x2={x - W / 2 + 12} y2={pY} stroke={m} strokeWidth={5} /><line x1={x} y1={yE} x2={x + W / 2 - 12} y2={pY} stroke={m} strokeWidth={5} /><circle cx={x} cy={yE} r={12} fill={m} /></svg>
    {id && fr >= f0 && <div style={{position: 'absolute', left: x - TW / 2, top: pY - TH - 8 - (1 - cae) * 480, width: TW, height: TH, opacity: Math.min(1, cae * 3), background: '#fff', padding: 9, boxSizing: 'border-box', boxShadow: '0 18px 28px rgba(0,0,0,.36)', transform: `rotate(${(1 - cae) * -9}deg)`, filter: dim > 0.02 ? `grayscale(${0.7 * dim}) brightness(${1 - 0.28 * dim})` : undefined}}><div style={{position: 'relative', width: '100%', height: '100%'}}><Encuadre id={id} foco={foco} /></div></div>}
    <div style={{position: 'absolute', left: x - W / 2, top: pY - 14, width: W, height: 46, borderRadius: '50%', background: `linear-gradient(180deg, ${mezclar(c, '#ffffff', 0.5)}, ${mezclar(c, '#000000', 0.45)})`, boxShadow: '0 16px 26px rgba(0,0,0,.34)'}} />
    {t && fr >= f0 && <div style={{position: 'absolute', left: x - 260, top: pY + 42, width: 520, textAlign: 'center', fontFamily: fam(look.texto), fontWeight: 800, fontSize: tam, whiteSpace: 'nowrap', color: look.oscuro ? '#fff' : look.tinta, letterSpacing: '-0.02em', opacity: 1 - 0.45 * dim}}>{t}</div>}
  </>);
};
const Balanza: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, c = look.acento, [A, B0] = ac.fotos, B = B0 || A, izq = d.gana !== 'der', sgn = izq ? -1 : 1, PX = 960, PY = 250, L = 590, ids = `cli-ba-${ac.a}`;
  const tilt = salta(fr, G, {damping: 7.5, stiffness: 150, mass: 0.85}), mec = Math.sin((fr - ac.a) / 15) * 3.4 * (1 - va(fr, G - 4, 6)), th = (mec + sgn * 13 * tilt) * (Math.PI / 180);
  const yIzq = PY - Math.sin(th) * L, yDer = PY + Math.sin(th) * L, xIzq = PX - Math.cos(th) * L, xDer = PX + Math.cos(th) * L, f1 = d.en_a ?? ac.a + Math.min(8, (G - ac.a) * 0.3), f2 = d.en_b ?? ac.a + Math.min(20, (G - ac.a) * 0.62), m = look.oscuro ? '#d2d9df' : '#5d6971', luz = va(fr, G, 12), e = salta(fr, ac.a, {damping: 15, stiffness: 90});
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={A} piso={950} halo={c} semilla="bal" />
    <Camara ac={ac} G={G} temblor={11} empuje={0.015}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 100%', transform: `perspective(1800px) rotateX(${(1 - e) * 26}deg) translateY(${(1 - e) * 170}px) rotateY(${Math.sin((fr - ac.a) / 41) * 3}deg)`}}>
        <SombraPiso w={560} o={0.55} style={{left: 680, top: 945}} />
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <defs><linearGradient id={ids + 'p'} x1="0" x2="1"><stop offset="0" stopColor={mezclar(m, '#000000', 0.5)} /><stop offset=".36" stopColor={mezclar(m, '#ffffff', 0.5)} /><stop offset="1" stopColor={mezclar(m, '#000000', 0.55)} /></linearGradient><linearGradient id={ids + 'b'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={mezclar(c, '#ffffff', 0.45)} /><stop offset="1" stopColor={mezclar(c, '#000000', 0.42)} /></linearGradient></defs>
          <path d={`M${PX - 20},${PY} L${PX + 20},${PY} L${PX + 28},950 L${PX - 28},950 Z`} fill={`url(#${ids}p)`} /><ellipse cx={PX} cy={962} rx={200} ry={30} fill={`url(#${ids}b)`} />
        </svg>
        <Platillo x={xIzq} yE={yIzq} id={A.id} foco={A.foco} f0={f1} t={d.a} look={look} dim={izq ? 0 : luz} c={c} />
        <Platillo x={xDer} yE={yDer} id={B.id} foco={B.foco} f0={f2} t={d.b} look={look} dim={!izq ? 0 : luz} c={c} />
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}><line x1={xIzq} y1={yIzq} x2={xDer} y2={yDer} stroke={`url(#${ids}b)`} strokeWidth={26} strokeLinecap="round" /><line x1={xIzq} y1={yIzq - 7} x2={xDer} y2={yDer - 7} stroke="rgba(255,255,255,.5)" strokeWidth={4} strokeLinecap="round" /><circle cx={PX} cy={PY} r={38} fill={`url(#${ids}b)`} stroke="rgba(255,255,255,.75)" strokeWidth={5} /></svg>
        {fr >= G && fr < G + 20 && Array.from({length: 18}).map((_, i) => { const t = fr - G, x0 = izq ? xIzq : xDer, y0 = (izq ? yIzq : yDer) + 366, th2 = azar('b' + i) * Math.PI - Math.PI, v = 80 + azar('v' + i) * 240, u = 1 - Math.exp(-t / 6); return <div key={i} style={{position: 'absolute', left: x0 + Math.cos(th2) * v * u, top: y0 + Math.sin(th2) * 0.5 * v * u + t * t * 0.42, width: 10, height: 10, borderRadius: 3, background: c, opacity: 1 - t / 20}} />; })}
      </div>
      <div style={{position: 'absolute', left: fr < G ? 460 : izq ? 50 : 1030, top: 28, width: fr < G ? 1000 : 840}}>{fr < G ? <LeadTexto ac={ac} look={look} ancho={1000} max={68} hasta={G} /> : <GolpeTexto ac={ac} look={look} ancho={840} max={108} color={look.oscuro ? c : legibleEnClaro(look, c)} renglones={2} />}</div>
    </Camara>
  </div>);
};

/* ═══════════ FRASCOS: frascos de vidrio con foto; cada uno se llena al nombrarlo y el importante rebalsa en el golpe ═══════════ */
const NIVEL: Record<string, number> = {alto: 0.76, medio: 0.48, bajo: 0.2};
const Frascos: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, c = look.acento, filas: any[] = (d.filas && d.filas.length ? d.filas : ac.fotos.map(() => ({}))).slice(0, 4), n = Math.max(1, filas.length);
  const JW = n > 3 ? 310 : 350, JH = 548, BASE = 840, paso = n > 1 ? Math.min(450, 1500 / (n - 1)) : 0, x0 = 960 - ((n - 1) * paso) / 2, ens = crecientes(filas.map((f) => f.en), ac.a + 4, Math.max(G - 6, ac.a + 6 + n));
  const clave = typeof d.clave === 'number' ? Math.max(0, Math.min(n - 1, Math.round(d.clave))) : n - 1, luz = va(fr, G, 12), tinta = look.oscuro ? '#fff' : look.tinta;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Sala look={look} foto={ac.fotos[0]} piso={BASE - 16} halo={c} semilla="fras" />
    <Camara ac={ac} G={G} temblor={6} empuje={0.1} origen={`${((x0 + clave * paso) / 1920) * 100}% 60%`}>
      <div style={{position: 'absolute', inset: 0, transform: `perspective(2200px) rotateY(${-7 + Math.sin((fr - ac.a) / 45) * 3}deg)`}}>
      <div style={{position: 'absolute', left: 90, right: 90, top: BASE - 4, height: 34, background: look.oscuro ? mezclar(look.fondo || '#111', '#ffffff', 0.2) : mezclar(look.fondo || '#ddd', look.tinta, 0.14), boxShadow: '0 22px 34px rgba(0,0,0,.28)', borderRadius: 3}} />
      {filas.map((f, i) => {
        const x = x0 + i * paso, foto = f.foto || ac.fotos[i % Math.max(1, ac.fotos.length)], lv = NIVEL[f.nivel] ?? [0.3, 0.62, 0.45, 0.72][i % 4], esClave = i === clave, ll = va(fr, ens[i], 22, 0, 1, curva.ios), sp = salta(fr, ac.a + i * 3, {damping: 13, stiffness: 150}), rise = esClave ? va(fr, G - 2, 14, 0, 1, curva.ios) : 0, nivel = Math.min(1.015, lv * ll + (1.015 - lv) * rise), hL = nivel * (JH - 60), wob = Math.sin((fr - ens[i]) / 3.3) * 8 * Math.exp(-Math.max(0, fr - ens[i]) / 18), dim = !esClave ? luz : 0, lq = esClave ? mezclar(c, '#ffffff', 0.08) : mezclar(c, look.oscuro ? '#7c8790' : '#aab3b8', 0.58 + 0.3 * dim), idg = `cli-fr-${ac.a}-${i}`, t = f.t as string | undefined, sobra = esClave ? va(fr, G + 8, 8) : 0;
        return (<div key={i} style={{position: 'absolute', left: x - JW / 2, top: BASE - JH, width: JW, height: JH, opacity: Math.min(1, sp * 2) * (1 - 0.35 * dim), transform: `perspective(1400px) translateY(${(1 - sp) * 90}px) rotateY(${(960 - x) * 0.012}deg) scale(${1 + (esClave ? 0.04 * luz : 0)})`, transformOrigin: '50% 100%'}}>
          <svg width={JW} height={JH + 120} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <defs><linearGradient id={idg} x1="0" x2="1"><stop offset="0" stopColor="rgba(255,255,255,.42)" /><stop offset=".22" stopColor="rgba(255,255,255,.08)" /><stop offset=".78" stopColor="rgba(255,255,255,.02)" /><stop offset="1" stopColor="rgba(255,255,255,.3)" /></linearGradient></defs>
            <rect x={6} y={36} width={JW - 12} height={JH - 40} rx={38} fill={rgba(look.oscuro ? '#ffffff' : '#ffffff', look.oscuro ? 0.08 : 0.55)} />
            <clipPath id={idg + 'c'}><rect x={14} y={36} width={JW - 28} height={JH - 44} rx={30} /></clipPath>
            <g clipPath={`url(#${idg}c)`}>
              <rect x={0} y={JH - 8 - hL} width={JW} height={hL + 20} fill={lq} />
              <ellipse cx={JW / 2} cy={JH - 8 - hL} rx={JW / 2 - 8} ry={15 + wob} fill={mezclar(lq, '#ffffff', 0.38)} />
              {esClave && fr >= G - 2 && Array.from({length: 12}).map((_, j) => { const t2 = (fr - G - j * 3 + 90) % 40, bx = 30 + azar('bx' + j) * (JW - 60), r = 5 + azar('br' + j) * 12; return <circle key={j} cx={bx} cy={JH - 10 - t2 * 13} r={r} fill="rgba(255,255,255,.42)" />; })}
            </g>
            <rect x={6} y={36} width={JW - 12} height={JH - 40} rx={38} fill={`url(#${idg})`} stroke={rgba(look.oscuro ? '#ffffff' : look.tinta, 0.36)} strokeWidth={5} />
            <rect x={JW * 0.13} y={0} width={JW * 0.74} height={50} rx={10} fill={esClave ? mezclar(c, '#000000', 0.15) : (look.oscuro ? '#59636c' : '#99a3a9')} />
            {sobra > 0 && [0.2, 0.8].map((q, j) => <path key={j} d={`M${JW * q},38 L${JW * q},${38 + (JH - 40) * sobra * (j ? 0.72 : 0.92)}`} stroke={lq} strokeWidth={20} strokeLinecap="round" fill="none" />)}
          </svg>
          {foto && <div style={{position: 'absolute', left: 34, top: 92, width: JW - 68, height: 200, background: '#fff', padding: 7, boxSizing: 'border-box', boxShadow: '0 8px 16px rgba(0,0,0,.28)'}}><div style={{position: 'relative', width: '100%', height: '100%'}}><Encuadre id={foto.id} foco={foto.foco} filtro={dim > 0.02 ? `grayscale(${dim})` : undefined} /></div></div>}
          <div style={{position: 'absolute', left: JW * 0.14, top: 44, width: JW * 0.12, height: JH - 80, borderRadius: 40, background: 'linear-gradient(90deg, rgba(255,255,255,.36), transparent)'}} />
          {t && fr >= ens[i] - 2 && <div style={{position: 'absolute', left: -60, width: JW + 120, top: JH + 42, textAlign: 'center', fontFamily: fam(look.texto), fontWeight: 800, fontSize: Math.max(46, Math.min(66, (Math.min(paso || JW + 120, JW + 120) - 30) / (t.length * 0.6))), color: tinta, whiteSpace: 'nowrap', letterSpacing: '-0.02em', opacity: 1 - 0.4 * dim}}>{t}</div>}
        </div>);
      })}
      </div>
      <div style={{position: 'absolute', left: 360, top: 56, width: 1200}}>{fr < G ? <LeadTexto ac={ac} look={look} ancho={1200} max={70} hasta={G} /> : <GolpeTexto ac={ac} look={look} ancho={1200} max={200} color={look.oscuro ? c : legibleEnClaro(look, c)} renglones={1} />}</div>
    </Camara>
  </div>);
};

export const OPS: Record<string, React.FC<OpProps>> = {cli_etiqueta: Etiqueta, cli_sello: Sello, cli_cohorte: Cohorte, cli_anillo: Anillo, cli_muro: Muro, cli_corte: Corte, cli_rayos: Rayos, cli_balanza: Balanza, cli_frascos: Frascos};
