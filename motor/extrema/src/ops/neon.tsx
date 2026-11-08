// Familia neon: lenguaje de alto impacto, CSS puro, sin identidad. Cada operación es un OBJETO con un momento WOW en la palabra golpe.
// Nada de preserve-3d: cada pieza lleva su propio perspective() y todas comparten origen, así el punto de fuga es común.
import React from 'react';
import {useCurrentFrame, interpolate, random, Easing} from 'remotion';
import {OpProps, Linea, fam} from './base';
import {Encuadre, FondoFoto, Palabras, Polvo, va, salta, curva} from '../kit';
import {cl, mix, rgba, sobre, tiempos, golpeL, leads, txtDe, cabe, mayusDe, pesoDe, Dicho, SOMBRA_N, Escena, Reflejo, salida, anchoLetra} from './neon_esc';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const fuerteUp = (t: string, up: boolean) => (up ? t.toUpperCase() : t);
const raiz: React.CSSProperties = {position: 'absolute', inset: 0, overflow: 'hidden'};

/* ───────────── COVERFLOW: tarjetas 9:16 con foto, reflejo y haz de luz ───────────── */
const CoverFlow: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, ent} = tiempos(ac), {a} = ac, fotos = ac.fotos, N = fotos.length;
  if (!N) return null;
  const filas: any[] = ac.datos?.filas || [], gl = golpeL(ac);
  const at: number[] = []; fotos.forEach((_, i) => { const v = filas[i]?.en ?? (N > 1 ? Math.round(mix(a + ent * 0.5, G, i / (N - 1))) : a); at.push(i ? Math.max(v, at[i - 1] + 3) : v); });
  let act = 0; for (let i = 1; i < N; i++) act += salta(fr, at[i] - 7, {damping: 13, stiffness: 120, mass: 0.75});
  let push = 0; at.forEach((t) => { const x = fr - (t - 7); if (x > 0) push += Math.sin((Math.min(x, 40) / 40) * Math.PI) * Math.exp(-x * 0.02); });
  const W = 428, H = 760, top = 88, hit = salta(fr, G - 1, {damping: 10, stiffness: 240, mass: 0.6}), ini = salta(fr, a, {damping: 18, stiffness: 90, mass: 1});
  const camZ = -380 * (1 - ini) + 30 * push + 22 * Math.sin((fr - a) / 34), camRY = 12 * (1 - ini) + 3.4 * Math.sin((fr - a) / 42 + 0.6), camY = 8 * Math.sin((fr - a) / 50 + 1.2);
  const orden = fotos.map((f, i) => ({f, i, d: (((i - act + N / 2) % N) + N) % N - N / 2})).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const lead = leads(ac)[0], gt = gl ? cabe(txtDe(gl), 1320, look, 170, 1) : 0;
  return (<Escena ac={ac} look={look} foto={fotos[Math.min(N - 1, Math.round(act))]} o={0.42} luz={1 + 0.5 * cl(push)}>
    <div style={{position: 'absolute', left: 960 - 520, top: -40, width: 1040, height: 1080, background: `conic-gradient(from 160deg at 50% 0%, transparent 0deg, ${rgba(look.acento, 0.2 + 0.22 * hit * (fr >= G ? 1 : 0))} 20deg, transparent 40deg)`}} />
    <div style={{position: 'absolute', left: 960 - 380, top: 60, width: 760, height: 860, background: `radial-gradient(50% 50% at 50% 50%, ${rgba(look.acento, 0.22 + 0.2 * cl(push))}, transparent 72%)`}} />
    {orden.map(({f, i, d}) => {
      const s = salta(fr, a + 1 + Math.min(i, 4) * 2, {damping: 12, stiffness: 95, mass: 0.85});
      if (s <= 0.003) return null;
      const ad = Math.abs(d), sg = Math.sign(d), x = sg * (Math.min(ad, 1) * 440 + Math.max(ad - 1, 0) * 250), activa = ad < 0.5, ultima = i === N - 1;
      const z = -Math.min(ad, 3) * 260 + camZ + (ultima && activa ? hit * 120 : 0), ry = -cl(d, -1, 1) * 48 + camRY, y = (1 - s) * 620 + camY, rz = (1 - s) * 10;
      const op = cl((N / 2 - ad) * 2) * (ad < 3.4 ? 1 - Math.max(0, ad - 2.4) : 0) * cl(s * 2.2);
      const cara = (<div style={{position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', background: '#000', border: `2px solid ${activa ? rgba(look.acento, 0.9) : 'rgba(255,255,255,.2)'}`}}>
        <Encuadre id={f.id} foco={f.foco} filtro="contrast(1.06) brightness(1.04)" />
        <div style={{position: 'absolute', inset: 0, background: `rgba(4,4,10,${cl(ad * 0.42, 0, 0.72)})`}} />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,0) 32%)'}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '42%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.72))'}} />
      </div>);
      const t = filas[i]?.t, oculto = !!gl && fr >= G - 1 && ultima;
      return (<div key={f.id + i} style={{position: 'absolute', left: 960 - W / 2, top, width: W, height: H, opacity: op, zIndex: 100 - Math.round(ad * 10), transform: `perspective(1900px) translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateZ(${rz}deg)`}}>
        <Reflejo w={W} h={H} alto={210} o={0.36}>{cara}</Reflejo>
        <div style={{position: 'absolute', inset: 0, boxShadow: `0 30px 60px rgba(0,0,0,.6), 0 0 ${activa ? 44 : 0}px ${rgba(look.acento, activa ? 0.42 : 0)}`, borderRadius: 18}}>{cara}</div>
        {t && activa && !oculto && <div style={{position: 'absolute', left: 16, right: 16, bottom: 26, textAlign: 'center', fontFamily: fam(look.display), fontWeight: pesoDe(look.display), fontSize: cabe(String(t), 396, look, 84, 2), lineHeight: 1, color: look.claro, textShadow: SOMBRA_N, opacity: va(fr, Math.max(at[i] - 2, a), 7), transform: `translateY(${va(fr, Math.max(at[i] - 2, a), 10, 26, 0)}px)`}}>{fuerteUp(String(t), mayusDe(look))}</div>}
      </div>);
    })}
    <div style={{position: 'absolute', left: 960 - 680, top: 640, width: 1360, zIndex: 200, transform: `scale(${0.82 + 0.18 * hit})`, transformOrigin: '50% 60%', textShadow: SOMBRA_N}}><Dicho l={gl} tam={gt} ancho={1360} look={look} color={look.acento} /></div>
    <div style={{position: 'absolute', left: 960 - 800, bottom: 40, width: 1600, zIndex: 200, textShadow: SOMBRA_N}}>{!filas.some((x) => x?.t) && <Dicho l={lead} tam={cabe(txtDe(lead), 1560, look, 66, 1, 44, look.texto)} ancho={1600} look={look} />}</div>
  </Escena>);
};

/* ───────────── ABANICO: mazo que se abre; la carta oculta sube, gira y se revela ───────────── */
const Dorso: React.FC<{look: any}> = ({look}) => (<div style={{position: 'absolute', inset: 0, borderRadius: 20, background: look.papel, border: `3px solid ${rgba(look.acento, 0.85)}`, overflow: 'hidden'}}>
  <div style={{position: 'absolute', inset: 16, borderRadius: 12, border: `2px solid ${rgba(look.acento, 0.55)}`, backgroundImage: `repeating-linear-gradient(45deg, ${rgba(look.acento, 0.28)} 0 3px, transparent 3px 26px), repeating-linear-gradient(-45deg, ${rgba(look.acento, 0.28)} 0 3px, transparent 3px 26px)`}} />
  <div style={{position: 'absolute', left: '50%', top: '50%', width: 120, height: 120, marginLeft: -60, marginTop: -60, transform: 'rotate(45deg)', background: look.papel, border: `5px solid ${look.acento}`}} />
  <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,.2), transparent 40%)'}} />
</div>);
const Abanico: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, ent} = tiempos(ac), {a} = ac;
  const clave = ac.fotos[0]; if (!clave) return null;
  const resto = ac.fotos.slice(1).length ? ac.fotos.slice(1) : [clave], n = resto.length, W = 400, H = 640;
  const gl = golpeL(ac), lead = leads(ac)[0], paso = n <= 3 ? 19 : 15;
  const sube = salta(fr, G - 7, {damping: 14, stiffness: 120, mass: 0.8}), hit = salta(fr, G, {damping: 10, stiffness: 260, mass: 0.55});
  const dolly = 1 + 0.05 * Math.sin((fr - a) / 40) + va(fr, a, Math.max(ent * 2, 20), -0.1, 0) + sube * 0.03;
  const giro = interpolate(fr, [G - 7, G + 7], [180, 0], {...clamp, easing: curva.suave});
  const orden = resto.map((f, i) => ({f, i, u: i - (n - 1) / 2})).sort((x, y) => Math.abs(y.u) - Math.abs(x.u));
  return (<Escena ac={ac} look={look} foto={clave} o={0.4} luz={1 + hit * 0.8}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${dolly})`, transformOrigin: '50% 100%'}}>
      {orden.map(({f, i, u}) => {
        const ab = salta(fr, a + 2 + Math.abs(u) * 3, {damping: 12, stiffness: 100, mass: 0.8}), abre = mix(0.16, 1, ab) + sube * 0.26, ang = u * paso * abre, sal = salta(fr, a + Math.abs(u) * 2, {damping: 16, stiffness: 120});
        return (<div key={i} style={{position: 'absolute', left: 960 - W / 2, top: 300 + (1 - sal) * 560, width: W, height: H, zIndex: 30 - Math.round(Math.abs(u) * 4), transformOrigin: '50% 1240px', transform: `perspective(1700px) rotateX(${7 - 3 * sube}deg) rotateZ(${ang}deg) translateY(${Math.abs(u) * 26 * abre}px)`, boxShadow: '0 26px 40px rgba(0,0,0,.55)', borderRadius: 20, opacity: cl(sal * 2)}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(255,255,255,.26)', background: '#000'}}>
            <Encuadre id={f.id} foco={f.foco} filtro="contrast(1.05)" />
            <div style={{position: 'absolute', inset: 0, background: `rgba(4,4,10,${0.12 + 0.56 * sube})`}} />
            <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,.22), transparent 36%)'}} />
          </div>
        </div>);
      })}
    </div>
    <div style={{position: 'absolute', left: 960 - 620, top: 560 - 620, width: 1240, height: 1240, zIndex: 40, background: `radial-gradient(closest-side, ${rgba(look.acento, 0.5 * cl(hit))}, ${rgba(look.acento, 0.14 * cl(hit))} 55%, transparent)`}} />
    <div style={{position: 'absolute', left: 960 - W / 2, top: 300, width: W, height: H, zIndex: 50, transform: `perspective(1500px) translate3d(0px,${mix(26, -38, sube) + 8 * Math.sin((fr - a) / 26)}px,${sube * 300 + hit * 34}px) rotateY(${giro > 90 ? giro - 180 : giro}deg) rotateZ(${(1 - sube) * -1.5}deg)`, opacity: va(fr, a, Math.max(4, ent), 0, 1), boxShadow: `0 40px 70px rgba(0,0,0,.65), 0 0 ${60 * cl(hit)}px ${rgba(look.acento, 0.65)}`, borderRadius: 20}}>
      {giro > 90 ? <Dorso look={look} /> : <div style={{position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', background: '#000', border: `4px solid ${look.acento}`}}>
        <Encuadre id={clave.id} foco={clave.foco} filtro="contrast(1.07) brightness(1.06)" />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,.24), transparent 36%)'}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.66))'}} />
      </div>}
    </div>
    <div style={{position: 'absolute', left: 960 - 760, top: 800, width: 1520, zIndex: 60, textShadow: SOMBRA_N, transform: `scale(${0.8 + 0.2 * hit})`, transformOrigin: '50% 50%'}}><Dicho l={gl} tam={gl ? cabe(txtDe(gl), 1480, look, 190, 1) : 0} ancho={1520} look={look} color={look.claro} /></div>
    <div style={{position: 'absolute', left: 960 - 840, top: 62, width: 1680, zIndex: 60, textShadow: SOMBRA_N}}><Dicho l={lead} tam={cabe(txtDe(lead), 1640, look, 70, 1, 44, look.texto)} ancho={1680} look={look} /></div>
  </Escena>);
};

/* ───────────── CELULAR: teléfono 3D con foto; la notificación baja y estalla fuera del vidrio ───────────── */
const Celular: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, ent} = tiempos(ac), {a} = ac, f = ac.fotos[0]; if (!f) return null;
  const W = 440, H = 930, gl = golpeL(ac), lead = leads(ac)[0];
  const e = salta(fr, a, {damping: 15, stiffness: 80, mass: 1});
  const hit = salta(fr, G, {damping: 12, stiffness: 150, mass: 0.75}), tiembla = fr >= G ? Math.exp(-(fr - G) * 0.2) * Math.sin((fr - G) * 2.3) : 0;
  const ry = -17 + (1 - e) * 44 + 3.2 * Math.sin((fr - a) / 38) - tiembla * 3, rx = 5 + 1.6 * Math.sin((fr - a) / 47), rz = 3.5 + (1 - e) * 10 + tiembla * 2.6;
  const X = 1350 + (1 - e) * 260 + tiembla * 14, Y = 540 + (1 - e) * 860 + 7 * Math.sin((fr - a) / 31);
  const cae = va(fr, G - 7, 7, 0, 1, curva.ios);
  const tr = (z: number) => `perspective(2000px) translate3d(${X - 960}px,${Y - 540}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`;
  const pala = gl ? cabe(txtDe(gl), 860, look, 190, 2) : 0, acx = mix(1330, 700, hit), acy = mix(205, 640, hit), acS = mix(0.34, 1, hit);
  return (<Escena ac={ac} look={look} foto={f} o={0.44} luz={1.1}>
    {[0, 1, 2].map((k) => { const p = fr >= G ? ((fr - G - k * 7) / 34) : -1; if (p <= 0 || p >= 1) return null; const R = 300 + p * 760; return <div key={k} style={{position: 'absolute', left: 1350 - R, top: 540 - R, width: R * 2, height: R * 2, borderRadius: '50%', border: `${6 * (1 - p) + 1}px solid ${rgba(look.acento, 0.85 * (1 - p))}`}} />; })}
    <div style={{position: 'absolute', left: 1350 - 560, top: 540 - 560, width: 1120, height: 1120, background: `radial-gradient(closest-side, ${rgba(look.acento, 0.2 + 0.42 * cl(hit))}, transparent)`}} />
    {Array.from({length: 7}).map((_, i) => <div key={i} style={{position: 'absolute', left: 960 - W / 2, top: 540 - H / 2, width: W, height: H, borderRadius: 66, background: i === 6 ? '#0a0a0e' : `linear-gradient(135deg,#9aa2ad,#2b2e35 40%,#747b86 80%)`, transform: tr(-(6 - i + 1) * 4), opacity: cl(e * 3)}} />)}
    <div style={{position: 'absolute', left: 960 - W / 2, top: 540 - H / 2, width: W, height: H, borderRadius: 66, transform: tr(0), background: 'linear-gradient(135deg,#d8dde4,#3a3e46 26%,#e8ebef 52%,#2c2f35 74%,#aab0b9)', boxShadow: `0 50px 80px rgba(0,0,0,.6)`, opacity: cl(e * 3)}}>
      <div style={{position: 'absolute', inset: 13, borderRadius: 54, overflow: 'hidden', background: '#000'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1.04 + (fr - a) * 0.0009})`}}><Encuadre id={f.id} foco={f.foco} filtro="contrast(1.05) brightness(1.03)" /></div>
        <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.5 * cl(hit)})`}} />
        {fr < G + 2 && <div style={{position: 'absolute', left: 16, right: 16, top: -130 + cae * 190, height: 104, borderRadius: 30, background: 'rgba(34,35,42,.94)', display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', boxSizing: 'border-box'}}>
          <div style={{width: 62, height: 62, borderRadius: 18, background: look.acento}} /><div style={{flex: 1}}><div style={{height: 14, width: '86%', borderRadius: 7, background: 'rgba(255,255,255,.85)', marginBottom: 12}} /><div style={{height: 11, width: '55%', borderRadius: 6, background: 'rgba(255,255,255,.4)'}} /></div></div>}
        <div style={{position: 'absolute', left: '50%', top: 14, width: 118, height: 32, marginLeft: -59, borderRadius: 18, background: '#000'}} />
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${122 + ry}deg, rgba(255,255,255,.2) 0%, rgba(255,255,255,.04) 30%, transparent 46%)`}} />
      </div>
    </div>
    {gl && fr >= G && [4, 3, 2, 1].map((k) => { const p = salta(fr, G + k * 2, {damping: 12, stiffness: 130, mass: 0.7}), sg = k % 2 ? 1 : -1; return <div key={k} style={{position: 'absolute', left: 700 - 560, top: 640 - 130, width: 1120, height: 260, borderRadius: 54, background: `linear-gradient(180deg, ${rgba(look.acento, 0.95 - k * 0.14)}, ${rgba(look.acento, 0.62 - k * 0.1)})`, opacity: cl(p * 5), transform: `translate(${p * sg * k * 34 + (1 - cl(p)) * 630}px,${p * k * 66 - (1 - cl(p)) * 435}px) rotate(${p * sg * k * 2.1 - 2}deg) scale(${(0.34 + 0.66 * p) * (1 - k * 0.03)})`, boxShadow: '0 20px 40px rgba(0,0,0,.45)'}} />; })}
    {gl && fr >= G && <div style={{position: 'absolute', left: acx - 560, top: acy - 130, width: 1120, height: 260, borderRadius: 54, background: 'rgba(22,23,30,.98)', border: `3px solid ${rgba(look.acento, 0.9)}`, boxShadow: `0 40px 70px rgba(0,0,0,.65), 0 0 60px ${rgba(look.acento, 0.5)}`, transform: `perspective(1600px) rotateY(${(1 - hit) * -30 + 7}deg) rotateZ(-2deg) scale(${acS})`, display: 'flex', alignItems: 'center', gap: 34, padding: '0 38px', boxSizing: 'border-box'}}>
      <div style={{width: 150, height: 150, flexShrink: 0, borderRadius: 40, background: `linear-gradient(145deg, ${look.acento}, ${rgba(look.acento, 0.55)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${Math.sin((fr - G) * 0.9) * 16 * Math.exp(-(fr - G) * 0.09)}deg)`}}>
        <svg width="96" height="96" viewBox="0 0 24 24"><path d="M12 2.5a1.6 1.6 0 0 0-1.6 1.6v.6A6.6 6.6 0 0 0 5.4 11v4.2L3.6 18v1h16.8v-1l-1.8-2.8V11a6.6 6.6 0 0 0-5-6.3v-.6A1.6 1.6 0 0 0 12 2.5zM9.7 20.2a2.4 2.4 0 0 0 4.6 0z" fill={sobre(look.acento, look)} /></svg>
      </div>
      <Dicho l={gl} tam={pala} ancho={880} look={look} color={look.claro} alin="left" interlinea={0.98} />
    </div>}
    <div style={{position: 'absolute', left: 110, bottom: 1080 - 500, width: 1010, textShadow: SOMBRA_N}}><Dicho l={lead} tam={lead ? cabe(txtDe(lead), 1000, look, 94, 3, 44, look.texto) : 0} ancho={1010} look={look} alin="left" interlinea={1.04} /></div>
  </Escena>);
};

/* ───────────── ODÓMETRO: tambores mecánicos que ruedan y clavan en el golpe ───────────── */
const CIFRAS = '0123456789', LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const Tambor: React.FC<{c: string; idx: number; n: number; w: number; h: number; fuente: string; G: number; a: number; look: any; ult: boolean}> = ({c, idx, n, w, h, fuente, G, a, look, ult}) => {
  const fr = useCurrentFrame(), dig = CIFRAS.includes(c), alfa = dig ? CIFRAS : LETRAS, pos = alfa.indexOf(c.toUpperCase());
  const colorF = ult ? look.acento : '#EFE9DC', colorT = ult ? sobre(look.acento, look) : '#17161B';
  if (pos < 0) return <div style={{width: w * 0.55, height: h, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: fuente, fontSize: h * 0.72, lineHeight: 1, color: '#EFE9DC', paddingBottom: h * 0.1, boxSizing: 'border-box'}}>{c}</div>;
  const fin = Math.max(a + 3, G - (n - 1 - idx) * 3), ini = Math.max(a, Math.min(fin - 3, G - 62)), M = 8 + (n - idx) * 2 + Math.round(random('r' + idx) * 3);
  const avance = interpolate(fr, [ini, fin], [0, M], {...clamp, easing: Easing.bezier(0.45, 0.05, 0.25, 1)});
  const reb = fr >= fin ? Math.exp(-(fr - fin) * 0.32) * Math.sin((fr - fin) * 1.5) * 0.16 : 0, p = avance + reb, base = Math.floor(p);
  const celda = (k: number) => { const ch = ((pos - M + k) % alfa.length + alfa.length * 8) % alfa.length; return alfa[ch]; };
  return (<div style={{position: 'relative', width: w, height: h, overflow: 'hidden', borderRadius: 8, background: colorF, boxShadow: 'inset 0 0 0 2px rgba(0,0,0,.35)'}}>
    {[-1, 0, 1, 2].map((d) => <div key={d} style={{position: 'absolute', left: 0, width: w, height: h, top: (base + d - p) * h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fuente, fontSize: h * 0.8, lineHeight: 1, color: colorT}}>{celda(base + d)}</div>)}
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.12) 24%, rgba(255,255,255,.14) 48%, rgba(0,0,0,.12) 74%, rgba(0,0,0,.76) 100%)'}} />
  </div>);
};
const Odometro: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, ent, sal} = tiempos(ac), {a} = ac, f = ac.fotos[0];
  const crudo = String(ac.datos?.cifra || txtDe(golpeL(ac)) || '0').trim().toUpperCase().slice(0, 12), cs = crudo.split(''), n = cs.length;
  const anchos = cs.reduce((u, c) => u + (/[0-9A-ZÁÉÍÓÚÑ]/.test(c) ? 1 : 0.55), 0), cw = Math.min(248, 1500 / anchos), ch = Math.round(cw * 1.44);
  const HW = Math.max(980, anchos * (cw + 10) + 130), plato = 196, HH = ch + 90 + plato;
  const e = salta(fr, a, {damping: 15, stiffness: 85, mass: 1}), hit = salta(fr, G, {damping: 9, stiffness: 320, mass: 0.5}), golpea = fr >= G ? Math.exp(-(fr - G) * 0.26) * Math.sin((fr - G) * 1.9) : 0;
  const quita = (t: string) => t.toUpperCase().replace(/[^\w$%]/g, '') === crudo.replace(/[^\w$%]/g, '');
  const texto: Linea[] = ac.lineas.map((l) => ({...l, w: l.w.filter((x) => !quita(x[0]) && !crudo.includes(x[0].replace(/[^\d]/g, '') || '§'))})).filter((l) => l.w.length);
  const gl = texto.find((l) => l.rol === 'golpe'), ld = texto.find((l) => l.rol !== 'golpe'), barre = va(fr, G, 16, -20, 120, curva.suave), fuente = fam(look.display === 'Syne' || look.display === 'Playfair' ? 'SpaceGrotesk' : look.display);
  return (<div style={raiz}><div style={{position: 'absolute', inset: 0, background: look.fondo, ...salida(fr, ac, sal)}}>
    {f && <div style={{position: 'absolute', inset: 0, transform: `scale(${1.08 + (fr - a) * 0.0009 + golpea * 0.01})`, transformOrigin: '50% 40%'}}><Encuadre id={f.id} foco={f.foco} filtro="brightness(.56) saturate(.9) contrast(1.05)" /></div>}
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(70% 60% at 50% 46%, ${rgba(look.fondo || '#000000', 0.42)}, ${rgba(look.fondo || '#000000', 0.82)})`}} />
    <div style={{position: 'absolute', left: 960 - 900, top: 540 - 520, width: 1800, height: 1040, background: `radial-gradient(closest-side, ${rgba(look.acento, 0.5 * cl(hit))}, transparent)`}} />
    <div style={{position: 'absolute', left: 960 - HW / 2, top: 505 - HH / 2 + (1 - e) * 760 + golpea * 16, width: HW, height: HH, transform: `perspective(1700px) rotateY(${-8 + 3 * Math.sin((fr - a) / 44)}deg) rotateX(${8 + (1 - e) * -20 + 1.4 * Math.sin((fr - a) / 58)}deg) scale(${1 + 0.018 * cl(hit)})`}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 26, background: 'linear-gradient(180deg,#494d56 0%,#23252b 42%,#31343b 100%)', boxShadow: `0 16px 0 #111216, 0 70px 90px rgba(0,0,0,.7), 0 0 0 2px rgba(255,255,255,.18) inset`}} />
      {[[24, 24], [HW - 46, 24], [24, HH - 46], [HW - 46, HH - 46]].map(([l, t], i) => <div key={i} style={{position: 'absolute', left: l, top: t, width: 22, height: 22, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#d2d6dd,#555a64 70%)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.5)'}} />)}
      <div style={{position: 'absolute', left: 60, right: 60, top: 42, height: ch + 22, borderRadius: 12, background: '#07070a', boxShadow: 'inset 0 6px 16px rgba(0,0,0,.9), 0 2px 0 rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}>
        {cs.map((c, i) => <Tambor key={i} c={c} idx={i} n={n} w={cw} h={ch} fuente={fuente} G={G} a={a} look={look} ult={i === n - 1 && n > 1 && /\d/.test(c)} />)}
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: 42, height: ch + 22, borderRadius: 12, overflow: 'hidden', pointerEvents: 'none'}}>
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,.16), transparent 30%)'}} />
        {fr >= G && fr < G + 18 && <div style={{position: 'absolute', top: 0, bottom: 0, left: `${barre}%`, width: '16%', background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.75), transparent)'}} />}
      </div>
      <div style={{position: 'absolute', left: 60, right: 60, top: ch + 66, height: plato + 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textShadow: '0 2px 0 rgba(0,0,0,.6)'}}>
        <Dicho l={ld} tam={ld ? cabe(txtDe(ld), HW - 160, look, 66, 1, 44, look.texto) : 0} ancho={HW - 150} look={look} />
        <Dicho l={gl} tam={gl ? cabe(txtDe(gl), HW - 170, look, ld ? 104 : 140, 1) : 0} ancho={HW - 150} look={look} desde={G} />
      </div>
    </div>
    <Polvo n={8} color={look.claro || '#fff'} semilla={'odo' + a} />
  </div></div>);
};

/* ───────────── SEGURIDAD: muro de monitores; la cámara se mete en uno y la retícula clava al sujeto ───────────── */
const Seguridad: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, ent} = tiempos(ac), {a} = ac, f = ac.fotos[0]; if (!f) return null;
  const L = ac.fotos[1] || f, R = ac.fotos[2] || L, W = 1180, H = 664, gl = golpeL(ac), lead = leads(ac)[0];
  const dentro = salta(fr, G - 3, {damping: 16, stiffness: 150, mass: 0.8}), esc = mix(1, 1.63, dentro), cx = cl(f.foco?.[0] ?? 0.5, 0.26, 0.74), cy = cl(f.foco?.[1] ?? 0.5, 0.3, 0.68);
  const z1 = fr >= G ? 1.32 : 1, z2 = fr >= G + 7 ? 1.62 : 1, zoom = z1 * (z2 > 1 ? 1.22 : 1) + (fr - a) * 0.0007, ret = salta(fr, G, {damping: 13, stiffness: 220, mass: 0.6}), lado = mix(430, 214, ret);
  const FILTRO = 'grayscale(.88) contrast(1.22) brightness(.92) sepia(.12)', seg = Math.floor((fr - a) / 30), rec = Math.floor((fr - a) / 13) % 2 === 0 || fr >= G;
  const pantalla = (ft: any, enc: number, i: number, principal: boolean) => { const on = va(fr, a + enc, 6, 0.01, 1, curva.ios); return (<div style={{position: 'absolute', inset: 22, borderRadius: 26, overflow: 'hidden', background: '#02040a'}}>
    <div style={{position: 'absolute', inset: 0, transform: `scaleY(${on})`, opacity: va(fr, a + enc, 3, 0.2, 1)}}>
      <div style={{position: 'absolute', inset: 0, transform: principal ? `scale(${zoom})` : `scale(${1.04 + (fr - a) * 0.0006})`, transformOrigin: `${cx * 100}% ${cy * 100}%`}}><Encuadre id={ft.id} foco={ft.foco} filtro={principal ? FILTRO : FILTRO + ' brightness(.75)'} /></div>
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,.26) 0 2px, transparent 2px 5px)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: `${(((fr - a) * 1.7 + i * 37) % 130) - 20}%`, height: 44, background: 'linear-gradient(180deg, transparent, rgba(255,255,255,.09), transparent)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,.7))'}} />
    </div></div>); };
  const Caja = (x: number, ry: number, z: number, ft: any, enc: number, i: number, principal: boolean) => (<div style={{position: 'absolute', left: 960 - W / 2, top: 470 - H / 2, width: W, height: H, transform: `perspective(2000px) translate3d(${x}px,0,${z}px) rotateY(${ry}deg)`, opacity: va(fr, a + enc - 3, 4)}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 34, background: 'linear-gradient(160deg,#30333a,#141519 60%,#25272d)', boxShadow: '0 40px 70px rgba(0,0,0,.65), 0 0 0 2px rgba(255,255,255,.1) inset'}} />
    {pantalla(ft, enc, i, principal)}
    {principal && <div style={{position: 'absolute', inset: 22, borderRadius: 26, overflow: 'hidden'}}>
      <div style={{position: 'absolute', right: 34, top: 24, display: 'flex', alignItems: 'center', gap: 12, fontFamily: fam(look.mono || 'JetBrainsMono'), fontWeight: 700, fontSize: 40, color: '#fff', textShadow: SOMBRA_N}}><div style={{width: 26, height: 26, borderRadius: '50%', background: rec ? '#ff2b2b' : 'rgba(255,43,43,.25)', boxShadow: rec ? '0 0 20px #ff2b2b' : undefined}} />REC</div>
      <div style={{position: 'absolute', right: 34, bottom: 22, fontFamily: fam(look.mono || 'JetBrainsMono'), fontWeight: 700, fontSize: 40, color: 'rgba(255,255,255,.9)', textShadow: SOMBRA_N}}>{`00:00:${String(seg).padStart(2, '0')}`}</div>
      {fr >= G - 1 && <><div style={{position: 'absolute', inset: 0, border: `10px solid ${rgba(look.acento, 0.5 + 0.5 * Math.abs(Math.sin((fr - G) / 5)))}`, borderRadius: 26}} />
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], k) => <div key={k} style={{position: 'absolute', left: cx * (W - 44) + sx * lado * 0.62 - 42, top: cy * (H - 44) + sy * lado * 0.62 - 42, width: 84, height: 84, boxSizing: 'border-box', borderLeft: sx < 0 ? `9px solid ${look.acento}` : undefined, borderRight: sx > 0 ? `9px solid ${look.acento}` : undefined, borderTop: sy < 0 ? `9px solid ${look.acento}` : undefined, borderBottom: sy > 0 ? `9px solid ${look.acento}` : undefined, opacity: cl(ret * 2)}} />)}
      </>}
    </div>}
  </div>);
  const gt = gl ? cabe(txtDe(gl), 620, look, 96, 1, 34) : 0, est = gl ? Math.min(760, txtDe(gl).length * gt * anchoLetra(look.display) + 10) : 0, tagX = cl(cx * (W - 44) + 22, est / 2 + 34, W - est / 2 - 34), tagY = cy * (H - 44) + 22 + lado * 0.62 + 62;
  return (<Escena ac={ac} look={look} foto={f} o={0.26} luz={0.8} polvo={6}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${esc}) translateY(${dentro * 70 / esc}px)`, transformOrigin: '50% 43.5%'}}>
      {Caja(-1160, 34, -320, L, 7, 1, false)}{Caja(1160, -34, -320, R, 10, 2, false)}{Caja(0, 2.5 * Math.sin((fr - a) / 30) * (1 - dentro), 0, f, 2, 0, true)}
      {gl && fr >= G && <div style={{position: 'absolute', left: 960 - W / 2 + tagX, top: 470 - H / 2 + clampTag(tagY, H, gt), transform: `translateX(-50%) scale(${0.6 + 0.4 * ret})`, background: look.acento, padding: '10px 22px', borderRadius: 8, whiteSpace: 'nowrap', boxShadow: '0 12px 30px rgba(0,0,0,.55)'}}>
        <Palabras palabras={gl.w.map(([t, fq]) => [fuerteUp(t.replace(/[.,;:]+$/, ''), mayusDe(look)), Math.max(fq, G)] as [string, number])} tam={gt} fuente={fam(look.display)} peso={pesoDe(look.display)} color={sobre(look.acento, look)} ancho={est + 30} alin="center" interlinea={1.1} /></div>}
    </div>
    {lead && <div style={{position: 'absolute', left: 960 - 800, bottom: 56, width: 1600, opacity: 1 - va(fr, G + 4, 8), textShadow: SOMBRA_N}}><Dicho l={lead} tam={cabe(txtDe(lead), 1560, look, 74, 1, 44, look.texto)} ancho={1600} look={look} /></div>}
  </Escena>);
};
const clampTag = (y: number, H: number, t: number) => cl(y, 30, H - t * 1.6 - 30);

/* ───────────── VERSUS: dos monolitos de neón enfrentados; en el golpe uno se apaga ───────────── */
const Versus: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G} = tiempos(ac), {a} = ac, A = ac.fotos[0], B = ac.fotos[1] || ac.fotos[0]; if (!A) return null;
  const ganaB = ac.var !== 'a', ls = leads(ac), gl = golpeL(ac), W = 600, H = 740;
  const chispa = fr < G + 2;
  const parpadeo = fr < G ? 1 : fr > G + 9 ? 0 : [1, 0.15, 0.8, 0.05, 0.5, 0, 0.3, 0, 0.1, 0][fr - G];
  const cae = salta(fr, G + 2, {damping: 13, stiffness: 55, mass: 1.1}), sube = salta(fr, G, {damping: 11, stiffness: 170, mass: 0.7});
  const Mono = (i: number) => { const ft = i ? B : A, gana = (i === 1) === ganaB, lado = i ? 1 : -1, c = i ? (look.acento2 || look.acento) : look.acento, cC = gana ? look.acento : c, l = ls[i];
    const ini = l ? Math.max(a, l.w[0][1] - 4) : a + i * 5, e = salta(fr, ini, {damping: 13, stiffness: 95, mass: 0.9}), on = gana ? 1 : parpadeo, gris = gana ? 0 : 1 - parpadeo;
    const x = lado * (472 + (1 - e) * 1100) + (gana ? -lado * sube * 170 : lado * cae * 60), z = gana ? sube * 200 : -cae * 340, ry = -lado * mix(26, gana ? 12 : 34, gana ? sube : cae), y = gana ? -sube * 8 : cae * 46, rz = gana ? 0 : lado * cae * 3.5;
    const cara = (<div style={{position: 'absolute', inset: 0, borderRadius: 10, overflow: 'hidden', background: '#000'}}>
      <Encuadre id={ft.id} foco={ft.foco} filtro="contrast(1.06)" />
      <div style={{position: 'absolute', inset: 0, opacity: gris}}><Encuadre id={ft.id} foco={ft.foco} filtro="grayscale(1) brightness(.34) contrast(.9)" /></div>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,.16), transparent 32%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '36%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.76))'}} />
    </div>);
    return (<div key={i} style={{position: 'absolute', left: 960 - W / 2, top: 64, width: W, height: H, zIndex: gana ? 20 : 10, transform: `perspective(1700px) translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateZ(${rz}deg)`}}>
      <Reflejo w={W} h={H} alto={170} o={gana ? 0.4 : 0.14}>{cara}</Reflejo>
      {on > 0.02 && <div style={{position: 'absolute', left: -60, top: -60, right: -60, bottom: -60, opacity: on, background: `radial-gradient(closest-side, ${rgba(cC, gana && fr >= G ? 0.62 : 0.3)}, transparent)`}} />}
      <div style={{position: 'absolute', inset: 0, borderRadius: 10, boxShadow: `0 36px 60px rgba(0,0,0,.65), 0 0 0 7px ${on > 0.02 ? rgba(cC, on) : 'rgba(70,72,80,.7)'}, 0 0 44px ${rgba(cC, 0.75 * on)}`}}>{cara}</div>
      {l && <div style={{position: 'absolute', left: 18, right: 18, bottom: 22, textShadow: SOMBRA_N, opacity: gana ? 1 : mix(1, 0.5, cl(cae))}}><Dicho l={l} tam={cabe(txtDe(l), 556, look, 84, 2, 44, look.texto)} ancho={564} look={look} color={look.claro} interlinea={1.02} /></div>}
    </div>); };
  const rayo = (s: string, amp: number) => Array.from({length: 11}).map((_, i) => `${i * 44},${Math.round((random(`${s}${Math.floor(fr / 2)}-${i}`) - 0.5) * (i === 0 || i === 10 ? 0 : amp)) + 170}`).join(' ');
  const pts = rayo('v', 300), pts2 = rayo('w', 190);
  const onda = fr >= G ? cl((fr - G) / 22) : 0;
  return (<Escena ac={ac} look={look} foto={ganaB ? B : A} o={0.36} luz={1}>
    {Mono(ganaB ? 0 : 1)}{Mono(ganaB ? 1 : 0)}
    {chispa && <svg width="440" height="340" viewBox="0 0 440 340" style={{position: 'absolute', left: 740, top: 270, zIndex: 30, overflow: 'visible', opacity: va(fr, a + 8, 6)}}>
      <polyline points={pts} fill="none" stroke={rgba(look.acento, 0.3)} strokeWidth="26" strokeLinejoin="round" /><polyline points={pts2} fill="none" stroke={rgba(look.acento2 || look.acento, 0.9)} strokeWidth="5" strokeLinejoin="round" /><polyline points={pts} fill="none" stroke={look.claro} strokeWidth="6" strokeLinejoin="round" /></svg>}
    {onda > 0 && onda < 1 && <div style={{position: 'absolute', left: 960 - 760 * onda, top: 440 - 760 * onda, width: 1520 * onda, height: 1520 * onda, borderRadius: '50%', zIndex: 15, border: `${10 * (1 - onda)}px solid ${rgba(look.acento, 1 - onda)}`}} />}
    {gl && <div style={{position: 'absolute', left: 960 - 800, top: 868, width: 1600, zIndex: 40, textShadow: SOMBRA_N, transform: `scale(${0.8 + 0.2 * sube})`}}><Dicho l={gl} tam={cabe(txtDe(gl), 1560, look, 170, 1)} ancho={1600} look={look} color={look.acento} /></div>}
  </Escena>);
};

/* ───────────── FRASE: palabra por palabra sobre foto que se apaga; un trazo de marcador cruza el golpe ───────────── */
// El trazo y las dos copias del texto viven en la misma caja: el corte en % coincide siempre, sea cual sea la fuente.
const TRAZO = 'M0,12 C120,3 260,16 420,7 S760,1 1000,10 L1000,92 C820,99 640,86 460,95 S140,88 0,97 Z';
const FilaTrazo: React.FC<{pal: [string, number][]; gt: number; look: any; color: string; tinta: string; rot: number}> = ({pal, gt, look, color, tinta, rot}) => {
  const fr = useCurrentFrame(); if (!pal.length) return null;
  const total = pal.reduce((n, [t]) => n + t.length + 1, 0), p = cl(pal.reduce((n, [t, q]) => n + ((t.length + 1) / total) * interpolate(fr, [q, q + cl(t.length * 1.3, 5, 11)], [0, 1], {...clamp, easing: curva.suave}), 0)), pc = p * 100;
  const caja: React.CSSProperties = {fontFamily: fam(look.display), fontWeight: pesoDe(look.display), fontSize: gt, lineHeight: 1.18, padding: '0.03em 0.2em 0.09em', whiteSpace: 'nowrap', letterSpacing: '0.005em'};
  const texto = (c: string, sombra?: string) => pal.map(([t, q], i) => { const s = cl(salta(fr, q, {damping: 10, stiffness: 280, mass: 0.5}), 0, 1.1); return <span key={i} style={{display: 'inline-block', marginRight: i < pal.length - 1 ? gt * 0.24 : 0, visibility: fr < q ? 'hidden' : 'visible', color: c, textShadow: sombra, transform: `scale(${mix(1.34, 1, s)})`}}>{t}</span>; });
  return (<div style={{position: 'relative', display: 'inline-block', transform: `rotate(${rot}deg)`}}>
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'hidden', clipPath: `inset(0 ${100 - pc}% 0 0)`}}><path d={TRAZO} fill={look.acento} /></svg>
    <div style={{...caja, position: 'relative', clipPath: `inset(-20% -20% -20% ${pc}%)`}}>{texto(color, SOMBRA_N)}</div>
    <div style={{...caja, position: 'absolute', left: 0, top: 0, clipPath: `inset(-20% ${100 - pc}% -20% -20%)`}}>{texto(tinta)}</div>
  </div>);
};
const Frase: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, sal} = tiempos(ac), {a} = ac, f = ac.fotos[0]; if (!f) return null;
  const gl = golpeL(ac), ls = leads(ac), todas = ac.lineas.flatMap((l) => l.w), n = Math.max(1, todas.length), dichas = todas.filter((x) => x[1] <= fr).length, F0 = look.fondo || '#000000';
  const hit = salta(fr, G, {damping: 9, stiffness: 300, mass: 0.5}), ch = cl(hit), sac = fr >= G ? Math.exp(-(fr - G) * 0.22) * Math.sin((fr - G) * 2.1) : 0, apaga = cl(0.22 + (dichas / n) * 0.42 + 0.14 * ch, 0, 0.8);
  const gtxt = txtDe(gl), dos = gtxt.length > 13 && !!gl && gl.w.length > 1, gt = gl ? cabe(gtxt, 1540, look, 250, dos ? 2 : 1) : 0, lt = ls.length ? cabe(ls.map(txtDe).join(' '), 1500, look, 96, 2, 44, look.texto) : 0;
  const up = mayusDe(look), corte = gl ? Math.ceil(gl.w.length / 2) : 0, palG = gl ? gl.w.map(([t, q]) => [fuerteUp(t.replace(/[.,;:]+$/, ''), up), Math.max(q, G)] as [string, number]) : [], filas = dos ? [palG.slice(0, corte), palG.slice(corte)] : [palG];
  return (<div style={raiz}><div style={{position: 'absolute', inset: 0, background: look.fondo, ...salida(fr, ac, sal)}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${1.1 + (fr - a) * 0.0011 + 0.05 * ch + sac * 0.014}) translateX(${Math.sin((fr - a) / 40) * 14}px)`, transformOrigin: `${(f.foco?.[0] ?? 0.5) * 100}% ${(f.foco?.[1] ?? 0.5) * 100}%`}}><Encuadre id={f.id} foco={f.foco} filtro="contrast(1.06) saturate(.92)" /></div>
    <div style={{position: 'absolute', inset: 0, background: rgba(F0, apaga)}} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(72% 64% at 50% 50%, ${rgba(F0, 0.42)}, transparent 100%)`}} />
    <div style={{position: 'absolute', left: 120, right: 120, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, transform: `perspective(1800px) rotateY(${2 * Math.sin((fr - a) / 44)}deg) rotateX(${0.9 * Math.sin((fr - a) / 57)}deg)`}}>
      {ls.map((l, i) => <div key={i} style={{textShadow: SOMBRA_N, opacity: mix(1, 0.78, ch), transform: `scale(${mix(1, 0.88, ch)})`}}><Dicho l={l} tam={lt} ancho={1640} look={look} alin="center" interlinea={1.06} /></div>)}
      {filas.map((pal, r) => <div key={r} style={{transform: `scale(${0.84 + 0.16 * hit})`}}><FilaTrazo pal={pal} gt={gt} look={look} color={look.claro || '#fff'} tinta={sobre(look.acento, look)} rot={r % 2 ? 1 : -1.3} /></div>)}
    </div>
  </div></div>);
};

/* ───────────── PISO: la foto se recuesta y se vuelve suelo; la palabra se levanta sobre ella como un monolito ───────────── */
const Piso: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, sal} = tiempos(ac), {a} = ac, f = ac.fotos[0]; if (!f) return null;
  const gl = golpeL(ac), lead = leads(ac)[0], t = cl(salta(fr, G - 8, {damping: 15, stiffness: 95, mass: 0.9}), 0, 1.04), alza = salta(fr, G, {damping: 11, stiffness: 150, mass: 0.75}), ent = salta(fr, a, {damping: 18, stiffness: 70, mass: 1});
  const gtxt = txtDe(gl), dos = gtxt.length > 12 && gtxt.includes(' '), gt = gl ? cabe(gtxt, 1620, look, 400, dos ? 2 : 1) : 0, c = look.acento, up = mayusDe(look), F0 = look.fondo || '#000000';
  const capas = Array.from({length: 16}).map((_, i) => `${(i + 1) * 0.7}px ${(i + 1) * 1.1}px 0 ${c}`), cuerpo = capas.join(',') + ', 0 44px 60px rgba(0,0,0,.55)';
  const pal = gl ? gl.w.map(([w, q]) => [fuerteUp(w.replace(/[.,;:]+$/, ''), up), Math.max(q, G)] as [string, number]) : [], base = 700;
  const texto = (color: string, sombra?: string) => <Palabras palabras={pal} tam={gt} fuente={fam(look.display)} peso={pesoDe(look.display)} color={color} ancho={1720} alin="center" interlinea={0.96} tracking="0.005em" style={{textShadow: sombra}} />;
  const deriva = Math.sin((fr - a) / 36) * 12, rx = mix(mix(3, 12, ent), 70, t), s0 = 1.3, esc = mix(s0, 2.05, t);
  return (<div style={raiz}><div style={{position: 'absolute', inset: 0, background: look.fondo, ...salida(fr, ac, sal)}}>
    <FondoFoto id={f.id} blur={30} brillo={0.42} />
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(F0, 0.84)} 0%, ${rgba(F0, 0.4)} 58%, transparent 70%)`}} />
    <div style={{position: 'absolute', inset: 0, opacity: cl(t * 1.6), background: `conic-gradient(from 148deg at 50% -6%, transparent 0deg, ${rgba(look.claro || '#ffffff', 0.15)} 16deg, transparent 32deg, transparent 34deg, ${rgba(c, 0.18)} 48deg, transparent 64deg)`}} />
    <div style={{position: 'absolute', left: 960 - 1000, top: 230, width: 2000, height: 640, background: `radial-gradient(closest-side, ${rgba(c, 0.55 * cl(alza))}, transparent)`}} />
    <div style={{position: 'absolute', inset: 0, perspective: 1050, perspectiveOrigin: '960px 410px'}}>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', transformOrigin: '50% 100%', transform: `translateY(${t * 90}px) rotateX(${rx}deg) scale(${esc})`}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1.03 + (fr - a) * 0.0011}) translateX(${deriva}px)`, transformOrigin: `${(f.foco?.[0] ?? 0.5) * 100}% ${(f.foco?.[1] ?? 0.5) * 100}%`}}><Encuadre id={f.id} foco={f.foco} filtro="contrast(1.06) brightness(1.04)" /></div>
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${F0} 0%, ${F0} 26%, ${rgba(F0, 0.72)} 48%, ${rgba(F0, 0.18)} 78%, transparent 100%)`, opacity: cl(t)}} />
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${rgba(F0, 0.5)} 0%, transparent 34%)`, opacity: 1 - cl(t)}} />
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 560, background: `linear-gradient(180deg, transparent, ${rgba(F0, 0.74)})`, opacity: 1 - cl(t * 2)}} />
        {lead && <div style={{position: 'absolute', left: 960 - 600, bottom: 54, width: 1200, textShadow: '0 3px 14px rgba(0,0,0,.8)', opacity: 1 - cl(t * 1.3)}}><Dicho l={lead} tam={cabe(txtDe(lead), 1180, look, 104, 2, 44, look.texto)} ancho={1200} look={look} color={look.claro} interlinea={1.04} /></div>}
      </div>
    </div>
    {gl && fr >= G - 1 && <>
      <div style={{position: 'absolute', left: 100, bottom: 1080 - base, width: 1720, opacity: dos ? 0.2 : 0.3, WebkitMaskImage: 'linear-gradient(0deg,#000 25%,transparent 90%)', maskImage: 'linear-gradient(0deg,#000 25%,transparent 90%)', transform: `scaleY(${-0.62 * alza})`, transformOrigin: '50% 100%'} as React.CSSProperties}>{texto(c)}</div>
      <div style={{position: 'absolute', left: 100, bottom: 1080 - base, width: 1720, transform: `perspective(1400px) rotateY(${2.6 * Math.sin((fr - a) / 40)}deg) scaleY(${cl(alza, 0, 1.08)})`, transformOrigin: '50% 100%'}}>{texto(look.claro || '#fff', cuerpo)}</div>
    </>}
    <Polvo n={8} color={look.claro || '#fff'} semilla={'piso' + a} />
  </div></div>);
};

/* ───────────── LETRERO: letrero de neón colgado delante de la foto apagada; al encenderse ilumina la escena ───────────── */
const parpadeoNeon = (fr: number, f: number) => { const d = fr - f; if (d < 0) return 0; if (d > 8) return 0.94 + 0.06 * Math.sin(fr / 4.3); return [0.9, 0.08, 0.7, 0.1, 1, 0.35, 1, 0.75, 1][d]; };
const Tubo: React.FC<{w: [string, number][]; tam: number; look: any; color: string; fuente: string; desde?: number; ancho: number}> = ({w, tam, look, color, fuente, desde = -1, ancho}) => {
  const fr = useCurrentFrame();
  return <div style={{width: ancho, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: tam * 0.26, fontFamily: fuente, fontWeight: pesoDe(look.display), fontSize: tam, lineHeight: 1.04}}>
    {w.map(([t, f], i) => { const q = Math.max(f, desde), on = parpadeoNeon(fr, q); if (fr < q) return <span key={i} style={{visibility: 'hidden'}}>{t}</span>; const s = Math.max(3, tam * 0.045);
      return <span key={i} style={{display: 'inline-block', WebkitTextStroke: `${s}px ${on > 0.4 ? color : '#3b3d45'}`, paintOrder: 'stroke fill', color: on > 0.4 ? '#fffdf6' : '#23252c', textShadow: on > 0.4 ? `0 0 ${tam * 0.1}px ${rgba(color, on)}, 0 0 ${tam * 0.42}px ${rgba(color, 0.8 * on)}` : undefined}}>{t}</span>; })}
  </div>;
};
const Letrero: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, sal} = tiempos(ac), {a} = ac, f = ac.fotos[0]; if (!f) return null;
  const gl = golpeL(ac), lead = leads(ac)[0], up = mayusDe(look), gtxt = txtDe(gl), dos = gtxt.length > 11 && gtxt.includes(' '), gt = gl ? cabe(gtxt, 1500, look, dos ? 270 : 340, dos ? 2 : 1) : 0, lt = lead ? cabe(txtDe(lead), 1300, look, 92, 2, 44, look.texto) : 0;
  const palG: [string, number][] = gl ? gl.w.map(([t, q]) => [fuerteUp(t.replace(/[.,;:]+$/, ''), up), q]) : [], on = parpadeoNeon(fr, G), cae = salta(fr, G - 4, {damping: 9, stiffness: 240, mass: 0.6});
  const anchoG = gl ? Math.min(1560, (dos ? Math.ceil(gtxt.length * 0.6) : gtxt.length) * gt * anchoLetra(look.display)) : 900, Wp = Math.max(900, anchoG + 200), corteG = Math.ceil(palG.length / 2), filasP = dos ? [palG.slice(0, corteG), palG.slice(corteG)] : [palG], filasG = filasP.length, altoG = gl ? gt * 1.06 * filasG : 0, altoL = lead ? lt * 1.2 * (txtDe(lead).length * lt * anchoLetra(look.texto) > 1300 ? 2 : 1) : 0, cy = Math.max(490, 56 + altoL + 34 + altoG / 2), top = cy - altoG / 2, topL = top - altoL - 34, medioL = 540 - altoL / 2, yL = mix(medioL, topL, cl(cae, 0, 1));
  const kick = fr >= G ? Math.exp(-(fr - G) * 0.05) * Math.sin((fr - G) * 0.24) * 3 : 0, balanceo = kick + 0.5 * Math.sin((fr - a) / 26);
  const tr = `scale(${1.06 + (fr - a) * 0.0011}) translateX(${Math.sin((fr - a) / 44) * 11}px)`, or = `${(f.foco?.[0] ?? 0.5) * 100}% ${(f.foco?.[1] ?? 0.5) * 100}%`, mask = `radial-gradient(90% 100% at 50% ${(cy / 1080) * 100}%, #000 40%, rgba(0,0,0,.55) 75%, transparent 100%)`;
  const riel = (y: number) => <div style={{position: 'absolute', left: 960 - Wp / 2, top: y, width: Wp, height: 16, borderRadius: 8, background: 'linear-gradient(180deg,#6b6f79,#23252c 60%,#3c3f47)', boxShadow: '0 10px 18px rgba(0,0,0,.55)'}} />;
  return (<div style={raiz}><div style={{position: 'absolute', inset: 0, background: look.fondo, ...salida(fr, ac, sal)}}>
    <div style={{position: 'absolute', inset: 0, transform: tr, transformOrigin: or}}><Encuadre id={f.id} foco={f.foco} filtro="brightness(.5) saturate(.7) contrast(1.05)" /></div>
    <div style={{position: 'absolute', inset: 0, opacity: on, WebkitMaskImage: mask, maskImage: mask} as React.CSSProperties}><div style={{position: 'absolute', inset: 0, transform: tr, transformOrigin: or}}><Encuadre id={f.id} foco={f.foco} filtro="brightness(1.12) contrast(1.06) saturate(1.08)" /></div></div>
    <div style={{position: 'absolute', inset: 0, opacity: on, background: `radial-gradient(62% 70% at 50% ${(cy / 1080) * 100}%, ${rgba(look.acento, 0.34)}, transparent 100%)`}} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(70% 62% at 50% ${(cy / 1080) * 100}%, ${rgba(look.fondo || '#000000', 0.34)}, transparent 100%)`}} />
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `perspective(2100px) rotateY(${-5 + 2.4 * Math.sin((fr - a) / 48)}deg) rotateX(2deg) translateY(${(1 - cae) * -1180}px) rotateZ(${balanceo}deg)`, transformOrigin: '960px -120px', opacity: cae > 0.001 ? 1 : 0}}>
      {[-1, 1].map((s) => <div key={s} style={{position: 'absolute', left: 960 + s * (Wp / 2 - 110) - 3, top: -60, width: 6, height: top + 60 + altoG * 0.34, background: 'linear-gradient(180deg,#0f1014,#60646e)'}} />)}
      {gl && riel(top + altoG * 0.3)}{gl && riel(top + altoG * 0.68)}
      {gl && filasP.map((w, r) => <div key={r} style={{position: 'absolute', left: 960 - 830, top: top + r * gt * 1.06, width: 1660}}><Tubo w={w} tam={gt} look={look} color={look.acento} fuente={fam(look.display)} desde={G} ancho={1660} /></div>)}
    </div>
    {lead && <div style={{position: 'absolute', left: 960 - 680, top: yL, width: 1360, transform: `perspective(2100px) rotateY(${-3 + 2 * Math.sin((fr - a) / 48)}deg)`}}><Tubo w={lead.w} tam={lt} look={{...look, display: look.texto}} color={look.acento2 || look.acento} fuente={fam(look.texto)} ancho={1360} /></div>}
    <Polvo n={8} color={look.claro || '#fff'} semilla={'let' + a} />
  </div></div>);
};

/* ───────────── BUCLE: anillo de neón con fotos en órbita; en el golpe el ciclo se cierra y gira ───────────── */
const Bucle: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {G, ent} = tiempos(ac), {a} = ac, fotos = ac.fotos, N = fotos.length; if (!N) return null;
  const rx = 690, ry = 306, cy = 500, gl = golpeL(ac), lead = leads(ac)[0], hit = salta(fr, G, {damping: 11, stiffness: 180, mass: 0.65});
  const at = fotos.map((_, i) => Math.round(mix(a + ent * 0.4, Math.max(a + ent, G - 4), N > 1 ? i / (N - 1) : 0)));
  const vuelta = interpolate(fr, [G - 4, G + 34], [0, Math.PI * 2], {...clamp, easing: Easing.bezier(0.5, 0, 0.15, 1)}), lento = (fr - a) * 0.008, giro = vuelta + lento;
  const dibuja = va(fr, a, Math.max(10, Math.min(G - a, 40)), 0, 1, curva.suave), cometa = ((fr - a) * 0.018 + vuelta / (Math.PI * 2) + 0.75) % 1;
  const items = fotos.map((f, i) => { const th = (i / N) * Math.PI * 2 + Math.PI / 2 + giro; return {f, i, th, prof: (Math.sin(th) + 1) / 2}; }).sort((p, q) => p.prof - q.prof);
  const gtxt = txtDe(gl), gt = gl ? cabe(gtxt, 800, look, 170, gtxt.length > 10 ? 2 : 1) : 0;
  const Azul = (mitad: 'atras' | 'frente') => (<svg width="1920" height="1080" style={{position: 'absolute', left: 0, top: 0, clipPath: mitad === 'atras' ? `inset(0 0 ${1080 - cy}px 0)` : `inset(${cy}px 0 0 0)`}}>
    <ellipse cx="960" cy={cy} rx={rx} ry={ry} fill="none" stroke={rgba(look.acento, 0.2 + 0.2 * cl(hit))} strokeWidth="46" pathLength={1} strokeDasharray={`${dibuja} 1`} />
    <ellipse cx="960" cy={cy} rx={rx} ry={ry} fill="none" stroke={look.acento} strokeWidth="11" pathLength={1} strokeDasharray={`${dibuja} 1`} />
    <ellipse cx="960" cy={cy} rx={rx} ry={ry} fill="none" stroke={rgba(look.claro || '#ffffff', 0.92)} strokeWidth="4" pathLength={1} strokeDasharray={`${dibuja} 1`} />
    {dibuja >= 1 && <ellipse cx="960" cy={cy} rx={rx} ry={ry} fill="none" stroke="#fff" strokeWidth="18" strokeLinecap="round" pathLength={1} strokeDasharray="0.05 1" strokeDashoffset={-cometa} />}
  </svg>);
  const Item = ({f, i, th, prof}: any) => { const x = 960 + Math.cos(th) * rx, y = cy + Math.sin(th) * ry, s = mix(0.56, 1.12, prof), W = 430, H = 300, e = salta(fr, at[i], {damping: 11, stiffness: 150, mass: 0.7}), brilla = fr >= at[i] ? Math.exp(-(fr - at[i]) * 0.09) : 0;
    if (e <= 0.003) return null;
    return <div key={f.id + i} style={{position: 'absolute', left: x - W / 2, top: y - H / 2, width: W, height: H, borderRadius: 22, overflow: 'hidden', border: `4px solid ${rgba(look.acento, 0.5 + 0.5 * brilla)}`, boxShadow: `0 24px 40px rgba(0,0,0,.55), 0 0 ${10 + 40 * brilla}px ${rgba(look.acento, 0.5 + 0.4 * brilla)}`, transform: `scale(${s * e}) rotate(${(1 - e) * 16}deg)`, background: '#000'}}>
      <Encuadre id={f.id} foco={f.foco} filtro="contrast(1.05)" /><div style={{position: 'absolute', inset: 0, background: `rgba(4,4,12,${0.5 * (1 - prof)})`}} /><div style={{position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,.2), transparent 36%)'}} /></div>; };
  const detras = items.filter((x) => x.prof < 0.5), delante = items.filter((x) => x.prof >= 0.5), incl = `perspective(2400px) rotateX(${3 * Math.sin((fr - a) / 40)}deg) rotateY(${3.5 * Math.sin((fr - a) / 53)}deg) scale(${mix(0.86, 1, salta(fr, a, {damping: 18, stiffness: 80})) + 0.02 * cl(hit)})`;
  return (<Escena ac={ac} look={look} foto={fotos[0]} o={0.4} luz={1}>
    <div style={{position: 'absolute', inset: 0, transform: incl}}>
      {Azul('atras')}{detras.map(Item)}
      <div style={{position: 'absolute', left: 960 - 460, top: cy - 300, width: 920, height: 600, background: `radial-gradient(closest-side, ${rgba(look.acento, 0.14 + 0.32 * cl(hit))}, transparent)`}} />
      {Azul('frente')}{delante.map(Item)}
      <div style={{position: 'absolute', left: 960 - 440, top: cy - gt * (gtxt.length > 10 ? 1 : 0.5) - 6, width: 880, textShadow: SOMBRA_N, transform: `scale(${0.72 + 0.28 * hit})`}}><Dicho l={gl} tam={gt} ancho={880} look={look} color={look.claro} interlinea={0.98} /></div>
    </div>
    <div style={{position: 'absolute', left: 960 - 840, bottom: 26, width: 1680, textShadow: SOMBRA_N}}><Dicho l={lead} tam={cabe(txtDe(lead), 1640, look, 64, 1, 44, look.texto)} ancho={1680} look={look} /></div>
  </Escena>);
};

export const OPS: Record<string, React.FC<OpProps>> = {neo_coverflow: CoverFlow, neo_abanico: Abanico, neo_celular: Celular, neo_odometro: Odometro, neo_seguridad: Seguridad, neo_versus: Versus, neo_frase: Frase, neo_piso: Piso, neo_letrero: Letrero, neo_bucle: Bucle};
