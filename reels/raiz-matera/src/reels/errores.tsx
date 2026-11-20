// REEL 2 — "3 errores que arruinan tu mate" (+ bonus que lleva a los productos). Formato lista: el que más se guarda y comenta.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {C} from '../marca';
import {Bloque, Centro, Cierre, duracion, Escena, Etiqueta, FotoCard, Numero, Palabras, Sello, Sfx, useSacudida} from '../kit';
import {Mate, Pava, useDibujo} from '../ilus';
import {Reel, Texto} from './comun';
import {Voz, vf} from '../voz';

// tiempos atados a la duración de cada frase de la voz en off
const R = 'reel2-errores';
const v = (id: string) => vf(R, id);
const TG = (() => { const g1 = 2; const g2 = Math.max(44, g1 + v('g1') + 4); return {g1, g2, dur: Math.max(84, g2 + v('g2') + 12)}; })();
const T1 = (() => { const a = 6; const b = Math.max(76, a + v('e1a') + 6); return {a, b, dur: Math.max(175, b + v('e1b') + 14)}; })();
const T2 = (() => { const a = 6; const b = Math.max(70, a + v('e2a') + 6); return {a, b, dur: Math.max(165, b + v('e2b') + 14)}; })();
const T3 = (() => {
  const a = 6; const b = Math.max(72, a + v('e3a') + 6);
  const BIEN = Math.max(100, b + v('e3b') + 8); const c = BIEN + 8;
  return {a, b, BIEN, c, dur: Math.max(BIEN + 120, c + v('e3c') + 14)};
})();
const TB = (() => { const a = 4; const b = Math.max(70, a + v('b1') + 6); return {a, b, dur: Math.max(160, b + v('b2') + 16)}; })();
const CIERRE = Math.max(170, 6 + v('cierre') + 26);

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Gancho: React.FC<{dur: number}> = ({dur}) => {
  const sac = useSacudida([0, 14], 24);
  return (
    <Escena dur={dur} entrada="ninguna" salida="zoom">
      <AbsoluteFill style={{transform: sac}}>
        <Centro top={300}>
          <Numero n="3" tam={560} desde={0} />
        </Centro>
        <Centro top={930}>
          <Palabras texto={'errores que *arruinan*\ntu mate'} tam={112} anim="golpe" desde={12} cada={3} />
        </Centro>
        <Centro top={1375}>
          <Etiqueta texto="¿Cuántos hacés vos?" desde={TG.g2} color={C.crema} tam={40} />
        </Centro>
      </AbsoluteFill>
      <Sfx src="impacto" en={0} vol={0.9} />
      <Sfx src="whoosh_corto" en={10} vol={0.6} />
      <Sfx src="bombo" en={14} vol={0.7} />
      <Sfx src="pop" en={TG.g2} vol={0.5} />
      <Voz reel={R} id="g1" en={TG.g1} />
      <Voz reel={R} id="g2" en={TG.g2} />
    </Escena>
  );
};

// encabezado común de cada error
const Cabeza: React.FC<{n: number; titulo: string}> = ({n, titulo}) => (
  <Centro top={330}>
    <Etiqueta texto={`Error ${n} de 3`} desde={2} color={C.rojo} />
    <div style={{height: 18}} />
    <Palabras texto={titulo} tam={104} desde={4} cada={3} acento={C.dorado} />
  </Centro>
);

const Error1: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const dib = useDibujo(6, 20);
  const meneo = f > 26 && f < 72 ? Math.sin((f - 26) * 0.9) * 14 : 0;
  const sac = useSacudida([68], 14);
  return (
    <Escena dur={dur} entrada="derecha" salida="izquierda">
      <Cabeza n={1} titulo="Mover la *bombilla*" />
      <AbsoluteFill style={{transform: sac}}>
        <Centro top={630}>
          <Mate dib={dib} ancho={540} angBombilla={meneo} montania={1 - interpolate(f, [26, 72], [0, 0.6], cl)} />
        </Centro>
        <div style={{position: 'absolute', left: 680, top: 1060}}>
          <Sello tipo="mal" desde={68} tam={210} />
        </div>
      </AbsoluteFill>
      <Centro top={1400}>
        <Texto texto={'Tapa el filtro y lava la yerba. *Ponela una vez* y no la toques más.'} desde={T1.b} />
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.6} />
      <Sfx src="maquina" en={28} vol={0.5} />
      <Sfx src="maquina" en={46} vol={0.45} />
      <Sfx src="error" en={68} vol={0.7} />
      <Voz reel={R} id="e1a" en={T1.a} />
      <Voz reel={R} id="e1b" en={T1.b} />
    </Escena>
  );
};

const Error2: React.FC<{dur: number}> = ({dur}) => {
  const dib = useDibujo(6, 20);
  const sac = useSacudida([60], 14);
  return (
    <Escena dur={dur} entrada="derecha" salida="izquierda">
      <Cabeza n={2} titulo="Cebar con agua *hirviendo*" />
      <AbsoluteFill style={{transform: sac}}>
        <Centro top={720}>
          <Pava dib={dib} ancho={680} vapor={1} burbujas={1} />
        </Centro>
        <div style={{position: 'absolute', left: 690, top: 1060}}>
          <Sello tipo="mal" desde={60} tam={210} />
        </div>
      </AbsoluteFill>
      <Centro top={1400}>
        <Texto texto={'Quema la yerba y el mate sale amargo. Lo ideal: *entre 70° y 80°.*'} desde={T2.b} />
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.6} />
      <Sfx src="chisporroteo" en={14} vol={0.5} />
      <Sfx src="error" en={60} vol={0.7} />
      <Voz reel={R} id="e2a" en={T2.a} />
      <Voz reel={R} id="e2b" en={T2.b} />
    </Escena>
  );
};

const LUGARES = [130, 272, 168, 255, 118, 210];
const Error3: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const dib = useDibujo(6, 20);
  const {BIEN} = T3;
  const mal = f >= 22 && f < Math.min(BIEN - 14, T3.b + 50);
  const bien = f >= BIEN && f < BIEN + 60;
  const x = mal ? LUGARES[Math.floor((f - 22) / 8) % LUGARES.length] : 224;
  const montania = f < BIEN - 12 ? 1 - interpolate(f, [22, 70], [0, 0.75], cl) : interpolate(f, [BIEN - 12, BIEN], [0.25, 1], cl);
  const sac = useSacudida([70], 14);
  return (
    <Escena dur={dur} entrada="derecha" salida="zoom">
      <Cabeza n={3} titulo="Cebar en *cualquier lado*" />
      <AbsoluteFill style={{transform: sac}}>
        <Centro top={670}>
          <Mate dib={dib} ancho={540} montania={montania}>
            {(mal || bien) && (
              <g>
                <rect x={x - 6} y={-70} width={12} height={216} rx={6} fill="url(#chorro)" />
                <circle cx={x - 12} cy={140 - (f % 6) * 2} r={5} fill="#bfe0f0" opacity={0.8} />
                <circle cx={x + 14} cy={138 - (f % 5) * 2} r={4} fill="#bfe0f0" opacity={0.8} />
              </g>
            )}
          </Mate>
        </Centro>
        <div style={{position: 'absolute', left: 700, top: 1090}}>
          {f < BIEN - 6 ? <Sello tipo="mal" desde={70} tam={200} /> : <Sello tipo="bien" desde={BIEN + 20} tam={200} />}
        </div>
      </AbsoluteFill>
      <Centro top={1410}>
        {f < BIEN - 6 ? (
          <Texto texto="La montañita se moja entera y el mate se lava rápido." desde={T3.b} />
        ) : (
          <Texto texto={'Cebá *siempre en el mismo lugar*, junto a la bombilla: rinde muchísimo más.'} desde={BIEN + 10} />
        )}
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.6} />
      <Sfx src="cebar" en={22} vol={0.6} />
      <Sfx src="cebar" en={44} vol={0.5} />
      <Sfx src="error" en={70} vol={0.7} />
      <Sfx src="whoosh_corto" en={BIEN - 8} vol={0.5} />
      <Sfx src="cebar" en={BIEN} vol={0.6} />
      <Sfx src="acierto" en={BIEN + 20} vol={0.7} />
      <Voz reel={R} id="e3a" en={T3.a} />
      <Voz reel={R} id="e3b" en={T3.b} />
      <Voz reel={R} id="e3c" en={T3.c} />
    </Escena>
  );
};

const Bonus: React.FC<{dur: number}> = ({dur}) => (
  <Escena dur={dur} entrada="zoom" salida="zoom">
    <Centro top={320}>
      <Etiqueta texto="Bonus" desde={0} />
      <div style={{height: 18}} />
      <Palabras texto={'Tomar mate en\n*cualquier cosa*'} tam={104} desde={4} cada={3} />
    </Centro>
    <FotoCard src="torpedo.jpg" x={300} y={1030} ancho={380} alto={510} rot={-9} desde={30} />
    <FotoCard src="mate_vela.jpg" x={780} y={1030} ancho={380} alto={510} rot={9} desde={40} />
    <FotoCard src="imperial.jpg" x={540} y={990} ancho={420} alto={570} rot={0} desde={50} />
    <Centro top={1400}>
      <Texto texto={'Tu momento merece *un mate a su altura.*'} desde={TB.b} tam={52} />
    </Centro>
    <Sfx src="whoosh" en={0} vol={0.5} />
    <Sfx src="whoosh_corto" en={28} vol={0.6} />
    <Sfx src="whoosh_corto" en={38} vol={0.6} />
    <Sfx src="whoosh_corto" en={48} vol={0.6} />
    <Sfx src="campana" en={TB.b} vol={0.4} />
    <Voz reel={R} id="b1" en={TB.a} />
    <Voz reel={R} id="b2" en={TB.b} />
  </Escena>
);

export const bloquesErrores: Bloque[] = [
  {dur: TG.dur, el: <Gancho dur={TG.dur} />},
  {dur: T1.dur, el: <Error1 dur={T1.dur} />, solapa: 6},
  {dur: T2.dur, el: <Error2 dur={T2.dur} />, solapa: 6},
  {dur: T3.dur, el: <Error3 dur={T3.dur} />, solapa: 6},
  {dur: TB.dur, el: <Bonus dur={TB.dur} />, solapa: 6},
  {dur: CIERRE, el: <><Cierre dur={CIERRE} titulo={'¿Cuántos hacías?\n*Contanos* abajo'} /><Voz reel={R} id="cierre" en={6} /></>, solapa: 6},
];
export const duracionErrores = duracion(bloquesErrores);
export const ReelErrores: React.FC = () => <Reel bloques={bloquesErrores} cierre={CIERRE} />;
