// Familia cocina: objetos domésticos que hacen la idea. Cada op tiene un solo golpe físico, y las fotos del video viven dentro del objeto.
import React from 'react';
import {useCurrentFrame, random} from 'remotion';
import {OpProps, Foto as FotoT, Look} from './base';
import {Encuadre, FondoFoto, Palabras, Polvo, va, salta, curva} from '../kit';
import {mat, mez, alfa, tiempos, leadsDe, golpesDe, textoDe, pals, pulso, lim, cabe, Salida, Mesa, Mano, R_MANO, elipseMano, curvaPts, trazo, P2} from './cocina_mat';

const fotoDe = (fs: FotoT[], i = 0): FotoT => fs[i] || fs[0] || {id: 'p001'};
const focoDe = (f: FotoT): [number, number] => (f.foco || [0.5, 0.5]) as [number, number];
const abs: React.CSSProperties = {position: 'absolute'};

/** Rótulo de dos pisos para un papel: lead a mano arriba, golpe grande debajo. */
const Bloque: React.FC<{ac: OpProps['ac']; look: Look; w: number; hLead: number; hGolpe: number; alin?: 'left' | 'center'; golpeMano?: boolean; maxG?: number; maxL?: number}> = ({ac, look, w, hLead, hGolpe, alin = 'left', golpeMano, maxG = 170, maxL = 84}) => {
  const m = mat(look), L = leadsDe(ac), Gs = golpesDe(ac), tL = textoDe(L), tG = textoDe(Gs);
  const tamL = cabe(tL, w, hLead, R_MANO, 1.02, maxL, 46), tamG = golpeMano ? cabe(tG, w, hGolpe, R_MANO, 0.98, maxG, 56) : cabe(tG, w, hGolpe, m.rDisp * 1.2, 1, maxG, 56);
  return (<div style={{width: w, display: 'flex', flexDirection: 'column', gap: 8, alignItems: alin === 'center' ? 'center' : 'flex-start'}}>
    {L.length > 0 && <Mano palabras={pals(L, ac.a)} tam={tamL} fuente={m.mano} color={m.os} ancho={w} alin={alin} inter={1.02} />}
    {Gs.length > 0 && (golpeMano ? <Mano palabras={pals(Gs, ac.a)} tam={tamG} fuente={m.mano} color={m.acento} ancho={w} alin={alin} inter={0.98} />
      : <Palabras palabras={pals(Gs, ac.a)} tam={tamG} fuente={m.disp} color={m.acento} ancho={w} alin={alin} interlinea={1} italica peso={700} />)}
  </div>);
};

/* ═════════ TERMÓMETRO DE PARED: el nivel le devuelve el color a la foto ═════════ */
const Termometro: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f);
  const baja = ac.var === 'baja', der = foco[0] <= 0.55, ent = salta(fr, a, {damping: 13, stiffness: 120, mass: 0.8});
  const sG = salta(fr, G, {damping: 9, stiffness: 190, mass: 0.62}), previo = va(fr, a + 2, Math.max(1, G - a - 2), baja ? 0.86 : 0.1, baja ? 0.68 : 0.4, curva.suave);
  const nv = previo + ((baja ? 0.09 : 0.92) - previo) * sG, X0 = der ? 1510 : 110, Y0 = 34, TY = 96, TB = 782, ly = TB - nv * (TB - TY), yNivel = Y0 + ly;
  const barre = va(fr, G + 3, 16, 0, 1, curva.suave), yColor = baja ? yNivel + (1090 - yNivel) * barre : yNivel * (1 - barre), p = pulso(fr, G, 18);
  const camara = `scale(${1.06 + Math.sin(fr / 48) * 0.012 + p * 0.03}) translate(${Math.sin(fr / 61) * 12}px,${Math.cos(fr / 53) * 7}px)`, tuboX = X0 + 150;
  const hL = leadsDe(ac).length ? 170 : 0, hG = 224, alto = hL + 58 + hG * lim(sG, 0, 1), tagW = 600, tagX = der ? X0 - tagW - 46 : X0 + 300 + 46, tagY = lim(yNivel - alto / 2, 54, 1080 - alto - 44), giro = (1 - lim(ent, 0, 1.2)) * (der ? 9 : -9) + Math.sin(fr * 1.5) * p * 2.4;
  const merc = `linear-gradient(90deg, ${mez(m.acento, '#000000', 0.34)}, ${m.acento} 34%, ${mez(m.acento, '#ffffff', 0.46)} 50%, ${m.acento} 66%, ${mez(m.acento, '#000000', 0.42)})`;
  return (<Salida ac={ac}>
    <div style={{...abs, inset: 0, transform: camara, transformOrigin: `${foco[0] * 100}% ${foco[1] * 100}%`}}>
      <Encuadre id={f.id} foco={foco} filtro="contrast(1.06) saturate(1.16)" />
      <div style={{...abs, inset: 0, clipPath: `inset(0 0 ${100 - lim(yColor / 10.8, 0, 100)}% 0)`}}><Encuadre id={f.id} foco={foco} filtro="grayscale(1) brightness(.74) contrast(1.05)" /></div>
    </div>
    <div style={{...abs, left: 0, right: 0, top: yColor - 120, height: 120, background: `linear-gradient(180deg, transparent, ${alfa(m.calido, 0.34)})`, opacity: yColor > 4 && yColor < 1080 ? 1 : 0}} />
    <svg viewBox="0 0 1920 1080" style={{...abs, inset: 0, width: 1920, height: 1080}}><line x1={der ? tagX + tagW - 8 : tagX + 8} y1={tagY + alto / 2} x2={tuboX} y2={yNivel} stroke={m.claro} strokeWidth={5} strokeLinecap="round" opacity={0.92} /></svg>
    {/* tabla colgada de un clavo */}
    <div style={{...abs, left: X0, top: Y0, width: 300, height: 1012, transformOrigin: '50% 30px', transform: `translateY(${(1 - ent) * -1160}px) perspective(1500px) rotateY(${der ? -9 : 9}deg) rotate(${giro}deg)`, borderRadius: 54, background: `linear-gradient(115deg, ${m.metalCl}, ${m.claro} 30%, ${mez(m.claro, m.os, 0.2)})`, boxShadow: `0 34px 60px rgba(20,12,4,.5), inset 0 0 0 9px ${alfa(m.os, 0.1)}, inset 0 2px 0 rgba(255,255,255,.9)`}}>
      <div style={{...abs, left: 136, top: 22, width: 28, height: 28, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${m.metalCl}, ${m.metalOs})`, boxShadow: '0 3px 5px rgba(0,0,0,.45)'}} />
      {Array.from({length: 25}).map((_, i) => { const mayor = i % 4 === 0, y = TB - (i / 24) * (TB - TY), arriba = i / 24 <= nv; return <React.Fragment key={i}><div style={{...abs, left: 26, top: y - 2, width: mayor ? 68 : 40, height: mayor ? 6 : 3, background: arriba ? m.acento : m.os, opacity: mayor ? 0.9 : 0.55, marginLeft: mayor ? 0 : 28}} /><div style={{...abs, left: 206, top: y - 2, width: mayor ? 68 : 40, height: mayor ? 6 : 3, background: arriba ? m.acento : m.os, opacity: mayor ? 0.9 : 0.55}} /></React.Fragment>; })}
      <div style={{...abs, left: 150 - 75, top: 842 - 75 + 0, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${alfa(m.calido, 0.95)}, transparent 70%)`, transform: `scale(${1.5 + p * 1.9})`, opacity: 0.25 + p * 0.75}} />
      <div style={{...abs, left: 110, top: 76, width: 80, height: 740, borderRadius: 40, background: alfa(m.claro, 0.75), boxShadow: `inset 0 0 0 3px ${alfa(m.os, 0.28)}, inset 8px 0 10px rgba(255,255,255,.75)`}} />
      <div style={{...abs, left: 128, top: ly, width: 44, height: Math.max(0, 860 - ly), background: merc}} />
      <div style={{...abs, left: 128, top: ly - 9, width: 44, height: 18, borderRadius: '50%', background: mez(m.acento, '#ffffff', 0.3)}} />
      <div style={{...abs, left: 150 - 64, top: 800, width: 128, height: 128, borderRadius: '50%', background: `radial-gradient(circle at 37% 30%, ${mez(m.acento, '#ffffff', 0.72)}, ${m.acento} 42%, ${mez(m.acento, '#000000', 0.42)})`, boxShadow: `0 12px 22px rgba(20,12,4,.38), 0 0 0 5px ${alfa(m.claro, 0.8)}`}} />
      <div style={{...abs, left: 122, top: 84, width: 12, height: 720, borderRadius: 6, background: 'linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.25))'}} />
    </div>
    {/* etiqueta de papel atada al nivel: sube con el líquido */}
    <div style={{...abs, left: tagX, top: tagY, width: tagW, height: alto, overflow: 'hidden', borderRadius: 16, padding: '26px 38px', background: `linear-gradient(135deg, ${m.claro}, ${m.cl})`, boxShadow: '0 22px 38px rgba(20,12,4,.45)', transform: `translateX(${(1 - lim(salta(fr, a + 7, {damping: 14, stiffness: 150}), 0, 1)) * (der ? -620 : 620)}px) rotate(${(der ? 1 : -1) * (1.6 + Math.sin(fr * 1.1) * p * 3)}deg)`}}><Bloque ac={ac} look={look} w={524} hLead={hL - 14} hGolpe={hG - 20} maxG={150} maxL={78} /></div>
  </Salida>);
};

/* ═════════ PERILLA DEL HORNO: gira, clava y el horno se enciende con la foto adentro ═════════ */
const Perilla: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f), ent = salta(fr, a, {damping: 15, stiffness: 110, mass: 0.85});
  const sG = salta(fr, G, {damping: 10, stiffness: 230, mass: 0.55}), previo = va(fr, a + 3, Math.max(1, G - a - 3), -134, -92, curva.suave), ang = previo + (98 - previo) * sG, p = pulso(fr, G, 14);
  const on = fr < G ? 0 : fr < G + 2 ? 0.55 : fr < G + 4 ? 0.15 : va(fr, G + 4, 10, 0.55, 1), brasa = fr >= G ? 0.86 + Math.sin(fr / 4.3) * 0.08 : 0, W = 1300, H = 560;
  const cromo = `linear-gradient(180deg, ${m.metalCl}, ${m.metal} 36%, ${m.metalOs} 56%, ${m.metal} 74%, ${m.metalCl})`;
  return (<Salida ac={ac}>
    <FondoFoto id={f.id} blur={36} brillo={0.46} />
    <div style={{...abs, left: 110, top: 30, width: 1700, height: 1180, borderRadius: '42px 42px 0 0', transformOrigin: '50% 40%', transform: `translateY(${(1 - ent) * 360 + p * 8}px) perspective(2500px) rotateY(${-5.5 + Math.sin(fr / 56) * 1.5}deg) rotateX(${1.5 + Math.cos(fr / 66) * 0.7}deg) scale(${0.965 + ent * 0.035 + p * 0.012 + Math.max(0, fr - G) * 0.0004})`, background: `linear-gradient(162deg, ${m.metalCl}, ${m.claro} 28%, ${mez(m.claro, m.os, 0.2)})`, boxShadow: `0 40px 80px rgba(15,8,2,.55), inset 0 3px 0 rgba(255,255,255,.95)`}}>
      {/* tablero */}
      <div style={{...abs, left: 0, right: 0, top: 306, height: 16, background: cromo}} />
      <div style={{...abs, left: 300 - 150, top: 158 - 150, width: 300, height: 300}}>
        {Array.from({length: 15}).map((_, i) => { const th = -135 + i * (270 / 14), llega = th <= ang; return <div key={i} style={{...abs, left: 150 - (i % 2 ? 3 : 5), top: 150 - 146, width: i % 2 ? 6 : 10, height: i % 2 ? 18 : 28, borderRadius: 4, background: llega && fr >= a + 3 ? m.acento : alfa(m.os, 0.48), transform: `rotate(${th}deg)`, transformOrigin: `${i % 2 ? 3 : 5}px 146px`}} />; })}
        <div style={{...abs, left: 28, top: 36, width: 244, height: 244, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(15,8,2,.5), transparent)'}} />
        <div style={{...abs, left: 38, top: 38, width: 224, height: 224, borderRadius: '50%', background: `conic-gradient(from 210deg, ${m.metalCl}, ${m.metalOs}, ${m.metalCl}, ${m.metal}, ${m.metalCl})`, boxShadow: `0 10px 18px rgba(15,8,2,.42), inset 0 0 0 4px ${alfa(m.os, 0.2)}`, transform: `rotate(${ang}deg) scale(${1 + p * 0.05})`}}>
          <div style={{...abs, left: 86, top: 2, width: 52, height: 220, borderRadius: 26, background: `linear-gradient(90deg, ${m.metal}, ${m.claro} 40%, ${m.metalOs})`, boxShadow: '0 5px 10px rgba(15,8,2,.38)'}} />
          <div style={{...abs, left: 104, top: 12, width: 16, height: 66, borderRadius: 8, background: m.acento}} />
        </div>
      </div>
      <div style={{...abs, left: 484, top: 132, width: 52, height: 52, borderRadius: '50%', background: on > 0.3 ? `radial-gradient(circle at 40% 34%, ${mez(m.acento, '#ffffff', 0.7)}, ${m.acento} 60%)` : `radial-gradient(circle at 40% 34%, ${m.metal}, ${m.metalOs})`, boxShadow: `inset 0 0 0 4px ${alfa(m.os, 0.3)}${on > 0.3 ? `, 0 0 ${26 + p * 26}px ${m.acento}` : ''}`}} />
      <div style={{...abs, left: 590, top: 26, width: 1030, height: 270, display: 'flex', alignItems: 'center'}}><Bloque ac={ac} look={look} w={1030} hLead={98} hGolpe={146} maxG={146} maxL={80} /></div>
      {/* manija */}
      <div style={{...abs, left: 120, top: 346, width: 1460, height: 40, borderRadius: 20, background: cromo, boxShadow: '0 16px 20px rgba(15,8,2,.34)'}} />
      {/* ventana con la foto adentro */}
      <div style={{...abs, left: 200 - 90, top: 400 - 40, width: W + 180, height: H + 90, borderRadius: 60, background: `radial-gradient(closest-side, ${alfa(m.calido, 0.75)}, transparent)`, opacity: on}} />
      <div style={{...abs, left: 200 - 18, top: 416 - 18, width: W + 36, height: H + 36, borderRadius: 36, background: `linear-gradient(135deg, ${m.metalOs}, ${m.os})`}} />
      <div style={{...abs, left: 200, top: 416, width: W, height: H, borderRadius: 22, overflow: 'hidden', background: m.os}}>
        <div style={{...abs, inset: 0, transform: `scale(${1.05 + on * 0.05 + Math.sin(fr / 38) * 0.008})`}}><Encuadre id={f.id} foco={foco} filtro="contrast(1.08) saturate(1.22)" /></div>
        <div style={{...abs, inset: 0, background: 'rgba(14,8,3,.84)', opacity: 1 - on * 0.97}} />
        <div style={{...abs, inset: 0, background: `radial-gradient(90% 75% at 50% 0%, ${alfa(m.calido, 0.62)}, transparent 72%)`, opacity: on * brasa}} />
        {[0.78, 0.86].map((y, i) => <div key={i} style={{...abs, left: 0, right: 0, top: `${y * 100}%`, height: 7, background: 'linear-gradient(180deg, rgba(0,0,0,.72), rgba(255,240,210,.18))'}} />)}
        <div style={{...abs, inset: 0, background: 'linear-gradient(112deg, transparent 12%, rgba(255,255,255,.2) 19%, rgba(255,255,255,.06) 30%, transparent 33%, transparent 62%, rgba(255,255,255,.11) 69%, transparent 77%)'}} />
        <div style={{...abs, inset: 0, boxShadow: 'inset 0 0 70px rgba(10,5,0,.72)', borderRadius: 22}} />
      </div>
    </div>
  </Salida>);
};

/** Cuña de reloj en % sobre su caja, desde las 12 en sentido horario. */
const cuna = (deg: number) => { if (deg >= 359.5) return undefined; const pts = ['50% 50%']; for (let g = 0; ; g += 8) { const x = Math.min(g, deg), t = (x * Math.PI) / 180; pts.push(`${(50 + Math.sin(t) * 76).toFixed(2)}% ${(50 - Math.cos(t) * 76).toFixed(2)}%`); if (x >= deg) break; } return `polygon(${pts.join(',')})`; };

/* ═════════ TEMPORIZADOR: rueda hasta la mesa, descubre la foto al girar y suena ═════════ */
const Temporizador: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f), R = 330;
  const ent = salta(fr, a, {damping: 15, stiffness: 95, mass: 0.85}), carta = salta(fr, a + 5, {damping: 12, stiffness: 140, mass: 0.7}), sG = salta(fr, G, {damping: 12, stiffness: 240, mass: 0.5});
  const pasa = lim((fr - a - 4) / Math.max(1, G - a - 4), 0, 1), pasos = 12 + Math.max(0, Math.round((G - a) / 7)), cuant = (Math.floor(pasa * pasos) + lim((pasa * pasos) % 1 / 0.28, 0, 1)) / pasos;
  const previo = 26 + cuant * 268, deg = lim(previo + (360 - previo) * sG, 0, 362), resto = Math.exp(-Math.max(0, fr - G) / 9), suena = fr >= G ? Math.sin((fr - G) * 2.5) * resto : 0, p = pulso(fr, G, 12);
  return (<Salida ac={ac}>
    <FondoFoto id={f.id} blur={34} brillo={0.62} />
    <div style={{...abs, left: -60, right: -60, top: 804, bottom: -40, background: `repeating-linear-gradient(90deg, rgba(0,0,0,.2) 0 3px, transparent 3px 240px), linear-gradient(180deg, ${m.maderaCl}, ${m.madera} 40%, ${m.maderaOs})`, boxShadow: `0 -6px 0 ${alfa(m.claro, 0.32)}`}} />
    <div style={{...abs, left: 1290 - 470, top: 802, width: 940, height: 112, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,5,0,.62), transparent)', opacity: lim(ent, 0, 1), transform: `translateX(${(1 - ent) * 840}px) scaleX(${1 + p * 0.06})`}} />
    <div style={{...abs, inset: 0, transformOrigin: '1290px 470px', transform: `scale(${1 + Math.max(0, fr - G) * 0.0006}) translateX(${Math.sin(fr / 70) * 6}px)`}}>
    {/* tarjeta plegada parada sobre la mesa */}
    <div style={{...abs, left: 96, top: 420, width: 730, height: 420, transformOrigin: '50% 100%', transform: `perspective(1500px) rotateY(16deg) rotateX(${(1 - carta) * 84}deg)`, borderRadius: 10, background: `linear-gradient(165deg, ${m.claro}, ${m.cl} 60%, ${mez(m.cl, m.os, 0.14)})`, boxShadow: '0 26px 34px rgba(20,12,4,.34)', padding: '38px 44px', display: 'flex', alignItems: 'center', opacity: lim(carta * 2, 0, 1)}}>
      <div style={{...abs, left: 0, right: 0, top: 18, height: 3, background: alfa(m.os, 0.16)}} />
      <Bloque ac={ac} look={look} w={642} hLead={130} hGolpe={196} maxG={172} maxL={92} />
    </div>
    {/* el reloj */}
    <div style={{...abs, left: 1290 - R - 40, top: 470 - R - 40, width: 2 * R + 80, height: 2 * R + 80, transformOrigin: '50% 100%', transform: `translateX(${(1 - ent) * 840}px) translateY(${-p * 26}px) rotate(${(1 - ent) * 300 + suena * 5}deg) perspective(1600px) rotateY(${-10 + Math.sin(fr / 58) * 3.2}deg)`}}>
      {[-1, 1].map((s) => <div key={s} style={{...abs, left: R + 40 + s * 220 - 42, top: 2 * R + 46, width: 84, height: 40, borderRadius: 14, background: m.metalOs}} />)}
      <div style={{...abs, left: R + 40 - 66, top: -24, width: 132, height: 72, borderRadius: '66px 66px 10px 10px', background: `linear-gradient(120deg, ${m.metalCl}, ${m.metal} 42%, ${m.metalOs})`, boxShadow: '0 6px 10px rgba(15,8,2,.35)'}} />
      <div style={{...abs, inset: 0, borderRadius: '50%', background: `conic-gradient(from 200deg, ${mez(m.acento, '#ffffff', 0.34)}, ${m.acento} 30%, ${mez(m.acento, '#000000', 0.34)} 58%, ${m.acento} 82%, ${mez(m.acento, '#ffffff', 0.34)})`, boxShadow: `0 18px 40px rgba(15,8,2,.5), inset 0 0 0 7px ${alfa(m.claro, 0.34)}`}} />
      <div style={{...abs, left: 40, top: 40, width: 2 * R, height: 2 * R, borderRadius: '50%', overflow: 'hidden', background: `radial-gradient(circle at 44% 36%, ${m.claro}, ${mez(m.claro, m.os, 0.12)})`, boxShadow: `inset 0 10px 20px rgba(15,8,2,.34)`}}>
        <div style={{...abs, inset: 0, clipPath: cuna(deg)}}><Encuadre id={f.id} foco={foco} zoom={1.08 + Math.max(0, fr - G) * 0.0012} filtro="contrast(1.07) saturate(1.18)" /></div>
        {Array.from({length: 60}).map((_, i) => { const mayor = i % 5 === 0; return <div key={i} style={{...abs, left: R - (mayor ? 4 : 2), top: 8, width: mayor ? 8 : 4, height: mayor ? 44 : 22, borderRadius: 3, background: i * 6 < deg ? m.claro : alfa(m.os, 0.72), boxShadow: i * 6 < deg ? '0 1px 3px rgba(0,0,0,.65)' : undefined, transform: `rotate(${i * 6}deg)`, transformOrigin: `${mayor ? 4 : 2}px ${R - 8}px`}} />; })}
        <div style={{...abs, inset: 0, background: 'linear-gradient(128deg, rgba(255,255,255,.26), transparent 36%)'}} />
      </div>
      <div style={{...abs, left: R + 40 - 8, top: R + 40 - 268, width: 16, height: 292, borderRadius: 9, background: m.os, boxShadow: `0 0 0 3px ${alfa(m.claro, 0.85)}, 3px 5px 8px rgba(0,0,0,.5)`, transform: `rotate(${deg}deg)`, transformOrigin: '8px 268px'}} />
      <div style={{...abs, left: R + 40 - 60, top: R + 40 - 60, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle at 38% 30%, ${m.metalCl}, ${m.metal} 50%, ${m.metalOs})`, boxShadow: '0 10px 16px rgba(15,8,2,.5)'}} />
    </div>
    </div>
    {/* ondas de la campana */}
    {fr >= G && <svg viewBox="0 0 1920 1080" style={{...abs, inset: 0, width: 1920, height: 1080, opacity: resto}}>{[0, 1, 2].map((i) => { const r = 150 + i * 62 + (fr - G) * 7; return <g key={i} fill="none" stroke={m.claro} strokeWidth={13 - i * 3} strokeLinecap="round"><path d={`M ${1290 - r * 0.76} ${84 - r * 0.32 + 90} Q ${1290 - r * 0.98} ${84 + 44} ${1290 - r * 0.76} ${84 + r * 0.32 + 30}`} /><path d={`M ${1290 + r * 0.76} ${84 - r * 0.32 + 90} Q ${1290 + r * 0.98} ${84 + 44} ${1290 + r * 0.76} ${84 + r * 0.32 + 30}`} /></g>; })}</svg>}
  </Salida>);
};

/* ═════════ TARJETA DE RECETA: se escribe sola; el golpe se subraya o tacha lo anterior ═════════ */
const Receta: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f), ent = salta(fr, a, {damping: 14, stiffness: 105, mass: 0.9}), ft = salta(fr, a + 8, {damping: 12, stiffness: 150, mass: 0.7}), tacha = ac.var === 'tacha';
  const L = leadsDe(ac), Gs = golpesDe(ac), W = 800, tL = textoDe(L), tG = textoDe(Gs), filas = L.length ? 3 : 0;
  const tamL = cabe(tL, W, filas * 104, R_MANO, 104 / 76, 76, 46), inL = 104 / tamL, tamG = cabe(tG, W, 300, R_MANO, 0.98, 230, 70), anchoG = Math.min(W, (tG.length + 1) * tamG * R_MANO * 0.96), rGol = trazo(curvaPts([6, 26], [anchoG * 0.5, 2], [anchoG, 18], 26), va(fr, G + 2, 11, 0, 1, curva.suave)), rGol2 = trazo(curvaPts([anchoG * 0.92, 40], [anchoG * 0.45, 26], [anchoG * 0.12, 46], 22), va(fr, G + 11, 8, 0, 1, curva.suave)), p = pulso(fr, G, 15);
  const lapiz = salta(fr, G, {damping: 11, stiffness: 120});
  return (<Salida ac={ac}>
    <Mesa look={look} dx={Math.sin(fr / 60) * 12} dy={Math.cos(fr / 72) * 8} inclina={22} />
    <div style={{...abs, left: -90, top: 690, width: 760, height: 560, transform: `rotate(16deg) translateY(${(1 - ent) * 200}px)`, background: `repeating-linear-gradient(0deg, ${alfa(m.acento, 0.5)} 0 54px, transparent 54px 108px), repeating-linear-gradient(90deg, ${alfa(m.acento, 0.5)} 0 54px, transparent 54px 108px), ${m.claro}`, boxShadow: '0 20px 30px rgba(15,8,2,.4)'}} />
    <div style={{...abs, left: 192, top: 66, width: 1490, height: 930, transformOrigin: '50% 60%', transform: `translateY(${(1 - ent) * 1000 + p * 6}px) perspective(2300px) rotateX(${15 + Math.sin(fr / 62) * 1.2}deg) rotate(${(1 - ent) * 12 - 2.1 + Math.sin(fr / 47) * 0.35}deg) scale(${1.0 + (fr - a) * 0.00022 + p * 0.012})`, borderRadius: 22, background: `radial-gradient(240px 170px at 12% 86%, ${alfa(m.calido, 0.24)}, transparent 75%), radial-gradient(150px 110px at 90% 90%, ${alfa(m.calido, 0.24)}, transparent 75%), linear-gradient(170deg, ${m.claro}, ${mez(m.claro, m.os, 0.06)})`, boxShadow: '0 44px 70px rgba(15,8,2,.55), 0 4px 8px rgba(15,8,2,.34)'}}>
      <div style={{...abs, left: 0, right: 0, top: 100, bottom: 16, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 100px, ${alfa(m.acento2, 0.34)} 100px 104px)`}} />
      <div style={{...abs, left: 0, right: 0, top: 96, height: 9, background: alfa(m.acento, 0.72)}} />
      <div style={{...abs, left: 118, top: 0, bottom: 0, width: 4, background: alfa(m.acento, 0.5)}} />
      <div style={{...abs, left: 150, top: 106}}>
        <Mano palabras={pals(L, a)} tam={tamL} fuente={m.mano} color={tacha && fr >= G ? alfa(m.os, 0.62) : mez(m.acento2, m.os, 0.55)} ancho={W} inter={inL} tacha={tacha ? G : undefined} colorTacha={m.acento} />
        {Gs.length > 0 && <div style={{position: 'relative', marginTop: 6, transform: `scale(${0.86 + 0.14 * salta(fr, G, {damping: 11, stiffness: 300, mass: 0.6})})`, transformOrigin: '0 70%'}}>
          <Mano palabras={pals(Gs, a)} tam={tamG} fuente={m.mano} color={m.acento} ancho={W} inter={0.98} />
          <svg viewBox={`0 0 ${W} 62`} style={{display: 'block', width: W, height: 62, marginTop: -8, overflow: 'visible'}}>{fr >= G + 3 && <polyline points={rGol.puntos} fill="none" stroke={m.acento} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />}{fr > G + 11 && <polyline points={rGol2.puntos} fill="none" stroke={m.acento} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}</svg>
        </div>}
      </div>
      {/* foto pegada con cinta */}
      <div style={{...abs, left: 1012, top: 148, width: 430, height: 560, padding: 18, background: m.metalCl, boxShadow: '0 20px 30px rgba(15,8,2,.35)', transform: `rotate(${3.2 + (1 - ft) * 16}deg) scale(${1.5 - 0.5 * lim(ft, 0, 1.2)})`, opacity: lim(ft * 3, 0, 1)}}>
        <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}><Encuadre id={f.id} foco={foco} filtro="contrast(1.05) saturate(1.1)" /></div>
        <div style={{...abs, left: 120, top: -28, width: 190, height: 58, background: alfa(m.calido, 0.62), transform: 'rotate(-3deg)', boxShadow: '0 2px 4px rgba(0,0,0,.15)'}} />
      </div>
    </div>
    {/* lápiz que rueda con el golpe */}
    <div style={{...abs, left: 1236, top: 930, width: 600, height: 40, borderRadius: 7, transform: `rotate(${-7}deg) translateX(${(1 - lapiz) * 90}px)`, background: `linear-gradient(180deg, ${mez(m.acento2, '#ffffff', 0.3)}, ${m.acento2} 45%, ${mez(m.acento2, '#000000', 0.42)})`, boxShadow: '0 14px 18px rgba(15,8,2,.55)'}}>
      <div style={{...abs, left: -64, top: 0, width: 0, height: 0, borderTop: '20px solid transparent', borderBottom: '20px solid transparent', borderRight: `64px solid ${m.maderaCl}`}} />
      <div style={{...abs, left: 575, top: 0, width: 25, height: 40, borderRadius: 5, background: m.calido}} />
    </div>
  </Salida>);
};

/* ═════════ LIBRO: se abre con peso, las hojas vuelan y cae en la página con la foto ═════════ */
const Libro: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f), W = 720, H = 836;
  const ini = Math.max(a + 2, G - 26), dur = Math.max(4, G - ini), ent = salta(fr, a, {damping: 15, stiffness: 115, mass: 0.85}), n = dur > 16 ? 3 : 1;
  // la tapa (0) y las hojas (1..n) salen escalonadas y todas aterrizan a más tardar en el golpe
  const angulo = (i: number) => va(fr, ini + (i / Math.max(1, n)) * dur * 0.45, dur * 0.55, 0, 1, curva.suave) * -180;
  const abierto = va(fr, ini, dur, 0, 1, curva.suave), p = pulso(fr, G, 16), luz = va(fr, G, 6, 0, 1) * (1 - va(fr, G + 8, 16, 0, 1, curva.suave));
  const T = (rot: number) => `perspective(2500px) rotateX(23deg) rotateY(${rot}deg)`, puesto = fr >= G - 1;
  const cara: React.CSSProperties = {...abs, inset: 0, borderRadius: '2px 12px 12px 2px', overflow: 'hidden'};
  const hoja = (dorso: boolean, oscuridad: number) => (<div style={{...cara, background: `linear-gradient(90deg, ${mez(m.claro, m.os, 0.22)}, ${m.claro} 12%, ${mez(m.claro, m.os, 0.05)})`, transform: dorso ? 'scaleX(-1)' : undefined}}>
    {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <div key={k} style={{...abs, left: 70, width: 500 - (k % 3) * 70, top: 112 + k * 80, height: 12, borderRadius: 6, background: alfa(m.os, 0.1)}} />)}
    <div style={{...abs, inset: 0, background: `rgba(30,18,6,${oscuridad})`}} />
  </div>);
  const tapa = (dorso: boolean) => (<div style={{...cara, background: dorso ? `linear-gradient(90deg, ${mez(m.acento2, '#000000', 0.3)}, ${m.acento2})` : `linear-gradient(135deg, ${mez(m.acento2, '#ffffff', 0.16)}, ${m.acento2} 45%, ${mez(m.acento2, '#000000', 0.32)})`, transform: dorso ? 'scaleX(-1)' : undefined}}>
    {!dorso && <><div style={{...abs, inset: 34, border: `5px solid ${alfa(m.claro, 0.5)}`, borderRadius: 8}} /><div style={{...abs, left: 74, right: 74, top: 280, minHeight: 270, padding: '24px 28px', background: m.claro, borderRadius: 6, boxShadow: '0 8px 14px rgba(0,0,0,.34)'}}><Mano palabras={pals(leadsDe(ac), a)} tam={cabe(textoDe(leadsDe(ac)), 510, 230, R_MANO, 1.02, 86, 46)} fuente={m.mano} color={m.os} ancho={516} inter={1.02} alin="center" /></div></>}
  </div>);
  const orden = [0, 1, 2, 3].slice(0, n + 1).map((i) => { const ang = angulo(i), izq = ang < -90; return {i, ang, izq, z: izq ? 20 + i : 40 - i}; }).sort((x, y) => x.z - y.z);
  return (<Salida ac={ac}>
    <Mesa look={look} dx={Math.sin(fr / 66) * 10} dy={p * 7} />
    <div style={{...abs, left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '50% 52%', transform: `translate(${(abierto - 1) * W / 2}px,${(1 - ent) * 1000 + 22}px) scale(${0.97 + (fr - a) * 0.00024 + p * 0.02}) rotate(${Math.sin(fr / 58) * 0.5}deg)`}}>
      {/* sombra de la mesa */}
      <div style={{...abs, left: 960 - 800, top: 530 + 240, width: 1600, height: 240, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,5,0,.55), transparent)', transform: `scaleX(${0.56 + 0.44 * abierto}) translateX(${(1 - abierto) * 340}px)`}} />
      <div style={{...abs, left: 960 - W - 16, top: 540 - H / 2 - 16, width: 2 * W + 32, height: H + 54, borderRadius: 14, background: `linear-gradient(180deg, ${mez(m.acento2, '#000000', 0.2)}, ${mez(m.acento2, '#000000', 0.5)})`, transformOrigin: '50% 47.5%', transform: T(0), opacity: abierto > 0.5 ? 1 : 0}} />
      {/* bloque de hojas */}
      <div style={{...abs, left: 960, top: 540 - H / 2, width: W, height: H + 24, transformOrigin: `0 ${H / 2}px`, transform: T(0), borderRadius: '0 10px 10px 0', background: `repeating-linear-gradient(180deg, ${mez(m.cl, m.os, 0.12)} 0 3px, ${m.claro} 3px 6px)`}} />
      {abierto > 0.48 && <div style={{...abs, left: 960 - W, top: 540 - H / 2, width: W, height: H + 24, transformOrigin: `100% ${H / 2}px`, transform: T(0), borderRadius: '10px 0 0 10px', background: `repeating-linear-gradient(180deg, ${mez(m.cl, m.os, 0.12)} 0 3px, ${m.claro} 3px 6px)`}} />}
      {/* página derecha con la foto pegada */}
      <div style={{...abs, left: 960, top: 540 - H / 2, width: W, height: H, transformOrigin: `0 ${H / 2}px`, transform: T(0), overflow: 'hidden', borderRadius: '0 10px 10px 0', background: `linear-gradient(90deg, ${mez(m.claro, m.os, 0.3)}, ${m.claro} 11%, ${mez(m.claro, m.os, 0.05)})`}}>
        <div style={{...abs, left: 62, top: 56, width: 606, height: 724, padding: 16, background: m.metalCl, boxShadow: '0 12px 22px rgba(25,14,4,.3)', transform: 'rotate(1.3deg)'}}><div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}><Encuadre id={f.id} foco={foco} zoom={1 + (fr - G > 0 ? (fr - G) * 0.0009 : 0)} filtro="contrast(1.06) saturate(1.12)" /></div></div>
      </div>
      {orden.filter((x) => !x.izq).map(({i, ang}) => (<div key={i} style={{...abs, left: 960, top: 540 - H / 2 - (i === 0 ? 8 : 0), width: W + (i === 0 ? 10 : 0), height: H + (i === 0 ? 16 : 0), transformOrigin: `0 ${H / 2 + (i === 0 ? 8 : 0)}px`, transform: T(ang)}}>{i === 0 ? tapa(false) : hoja(false, Math.abs(ang) / 90 * 0.24)}</div>))}
      {orden.filter((x) => x.izq).map(({i, ang}) => (<div key={i} style={{...abs, left: 960, top: 540 - H / 2 - (i === 0 ? 8 : 0), width: W + (i === 0 ? 10 : 0), height: H + (i === 0 ? 16 : 0), transformOrigin: `0 ${H / 2 + (i === 0 ? 8 : 0)}px`, transform: T(ang)}}>{i === 0 ? tapa(true) : hoja(true, (180 + ang) / 90 * 0.24)}</div>))}
      {/* página izquierda: las palabras, recién cuando la hoja se apoya */}
      {puesto && <div style={{...abs, left: 960 - W, top: 540 - H / 2, width: W, height: H, transformOrigin: `100% ${H / 2}px`, transform: T(0), overflow: 'hidden', borderRadius: '10px 0 0 10px', background: `linear-gradient(270deg, ${mez(m.claro, m.os, 0.3)}, ${m.claro} 11%, ${mez(m.claro, m.os, 0.05)})`}}>
        <div style={{...abs, left: 64, top: 90, width: 580, height: 660, display: 'flex', alignItems: 'center'}}><Bloque ac={ac} look={look} w={576} hLead={250} hGolpe={370} maxG={150} maxL={80} /></div>
      </div>}
      <div style={{...abs, left: 960 - 60, top: 540 - H / 2, width: 120, height: H, transformOrigin: `60px ${H / 2}px`, transform: T(0), background: 'linear-gradient(90deg, transparent, rgba(25,14,4,.26) 49%, rgba(25,14,4,.26) 51%, transparent)', opacity: abierto > 0.9 ? 1 : 0}} />
    </div>
    {/* luz que sale del libro */}
    <div style={{...abs, inset: 0, background: `radial-gradient(44% 58% at 50% 44%, ${alfa(mez(m.calido, m.claro, 0.6), 0.9)}, transparent 72%)`, opacity: luz * 0.85}} />
    {fr >= G - 4 && <Polvo n={12} color={m.claro} semilla="libro" />}
  </Salida>);
};

/** Copia instantánea: foto, banda blanca y una capa química que se revela. */
const Copia: React.FC<{f: FotoT; w: number; look: Look; revela?: number; children?: React.ReactNode}> = ({f, w, look, revela = 1, children}) => {
  const m = mat(look), pad = w * 0.05, ph = w * 0.9, foco = focoDe(f);
  return (<div style={{position: 'relative', width: w, padding: `${pad}px ${pad}px 0`, height: pad + ph + w * 0.27, background: `linear-gradient(160deg, ${m.metalCl}, ${m.claro} 60%, ${mez(m.claro, m.os, 0.1)})`, boxShadow: '0 22px 34px rgba(15,8,2,.5), 0 3px 6px rgba(15,8,2,.34)'}}>
    <div style={{position: 'relative', width: '100%', height: ph, overflow: 'hidden', background: m.os}}>
      <Encuadre id={f.id} foco={foco} filtro="contrast(1.05) saturate(1.1)" />
      <div style={{...abs, inset: 0, background: mez(m.claro, m.os, 0.3), opacity: 1 - revela}} />
      <div style={{...abs, inset: 0, background: 'linear-gradient(122deg, rgba(255,255,255,.2), transparent 32%)'}} />
    </div>
    {children}
  </div>);
};
const LUGARES: [number, number, number][] = [[292, 276, -9], [1628, 268, 7], [318, 806, 6], [1602, 812, -6]];

/* ═════════ INSTANTÁNEAS: caen sobre la mesa; en el golpe la última se estrella y se revela ═════════ */
const Polaroids: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), fs = ac.fotos.length ? ac.fotos : [{id: 'p001'}], heroe = fs[0], resto = fs.slice(1, 5), notas: any[] = (ac.datos && ac.datos.notas) || [];
  const entNota = salta(fr, a + 1, {damping: 14, stiffness: 130, mass: 0.75}), sH = salta(fr, G, {damping: 12, stiffness: 300, mass: 0.7}), tope = pulso(fr, G + 1, 18), revela = va(fr, G + 2, 20, 0, 1, curva.suave), emp = salta(fr, G + 1, {damping: 10, stiffness: 180, mass: 0.6}) * (fr >= G ? 1 : 0);
  const Gs = golpesDe(ac), tG = textoDe(Gs), L = leadsDe(ac), tL = textoDe(L), wH = 660, wC = 400, hH = wH * 1.22;
  return (<Salida ac={ac}>
    <Mesa look={look} dx={Math.sin(fr / 54) * 14} dy={tope * 11} inclina={18} />
    {/* la nota espera en el centro y la instantánea cae encima */}
    {L.length > 0 && <div style={{...abs, left: 960 - 400, top: 540 - 190, width: 800, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 34, background: `linear-gradient(165deg, ${m.claro}, ${m.cl})`, boxShadow: '0 18px 28px rgba(15,8,2,.42)', transform: `translateY(${(1 - entNota) * 780}px) rotate(${-2 + (1 - entNota) * -10}deg)`}}><Mano palabras={pals(L, a)} tam={cabe(tL, 720, 300, R_MANO, 1.04, 112, 52)} fuente={m.mano} color={m.os} ancho={728} alin="center" inter={1.04} /></div>}
    {resto.map((f, i) => { const lg = LUGARES[i], f0 = Math.round(a + 3 + ((G - a - 6) * i) / Math.max(1, resto.length)), s = salta(fr, f0, {damping: 13, stiffness: 190, mass: 0.75}), dx = lg[0] - 960, dy = lg[1] - 540, n = Math.hypot(dx, dy) || 1, ku = emp * 54, nota = notas[i] && notas[i].t;
      return (<div key={f.id + i} style={{...abs, left: lg[0] - wC / 2, top: lg[1] - wC * 0.62, opacity: lim((fr - f0) / 3, 0, 1), transform: `translate(${(dx / n) * ku}px,${(dy / n) * ku}px) rotate(${lg[2] + (1 - s) * 18 + emp * (i % 2 ? 3 : -3)}deg) scale(${1 + (1 - lim(s, 0, 1)) * 1.1})`}}><Copia f={f} w={wC} look={look}>{nota && <div style={{fontFamily: m.mano, fontWeight: 700, fontSize: cabe(nota, wC - 36, 80, R_MANO, 1, 66, 44), color: m.os, textAlign: 'center', lineHeight: `${wC * 0.24}px`, whiteSpace: 'nowrap'}}>{nota}</div>}</Copia></div>); })}
    {/* la protagonista */}
    {fr >= G - 1 && <div style={{...abs, left: 960 - wH / 2, top: 540 - hH / 2, opacity: lim((fr - G + 1) / 2, 0, 1), transform: `rotate(${-2.4 + (1 - sH) * 14 + Math.sin(fr / 44) * 0.4}deg) scale(${1 + (1 - sH) * 1.5 + (fr - G) * 0.00022})`}}>
      <Copia f={heroe} w={wH} look={look} revela={revela}><div style={{position: 'relative', height: wH * 0.27, display: 'flex', alignItems: 'center'}}><Mano palabras={pals(Gs, G)} tam={cabe(tG, wH - 80, wH * 0.2, R_MANO, 1, 130, 54)} fuente={m.mano} color={m.acento} ancho={wH - 66} alin="center" inter={1} /></div></Copia>
    </div>}
  </Salida>);
};

/* ═════════ MARCADOR: un marcador de verdad encierra el detalle en la foto y escribe al margen ═════════ */
const Marcador: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, b, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f), ent = salta(fr, a, {damping: 14, stiffness: 110, mass: 0.85});
  const FW = 1120, FH = 850, FX = 60, FY = 60, cx = FX + lim(foco[0], 0.3, 0.7) * FW, cy = FY + lim(foco[1], 0.32, 0.68) * FH, rx = 270, ry = 216;
  const cd = lim(G - a - 8, 8, 26), ini = G - cd, arco = elipseMano(cx, cy, rx, ry), dibu = trazo(arco, va(fr, ini, cd, 0, 1, curva.suave)), ax = cx + rx * 0.92, ay = cy - ry * 0.3, tx = 1208, ty = 640, flecha = curvaPts([ax, ay], [(ax + tx) / 2 + 40, Math.min(ay, ty) - 130], [tx, ty], 30), fl = trazo(flecha, va(fr, G, 10, 0, 1, curva.suave));
  const A0: P2 = [1990, 1160], tip: P2 = fr < ini ? [A0[0] + (arco[0][0] - A0[0]) * va(fr, Math.max(a, ini - 10), 10, 0, 1, curva.ios), A0[1] + (arco[0][1] - A0[1]) * va(fr, Math.max(a, ini - 10), 10, 0, 1, curva.ios)] : fr < G ? dibu.punta : fr < G + 10 ? fl.punta : [tx + (A0[0] - tx) * va(fr, G + 10, 12, 0, 1, curva.entra), ty + (A0[1] - ty) * va(fr, G + 10, 12, 0, 1, curva.entra)];
  const L = leadsDe(ac), Gs = golpesDe(ac), MW = 500, tamG = cabe(textoDe(Gs), MW, 380, R_MANO, 0.96, 190, 66), tamL = cabe(textoDe(L), MW, 290, R_MANO, 1.04, 88, 48), foca = va(fr, G, 12, 0, 1, curva.suave), z = 1 + 0.03 * foca + (fr - a) * 0.00016;
  const apoyo = Math.sin(fr * 1.4) * (fr >= ini && fr < G + 10 ? 2.4 : 0);
  return (<Salida ac={ac}>
    <Mesa look={look} dx={Math.sin(fr / 64) * 12} dy={Math.cos(fr / 80) * 8} inclina={20} />
    <div style={{...abs, left: 66, top: 42, width: 1788, height: 996, transformOrigin: `${cx}px ${cy}px`, transform: `translate(${(1 - ent) * -1960}px,${pulso(fr, G, 12) * 6}px) perspective(2500px) rotateX(${8 + Math.sin(fr / 70) * 1}deg) rotateY(${Math.sin(fr / 58) * 1.1}deg) rotate(${(1 - ent) * -14 - 1.1}deg) scale(${z})`, borderRadius: 8, background: `radial-gradient(90% 80% at 30% 20%, ${m.metalCl}, ${m.claro} 60%, ${mez(m.claro, m.os, 0.1)})`, boxShadow: '0 40px 66px rgba(15,8,2,.55)'}}>
      <div style={{...abs, left: FX, top: FY, width: FW, height: FH, overflow: 'hidden', boxShadow: `inset 0 0 0 2px ${alfa(m.os, 0.2)}`}}>
        <Encuadre id={f.id} foco={foco} filtro="contrast(1.06) saturate(1.12)" />
        <div style={{...abs, inset: 0, opacity: foca, background: `radial-gradient(${rx * 0.98}px ${ry * 0.98}px at ${cx - FX}px ${cy - FY}px, transparent 99%, rgba(24,14,5,.52) 100%)`}} />
      </div>
      <div style={{...abs, left: 1224, top: 72, width: MW, height: 300, display: 'flex', alignItems: 'flex-end'}}><Mano palabras={pals(L, a)} tam={tamL} fuente={m.mano} color={m.os} ancho={MW} inter={1.04} /></div>
      <div style={{...abs, left: 1224, top: 440, width: MW, height: 420, display: 'flex', alignItems: 'center'}}><Mano palabras={pals(Gs, a)} tam={tamG} fuente={m.mano} color={m.acento} ancho={MW} inter={0.96} /></div>
      <svg viewBox="0 0 1788 996" style={{...abs, inset: 0, width: 1788, height: 996, overflow: 'visible'}}>
        <polyline points={dibu.puntos} fill="none" stroke={m.acento} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" opacity={fr >= ini ? 0.96 : 0} />
        {fr >= G && <polyline points={fl.puntos} fill="none" stroke={m.acento} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />}
        {fr >= G + 9 && <polyline points={`${tx - 46},${ty - 50} ${tx},${ty} ${tx - 62},${ty + 18}`} fill="none" stroke={m.acento} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {/* el marcador */}
      {fr < b && <div style={{...abs, left: tip[0], top: tip[1], width: 0, height: 0, transform: `rotate(${38 + apoyo}deg)`}}>
        <div style={{...abs, left: -11, top: 0, width: 22, height: 40, borderRadius: '10px 10px 0 0', background: m.acento}} />
        <div style={{...abs, left: -24, top: 38, width: 48, height: 40, background: `linear-gradient(90deg, ${m.metalOs}, ${m.metalCl} 42%, ${m.metalOs})`, clipPath: 'polygon(26% 0,74% 0,100% 100%,0 100%)'}} />
        <div style={{...abs, left: -46, top: 76, width: 92, height: 400, borderRadius: 14, background: `linear-gradient(90deg, ${mez(m.acento, '#000000', 0.34)}, ${m.acento} 32%, ${mez(m.acento, '#ffffff', 0.4)} 46%, ${m.acento} 62%, ${mez(m.acento, '#000000', 0.42)})`, boxShadow: '26px 22px 34px rgba(15,8,2,.42)'}} />
        <div style={{...abs, left: -46, top: 214, width: 92, height: 94, background: m.claro, opacity: 0.86}} />
      </div>}
    </div>
  </Salida>);
};

/* ═════════ TAMIZ: las fotos se sacuden en el colador; en el golpe pasa una sola ═════════ */
const Tamiz: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), fs = ac.fotos.length ? ac.fotos : [{id: 'p001'}], gana = fs[0], ent = salta(fr, a, {damping: 14, stiffness: 100, mass: 0.85});
  const caida = salta(fr, G, {damping: 11, stiffness: 95, mass: 0.75}), impacto = G + 8, tope = pulso(fr, impacto, 20), sube = va(fr, G + 6, Math.max(6, Math.min(18, (ac.b - G - 8) * 0.7)), 0, 1, curva.suave), sacude = fr < G ? Math.sin(fr * 1.05) * (11 + Math.min(1, (fr - a) / 30) * 8) : Math.sin(fr * 2.3) * Math.exp(-(fr - G) / 8) * 16;
  const n = fs.length, tarjW = 330, cx = 960, cy = 270 + (1 - ent) * -700 - sube * 980, rx = 560, ry = 120, prof = 330, malla = `M ${cx - rx} ${cy} C ${cx - rx * 0.86} ${cy + prof * 1.25} ${cx + rx * 0.86} ${cy + prof * 1.25} ${cx + rx} ${cy} Z`;
  const motas = Array.from({length: 70}).map((_, i) => { const r = (s: string) => random(`tamiz-${s}-${i}`), T = 22 + r('t') * 18, k = ((fr + r('o') * T) % T) / T, xo = cx + (r('x') - 0.5) * 760; return {x: xo + sacude * 0.4, y: cy + prof * 0.86 + k * (880 - cy - prof * 0.86), o: Math.min(1, k * 7) * (1 - k * 0.5), l: 8 + r('l') * 26, w: 3 + r('w') * 4}; });
  const puff = Array.from({length: 26}).map((_, i) => { const r = (s: string) => random(`puff-${s}-${i}`), th = -Math.PI * r('a'), v = 150 + r('v') * 520, q = va(fr, impacto, 26, 0, 1, curva.expo); return {x: 960 + Math.cos(th) * v * q, y: 870 + Math.sin(th) * v * 0.56 * q, z: 18 + r('z') * 54, o: (1 - q) * 0.72}; });
  const pila = va(fr, a, Math.max(1, G - a), 0.25, 1, curva.suave), Gs = golpesDe(ac), L = leadsDe(ac), tL = textoDe(L), tG = textoDe(Gs), wF = 900, hF = 560, ban = 150;
  const xG0 = cx - ((n - 1) / 2) * 200 + 0 * 200, xF = xG0 + (960 - xG0) * caida, yF = 300 + (590 - 300) * caida, esc = (tarjW / wF) + (1 - tarjW / wF) * caida;
  return (<Salida ac={ac}>
    <FondoFoto id={gana.id} blur={38} brillo={0.66} />
    <div style={{...abs, inset: 0, background: alfa(m.cl, 0.2)}} />
    <div style={{...abs, left: -60, right: -60, top: 800, bottom: -30, background: `repeating-linear-gradient(90deg, rgba(0,0,0,.26) 0 3px, transparent 3px 260px), linear-gradient(180deg, ${m.maderaCl}, ${m.madera} 42%, ${m.maderaOs})`, boxShadow: `0 -5px 0 ${alfa(m.claro, 0.28)}`}} />
    {/* montoncito que crece */}
    <div style={{...abs, left: 960 - 400, top: 880, width: 800, height: 34, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,5,0,.5), transparent)', transform: `scaleX(${0.3 + pila * 0.7})`}} />
    <div style={{...abs, left: 960 - 370, top: 748, width: 740, height: 150, borderRadius: '50% 50% 46% 46% / 100% 100% 12% 12%', background: `radial-gradient(70% 120% at 42% 18%, ${m.metalCl}, ${m.claro} 48%, ${mez(m.claro, m.os, 0.26)})`, transform: `scale(${0.26 + pila * 0.74})`, transformOrigin: '50% 100%'}} />
    {L.length > 0 && fr < impacto + 2 && <div style={{...abs, left: 150, right: 150, top: 905, display: 'flex', justifyContent: 'center', opacity: 1 - va(fr, G + 2, 7, 0, 1), textShadow: '0 3px 10px rgba(15,8,2,.85)'}}><Mano palabras={pals(L, a)} tam={cabe(tL, 1560, 150, R_MANO, 1, 104, 54)} fuente={m.mano} color={m.claro} ancho={1600} alin="center" inter={1} /></div>}
    {/* colador */}
    {sube < 1 && <div style={{...abs, inset: 0, transform: `translateX(${sacude}px) rotate(${sacude * 0.04}deg)`, transformOrigin: `${cx}px ${cy}px`}}>
      <div style={{...abs, left: cx + rx - 22, top: cy - 26, width: 480, height: 40, borderRadius: 20, transform: 'rotate(-8deg)', transformOrigin: '0 50%', background: `linear-gradient(180deg, ${m.metalCl}, ${m.metal} 46%, ${m.metalOs})`, boxShadow: '0 14px 18px rgba(15,8,2,.5)'}} />
      <svg viewBox="0 0 1920 1080" style={{...abs, inset: 0, width: 1920, height: 1080}}><ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={alfa(m.os, 0.55)} stroke={m.metalOs} strokeWidth={20} /></svg>
      {fs.slice(1).map((f, i) => { const k = i + 1, x = cx - ((n - 1) / 2) * 200 + k * 200, s = salta(fr, a + 5 + k * 3, {damping: 12, stiffness: 150, mass: 0.7}); return <div key={f.id + i} style={{...abs, left: x - tarjW / 2, top: cy - 148 + (k % 2) * 34 + Math.sin(fr * 0.9 + k * 2) * 9, width: tarjW, height: 216, transform: `translateY(${(1 - s) * -820}px) rotate(${(k % 2 ? 7 : -7) + Math.sin(fr * 0.8 + k) * 3}deg)`, border: `9px solid ${m.claro}`, boxShadow: '0 12px 20px rgba(15,8,2,.5)', background: m.os, overflow: 'hidden'}}><Encuadre id={f.id} foco={focoDe(f)} filtro="brightness(.84) saturate(.82)" /></div>; })}
      {fr < G && <div style={{...abs, left: cx - ((n - 1) / 2) * 200 - tarjW / 2, top: cy - 128 + Math.sin(fr * 0.9) * 9, width: tarjW, height: 216, transform: `rotate(${-5 + Math.sin(fr * 0.8) * 3}deg) translateY(${(1 - salta(fr, a + 4, {damping: 12, stiffness: 150, mass: 0.7})) * -820}px)`, border: `9px solid ${m.claro}`, boxShadow: '0 12px 20px rgba(15,8,2,.5)', background: m.os, overflow: 'hidden'}}><Encuadre id={gana.id} foco={focoDe(gana)} /></div>}
      <svg viewBox="0 0 1920 1080" style={{...abs, inset: 0, width: 1920, height: 1080}}>
        <defs><pattern id="coc-malla" width="17" height="17" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="17" height="17" fill={alfa(m.metal, 0.16)} /><path d="M0 0H17M0 0V17" stroke={m.metalOs} strokeWidth="2.6" /></pattern></defs>
        <path d={malla} fill="url(#coc-malla)" stroke={m.metalOs} strokeWidth={8} />
        <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`} fill="none" stroke={m.metal} strokeWidth={26} strokeLinecap="round" />
        <path d={`M ${cx - rx + 12} ${cy + 4} A ${rx} ${ry} 0 0 0 ${cx + 40} ${cy + ry - 3}`} fill="none" stroke={m.metalCl} strokeWidth={7} strokeLinecap="round" />
      </svg>
    </div>}
    {/* harina que cae */}
    {fr < impacto + 8 && <svg viewBox="0 0 1920 1080" style={{...abs, inset: 0, width: 1920, height: 1080}}>{motas.map((p, i) => p.y < 1080 && <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={p.y + p.l} stroke={m.claro} strokeWidth={p.w} strokeLinecap="round" opacity={p.o * (fr < G + 5 ? 1 : 0.5)} />)}</svg>}
    {/* la foto que pasa */}
    {fr >= G && <div style={{...abs, left: xF - wF / 2, top: yF - (hF + ban) / 2, width: wF, height: hF + ban, padding: 22, paddingBottom: 0, background: `linear-gradient(160deg, ${m.metalCl}, ${m.claro})`, boxShadow: '0 34px 60px rgba(15,8,2,.6)', transform: `scale(${esc + Math.max(0, fr - impacto) * 0.00035}) rotate(${(1 - caida) * -10 - 1.6 + Math.sin(fr / 40) * 0.5}deg)`}}>
      <div style={{position: 'relative', width: '100%', height: hF - 22, overflow: 'hidden'}}><Encuadre id={gana.id} foco={focoDe(gana)} zoom={1.02 + Math.max(0, fr - G) * 0.0012} filtro="contrast(1.06) saturate(1.14)" /></div>
      <div style={{height: ban, display: 'flex', alignItems: 'center'}}><Mano palabras={pals(Gs, G)} tam={cabe(tG, wF - 70, ban - 12, R_MANO, 1, 128, 54)} fuente={m.mano} color={m.acento} ancho={wF - 44} alin="center" inter={1} /></div>
    </div>}
    {fr >= impacto && <Polvo n={14} color={m.claro} semilla="harina" />}
    {fr >= impacto && puff.map((p, i) => <div key={i} style={{...abs, left: p.x - p.z, top: p.y - p.z, width: p.z * 2, height: p.z * 2, borderRadius: '50%', background: `radial-gradient(closest-side, ${m.claro}, transparent)`, opacity: p.o}} />)}
  </Salida>);
};

/* ═════════ FRASCO: monedas una a una, la foto guardada adentro y la tapa que sella ═════════ */
const Frasco: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, G} = tiempos(ac), m = mat(look), f = fotoDe(ac.fotos), foco = focoDe(f), ent = salta(fr, a, {damping: 14, stiffness: 115, mass: 0.85}), etq = salta(fr, a + 6, {damping: 12, stiffness: 120, mass: 0.75});
  const CX = 1310, JW = 620, JH = 680, JT = 190, FI = 18, COL = 5, N = 28, totalPrevio = 20, WC = 110, HC = 46, p = pulso(fr, G, 16), impacto = G + 3;
  const coins = Array.from({length: N}).map((_, i) => {
    const previo = i < totalPrevio, f0 = previo ? Math.round(a + 4 + ((G - a - 6) * i) / totalPrevio) : G + (i - totalPrevio) * 0.9, fila = Math.floor(i / COL), desf = fila % 2 ? WC * 0.46 : 0;
    const x = CX - JW / 2 + 40 + (i % COL) * (WC - 2) + desf + (random(`f-x-${i}`) - 0.5) * 14, y = JT + JH - HC - 34 - fila * 40 + (random(`f-y-${i}`) - 0.5) * 9, s = salta(fr, f0, {damping: 12, stiffness: 200, mass: 0.55}), yy = y + (1 - Math.min(s, 1)) * -(y + 90), rot = (random(`f-r-${i}`) - 0.5) * 16 + (1 - s) * 220;
    return {i, x: lim(x, CX - JW / 2 + 28, CX + JW / 2 - WC - 28), y: yy, rot, vis: fr >= f0};
  });
  const tapa = salta(fr, impacto, {damping: 11, stiffness: 260, mass: 0.6}), giroTapa = va(fr, impacto, 12, 0, 1, curva.suave), balanceo = Math.sin(fr * 1.3) * Math.exp(-Math.max(0, fr - G) / 11) * (fr >= G ? 5.5 : 0), L = leadsDe(ac), Gs = golpesDe(ac);
  const moneda = (i: number) => { const oro = i % 3 === 0 ? mez(m.acento, m.claro, 0.3) : mez(m.acento, m.claro, 0.12); return (<>
    <div style={{...abs, left: 0, top: 11, width: WC, height: HC, borderRadius: '50%', background: mez(oro, '#000000', 0.42)}} />
    <div style={{...abs, left: 0, top: 0, width: WC, height: HC, borderRadius: '50%', background: `radial-gradient(ellipse at 36% 28%, ${mez(oro, '#ffffff', 0.5)}, ${oro} 52%, ${mez(oro, '#000000', 0.26)})`}} />
    <div style={{...abs, left: 16, top: 7, width: WC - 32, height: HC - 14, borderRadius: '50%', border: `3px solid ${alfa(mez(oro, '#000000', 0.45), 0.5)}`}} /></>); };
  return (<Salida ac={ac}>
    <FondoFoto id={f.id} blur={38} brillo={0.78} />
    <div style={{...abs, inset: 0, background: alfa(m.cl, 0.24)}} />
    <div style={{...abs, left: -40, right: -40, top: 868, height: 72, background: `linear-gradient(180deg, ${m.maderaCl}, ${m.madera})`, boxShadow: '0 22px 30px rgba(10,5,0,.5)'}} />
    <div style={{...abs, left: -40, right: -40, top: 940, bottom: -10, background: `linear-gradient(180deg, ${m.maderaOs}, ${mez(m.maderaOs, '#000000', 0.34)})`}} />
    {/* tarjeta atada con hilo */}
    <svg viewBox="0 0 1920 1080" style={{...abs, inset: 0, width: 1920, height: 1080, opacity: lim(etq * 2, 0, 1)}}><path d={`M ${CX - JW / 2 + 92} ${JT + 56} Q ${CX - JW / 2 - 90} ${JT + 180 + Math.sin(fr / 9) * 6 * (fr >= G ? 1 : 0.3)} ${860} ${262}`} fill="none" stroke={m.claro} strokeWidth={6} strokeLinecap="round" /></svg>
    <div style={{...abs, left: 110, top: 220, width: 760, height: 530, transformOrigin: '100% 8%', transform: `translateX(${(1 - etq) * -1000}px) rotate(${-2.4 + (1 - lim(etq, 0, 1.3)) * -18 + balanceo * 0.8}deg)`, borderRadius: 14, background: `linear-gradient(150deg, ${m.claro}, ${m.cl})`, boxShadow: '0 28px 44px rgba(10,5,0,.5)', padding: '44px 52px', display: 'flex', alignItems: 'center'}}>
      <div style={{...abs, right: 28, top: 26, width: 34, height: 34, borderRadius: '50%', background: mez(m.madera, m.os, 0.2), boxShadow: `inset 0 3px 6px rgba(0,0,0,.5), 0 0 0 7px ${m.calido}`}} />
      {L.length + Gs.length > 0 && <Bloque ac={ac} look={look} w={650} hLead={220} hGolpe={200} maxG={158} maxL={108} />}
    </div>
    {/* frasco */}
    <div style={{...abs, inset: 0, transformOrigin: `${CX}px ${JT + JH}px`, transform: `translateY(${(1 - ent) * 1000}px) rotate(${balanceo * 0.3}deg) scale(${1 + p * 0.016 + Math.max(0, fr - G) * 0.0005})`}}>
      <div style={{...abs, left: CX - JW * 0.56, top: JT + JH - 26, width: JW * 1.12, height: 62, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(10,5,0,.66), transparent)'}} />
      <div style={{...abs, left: CX - JW / 2, top: JT, width: JW, height: JH, borderRadius: '110px 110px 74px 74px', overflow: 'hidden', background: alfa(m.claro, 0.2), boxShadow: `inset 0 0 0 6px ${alfa(m.claro, 0.62)}, 0 0 44px ${alfa(m.claro, 0.16)}`}}>
        <div style={{...abs, left: FI, right: FI, top: FI + 54, bottom: FI, borderRadius: '96px 96px 62px 62px', overflow: 'hidden'}}><Encuadre id={f.id} foco={foco} zoom={1.06 + (fr - a) * 0.0004} filtro="contrast(1.05) saturate(1.14)" /></div>
      </div>
      {coins.filter((c) => c.vis).map((c) => <div key={c.i} style={{...abs, left: c.x, top: c.y, width: WC, height: HC + 12, transform: `rotate(${c.rot}deg)`}}>{moneda(c.i)}</div>)}
      {/* vidrio por delante */}
      <div style={{...abs, left: CX - JW / 2, top: JT, width: JW, height: JH, borderRadius: '110px 110px 74px 74px', background: 'linear-gradient(96deg, rgba(255,255,255,.34) 0, rgba(255,255,255,.1) 8%, transparent 14%, transparent 78%, rgba(255,255,255,.16) 88%, rgba(255,255,255,.3) 100%)'}} />
      <div style={{...abs, left: CX - JW / 2 + 56, top: JT + 72, width: 44, height: JH - 176, borderRadius: 24, background: 'linear-gradient(180deg, rgba(255,255,255,.52), rgba(255,255,255,.08))'}} />
      {/* cuello y tapa */}
      <div style={{...abs, left: CX - JW * 0.39, top: JT - 38, width: JW * 0.78, height: 62, borderRadius: 12, background: alfa(m.claro, 0.32), boxShadow: `inset 0 0 0 5px ${alfa(m.claro, 0.6)}`, backgroundImage: `repeating-linear-gradient(174deg, ${alfa(m.claro, 0.55)} 0 5px, transparent 5px 15px)`}} />
      <div style={{...abs, left: CX - JW * 0.43, top: JT - 76 + (1 - tapa) * -300, width: JW * 0.86, height: 92, borderRadius: 16, opacity: fr >= impacto - 2 ? 1 : 0, background: `repeating-linear-gradient(90deg, rgba(0,0,0,.14) ${0}px 4px, transparent 4px 26px), linear-gradient(180deg, ${m.metalCl}, ${m.metal} 40%, ${m.metalOs})`, backgroundPosition: `${giroTapa * 260}px 0, 0 0`, boxShadow: '0 12px 18px rgba(10,5,0,.45)'}} />
    </div>
  </Salida>);
};

export const OPS: Record<string, React.FC<OpProps>> = {coc_termometro: Termometro, coc_perilla: Perilla, coc_temporizador: Temporizador, coc_receta: Receta, coc_libro: Libro, coc_instantaneas: Polaroids, coc_marcador: Marcador, coc_tamiz: Tamiz, coc_frasco: Frasco};
