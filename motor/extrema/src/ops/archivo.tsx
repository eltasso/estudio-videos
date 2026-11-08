// Familia archivo: el lenguaje documental. Documentos, expedientes, años, personas y pruebas como objetos físicos sobre la mesa.
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {OpProps, fam, esSerif} from './base';
import {Encuadre, Palabras, Barrido, FondoFoto, va, salta, curva} from '../kit';
import {materia, tiempos, partes, txt, cabe, renglonesDe, lerp, limita, alfa, mix, Mesa, Sale, Renglones, Clip, Grapa, Chinche, CORCHO, TINTA} from './archivo_kit';

const sacude = (fr: number, G: number, amp = 14) => { const t = fr - G; if (t < 0 || t > 16) return [0, 0]; const e = Math.exp(-t / 4.2) * amp; return [Math.sin(t * 2.6) * e * 0.7, Math.cos(t * 3.3) * e]; };
const pal = (l?: {w: [string, number][]}) => (l ? l.w : []) as [string, number][];

/** DOCUMENTO: una hoja cae sobre la mesa en perspectiva; en la palabra, la cámara se acerca y el marcador pasa sobre lo dicho. */
const Documento: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g, leads} = partes(ac), A = ac.fotos[0], B = ac.fotos[1] || A;
  const dT = look.display, ms = look.mono || 'SpecialElite', tl = txt(leads[0]) + (leads[1] ? ' ' + txt(leads[1]) : ''), tg = txt(g);
  const tamL = cabe(tl || 'x', 1030, ms, 74, 2), lineasL = tl ? renglonesDe(tl, 1030, ms, tamL) : 0, tamG = cabe(tg || 'x', 1020, dT, 210, 1, 72);
  const yL = 470, yG = yL + lineasL * tamL * 1.12 + (tl ? 34 : 0), anchoG = Math.min(1060, tg.length * tamG * ({Cormorant: 0.43, Playfair: 0.54, Fraunces: 0.55} as any)[dT] * 1.08 || 1060);
  const e = salta(fr, T.a, {damping: 15, stiffness: 92, mass: 0.95}), k = va(fr, T.G - 7, 22, 0, 1, curva.suave), ult = g ? g.w[g.w.length - 1][1] : T.G;
  const marca = va(fr, T.G + 1, Math.max(10, ult - T.G + 12), 0, 1, curva.suave), focoY = lerp(330, yG + tamG * 0.5, k), [sx, sy] = sacude(fr, T.G, 5);
  const rx = lerp(37, 13, k) + Math.sin(fr / 40) * 0.9, rz = lerp(-3.6, -1.2, k) + (1 - e) * -11, z = lerp(0.88, 1.2, k) + Math.sin(fr / 33) * 0.008, sub = (1 - e) * 820;
  return (<>
    <Mesa look={look} foto={B?.id} luz={[50, 50]} />
    <Sale b={T.b} sal={T.sal}><div style={{position: 'absolute', left: 390 + sx * 0.6, top: 520 - focoY + sub + sy * 0.6, width: 1180, height: 1600, background: M.hojaB, transformOrigin: `590px ${focoY}px`, transform: `perspective(2300px) rotateX(${rx}deg) rotateZ(${rz + 3.4}deg) scale(${z})`, boxShadow: '0 40px 70px rgba(0,0,0,.45)'}} /><div style={{position: 'absolute', left: 370 + sx, top: 500 - focoY + sub + sy, width: 1180, height: 1600, background: `linear-gradient(170deg, ${M.hoja}, ${M.hojaB})`, transformOrigin: `590px ${focoY}px`, transform: `perspective(2300px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${z})`, boxShadow: '0 70px 90px rgba(0,0,0,.5), 0 8px 14px rgba(0,0,0,.34)'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 790, height: 3, background: 'linear-gradient(90deg, rgba(0,0,0,.09), rgba(255,255,255,.5), rgba(0,0,0,.09))'}} />
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(330px 240px at 150px 1300px, ${alfa(M.tinta, 0.08)}, transparent), radial-gradient(240px 200px at 1020px 720px, ${alfa(M.tinta, 0.06)}, transparent)`}} />
      <Renglones x={84} y={92} w={490} n={6} paso={50} color={alfa(M.tinta, 0.16)} semilla="doc1" />
      {A ? <div style={{position: 'absolute', left: 640, top: 34, width: 490, height: 390, background: M.hoja, padding: 13, transform: 'rotate(3.4deg)', boxShadow: '0 14px 22px rgba(0,0,0,.4)'}}><div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}><Encuadre id={A.id} foco={A.foco} filtro="sepia(.35) contrast(1.04)" zoom={1.04 + 0.08 * k} /></div></div> : null}
      <Clip x={760} y={-26} color={M.metal} rot={3} h={170} />
      {tl ? <div style={{position: 'absolute', left: 84, top: yL}}><Palabras palabras={[...pal(leads[0]), ...pal(leads[1])]} tam={tamL} fuente={fam(ms)} color={M.tinta} ancho={1030} interlinea={1.12} tracking="0" /></div> : null}
      {g ? <><div style={{position: 'absolute', left: 74, top: yG + tamG * 0.2, height: tamG * 0.8, width: anchoG * marca, background: M.marcador, borderRadius: '10px 26px 16px 8px', transform: 'skewX(-5deg)'}} />
      <div style={{position: 'absolute', left: 84, top: yG}}><Palabras palabras={pal(g)} tam={tamG} fuente={fam(dT)} italica={esSerif(dT)} color={M.tinta} ancho={1600} interlinea={1} style={{whiteSpace: 'nowrap'}} /></div></> : null}
      <Renglones x={84} y={yG + tamG + 60} w={1000} n={9} paso={50} color={alfa(M.tinta, 0.16)} semilla="doc2" />
      {g && fr >= T.G - 2 ? (() => { const sal = va(fr, ult + 14, 9, 0, 1, curva.suave), lle = va(fr, T.G - 3, 5, 0, 1); return <div style={{position: 'absolute', left: 74 + anchoG * marca, top: yG + tamG * 0.68 - sal * 260, width: 560, height: 70, opacity: lle * (1 - sal), transformOrigin: '0 50%', transform: 'rotate(-34deg)', filter: 'drop-shadow(14px 26px 10px rgba(0,0,0,.34))'}}>
        <div style={{position: 'absolute', left: 0, top: 18, width: 42, height: 34, background: look.acento, clipPath: 'polygon(0 22%, 100% 0, 100% 100%, 0 78%)'}} />
        <div style={{position: 'absolute', left: 40, top: 8, width: 66, height: 54, background: `linear-gradient(180deg, ${M.metal}, ${M.metalB})`}} />
        <div style={{position: 'absolute', left: 104, top: 0, width: 456, height: 70, borderRadius: '0 20px 20px 0', background: `linear-gradient(180deg, ${mix(look.acento, '#ffffff', 0.34)}, ${look.acento} 48%, ${mix(look.acento, '#000000', 0.42)})`}} />
      </div>; })() : null}
    </div></Sale>
    <Barrido f0={T.G - 2} dur={20} o={0.32} />
  </>);
};

/** EXPEDIENTE: carpeta cerrada; en la palabra la tapa se abre y aparece la foto engrapada. */
const Expediente: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g, leads} = partes(ac), A = ac.fotos[0], B = ac.fotos[1];
  const d = ac.datos || {}, ms = look.mono || 'SpecialElite', dT = look.display, rot = (d.titulo as string) || txt(leads[0]) || '', tg = txt(g), tamG = cabe(tg || 'x', 600, dT, 150, 2, 50);
  const e = salta(fr, T.a, {damping: 15, stiffness: 95}), asoma = va(fr, T.G - 16, 14, 0, 9, curva.suave), abre = va(fr, T.G - 1, Math.max(8, Math.min(22, T.b - T.sal - T.G)), 0, 1, curva.ios), ang = asoma + (179 - asoma) * abre;
  const foto = salta(fr, T.G + 3, {damping: 12, stiffness: 190, mass: 0.7}), grapa = va(fr, T.G + 12, 4, 0, 1), [sx, sy] = sacude(fr, T.G + 12, 8), dx = lerp(-385, 0, abre), luz = Math.sin(limita(abre, 0, 1) * Math.PI);
  const sw = Math.sin(fr / 42) * 0.9, W = 760, H = 880, dorso = ang > 90;
  return (<>
    <Mesa look={look} foto={(B || A)?.id} luz={[50, 50]} />
    <Sale b={T.b} sal={T.sal}><div style={{position: 'absolute', inset: 0, transformOrigin: '960px 540px', transform: `translate(${dx + sx}px,${(1 - e) * 1000 + sy}px) perspective(2800px) rotateX(${10 + (1 - e) * 26}deg) rotateZ(${-1.2 + sw - (1 - e) * 8}deg) scale(${0.97 + 0.03 * abre + Math.sin(fr / 37) * 0.006})`}}>
      <div style={{position: 'absolute', left: 960, top: 110, width: W, height: H, background: `linear-gradient(160deg, ${M.carpeta}, ${mix(M.carpeta, M.tinta, 0.2)})`, borderRadius: '4px 16px 16px 4px', boxShadow: '0 60px 80px rgba(0,0,0,.55), 0 8px 12px rgba(0,0,0,.35)'}}>
        <div style={{position: 'absolute', left: 34, top: 30, width: W - 76, height: H - 60, background: `linear-gradient(170deg, ${M.hoja}, ${M.hojaB})`, boxShadow: '0 5px 12px rgba(0,0,0,.28)', transform: 'rotate(.7deg)'}}><Renglones x={52} y={716} w={560} n={3} paso={38} color={alfa(M.tinta, 0.18)} semilla="exp" /></div>
        {A ? <div style={{position: 'absolute', left: 70, top: 62, width: W - 148, height: 620, padding: 15, background: M.hoja, boxShadow: '0 16px 24px rgba(0,0,0,.42)', transform: `translateY(${(1 - foto) * -70}px) rotate(${-1.4 + (1 - foto) * 5}deg) scale(${1 + (1 - foto) * 0.1})`}}><div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}><Encuadre id={A.id} foco={A.foco} filtro={`sepia(.25) brightness(${1 + 0.18 * luz})`} zoom={1.03 + 0.05 * abre} /></div></div> : null}
        {grapa > 0 ? <Grapa x={W / 2 - 62} y={54} color={M.metal} /> : null}
        <div style={{position: 'absolute', inset: 0, opacity: 0.55 * luz, background: `radial-gradient(70% 60% at 0% 45%, ${alfa(M.hoja, 0.9)}, transparent 70%)`}} />
      </div>
      <div style={{position: 'absolute', left: 960, top: 110, width: W, height: H, transformOrigin: '0 50%', transform: `perspective(2300px) rotateY(${-ang}deg)`}}>
        <div style={{position: 'absolute', inset: 0, transform: dorso ? 'scaleX(-1)' : undefined}}>
          <div style={{position: 'absolute', right: dorso ? undefined : 56, left: dorso ? 56 : undefined, top: -56, width: 290, height: 62, borderRadius: '16px 16px 0 0', background: mix(M.carpeta, M.hoja, 0.14)}} />
          <div style={{position: 'absolute', inset: 0, borderRadius: dorso ? '16px 4px 4px 16px' : '4px 16px 16px 4px', background: `linear-gradient(${dorso ? 200 : 155}deg, ${mix(M.carpeta, M.hoja, 0.16)}, ${M.carpeta})`, boxShadow: 'inset 0 0 90px rgba(90,60,20,.22)'}} />
          {!dorso ? <>
            {rot ? <div style={{position: 'absolute', left: 90, right: 90, top: 330, minHeight: 200, background: M.hoja, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '26px 30px', transform: 'rotate(-1.2deg)', boxShadow: '0 3px 8px rgba(0,0,0,.3)'}}><div style={{fontFamily: fam(ms), color: M.tinta, fontSize: cabe(rot, 500, ms, 78, 2), textAlign: 'center', lineHeight: 1.12}}>{rot}</div></div> : null}
            <div style={{position: 'absolute', left: 372, top: 690, width: 26, height: 26, borderRadius: '50%', background: M.metal, boxShadow: '0 3px 4px rgba(0,0,0,.4)'}} />
            <div style={{position: 'absolute', left: 382, top: 700, width: 8, height: 180, background: look.acento, transform: 'rotate(4deg)', transformOrigin: 'top'}} />
          </> : <div style={{position: 'absolute', left: 60, right: 60, top: 60, bottom: 60, background: `linear-gradient(170deg, ${M.hoja}, ${M.hojaB})`, boxShadow: '0 4px 12px rgba(0,0,0,.28)', transform: 'rotate(-.9deg)', padding: '60px 38px'}}>
            <Renglones x={40} y={560} w={540} n={4} paso={42} color={alfa(M.tinta, 0.18)} semilla="ex2" />
            {leads.length ? <div style={{marginBottom: 26}}><Palabras palabras={leads.flatMap(pal)} tam={cabe(leads.map(txt).join(' '), 590, ms, 54, 2)} fuente={fam(ms)} color={M.tinta} ancho={590} tracking="0" /></div> : null}
            {g ? <Palabras palabras={pal(g).map(([t, f]) => [t, Math.max(f, T.G + 8)] as [string, number])} tam={tamG} fuente={fam(dT)} italica={esSerif(dT)} color={M.tintaA} ancho={600} interlinea={1} /> : null}
          </div>}
          <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.34 * Math.abs(Math.sin((ang * Math.PI) / 180))})`, borderRadius: 8}} />
        </div>
      </div>
    </div></Sale>
  </>);
};

/** AÑOS: la cámara viaja por un corredor de fotos y frena en cada fecha dicha; la última clava con la vía encendida. */
const Anios: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), d = ac.datos || {}, dT = look.display;
  const filas: any[] = (d.hitos && d.hitos.length ? d.hitos : ac.fotos.slice(0, 3).map((_: any, i: number) => ({t: '', en: T.a + ((T.G - T.a) * (i + 1)) / Math.max(1, Math.min(3, ac.fotos.length))})));
  const hs = filas.map((h, i) => ({t: String(h.t || ''), en: Math.max(T.a + 6, Number(h.en) || T.G), f: h.foto || ac.fotos[i % Math.max(1, ac.fotos.length)], X: i % 2 ? 500 : -500})), D = 960, f = 1000, n = hs.length;
  const p = hs.reduce((s, h) => s + salta(fr, h.en - 9, {damping: 19, stiffness: 92, mass: 0.82}), -1) + Math.sin(fr / 30) * 0.006, cz = p * D, i0 = limita(Math.floor(p), 0, n - 1), i1 = limita(i0 + 1, 0, n - 1), u = limita(p - i0, 0, 1), cx = lerp(p < 0 ? hs[0].X * 0.4 : hs[i0].X, hs[i1].X, p < 0 ? 0 : u) * 0.66;
  const hz = 330, piso = 590, sc = (z: number) => f / (f + z - cz), px = (X: number, z: number) => 960 + (X - cx) * sc(z), py = (Y: number, z: number) => hz + Y * sc(z), ult = hs[n - 1]?.en ?? T.G;
  const via = Array.from({length: 26}).map((_, j) => { const z = Math.floor(cz / 240 + j - 2) * 240; return z - cz > -f * 0.72 ? z : null; }).filter((z) => z !== null) as number[];
  const zN = cz - f * 0.72, zL = cz + 9000, x0 = (X: number, z: number) => px(X, z).toFixed(1), brillo = va(fr, ult, 18, 0, 1), zF = Math.min(p, n - 1) * D;
  const orden = hs.map((h, i) => ({...h, i, z: i * D})).sort((a, b) => b.z - a.z);
  const [sx, sy] = sacude(fr, ult, 6);
  return (<>
    <div style={{position: 'absolute', inset: 0, background: M.maderaB}}>
      {hs.map((h, i) => (h.f && Math.abs(p - i) < 1 ? <FondoFoto key={i} id={h.f.id} blur={44} brillo={0.72} style={{opacity: (1 - Math.abs(p - i)) * 0.62}} /> : null))}
      <div style={{position: 'absolute', left: 0, right: 0, top: hz, bottom: 0, background: `linear-gradient(180deg, ${alfa(mix(M.madera, look.claro || '#fff', 0.26), 0.92)}, ${alfa(M.maderaB, 0.98)} 72%)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: hz - 170, height: 340, background: `radial-gradient(52% 50% at 50% 50%, ${alfa(look.claro || '#fff', 0.36)}, transparent)`}} />
    </div>
    <Sale b={T.b} sal={T.sal}><div style={{position: 'absolute', inset: 0, transform: `translate(${sx}px,${sy}px)`}}>
      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
        <polygon points={`${x0(-44, zN)},${py(piso, zN)} ${x0(44, zN)},${py(piso, zN)} ${x0(44, zL)},${py(piso, zL)} ${x0(-44, zL)},${py(piso, zL)}`} fill={M.hoja} opacity={0.82} />
        {via.map((z) => { const m = (z / 240) % 4 === 0; return <polygon key={z} points={`${x0(-(m ? 170 : 110), z - 8)},${py(piso, z - 8)} ${x0(m ? 170 : 110, z - 8)},${py(piso, z - 8)} ${x0(m ? 170 : 110, z + 8)},${py(piso, z + 8)} ${x0(-(m ? 170 : 110), z + 8)},${py(piso, z + 8)}`} fill={M.hoja} opacity={Math.min(0.75, sc(z) * 0.95)} />; })}
        <polygon points={`${x0(-22, zN)},${py(piso, zN)} ${x0(22, zN)},${py(piso, zN)} ${x0(22, zF)},${py(piso, zF)} ${x0(-22, zF)},${py(piso, zF)}`} fill={look.acento} opacity={0.7 + 0.3 * brillo} />
      </svg>
      {orden.map((h) => { const dz = h.z - cz; if (dz < -f * 0.62 || dz > 3400) return null;
        const s = sc(h.z), W = 1040, H = 660, cxs = px(h.X, h.z), base = py(piso, h.z), ve = dz < -60 ? limita(1 - (-dz - 60) / 320, 0, 1) : 1, cerca = limita(1 - Math.abs(dz) / 700, 0, 1), dicho = fr >= h.en, pop = salta(fr, h.en, {damping: 11, stiffness: 240, mass: 0.6}), niebla = limita((dz / 2600) * 0.86, 0, 0.82);
        const tam = cabe(h.t || 'x', 700, dT, 190, 1, 80);
        return (<div key={h.i} style={{position: 'absolute', left: cxs - (W / 2) * s, top: base - H * s, width: W * s, height: H * s, opacity: ve}}>
          {h.f && dz < 1400 ? <div style={{position: 'absolute', left: 0, top: H * s + 2, width: W * s, height: H * s * 0.44, overflow: 'hidden', opacity: 0.3, WebkitMaskImage: 'linear-gradient(180deg, #000, transparent)', maskImage: 'linear-gradient(180deg, #000, transparent)'}}><div style={{position: 'absolute', left: 0, top: 0, width: W * s, height: H * s, transform: 'scaleY(-1)'}}><Encuadre id={h.f.id} foco={h.f.foco} filtro="sepia(.3)" /></div></div> : null}
          <div style={{position: 'absolute', left: W * s * 0.05, right: W * s * 0.05, bottom: -26 * s, height: 52 * s, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,.6), transparent)'}} />
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${s}) perspective(1500px) rotateY(${-Math.sign(h.X) * (9 * (1 - cerca))}deg)`, background: M.hoja, padding: 17, boxShadow: '0 24px 40px rgba(0,0,0,.5)'}}>
            <div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}>{h.f ? <Encuadre id={h.f.id} foco={h.f.foco} filtro="sepia(.3) contrast(1.05)" zoom={1.03 + cerca * 0.06} /> : null}<div style={{position: 'absolute', inset: 0, background: M.niebla, opacity: niebla}} /></div>
            {dicho && h.t ? <div style={{position: 'absolute', left: '50%', bottom: -30, padding: '6px 46px 12px', background: M.tinta, color: M.hoja, fontFamily: fam(dT), fontSize: tam, lineHeight: 1.08, whiteSpace: 'nowrap', borderBottom: `9px solid ${look.acento}`, boxShadow: '0 16px 26px rgba(0,0,0,.5)', transform: `translateX(-50%) translateY(${(1 - pop) * 50}px) scale(${0.72 + 0.28 * pop})`}}>{h.t}</div> : null}
          </div>
        </div>);
      })}
    </div></Sale>
    <Barrido f0={ult - 2} dur={20} o={0.34} />
  </>);
};

/** FOCO: la cámara se acerca, el fondo se apaga, una luz cae sobre la persona y su ficha llega volando. */
const Foco: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g} = partes(ac), A = ac.fotos[0], d = ac.datos || {}, dT = look.display, ms = look.mono || 'SpecialElite';
  const fx = A?.foco?.[0] ?? 0.5, fy = A?.foco?.[1] ?? 0.45, der = fx < 0.56, k = va(fr, T.G - 3, 16, 0, 1, curva.ios), z = 1.05 + 0.06 * va(fr, T.a, T.dur, 0, 1, curva.suave) + 0.46 * k + Math.sin(fr / 34) * 0.005;
  const tox = lerp(fx * 1920, der ? 540 : 1380, k), toy = lerp(fy * 1080, 520, k), tx = limita(tox - fx * 1920 * z, 1920 * (1 - z), 0), ty = limita(toy - fy * 1080 * z, 1080 * (1 - z), 0), cx = fx * 1920 * z + tx, cy = fy * 1080 * z + ty;
  const R = lerp(1500, 410, k), osc = 0.9 * k, flash = va(fr, T.G - 1, 3, 0, 1) * (1 - va(fr, T.G + 2, 12, 0, 1)), ent = va(fr, T.a, T.ent, 1.12, 1, curva.expo);
  const nombre: string = d.nombre || txt(g), filas: any[] = (d.filas || []).filter((x: any) => x && x.t).slice(0, 3), fi = T.G + 4, c = salta(fr, fi, {damping: 13, stiffness: 150, mass: 0.75});
  const CW = 660, CX = der ? 1190 : 70, CY = 300 - filas.length * 34, largo = 760, lin = va(fr, fi + 10, 14, 0, 1, curva.suave), bx0 = der ? CX + 6 : CX + CW - 6, by0 = CY + 110, ex = cx + (der ? 150 : -150), ey = cy - 30;
  return (<>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${ent})`}}><div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${tx}px,${ty}px) scale(${z})`}}>{A ? <Encuadre id={A.id} foco={A.foco} filtro={`contrast(1.04) saturate(${1 - 0.25 * k})`} /> : null}</div></div>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(${R}px ${R * 1.22}px at ${cx}px ${cy}px, transparent 42%, rgba(9,7,5,${osc * 0.72}) 72%, rgba(9,7,5,${osc}) 100%)`}} />
    {[1, 0.84, 0.68, 0.52, 0.36].map((m, i) => <div key={i} style={{position: 'absolute', inset: 0, opacity: 0.065 * k, background: `linear-gradient(180deg, ${alfa(look.claro || '#fff', 0.95)}, ${alfa(look.claro || '#fff', 0.12)})`, clipPath: `polygon(${cx - 90 * m}px 0, ${cx + 90 * m}px 0, ${cx + 420 * m}px ${cy + 520}px, ${cx - 420 * m}px ${cy + 520}px)`}} />)}
    <div style={{position: 'absolute', inset: 0, opacity: 0.5 * flash, background: `radial-gradient(520px 520px at ${cx}px ${cy}px, ${look.claro || '#fff'}, transparent 72%)`}} />
    <Sale b={T.b} sal={T.sal}>
      {lin > 0 && c > 0.3 ? <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}><path d={`M${bx0} ${by0} Q ${(bx0 + ex) / 2} ${by0 - 90} ${ex} ${ey}`} fill="none" stroke={look.oscuro ? look.acento : look.claro} strokeWidth={5} strokeLinecap="round" strokeDasharray={largo} strokeDashoffset={largo * (1 - lin)} /><circle cx={ex} cy={ey} r={13 * lin} fill={look.oscuro ? look.acento : look.claro} /></svg> : null}
      {fr >= fi ? <div style={{position: 'absolute', left: CX, top: CY, width: CW, background: `linear-gradient(168deg, ${M.hoja}, ${M.hojaB})`, padding: '56px 58px 50px', boxShadow: '0 44px 60px rgba(0,0,0,.65)', transformOrigin: der ? '100% 50%' : '0 50%', transform: `translateX(${(1 - c) * (der ? 760 : -760)}px) perspective(1400px) rotateY(${(1 - c) * (der ? 42 : -42)}deg) rotate(${(der ? 1.6 : -1.6) + (1 - c) * 8}deg)`}}>
        <div style={{position: 'absolute', left: CW / 2 - 22, top: 16, width: 44, height: 22, borderRadius: 12, background: 'rgba(0,0,0,.34)', boxShadow: 'inset 0 3px 5px rgba(0,0,0,.6)'}} />
        <div style={{fontFamily: fam(dT), fontStyle: esSerif(dT) ? 'italic' : undefined, color: M.tinta, fontSize: cabe(nombre, CW - 120, dT, 124, 2, 46), lineHeight: 1.02}}>{nombre}</div>
        <div style={{height: 6, width: 170, marginTop: 20, marginBottom: filas.length ? 20 : 0, background: look.acento, transformOrigin: '0 50%', transform: `scaleX(${va(fr, fi + 8, 12, 0, 1)})`}} />
        {filas.map((x, i) => { const f0 = Math.max(fi + 10 + i * 6, x.en ? Number(x.en) : 0), v = salta(fr, f0, {damping: 16, stiffness: 180}); return fr >= f0 ? <div key={i} style={{fontFamily: fam(ms), color: M.tinta, fontSize: cabe(String(x.t), CW - 130, ms, 56, 1, 44), lineHeight: 1.34, whiteSpace: 'nowrap', opacity: Math.min(1, v * 1.3), transform: `translateX(${(1 - v) * 26}px)`}}>{x.t}</div> : <div key={i} style={{height: 64}} />; })}
      </div> : null}
    </Sale>
  </>);
};

const SLOT: [number, number, number][] = [[400, 290, -5], [1530, 270, 4], [1500, 810, -3], [420, 815, 4], [960, 170, 2]];
/** CORCHO: fotos clavadas una a una con hilo; en la palabra la cámara se aleja y todos los hilos corren a la misma nota. */
const Corcho: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g} = partes(ac), d = ac.datos || {}, dT = look.display, ms = look.mano || 'Caveat';
  const filas: any[] = d.filas || [], ids = ac.fotos.slice(0, 5), n = ids.length, S = n === 3 ? [SLOT[0], SLOT[1], SLOT[4]] : SLOT, ini = T.a + Math.min(4, T.ent * 0.4), fin = Math.max(ini + 2, T.G - 12);
  const t = ids.map((_, i) => { const e = filas[i]?.en; return Math.min(T.G - 3, Number(e) || Math.round(lerp(ini, fin, n > 1 ? i / (n - 1) : 0))); });
  const ve = t.reduce((u, f, i) => (fr >= f ? i : u), 0), pull = va(fr, T.G - 2, 20, 0, 1, curva.ios), zI = 1.34, sigX = lerp(S[Math.max(0, ve - 1)][0], S[ve][0], va(fr, t[ve], 15, 0, 1, curva.suave)), sigY = lerp(S[Math.max(0, ve - 1)][1], S[ve][1], va(fr, t[ve], 15, 0, 1, curva.suave));
  const z = lerp(zI, 0.97, pull) + Math.sin(fr / 36) * 0.006, ox = lerp(960 - sigX * zI, 960 - 960 * 0.97, pull), oy = lerp(540 - sigY * zI, 540 - 540 * 0.97, pull), [sx, sy] = sacude(fr, T.G, 9);
  const NX = 960, NY = 575, nota = salta(fr, T.G, {damping: 12, stiffness: 230, mass: 0.7}), wob = Math.exp(-Math.max(0, fr - T.G - 8) / 7) * Math.sin(Math.max(0, fr - T.G - 8) * 1.2) * 22;
  const pin = (i: number): [number, number] => [S[i][0], S[i][1] - 148];
  const curvaH = (a: [number, number], b: [number, number], sag: number, u: number) => { const q: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag]; const B: [number, number] = [lerp(a[0], lerp(q[0], b[0], u), u), lerp(a[1], lerp(q[1], b[1], u), u)], C: [number, number] = [lerp(a[0], q[0], u), lerp(a[1], q[1], u)]; return `M${a[0]} ${a[1]} Q ${C[0]} ${C[1]} ${B[0]} ${B[1]}`; };
  const h = (i: number) => va(fr, t[i] + 4, 12, 0, 1, curva.suave), hc = (i: number) => va(fr, T.G + i * 2, 12, 0, 1, curva.ios), tam = cabe(txt(g) || 'x', 560, dT, 124, 2, 46);
  const Hilo: React.FC<{d: string; o?: number}> = ({d: p, o = 1}) => <><path d={p} fill="none" stroke="rgba(0,0,0,.32)" strokeWidth={8} strokeLinecap="round" transform="translate(5,10)" /><path d={p} fill="none" stroke={look.acento} strokeWidth={6.5} strokeLinecap="round" opacity={o} /></>;
  return (<>
    <div style={{position: 'absolute', inset: 0, background: M.maderaB}} />
    <Sale b={T.b} sal={T.sal}><div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${ox + sx}px,${oy + sy}px) scale(${z})`}}>
      <div style={{position: 'absolute', left: -320, top: -300, width: 2560, height: 1680, backgroundColor: M.corcho, backgroundImage: CORCHO}} />
      <div style={{position: 'absolute', left: -320, top: -300, width: 2560, height: 1680, background: `radial-gradient(42% 46% at 50% 47%, ${alfa(look.claro || '#fff', 0.28)}, transparent 72%), radial-gradient(66% 70% at 50% 50%, transparent 56%, rgba(0,0,0,.42) 100%)`}} />
      {ids.map((f, i) => { const c = salta(fr, t[i], {damping: 13, stiffness: 170, mass: 0.75}); if (fr < t[i]) return null; const [x, y, r] = S[i], et = filas[i]?.t as string | undefined;
        return <div key={f.id + i} style={{position: 'absolute', left: x - 200, top: y - 180, width: 400, height: 410, background: M.hoja, padding: '20px 20px 0', boxShadow: `${14 - 8 * c + 5}px ${44 - 28 * c}px ${34 - 16 * c}px rgba(0,0,0,.48)`, transformOrigin: '50% 8%', transform: `translateY(${(1 - c) * -120}px) scale(${1.28 - 0.28 * c}) rotate(${r + (1 - c) * 12 + (fr > T.G ? wob * 0.03 : 0)}deg)`, opacity: Math.min(1, c * 2.4)}}>
          <div style={{position: 'relative', width: 360, height: 318, overflow: 'hidden'}}><Encuadre id={f.id} foco={f.foco} filtro="sepia(.28) contrast(1.05)" zoom={1.06} /></div>
          {et ? <div style={{fontFamily: fam(ms), color: M.tinta, fontSize: cabe(et, 340, ms, 60, 1, 44), textAlign: 'center', lineHeight: '60px', whiteSpace: 'nowrap'}}>{et}</div> : null}
        </div>; })}
      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: 1920, height: 1080, overflow: 'visible'}}>
        {ids.slice(1).map((_, i) => (fr >= t[i + 1] + 4 ? <Hilo key={i} d={curvaH(pin(i), pin(i + 1), 75 * (1 - pull) + 18, h(i + 1))} o={lerp(1, 0.55, pull)} /> : null))}
        {fr >= T.G ? ids.map((_, i) => <Hilo key={'c' + i} d={curvaH(pin(i), [NX, NY - 118], wob * (i % 2 ? 1 : -1) * 0.6, hc(i))} />) : null}
      </svg>
      {ids.map((f, i) => (fr >= t[i] ? <Chinche key={i} x={pin(i)[0]} y={pin(i)[1]} color={look.acento} /> : null))}
      {g && fr >= T.G ? <div style={{position: 'absolute', left: NX - 320, top: NY - 142, width: 640, minHeight: 268, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '42px 34px 28px', background: `linear-gradient(170deg, ${M.hoja}, ${M.hojaB})`, boxShadow: '0 34px 46px rgba(0,0,0,.55)', transformOrigin: '50% 8%', transform: `scale(${1.5 - 0.5 * nota}) rotate(${-2 + (1 - nota) * -9}deg)`}}>
        <Palabras palabras={pal(g)} tam={tam} fuente={fam(dT)} italica={esSerif(dT)} color={M.tinta} ancho={570} alin="center" interlinea={1} />
      </div> : null}
      {fr >= T.G ? <Chinche x={NX} y={NY - 118} color={look.acento} r={24} /> : null}
    </div></Sale>
  </>);
};

/** FECHADOR: el sello con ruedas gira hasta armar lo dicho, cae con peso sobre el papel y al subir deja la tinta. */
const Fechador: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g, leads} = partes(ac), A = ac.fotos[0], d = ac.datos || {}, ms = look.mono || 'SpecialElite';
  const sello = String(d.sello || txt(g) || '').toUpperCase().slice(0, 14), n = Math.max(1, sello.length), w = Math.min(176, 1120 / n), fs = w * 1.16, hR = Math.max(190, fs * 1.3), NUM = '0123456789', LET = 'ABCDEFGHIJKLMNOPRSTUVY';
  const cae = va(fr, T.G - 4, 4, 0, 1, curva.entra), sube = va(fr, T.G + Math.min(7, (T.b - T.sal - T.G) * 0.25), Math.max(6, Math.min(18, (T.b - T.sal - T.G) * 0.7)), 0, 1, curva.ios), ant = va(fr, T.G - 15, 11, 0, 1, curva.suave) * (1 - cae), e = salta(fr, T.a, {damping: 16, stiffness: 100});
  const k = va(fr, T.G, 14, 0, 1, curva.ios), rx = lerp(42, 12, k), yP = lerp(440, 190, k), z = lerp(0.98, 1.1, k) + Math.sin(fr / 34) * 0.006, [sx, sy] = sacude(fr, T.G, 18), PW = 1260, PH = 800;
  const altoS = hR + 300, yBase = -150 + 40 * e, yGolpe = yP + 300 * 0.8 - altoS + 170, yS = fr < T.G ? lerp(yBase - (1 - e) * 700 - ant * 70, yGolpe, cae) : lerp(yGolpe, -altoS - 240, sube), tl = leads.map(txt).join(' ');
  const inked = fr >= T.G, tamS = cabe(sello || 'x', 860, ms, 200, 1, 74, true), anchoS = Math.min(1100, sello.length * tamS * 0.62 + 170), golpeInk = salta(fr, T.G, {damping: 18, stiffness: 300});
  return (<>
    <Mesa look={look} foto={A?.id} luz={[50, 62]} />
    <Sale b={T.b} sal={T.sal}>
      <div style={{position: 'absolute', left: 960 - PW / 2 + sx, top: yP + sy + (1 - e) * 700, width: PW, height: PH, background: `linear-gradient(170deg, ${M.hoja}, ${M.hojaB})`, transformOrigin: '50% 30%', transform: `perspective(2100px) rotateX(${rx}deg) rotateZ(${-1.6 + Math.sin(fr / 45) * 0.5}deg) scale(${z})`, boxShadow: '0 60px 80px rgba(0,0,0,.5), 0 8px 12px rgba(0,0,0,.34)'}}>
        {A ? <div style={{position: 'absolute', left: 70, top: 64, width: 520, height: 400, padding: 14, background: M.hoja, boxShadow: '0 10px 20px rgba(0,0,0,.36)', transform: 'rotate(-2deg)'}}><div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}><Encuadre id={A.id} foco={A.foco} filtro="sepia(.3) contrast(1.05)" /></div></div> : null}
        {tl ? <div style={{position: 'absolute', left: 650, top: 90}}><Palabras palabras={leads.flatMap(pal)} tam={cabe(tl, 530, ms, 74, 3, 50)} fuente={fam(ms)} color={M.tinta} ancho={530} interlinea={1.14} tracking="0" /></div> : <Renglones x={650} y={90} w={520} n={7} paso={54} color={alfa(M.tinta, 0.17)} semilla="fe" />}
        <Renglones x={70} y={640} w={1100} n={3} paso={46} color={alfa(M.tinta, 0.17)} semilla="fe2" />
        {inked ? <div style={{position: 'absolute', left: PW / 2 - anchoS / 2, top: 800 - tamS * 1.5 - 56, width: anchoS, height: tamS * 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(-5deg) scale(${1.08 - 0.08 * golpeInk})`, border: `11px solid ${M.tintaA}`, outline: `4px solid ${M.tintaA}`, outlineOffset: 8, borderRadius: 18, color: M.tintaA, WebkitMaskImage: TINTA, maskImage: TINTA, background: alfa(look.acento, 0.05)}}><div style={{fontFamily: fam(ms), fontSize: tamS, lineHeight: 1, whiteSpace: 'nowrap', letterSpacing: '.02em'}}>{sello}</div></div> : null}
      </div>
      <div style={{position: 'absolute', left: 960 - (n * w + 150) / 2 + sx * 0.4, top: yS, width: n * w + 150, height: altoS}}>
        <div style={{position: 'absolute', left: '50%', top: -420, width: 310, height: 540, marginLeft: -155, borderRadius: '150px 150px 34px 34px', background: `linear-gradient(90deg, ${M.maderaB}, ${mix(M.maderaB, look.claro || '#fff', 0.34)} 34%, ${M.maderaB} 90%)`}} />
        <div style={{position: 'absolute', left: '50%', top: 118, width: 136, height: 100, marginLeft: -68, background: `linear-gradient(90deg, ${M.metalB}, ${M.metal} 36%, ${M.metalB})`}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 210, height: hR + 44, borderRadius: 16, background: `linear-gradient(180deg, ${M.metal}, ${M.metalB} 70%)`, boxShadow: '0 26px 40px rgba(0,0,0,.5), inset 0 3px 2px rgba(255,255,255,.34)'}}>
          <div style={{position: 'absolute', left: 75, right: 75, top: 22, height: hR, background: '#0b0a09', display: 'flex', overflow: 'hidden', borderRadius: 6}}>
            {Array.from({length: n}).map((_, i) => { const c = sello[i] === ' ' ? ' ' : sello[i], f0 = lerp(T.a + T.ent * 0.5, T.G - 6, n > 1 ? i / (n - 1) : 1), v = va(fr, T.a, Math.max(3, f0 - T.a), 12 + i * 3, 0, curva.suave), ent = Math.floor(v), fra = v - ent, SIG = /\d/.test(c) ? NUM : LET, ch = (j: number) => (j === 0 || c === ' ' ? c : SIG[Math.floor(random(`fe-${i}-${j}`) * SIG.length)]);
              return <div key={i} style={{position: 'relative', width: w, height: hR, borderRight: '2px solid #000', background: `linear-gradient(180deg, ${M.metalB}, ${M.hoja} 46%, ${M.hojaB} 58%, ${M.metalB})`}}>
                {[ent + 1, ent].map((j, q) => <div key={q} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fam(ms), color: M.tinta, fontSize: fs, lineHeight: 1, transform: `translateY(${(q === 0 ? fra - 1 : fra) * hR}px)`}}>{ch(j)}</div>)}
              </div>; })}
          </div>
        </div>
        <div style={{position: 'absolute', left: 20, right: 20, top: 210 + hR + 44, height: 44, borderRadius: '0 0 10px 10px', background: `linear-gradient(180deg, ${M.metalB}, ${look.acento})`}} />
      </div>
    </Sale>
    <Barrido f0={T.G} dur={16} o={0.24} />
  </>);
};

/** BALANZA: dos fotos en los platos, duda mientras se habla; en la palabra un plato vence y el otro se apaga. */
const Balanza: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g} = partes(ac), A = ac.fotos[0], B = ac.fotos[1] || ac.fotos[0], d = ac.datos || {}, dT = look.display, ms = look.mono || 'SpecialElite';
  const gana = d.gana === 'b' ? 1 : -1, L = 610, PY = 262, CH = 400, duda = Math.sin((fr - T.a) / 7.5) * 3.4 * (1 - va(fr, T.G - 3, 6, 0, 1)), res = salta(fr, T.G, {damping: 7.5, stiffness: 92, mass: 0.9}), th = duda + res * 12.5 * gana, rad = (th * Math.PI) / 180;
  const tA = Math.min(Number(d.en_a) || T.a + 3, T.G - 6), tB = Math.min(Number(d.en_b) || Math.round(lerp(T.a + 3, T.G - 4, 0.5)), T.G - 3), e = salta(fr, T.a, {damping: 16, stiffness: 105}), orb = Math.sin(fr / 46) * 3.2;
  const lado = (s: -1 | 1, f: any, et: string | undefined, t0: number) => { const ex = 960 + s * L * Math.cos(rad), ey = PY + s * L * Math.sin(rad), py = ey + CH, x = ex, cae = salta(fr, t0, {damping: 12, stiffness: 180, mass: 0.75}), pierde = s === gana ? 0 : va(fr, T.G + 3, 16, 0, 1), W = 450, H = 320, gano = s === gana ? res : 0, tam = et ? cabe(et, 400, ms, 72, 1, 44, true) : 0;
    return (<React.Fragment key={s}>
      <svg viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>{[-268, 268].map((o) => <line key={o} x1={ex} y1={ey} x2={x + o} y2={py} stroke={M.laton} strokeWidth={6} />)}</svg>
      {fr >= t0 ? <div style={{position: 'absolute', left: x - W / 2, top: py - H - 12 + (1 - cae) * -46, width: W, height: H, padding: 11, background: M.hoja, boxShadow: '0 10px 14px rgba(0,0,0,.42)', opacity: Math.min(1, cae * 3), transform: `scale(${1.14 - 0.14 * cae}) rotate(${(1 - cae) * 4 * s}deg)`}}><div style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}><Encuadre id={f.id} foco={f.foco} filtro={`sepia(.22) brightness(${1 - 0.52 * pierde + 0.08 * gano}) saturate(${1 - 0.7 * pierde})`} zoom={1.04} /></div></div> : null}
      <div style={{position: 'absolute', left: x - 290, top: py - 18, width: 580, height: 50, borderRadius: '50%', background: `linear-gradient(180deg, ${M.hoja}, ${M.laton} 28%, ${M.latonB} 80%)`, boxShadow: '0 16px 22px rgba(0,0,0,.42), inset 0 2px 1px rgba(255,255,255,.4)'}} />
      {et && fr >= t0 ? <div style={{position: 'absolute', left: x - 260, width: 520, top: py + 38, textAlign: 'center', fontFamily: fam(ms), fontSize: tam, lineHeight: 1.1, whiteSpace: 'nowrap', color: look.claro, opacity: 1 - 0.55 * pierde, textShadow: '0 3px 14px rgba(0,0,0,.65)'}}>{et.toUpperCase()}</div> : null}
    </React.Fragment>); };
  const tg = txt(g), tamG = cabe(tg || 'x', 490, dT, 88, 2, 44);
  return (<>
    <Mesa look={look} foto={A?.id} luz={[50, 40]} />
    <Sale b={T.b} sal={T.sal}><div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - e) * 900}px) perspective(2300px) rotateY(${orb}deg) rotateX(2deg) scale(.95)`}}>
      <div style={{position: 'absolute', left: 960 - 30, top: PY, width: 60, height: 760, background: `linear-gradient(90deg, ${M.latonB}, ${M.hoja} 26%, ${M.laton} 44%, ${M.latonB})`}} />
      <div style={{position: 'absolute', left: 960 - 270, top: 955, width: 540, height: 90, borderRadius: '50%', background: `linear-gradient(180deg, ${M.laton}, ${M.latonB})`, boxShadow: '0 22px 34px rgba(0,0,0,.55)'}} />
      {lado(-1, A, d.a, tA)}
      {lado(1, B, d.b, tB)}
      <div style={{position: 'absolute', left: 960 - L - 14, top: PY - 15, width: 2 * L + 28, height: 30, borderRadius: 15, background: `linear-gradient(180deg, ${M.hoja}, ${M.laton} 34%, ${M.latonB})`, boxShadow: '0 14px 16px rgba(0,0,0,.42)', transform: `rotate(${th}deg)`}} />
      <div style={{position: 'absolute', left: 960 - 48, top: PY - 48, width: 96, height: 96, borderRadius: '50%', background: `radial-gradient(circle at 36% 30%, ${M.hoja}, ${M.laton} 44%, ${M.latonB})`, boxShadow: '0 12px 18px rgba(0,0,0,.45)'}} />
      {g && fr >= T.G ? <div style={{position: 'absolute', left: 960 - 275, width: 550, top: 800, minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 20px', background: M.tinta, borderBottom: `8px solid ${look.acento}`, boxShadow: '0 18px 30px rgba(0,0,0,.55)', transform: `scale(${0.84 + 0.16 * salta(fr, T.G, {damping: 12, stiffness: 240})})`}}><Palabras palabras={pal(g)} tam={tamG} fuente={fam(dT)} italica={esSerif(dT)} color={M.hoja} ancho={500} alin="center" interlinea={1} /></div> : null}
    </div></Sale>
  </>);
};

const PlanaDiario: React.FC<{W: number; H: number; titulo: [string, number][]; tam: number; A: any; bajada: [string, number][]; look: any; M: any; semilla: string}> = ({W, H, titulo, tam, A, bajada, look, M, semilla}) => {
  const ms = look.mono || 'SpecialElite', tb = bajada.map((x) => x[0]).join(' '), dT = look.display;
  return (<div style={{position: 'absolute', inset: 0, background: `linear-gradient(170deg, ${M.hoja}, ${M.hojaB})`}}>
    <div style={{position: 'absolute', left: 44, right: 44, top: 28, height: 11, background: M.tinta}} /><div style={{position: 'absolute', left: 44, right: 44, top: 46, height: 3, background: M.tinta}} />
    <div style={{position: 'absolute', left: 44, right: 44, top: 66, display: 'flex', justifyContent: 'center'}}><Palabras palabras={titulo} tam={tam} fuente={fam(dT)} color={M.tinta} ancho={W - 88} alin="center" interlinea={1} tracking="-0.01em" peso={700} /></div>
    <div style={{position: 'absolute', left: 44, right: 44, top: 66 + tam * (Math.max(1, renglonesDe(titulo.map((x) => x[0]).join(' '), (W - 88) / 1.22, dT, tam))) + 18, height: 3, background: M.tinta}} />
    {(() => { const yF = 66 + tam * renglonesDe(titulo.map((x) => x[0]).join(' '), (W - 88) / 1.22, dT, tam) + 42; return (<>
      {A ? <div style={{position: 'absolute', left: 44, top: yF, width: 730, height: H - yF - 36, overflow: 'hidden', background: '#222'}}><Encuadre id={A.id} foco={A.foco} filtro="grayscale(.85) contrast(1.16) sepia(.12)" zoom={1.03} /></div> : null}
      <div style={{position: 'absolute', left: 806, right: 44, top: yF}}>{tb ? <Palabras palabras={bajada} tam={cabe(tb, W - 850, ms, 58, 4, 44)} fuente={fam(ms)} color={M.tinta} ancho={W - 850} interlinea={1.14} tracking="0" /> : null}</div>
      <Renglones x={806} y={tb ? H - 175 : yF + 8} w={W - 850} n={tb ? 3 : 10} paso={42} color={alfa(M.tinta, 0.2)} semilla={semilla} />
    </>); })()}
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.22))'}} />
  </div>);
};
/** DIARIO: el periódico llega girando desde el fondo y clava el titular en la palabra; la foto ya está impresa. */
const Diario: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), T = tiempos(ac), M = materia(look), {g, leads} = partes(ac), A = ac.fotos[0], B = ac.fotos[1] || A, dT = look.display, W = 1290, H = 960, dos = !!leads.length && T.G - T.a > 52 && ac.fotos.length > 1;
  const gira = (L: number, s: number, rotF: number, x: number, y: number, esc: number) => { const p = va(fr, L - s, s, 0, 1, curva.suave), rot = lerp(rotF + 900, rotF, p), z = lerp(0.03, esc, p); return {style: {position: 'absolute' as const, left: 960 - W / 2 + x, top: 540 - H / 2 + y, width: W, height: H, opacity: fr >= L - s ? 1 : 0, boxShadow: '0 60px 80px rgba(0,0,0,.55), 0 6px 10px rgba(0,0,0,.4)', transform: `perspective(2500px) rotateX(${(1 - p) * 40 + 9}deg) rotate(${rot}deg) scale(${z})`}}; };
  const sG = Math.max(8, Math.min(leads.length ? 28 : 64, T.G - T.a)), [sx, sy] = sacude(fr, T.G, 20), tg = txt(g), tamT = cabe(tg || 'x', W - 170, dT, 158, tg.length > 12 ? 2 : 1, 66, true), L1 = T.a + Math.min(24, Math.max(10, (T.G - T.a) * 0.42));
  const tl = leads.map(txt).join(' '), tamL = cabe(tl || 'x', W - 96, dT, 124, 2, 72), z = 1 + va(fr, T.G, T.b - T.G, 0, 0.09, curva.suave) + Math.sin(fr / 33) * 0.004;
  return (<>
    <Mesa look={look} foto={B?.id} luz={[50, 46]} polvo={7} />
    <Sale b={T.b} sal={T.sal}><div style={{position: 'absolute', inset: 0, transformOrigin: '50% 46%', transform: `translate(${sx}px,${sy}px) scale(${z})`}}>
      {dos ? <div {...gira(L1, Math.round(L1 - T.a), -7, -64, -8, 0.88)}><PlanaDiario W={W} H={H} titulo={leads.flatMap(pal).map(([t, f]) => [t, Math.max(f, L1)] as [string, number])} tam={tamL} A={B} bajada={[]} look={look} M={M} semilla="d1" /><div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${va(fr, T.G - 2, 6, 0, 0.34)})`}} /></div> : null}
      <div {...gira(T.G, sG, 2.4, 22, 18, 0.94)}><PlanaDiario W={W} H={H} titulo={pal(g).map(([x, f]) => [x.toUpperCase(), f] as [string, number])} tam={tamT} A={A} bajada={dos ? [] : leads.flatMap(pal)} look={look} M={M} semilla="d2" /></div>
    </div></Sale>
    <Barrido f0={T.G - 1} dur={18} o={0.3} />
  </>);
};

export const OPS: Record<string, React.FC<OpProps>> = {arc_documento: Documento, arc_expediente: Expediente, arc_anios: Anios, arc_foco: Foco, arc_corcho: Corcho, arc_fechador: Fechador, arc_balanza: Balanza, arc_diario: Diario};
