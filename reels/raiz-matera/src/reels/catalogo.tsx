// REEL 4 — Publicidad: "Todo lo que tu mate estaba esperando." Cortes al ritmo de la música (folk_alegre, 92 pulsos/min en 6/8).
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../marca';
import {Bloque, Centro, Cierre, duracion, Escena, Etiqueta, FotoCard, FotoFondo, Palabras, Sfx} from '../kit';
import {Mate, useDibujo} from '../ilus';
import {Reel} from './comun';
import {Voz, vf} from '../voz';

const COMPAS = (120 / 92) * 30;          // 2 pulsos de negra con puntillo = 39.13 frames
const P = (k: number) => Math.round(k * COMPAS);
const tramo = (desde: number, n: number) => P(desde + n) - P(desde);

const Gancho: React.FC<{dur: number}> = ({dur}) => {
  const dib = useDibujo(26, 30);
  return (
    <Escena dur={dur} entrada="ninguna" salida="ninguna">
      <Centro top={330}>
        <Palabras texto={'Todo lo que\ntu mate estaba\n*esperando.*'} tam={116} anim="pop" cada={COMPAS / 6} />
      </Centro>
      <Centro top={760}>
        <Etiqueta texto="Mates · Bombillones · Termos · Materas" desde={40} tam={30} color={C.dorado} />
      </Centro>
      <Centro top={880}>
        <Mate dib={dib} ancho={460} />
      </Centro>
      <Sfx src="impacto" en={0} vol={0.7} />
      <Sfx src="pop" en={6} vol={0.35} />
      <Sfx src="pop" en={40} vol={0.4} />
    </Escena>
  );
};

const Producto: React.FC<{dur: number; nombre: string; foto: string; detalle?: string; rot?: number; abajo?: boolean}> = ({dur, nombre, foto, detalle, rot = 0, abajo = true}) => (
  <Escena dur={dur} entrada="ninguna" salida="ninguna">
    <Centro top={300}>
      <Palabras texto={nombre} tam={nombre.length > 14 ? 96 : 118} anim="golpe" cada={2} />
      {detalle && (<><div style={{height: 14}} /><Etiqueta texto={detalle} desde={6} tam={30} /></>)}
    </Centro>
    <FotoCard src={foto} x={540} y={1070} ancho={660} alto={890} rot={rot} desde={0} desdeAbajo={abajo} zoom={[1.0, 1.12]} />
  </Escena>
);

const Imperial: React.FC<{dur: number}> = ({dur}) => (
  <Escena dur={dur} entrada="ninguna" salida="ninguna">
    <FotoFondo src="imperial_cerca.jpg" zoom={[1.35, 1.1]} foco="45% 50%" oscuro={0.3} />
    <Centro top={330}>
      <Palabras texto="*Imperial*" tam={150} anim="golpe" />
      <div style={{height: 20}} />
      <Etiqueta texto="Borde labrado · forrado en cuero" desde={8} tam={32} color={C.crema} />
    </Centro>
  </Escena>
);

const Kits: React.FC<{dur: number}> = ({dur}) => {
  const b = COMPAS / 2;
  return (
    <Escena dur={dur} entrada="ninguna" salida="zoom">
      <Centro top={320}>
        <Palabras texto={'Kits materos\n*personalizados*'} tam={112} anim="golpe" cada={3} />
      </Centro>
      <FotoCard src="matera_grande.jpg" x={290} y={1080} ancho={400} alto={540} rot={-10} desde={b} />
      <FotoCard src="termo.jpg" x={790} y={1080} ancho={400} alto={540} rot={10} desde={b * 2} />
      <FotoCard src="combo.jpg" x={540} y={1040} ancho={440} alto={600} rot={0} desde={b * 3} />
    </Escena>
  );
};

// cada sección dura compases enteros (los cortes caen siempre sobre el pulso) y se estira si la voz lo necesita
const R = 'reel4-catalogo';
const VOZ_EN = 3;
const SECC = [
  {k: 'gancho', base: 2, voz: 'g'}, {k: 'bomb', base: 1, voz: 'bomb'}, {k: 'torp', base: 1, voz: 'torp'}, {k: 'imp', base: 2, voz: 'imp'},
  {k: 'termo', base: 1, voz: 'termo'}, {k: 'matera', base: 1, voz: 'matera'}, {k: 'combo', base: 1, voz: 'combo'}, {k: 'kits', base: 3, voz: 'kits'},
].reduce((acc, x) => {
  const n = Math.max(x.base, Math.ceil((VOZ_EN + vf(R, x.voz) + 3) / COMPAS));
  const desde = acc.length ? acc[acc.length - 1].desde + acc[acc.length - 1].n : 0;
  return [...acc, {...x, n, desde}];
}, [] as {k: string; base: number; voz: string; n: number; desde: number}[]);
const T = Object.fromEntries(SECC.map((x) => [x.k, tramo(x.desde, x.n)])) as Record<string, number>;
const CIERRE = Math.max(170, 6 + vf(R, 'cierre') + 26);
export const bloquesCatalogo: Bloque[] = [
  {dur: T.gancho, el: <Gancho dur={T.gancho} />},
  {dur: T.bomb, el: <Producto dur={T.bomb} nombre="Bombillones" foto="bombillones.jpg" rot={-3} />},
  {dur: T.torp, el: <Producto dur={T.torp} nombre="Torpedo de algarrobo" foto="torpedo.jpg" rot={3} abajo={false} />},
  {dur: T.imp, el: <Imperial dur={T.imp} />},
  {dur: T.termo, el: <Producto dur={T.termo} nombre="Termos" foto="termo.jpg" rot={-3} />},
  {dur: T.matera, el: <Producto dur={T.matera} nombre="Materas de cuero" foto="matera_grande.jpg" rot={3} abajo={false} />},
  {dur: T.combo, el: <Producto dur={T.combo} nombre="Combos" foto="combo.jpg" rot={-2} />},
  {dur: T.kits, el: <Kits dur={T.kits} />},
  {dur: CIERRE, el: <><Cierre dur={CIERRE} titulo={'Tu ritual,\n*tu raíz.*'} boton="Pedí el tuyo por DM" /><Voz reel={R} id="cierre" en={6} /></>, solapa: 6},
];
export const duracionCatalogo = duracion(bloquesCatalogo);

// efectos a nivel reel: whoosh que "llega" justo en cada corte, y la voz entrando sobre el pulso de cada sección
const CORTES = SECC.slice(1).map((x) => P(x.desde));
export const ReelCatalogo: React.FC = () => (
  <AbsoluteFill>
    <Reel bloques={bloquesCatalogo} cierre={CIERRE} />
    {CORTES.map((c, i) => <Sfx key={c} src={i % 2 ? 'whoosh_corto' : 'whoosh'} en={c - (i % 2 ? 6 : 10)} vol={0.55} />)}
    {CORTES.map((c) => <Sfx key={`p${c}`} src="pop" en={c + 2} vol={0.3} />)}
    {SECC.map((x) => <Voz key={x.k} reel={R} id={x.voz} en={P(x.desde) + VOZ_EN} />)}
  </AbsoluteFill>
);
