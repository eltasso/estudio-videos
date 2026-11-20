// REEL 1 — "¿Tu mate sale amargo? Es el agua." La temperatura justa (70°–80°) y el truco sin termómetro.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {C} from '../marca';
import {Bloque, Centro, Cierre, duracion, Escena, Etiqueta, FotoFondo, Palabras, Pildora, Sfx, useSacudida} from '../kit';
import {Cifra, Pava, Termometro, useDibujo} from '../ilus';
import {Reel, Texto} from './comun';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Gancho: React.FC<{dur: number}> = ({dur}) => {
  const sac = useSacudida([0], 22);
  return (
    <Escena dur={dur} entrada="ninguna" salida="zoom">
      <AbsoluteFill style={{transform: sac}}>
        <FotoFondo src="mate_cuero.jpg" zoom={[1.25, 1.08]} foco="50% 45%" oscuro={0.35} />
        <Centro top={330}>
          <Palabras texto={'¿Tu mate sale\n*amargo*?'} tam={130} anim="golpe" cada={4} />
        </Centro>
        <Centro top={1330}>
          <Pildora texto="No es culpa de la yerba" desde={34} tam={42} />
        </Centro>
      </AbsoluteFill>
      <Sfx src="impacto" en={0} vol={0.9} />
      <Sfx src="whoosh_corto" en={32} vol={0.6} />
      <Sfx src="pop" en={36} vol={0.5} />
    </Escena>
  );
};

const EsElAgua: React.FC<{dur: number}> = ({dur}) => {
  const sac = useSacudida([2], 26);
  const dib = useDibujo(4, 18);
  return (
    <Escena dur={dur} entrada="golpe" salida="izquierda">
      <AbsoluteFill style={{transform: sac}}>
        <Centro top={380}>
          <Palabras texto="Es el *agua*." tam={190} anim="golpe" cada={5} />
        </Centro>
        <Centro top={800}>
          <Pava dib={dib} ancho={780} vapor={1} burbujas={1} />
        </Centro>
      </AbsoluteFill>
      <Sfx src="bombo" en={2} vol={0.9} />
      <Sfx src="chisporroteo" en={8} vol={0.55} />
      <Sfx src="whoosh" en={dur - 9} vol={0.7} />
    </Escena>
  );
};

const Temperatura: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const dib = useDibujo(0, 16);
  const PICO = 52, BAJA = 150;
  const sube = interpolate(f, [8, PICO], [22, 100], {...cl, easing: Easing.in(Easing.quad)});
  const baja = interpolate(f, [BAJA, BAJA + 32], [100, 75], {...cl, easing: Easing.inOut(Easing.cubic)});
  const temp = f < BAJA ? sube : baja;
  const zona = interpolate(f, [BAJA + 26, BAJA + 40], [0, 1], cl);
  const sac = useSacudida([PICO], 24, 14);
  const caliente = f >= PICO && f < BAJA;
  const ok = f >= BAJA + 30;
  const col = temp > 88 ? C.rojo : temp > 82 ? '#e0a046' : C.ok;
  const salidaRojo = interpolate(f, [BAJA - 10, BAJA], [1, 0], cl);
  return (
    <Escena dur={dur} entrada="derecha" salida="zoom">
      <AbsoluteFill style={{transform: sac}}>
        <div style={{position: 'absolute', left: 60, top: 350}}>
          <Termometro temp={temp} dib={dib} alto={1180} zona={zona} />
        </div>
        <div style={{position: 'absolute', left: 450, top: 520, width: 600}}>
          <Cifra valor={ok ? 70 : temp} sufijo={ok ? '°–80°' : '°'} color={col} tam={ok ? 160 : 250} />
        </div>
        {caliente && (
          <div style={{position: 'absolute', left: 450, top: 830, width: 590, opacity: salidaRojo}}>
            <Palabras texto="*Hirviendo*" acento={C.rojo} tam={110} anim="golpe" desde={PICO} alinear="left" ancho={600} />
            <div style={{height: 40}} />
            <Palabras texto={'Quema la yerba: sale amarga y se lava enseguida.'} desde={PICO + 14} cada={1.6} tam={50} fuente="texto" peso={500}
              interlineado={1.38} ancho={560} alinear="left" pincel={false} />
          </div>
        )}
        {ok && (
          <div style={{position: 'absolute', left: 450, top: 790, width: 590}}>
            <Palabras texto={'El *punto\njusto*'} acento={C.ok} tam={110} anim="golpe" desde={BAJA + 30} cada={4} alinear="left" ancho={600} />
            <div style={{height: 40}} />
            <Palabras texto={'Más sabor, menos amargor y muchas más cebadas.'} desde={BAJA + 44} cada={1.6} tam={50} fuente="texto" peso={500}
              interlineado={1.38} ancho={560} alinear="left" pincel={false} />
          </div>
        )}
      </AbsoluteFill>
      <Sfx src="subida" en={8} vol={0.8} />
      <Sfx src="impacto" en={PICO} vol={0.8} />
      <Sfx src="chisporroteo" en={PICO + 2} vol={0.5} />
      <Sfx src="whoosh" en={BAJA - 4} vol={0.6} />
      <Sfx src="acierto" en={BAJA + 30} vol={0.7} />
      <Sfx src="whoosh" en={dur - 9} vol={0.5} />
    </Escena>
  );
};

const SinTermometro: React.FC<{dur: number}> = ({dur}) => {
  const dib = useDibujo(10, 22);
  const f = useCurrentFrame();
  const burb = interpolate(f, [40, 60], [0, 1], cl);
  return (
    <Escena dur={dur} entrada="zoom" salida="zoom">
      <Centro top={330}>
        <Etiqueta texto="El truco" desde={0} />
        <div style={{height: 20}} />
        <Palabras texto="¿Sin *termómetro*?" tam={108} desde={4} />
      </Centro>
      <Centro top={640}>
        <Pava dib={dib} ancho={680} vapor={burb * 0.35} burbujas={burb} />
      </Centro>
      <Centro top={1290}>
        <Texto texto={'Apagá el fuego cuando aparecen las *primeras burbujitas*, antes de que hierva.'} desde={50} tam={50} ancho={860} />
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.5} />
      <Sfx src="pop" en={6} vol={0.5} />
      <Sfx src="burbujas" en={42} vol={0.8} />
      <Sfx src="burbujas" en={80} vol={0.5} />
    </Escena>
  );
};

const CIERRE = 170;
export const bloquesAgua: Bloque[] = [
  {dur: 82, el: <Gancho dur={82} />},
  {dur: 64, el: <EsElAgua dur={64} />, solapa: 4},
  {dur: 300, el: <Temperatura dur={300} />, solapa: 6},
  {dur: 185, el: <SinTermometro dur={185} />, solapa: 6},
  {dur: CIERRE, el: <Cierre dur={CIERRE} titulo={'*Guardalo* para tu\npróximo mate'} />, solapa: 6},
];
export const duracionAgua = duracion(bloquesAgua);
export const ReelAgua: React.FC = () => <Reel bloques={bloquesAgua} cierre={CIERRE} />;
