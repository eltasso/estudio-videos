// Motor de partitura: cada momento es una lista de ACTOS; cada acto es una operación premium ya resuelta.
// DeepSeek sólo elige operación, fotos, líneas (palabras dichas) y variante. Nada de esto se escribe por video.
import React from 'react';
import {useCurrentFrame, interpolate, random} from 'remotion';
import {F, Encuadre, Papel, FotoForma, mezcla, TextoFoto, TextoDetras, Tiras, Lente, Carrusel3D, FondoFoto, Losa, Palabras, Bloom, Polvo, Barrido, Vineta, Grano, va, salta, curva} from './kit';
import {Foto, Linea, Acto, Look, Partitura, Area, SERIF, ANCHO, fam, esSerif, SOMBRA, CLARO, golpeDe, tamQueEntra, zonaArea, Rotulo, Velo, entradaFoto} from './ops/base';
import {OPS_EXTRA} from './ops';


// ═══════════ OPERACIONES ═══════════

/** PLENO: foto a sangre con cámara que no para; la segunda foto entra en el golpe con un empujón. var "detras": el golpe queda detrás de los objetos (sólo foto con pared clara). */
const Pleno: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac);
  const A = ac.fotos[0], B = ac.fotos[1];
  const enB = !!B && fr >= G - 1;
  const ft = enB ? B : A, t0 = enB ? G - 1 : ac.a;
  const push = entradaFoto(fr, t0) * (1 + (fr - t0) * 0.0019) + interpolate(fr, [G, G + 4, G + 16], [0, 0.018, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const deriva = (enB ? -1 : 1) * (fr - t0) * 0.6;
  const foco = ft.foco || [0.5, 0.5];
  const detras = false && ac.var === 'detras' && !enB && A.clara;
  const area = zonaArea(ft.zona);
  const leads = ac.lineas.filter((l) => l.rol !== 'golpe'), golpes = ac.lineas.filter((l) => l.rol === 'golpe');
  const gtxt = golpes.map((l) => l.w.map((x) => x[0]).join(' ')).join(' ');
  const serif = esSerif(look.display);
  const gt = tamQueEntra(gtxt, 1500, look.display, 330, !serif);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${push}) translateX(${deriva}px)`, transformOrigin: `${foco[0] * 100}% ${foco[1] * 100}%`}}>
      <Encuadre id={ft.id} foco={foco} filtro="contrast(1.05) brightness(1.05)" />
      <Bloom id={ft.id} o={0.18} foco={foco} />
      {detras && golpes.length > 0 && <TextoDetras id={A.id} texto={serif ? gtxt : gtxt.toUpperCase()} x={area.alin === 'right' ? 1830 : area.alin === 'center' ? 960 : 90} anchor={area.alin === 'right' ? 'end' : area.alin === 'center' ? 'middle' : 'start'} y={area.y !== undefined ? 120 + gt * 0.9 : 1080 - 90} tam={gt} fuente={fam(look.display)} color={look.acento} umbral={0.55} recorte={va(fr, G, 12, 0.08, 1, curva.suave)} />}
    </div>
    {!detras || !golpes.length ? <Velo area={area} /> : <Velo area={zonaArea(A.zona === 'top' ? 'bottom-left' : 'top-left')} />}
    {detras ? (<Rotulo lineas={leads} area={zonaArea(area.y !== undefined ? 'bottom-left' : 'top-left')} look={look} sobreFoto />)
      : B ? (<>{fr < G - 1 && <Rotulo lineas={leads.filter((l) => l.w[0][1] < G)} area={zonaArea(A.zona)} look={look} sobreFoto hasta={G - 1} />}
        {fr >= G - 1 && <Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] >= G)} area={zonaArea(B.zona)} look={look} sobreFoto desde={G} />}</>)
      : <Rotulo lineas={ac.lineas} area={area} look={look} sobreFoto />}
  </div>);
};

/** PARED: la cámara vuela dentro de una pared infinita de fotos y la atraviesa al final del acto. Las líneas viven en una tarjeta de papel de la pared. */
const Pared: React.FC<{ac: Acto; look: Look; sig?: Foto}> = ({ac, look, sig}) => {
  const fr = useCurrentFrame(), {a, b} = ac, d = b - a;
  const W_ = 640, H_ = 420, GAP = 26;
  const ids = ac.fotos.length ? ac.fotos : [{id: 'p001'}];
  const celdas: [number, number][] = [];
  for (let f = -2; f <= 2; f++) for (let c = -3; c <= 3; c++) celdas.push([c, f]);
  const avance = va(fr, a, Math.min(48, d * 0.5), 0, 420, curva.suave) + va(fr, b - Math.min(30, d * 0.4), Math.min(30, d * 0.4), 0, 2400, curva.entra);
  const abre = va(fr, b - Math.min(34, d * 0.45), Math.min(26, d * 0.4), 0, 1, curva.entra);
  const ar = va(fr, b - Math.min(30, d * 0.4), Math.min(30, d * 0.4), 0.58, 1, curva.expo);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Papel color={look.papel} />
    {sig && fr >= b - 34 && <div style={{position: 'absolute', inset: 0, transform: `scale(${ar})`}}><Encuadre id={sig.id} filtro="contrast(1.04) brightness(1.02)" /></div>}
    <div style={{position: 'absolute', inset: 0, perspective: 1400, perspectiveOrigin: '50% 46%', opacity: fr >= b - 8 ? 0 : 1}}>
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `translateZ(${avance}px) rotateY(${interpolate(fr, [a, a + 60], [-7, 3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}deg) rotateX(2deg)`}}>
        {celdas.map(([c, f], i) => {
          const centro = c === 0 && f === 0, ft = ids[(i * 7 + 3) % ids.length];
          const ent = salta(fr, a + ((Math.abs(c) * 2 + Math.abs(f) * 3) | 0), {damping: 15, stiffness: 110, mass: 0.9});
          const z = (1 - ent) * -900 + ((i * 53) % 150) - 75, nx = c * (W_ + GAP), ny = f * (H_ + GAP);
          return (<div key={i} style={{position: 'absolute', left: 960 - W_ / 2, top: 540 - H_ / 2, width: W_, height: H_, boxShadow: '0 30px 60px rgba(40,28,12,.28)', transform: `translate3d(${nx * (1 + abre * 1.5)}px,${ny * (1 + abre * 1.5)}px,${z}px)`}}>
            {centro ? (<><Papel color={look.papel} /><Rotulo lineas={ac.lineas} area={{x: 38, y: 34, w: 564}} look={look} maxGolpe={128} lead={56} renglones={2} /></>) : <Encuadre id={ft.id} foco={ft.foco} />}
          </div>);
        })}
      </div>
    </div>
  </div>);
};

const centrar = (f?: number[]) => [((f || [.5, .5])[0] + 0.5) / 2, ((f || [.5, .5])[1] + 0.45) / 2];   // el foco por bordes se va a orejas/pelo: a mitad de camino del centro
const N = 24;
const circulo = (cx: number, cy: number, rx: number, ry: number): [number, number][] => Array.from({length: N}, (_, i) => { const t = (i / N) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]; });
const poli = (pts: [number, number][]): [number, number][] => { // reparte N puntos a lo largo del polígono
  const out: [number, number][] = []; const per = pts.length;
  for (let i = 0; i < N; i++) { const s = (i / N) * per, k = Math.floor(s), t = s - k, p = pts[k], q = pts[(k + 1) % per]; out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  return out;
};
const PLENO_ = poli([[0, 0], [100, 0], [100, 100], [0, 100]]);
const FORMAS: Record<string, [number, number][]> = {
  triangulo: poli([[71, 8], [71, 8], [96, 92], [46, 92]]),
  circulo: circulo(71, 50, 24 * 0.5625, 42),
  rombo: poli([[71, 6], [96, 50], [71, 94], [46, 50]]),
  arco: poli([[50, 92], [50, 40], [56, 18], [71, 8], [86, 18], [92, 40], [92, 92]]),
  franja: poli([[0, 7], [100, 7], [100, 47], [0, 47]]),
  columna: poli([[60, 0], [82, 0], [82, 100], [60, 100]]),
  ventana: poli([[48, 10], [94, 10], [94, 90], [48, 90]]),
  grieta: poli([[46, 4], [96, 4], [96, 96], [70, 96], [74, 60], [64, 44], [70, 22]]),
};
/** FORMA: la foto a sangre se recorta en una forma en el golpe y queda sobre papel; las líneas pasan al papel. var = triangulo|circulo|rombo|arco|franja|columna|ventana|grieta. */
const Forma: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], B = ac.fotos[1];
  const meta = FORMAS[ac.var || ''] || FORMAS.ventana;
  const t = salta(fr, G - 6, {damping: 17, stiffness: 120, mass: 1});
  const pts = mezcla(PLENO_, meta, t);
  const push = entradaFoto(fr, ac.a) * (1 + (fr - ac.a) * 0.0008);
  const franjaH = ac.var === 'franja';
  const enB = B && fr >= G + 26;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Papel color={look.papel} />
    <div style={{position: 'absolute', inset: 0, transform: `scale(${push}) rotate(${t * -2}deg)`, transformOrigin: franjaH ? '50% 25%' : '70% 50%', filter: `drop-shadow(0 ${30 * t}px ${40 * t}px rgba(40,26,10,${0.35 * t}))`}}>
      <FotoForma id={(enB ? B : A).id} puntos={pts} foco={centrar((enB ? B : A).foco)} dx={t * Math.max(-4, Math.min(40, meta.reduce((u, p) => u + p[0], 0) / meta.length - ((enB ? B : A).foco || [.5, .5])[0] * 100))} zoom={1.05 + t * 0.2} filtro="contrast(1.05) brightness(1.05)" />
    </div>
    {fr < G - 2 && <><Velo area={zonaArea(A.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] < G)} area={zonaArea(A.zona)} look={look} sobreFoto hasta={G - 2} /></>}
    {fr >= G - 2 && <Rotulo lineas={ac.lineas} area={franjaH ? {x: 90, y: 560, w: 1740} : {x: 90, y: 200, w: 800}} look={look} desde={G - 2} maxGolpe={franjaH ? 230 : 280} renglones={franjaH ? 1 : 3} />}
  </div>);
};

/** NUMERAL: salimos de ADENTRO de una palabra o número gigante relleno con la foto (46x a 1x). `texto` = la palabra dicha. Al lado, otra foto alta y las líneas. */
const Numeral: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], B = ac.fotos[1] || ac.fotos[0];
  const txt = (ac.texto || 'x').slice(0, 7);
  const fuente = /^[0-9+%,.]+$/.test(txt) || txt.length <= 2 ? F.ArchivoBlack : F.Anton;
  const k = fuente === F.ArchivoBlack ? 0.7 : 0.44;
  const tam = Math.min(1250, 980 / (txt.length * k));
  const esc = interpolate(fr, [G - 3, G + 22], [12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: curva.expo});
  const asienta = salta(fr, G + 18, {damping: 13, stiffness: 320, mass: 0.7});
  const antes = fr < G - 3;
  const NUM = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
  const limpia = (x: string) => x.toLowerCase().replace(/[^\w+%$]/g, '');
  const esNum = (x: string) => limpia(x) === txt.toLowerCase() || String(NUM.indexOf(limpia(x))) === txt;
  const resto = ac.lineas.map((l) => { const w = l.w.filter((x) => !esNum(x[0])); return {...l, w, rol: l.rol === 'golpe' && !w.some((x) => limpia(x[0]).length >= 4) ? 'lead' : l.rol}; }).filter((l) => l.w.length) as Linea[];
  const push = entradaFoto(fr, ac.a) * (1 + (fr - ac.a) * 0.0012);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    {antes ? (<>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${(A.foco || [.5, .5])[0] * 100}% ${(A.foco || [.5, .5])[1] * 100}%`}}><Encuadre id={A.id} foco={A.foco} filtro="contrast(1.05) brightness(1.05)" /></div>
      <Velo area={zonaArea(A.zona)} />
      <Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] < G)} area={zonaArea(A.zona)} look={look} sobreFoto />
    </>) : (<>
      <Papel color={look.papel} />
      <div style={{position: 'absolute', right: 0, top: 0, width: 800, height: 600, overflow: 'hidden', transform: `translateX(${(1 - salta(fr, G + 10, {damping: 17, stiffness: 110})) * 900}px) scale(${1 + (fr - G) * 0.0006})`, boxShadow: '0 40px 70px rgba(40,28,12,.28)'}}>
        <Encuadre id={B.id} foco={B.foco} zoom={1.1} filtro="brightness(1.05)" />
      </div>
      <div style={{position: 'absolute', left: 40, top: 0, height: 1080, width: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: '50% 55%', transform: `scale(${esc}) rotate(${(1 - asienta) * -4 + (fr - G) * 0.02}deg)`}}>
        <TextoFoto id={A.id} texto={txt} tam={tam} fuente={fuente} foco={A.foco} style={{lineHeight: 1.02, filter: 'drop-shadow(0 34px 44px rgba(50,34,14,.34)) contrast(1.06)'}} />
      </div>
      <Rotulo lineas={resto} area={{x: 1130, y: 650, w: 720}} look={look} desde={G + 12} maxGolpe={200} />
    </>)}
  </div>);
};

/** CARRUSEL: losas 3D que giran una posición en cada línea; el golpe enorme queda DETRÁS de las losas. */
const Carrusel: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), ids = ac.fotos.map((f) => f.id).slice(0, 7);
  const n = Math.max(3, ids.length);
  let giro = -0.14 + va(fr, ac.a, 24, 0, 0.14, curva.expo);
  for (const l of ac.lineas) giro += va(fr, l.w[0][1] - 4, 20, 0, 1 / n, (t) => 1 - Math.pow(1 - t, 3.2));
  giro += (fr - ac.a) * 0.0003;
  const serif = esSerif(look.display);
  const golpes = ac.lineas.filter((l) => l.rol === 'golpe'), gtxt = golpes.map((l) => l.w.map((x) => x[0]).join(' ')).join(' ');
  const baja = interpolate(fr, [G - 2, G + 14], [540, 700], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: curva.expo});
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#d9c9a8'}}>
    <FondoFoto id={ids[0]} blur={46} brillo={1.32} />
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,248,232,.5), rgba(255,244,222,.28))'}} />
    {fr >= G - 2 && gtxt && <div style={{position: 'absolute', top: 50, left: 40, right: 40, textAlign: 'center', fontFamily: fam(look.display), fontStyle: serif ? 'italic' : 'normal', fontSize: Math.min(300, tamQueEntra(gtxt, 1760, look.display, 300, !serif, 1)), lineHeight: 1, whiteSpace: 'nowrap', color: look.acento, transform: `scale(${0.82 + 0.18 * salta(fr, G - 2, {damping: 13, stiffness: 330, mass: 0.65})})`}}>{serif ? gtxt : gtxt.toUpperCase()}</div>}
    <Polvo n={16} color="#fff6e0" semilla={ids[0]} />
    <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + (fr - ac.a) * 0.0007})`, transformOrigin: '50% 58%'}}>
      <Carrusel3D ids={ids.length >= 3 ? ids : [...ids, ...ids, ...ids].slice(0, 4)} giro={giro} cy={baja} w={800} h={470} radioX={830} radioZ={700} entra={(i) => salta(fr, ac.a + 1 + i * 3, {damping: 16, stiffness: 120})} />
    </div>
    <Rotulo lineas={ac.lineas.filter((l) => l.rol !== 'golpe')} area={{x: 90, bottom: 60, w: 1100}} look={look} sobreFoto hasta={fr >= G - 2 ? 1e9 : 1e9} />
  </div>);
};

/** TIRAS: la foto llega armándose en tiras; en el golpe las tiras se abren y detrás aparece la segunda foto. var "horizontal" = persiana. */
const TirasOp: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], B = ac.fotos[1] || ac.fotos[0];
  const vertical = ac.var !== 'horizontal', n = 9;
  const abre = (i: number) => va(fr, G - 4 + Math.abs(i - (n - 1) / 2) * 1.2, 14, 0, 1, curva.entra);
  const arma = (i: number) => salta(fr, ac.a - 6 + i * 1.2, {damping: 18, stiffness: 220});
  const push = 1 + (fr - ac.a) * 0.0009;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Papel color={look.papel} />
    {fr >= G - 4 && <div style={{position: 'absolute', inset: 0, transform: `scale(${va(fr, G - 4, 22, 1.14, 1.02) + (fr - G) * 0.0008})`, transformOrigin: `${(B.foco || [.5, .5])[0] * 100}% 50%`}}><Encuadre id={B.id} foco={B.foco} filtro="contrast(1.05) brightness(1.05)" /></div>}
    {fr < G + 22 && <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`}}>
      <Tiras id={A.id} n={n} vertical={vertical} foco={A.foco} filtro="contrast(1.05) brightness(1.05)" tira={(i) => { const s = i % 2 ? 1 : -1, e = (1 - arma(i)) * 1100 * s + abre(i) * 1250 * s; return {transform: vertical ? `translateY(${e}px)` : `translateX(${e * 1.7}px)`}; }} />
    </div>}
    {fr < G - 2 && <><Velo area={zonaArea(A.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] < G)} area={zonaArea(A.zona)} look={look} sobreFoto hasta={G - 2} /></>}
    {fr >= G - 2 && <><Velo area={zonaArea(B.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] >= G)} area={zonaArea(B.zona)} look={look} sobreFoto /></>}
  </div>);
};

/** LENTE: un vidrio real recorre la foto y en el golpe se planta sobre el detalle, agrandándolo. */
const LenteOp: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0];
  const [fx, fy] = A.foco || [0.5, 0.5];
  const llega = salta(fr, G - 6, {damping: 14, stiffness: 140});
  
  const tx = Math.min(1600, Math.max(320, fx * 1920)), ty = Math.min(760, Math.max(320, fy * 1080));
  const cx = tx + (fx < 0.5 ? 1 : -1) * 260 * (1 - llega), cy = ty + 520 * (1 - llega);
  const sx = cx / 1920, sy = cy / 1080; // punto de la foto bajo el centro de la lente
  const r = 230 + 70 * llega;
  const area = fx < 0.5 ? {x: 1000, y: 120, w: 830, alin: 'right' as const} : {x: 90, y: 120, w: 830};
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${entradaFoto(fr, ac.a) * (1 + (fr - ac.a) * 0.0006)})`}}>
      <Encuadre id={A.id} filtro={`contrast(1.04) brightness(${1.02 - 0.12 * llega}) saturate(${1 - 0.25 * llega})`} />
    </div>
    <Velo area={area} />
    <Lente id={A.id} cx={cx} cy={cy} r={r} fx={sx} fy={sy} aumento={2.2 + 0.6 * llega} escala={salta(fr, ac.a, {damping: 14, stiffness: 140})} />
    <Rotulo lineas={ac.lineas} area={area} look={look} sobreFoto maxGolpe={260} />
  </div>);
};

/** PILA: las fotos caen con peso una sobre otra sobre el papel; cada caída sacude el cuadro. */
const Pila: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), fotos = ac.fotos.slice(0, 7), n = fotos.length;
  const t0 = ac.a + 2, paso = Math.max(5, (G - t0) / Math.max(1, n - 1));
  const caidas = fotos.map((_, i) => Math.round(t0 + i * paso));
  let tiembla = 0;
  for (const c of caidas) if (fr > c + 3 && fr < c + 17) tiembla += Math.sin((fr - c) * 2.3) * (c + 17 - fr) * 0.55;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Papel color={look.papel} />
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${tiembla}px) scale(${1 + (fr - ac.a) * 0.0008})`, transformOrigin: '65% 60%'}}>
      {fotos.map((f, i) => {
        const c = caidas[i]; if (fr < c - 6) return null;
        const p = salta(fr, c - 6, {damping: 12, stiffness: 300, mass: 0.75});
        const rot = (random(f.id + i) - 0.5) * 12, dx = (random(f.id + 'x') - 0.5) * 120, dy = (random(f.id + 'y') - 0.5) * 70;
        return (<div key={i} style={{position: 'absolute', left: 1150 - 470 + dx, top: 560 - 315 + dy, width: 940, height: 630, transform: `translateY(${(1 - p) * -1150}px) rotate(${rot * p + (1 - p) * rot * 2.5}deg) scale(${1.25 - 0.25 * p})`, boxShadow: '0 40px 70px rgba(40,28,12,.36), 0 0 0 14px #fbf7ef'}}>
          <Encuadre id={f.id} foco={f.foco} zoom={1.1} filtro="contrast(1.05) brightness(1.05)" />
        </div>);
      })}
    </div>
    <Rotulo lineas={ac.lineas} area={{x: 80, y: 200, w: 560}} look={look} maxGolpe={240} />
  </div>);
};

/** PLIEGUE: la mitad de arriba de la foto se dobla como una tapa en el golpe y del otro lado está la segunda foto. var "lado" = se dobla como una página. */
const Pliegue: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], B = ac.fotos[1] || ac.fotos[0];
  const lado = ac.var === 'lado';
  const g = interpolate(salta(fr, G - 5, {damping: 15, stiffness: 160, mass: 0.9}), [0, 1], [0, 180]);
  const mA = lado ? 'inset(0 50% 0 0)' : 'inset(0 0 50% 0)', mB = lado ? 'inset(0 0 0 50%)' : 'inset(50% 0 0 0)';
  const eje = lado ? 'rotateY' : 'rotateX', sig = lado ? 1 : -1;
  const sombra = Math.sin((g / 180) * Math.PI) * 0.5;
  const ft = (f: Foto) => <Encuadre id={f.id} foco={f.foco} filtro="contrast(1.05) brightness(1.05)" />;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#1d1710'}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${entradaFoto(fr, ac.a) * (1 + (fr - ac.a) * 0.0008)})`, perspective: 2200}}>
      <div style={{position: 'absolute', inset: 0, clipPath: mA}}>{ft(B)}</div>
      <div style={{position: 'absolute', inset: 0, clipPath: mB}}>{g < 180 ? ft(A) : ft(B)}<div style={{position: 'absolute', inset: 0, background: `rgba(20,12,4,${sombra})`}} /></div>
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transformOrigin: '50% 50%', transform: `${eje}(${sig * g}deg)`}}>
        <div style={{position: 'absolute', inset: 0, clipPath: mA, backfaceVisibility: 'hidden'}}>{ft(A)}<div style={{position: 'absolute', inset: 0, background: `rgba(255,248,230,${sombra * 0.5})`}} /></div>
        <div style={{position: 'absolute', inset: 0, clipPath: mB, backfaceVisibility: 'hidden', transform: `${eje}(180deg)`}}>{ft(B)}</div>
      </div>
    </div>
    {fr < G - 4 && <><Velo area={zonaArea(A.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] < G)} area={zonaArea(A.zona)} look={look} sobreFoto hasta={G - 4} /></>}
    {fr >= G + 4 && <><Velo area={zonaArea(B.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] >= G)} area={zonaArea(B.zona)} look={look} sobreFoto desde={G + 4} /></>}
  </div>);
};

/** CORTINA: antes y después; un borde duro en diagonal barre la foto A y deja la B, con un hilo de acento en el filo. */
const Cortina: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), A = ac.fotos[0], B = ac.fotos[1] || ac.fotos[0];
  const p = va(fr, G - 6, 16, 0, 1, curva.ios);
  const x = -300 + p * 2520; // filo inclinado
  const push = entradaFoto(fr, ac.a) * (1 + (fr - ac.a) * 0.001);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`}}><Encuadre id={A.id} foco={A.foco} filtro="contrast(1.05) brightness(1.04)" /></div>
    <div style={{position: 'absolute', inset: 0, clipPath: `polygon(0 0, ${x + 300}px 0, ${x}px 1080px, 0 1080px)`}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${1.12 - 0.08 * p + (fr - G) * 0.0006})`}}><Encuadre id={B.id} foco={B.foco} filtro="contrast(1.05) brightness(1.06)" /></div>
    </div>
    {p > 0 && p < 1 && <svg style={{position: 'absolute', inset: 0, width: 1920, height: 1080}}><line x1={x + 300} y1={0} x2={x} y2={1080} stroke={look.acento} strokeWidth={10} /></svg>}
    {fr < G - 6 && <><Velo area={zonaArea(A.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] < G)} area={zonaArea(A.zona)} look={look} sobreFoto hasta={G - 6} /></>}
    {fr >= G - 6 && <><Velo area={zonaArea(B.zona)} /><Rotulo lineas={ac.lineas.filter((l) => l.w[0][1] >= G)} area={zonaArea(B.zona)} look={look} sobreFoto desde={G} /></>}
  </div>);
};

/** COLUMNA: una columna alta de fotos sube como un libro de cuentas; frena de golpe en cada línea. Texto a la izquierda en papel. */
const Columna: React.FC<{ac: Acto; look: Look}> = ({ac, look}) => {
  const fr = useCurrentFrame(), fotos = ac.fotos.slice(0, 8), H_ = 640, GAP = 30;
  let y = (fr - ac.a) * 3;
  for (const l of ac.lineas) y += va(fr, l.w[0][1] - 6, 18, 0, H_ + GAP, curva.ios);
  const total = fotos.length * (H_ + GAP);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
    <Papel color={look.papel} />
    <div style={{position: 'absolute', left: 900, top: 0, width: 960, height: 1080, perspective: 1600}}>
      <div style={{position: 'absolute', inset: 0, transform: 'rotateY(-9deg) rotateZ(2deg)', transformStyle: 'preserve-3d'}}>
        {[0, 1, 2].flatMap((rep) => fotos.map((f, i) => {
          const top = 220 + (rep * fotos.length + i) * (H_ + GAP) - (y % total) - total;
          if (top > 1200 || top < -H_ - 100) return null;
          return <div key={rep + '-' + i} style={{position: 'absolute', left: 30, top, width: 900, height: H_, boxShadow: '0 30px 60px rgba(40,28,12,.3)'}}><Encuadre id={f.id} foco={f.foco} zoom={1.08} filtro="contrast(1.05) brightness(1.05)" /></div>;
        }))}
      </div>
    </div>
    <Rotulo lineas={ac.lineas} area={{x: 90, y: 220, w: 720}} look={look} maxGolpe={260} />
  </div>);
};

const OPS: Record<string, React.FC<{ac: Acto; look: Look}>> = {pleno: Pleno, pared: Pared, forma: Forma, numeral: Numeral, carrusel: Carrusel, tiras: TirasOp, lente: LenteOp, pila: Pila, pliegue: Pliegue, cortina: Cortina, columna: Columna};

export type {Partitura};
export const Pieza: React.FC<{s: Partitura}> = ({s}) => {
  const fr = useCurrentFrame();
  const k = Math.max(0, s.actos.findIndex((x) => fr >= x.a && fr < x.b)), ac = s.actos[fr >= s.frames ? s.actos.length - 1 : k];
  const Op: any = {...OPS, ...OPS_EXTRA}[ac.op] || Pleno, sig = s.actos[s.actos.indexOf(ac) + 1]?.fotos?.[0];
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: s.look.papel}}>
    <Op ac={ac} look={ac.look || s.look} sig={sig} />
    {s.actos.slice(1).map((x, i) => <Barrido key={i} f0={golpeDe(x) - 2} dur={18} o={0.42} />)}
    <Vineta o={0.12} />
    <Grano o={0.055} />
  </div>);
};
