// REEL 3 — "¿Estrenás mate nuevo? No lo uses todavía." Cómo curar un mate de calabaza o madera en 4 pasos (contenido para guardar).
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {C} from '../marca';
import {Bloque, Centro, Cierre, duracion, Escena, Etiqueta, FotoCard, FotoFondo, Palabras, Pildora, Sello, Sfx, useSacudida} from '../kit';
import {Cifra, Cuchara, LluviaYerba, Mate, Reloj, useDibujo} from '../ilus';
import {Reel, Texto} from './comun';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const Gancho: React.FC<{dur: number}> = ({dur}) => {
  const sac = useSacudida([36], 20);
  return (
    <Escena dur={dur} entrada="ninguna" salida="zoom">
      <AbsoluteFill style={{transform: sac}}>
        <FotoFondo src="torpedo.jpg" zoom={[1.3, 1.15]} oscuro={0.55} desenfoque={10} />
        <Centro top={310}>
          <Palabras texto={'¿Estrenás\n*mate nuevo*?'} tam={124} anim="golpe" cada={4} />
        </Centro>
        <FotoCard src="torpedo.jpg" x={540} y={1060} ancho={540} alto={730} rot={-4} desde={8} />
        <Centro top={1420}>
          <Pildora texto="¡No lo uses todavía!" desde={36} tam={46} fondo={C.rojo} color={C.crema} />
        </Centro>
      </AbsoluteFill>
      <Sfx src="impacto" en={0} vol={0.85} />
      <Sfx src="whoosh_corto" en={8} vol={0.5} />
      <Sfx src="error" en={36} vol={0.6} />
    </Escena>
  );
};

const Curarlo: React.FC<{dur: number}> = ({dur}) => {
  const dib = useDibujo(14, 22);
  return (
    <Escena dur={dur} entrada="golpe" salida="izquierda">
      <Centro top={420}>
        <Palabras texto={'Primero hay\nque *curarlo*.'} tam={128} anim="golpe" cada={4} />
      </Centro>
      <Centro top={800}>
        <Etiqueta texto="Calabaza o madera · 4 pasos" desde={20} color={C.dorado} tam={36} />
      </Centro>
      <Centro top={930}>
        <Mate dib={dib} ancho={380} yerba={0} bombilla={0} />
      </Centro>
      <Sfx src="bombo" en={0} vol={0.8} />
      <Sfx src="pop" en={20} vol={0.5} />
      <Sfx src="whoosh" en={dur - 9} vol={0.6} />
    </Escena>
  );
};

const Cabeza: React.FC<{n: number; titulo: string}> = ({n, titulo}) => (
  <Centro top={330}>
    <Etiqueta texto={`Paso ${n}`} desde={2} />
    <div style={{height: 18}} />
    <Palabras texto={titulo} tam={104} desde={4} cada={3} />
  </Centro>
);

const Paso1: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const yerba = interpolate(f, [22, 62], [0, 1], cl);
  return (
    <Escena dur={dur} entrada="derecha" salida="izquierda">
      <Cabeza n={1} titulo={'Llenalo con\n*yerba usada*'} />
      <Centro top={720}>
        <Mate ancho={540} yerba={yerba} bombilla={0} montania={0.35}>
          <LluviaYerba desde={12} cant={70} ancho={150} y0={-110} caida={22} />
        </Mate>
      </Centro>
      <Centro top={1430}>
        <Texto texto="Húmeda, hasta el borde." desde={50} tam={52} />
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.6} />
      <Sfx src="maquina" en={16} vol={0.45} />
      <Sfx src="maquina" en={30} vol={0.4} />
      <Sfx src="maquina" en={44} vol={0.35} />
      <Sfx src="pop" en={64} vol={0.5} />
    </Escena>
  );
};

const Paso2: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const chorro = f >= 12 && f < 56;
  const reloj = spring({frame: f - 60, fps, config: {damping: 12, stiffness: 130}});
  const vueltas = interpolate(f, [64, 150], [0, 24], {...cl, easing: Easing.inOut(Easing.quad)});
  const horas = interpolate(f, [64, 150], [0, 24], {...cl, easing: Easing.inOut(Easing.quad)});
  return (
    <Escena dur={dur} entrada="derecha" salida="izquierda">
      <Cabeza n={2} titulo={'Agua *caliente*\ny a esperar'} />
      <div style={{position: 'absolute', left: 70, top: 760}}>
        <Mate ancho={430} yerba={1} bombilla={0} montania={0.2}>
          {chorro && <path d="M210,-380 L210,146" stroke="#bfe0f0" strokeWidth={12} strokeLinecap="round" opacity={0.9} />}
          {[0, 1, 2].map((i) => {
            const fase = ((f + i * 12) % 36) / 36;
            return <path key={i} d={`M${160 + i * 40},${110 - fase * 120} c -12,-16 12,-26 0,-42 c -12,-16 12,-26 0,-42`} fill="none" stroke={C.crema}
              strokeWidth={6} strokeLinecap="round" opacity={(f > 20 ? 1 : 0) * Math.sin(fase * Math.PI) * 0.6} />;
          })}
        </Mate>
      </div>
      <div style={{position: 'absolute', left: 560, top: 880, transform: `scale(${reloj})`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Reloj tam={400} vueltas={vueltas} />
        <div style={{marginTop: 10}}>
          <Cifra valor={horas} sufijo=" h" tam={120} color={C.dorado} />
        </div>
      </div>
      <Centro top={1440}>
        <Texto texto={'Sin hervir. Dejalo reposar *un día entero.*'} desde={70} tam={50} />
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.6} />
      <Sfx src="cebar" en={12} vol={0.7} />
      <Sfx src="cebar" en={34} vol={0.5} />
      <Sfx src="pop" en={60} vol={0.5} />
      <Sfx src="maquina" en={70} vol={0.35} />
      <Sfx src="maquina" en={92} vol={0.35} />
      <Sfx src="maquina" en={114} vol={0.35} />
      <Sfx src="campana" en={150} vol={0.55} />
    </Escena>
  );
};

const Paso3: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const entra = interpolate(f, [16, 34], [-420, 0], {...cl, easing: Easing.out(Easing.cubic)});
  const raspa = f > 34 ? Math.sin((f - 34) / 5) : 0;
  return (
    <Escena dur={dur} entrada="derecha" salida="izquierda">
      <Cabeza n={3} titulo={'Vacialo y\n*raspá suave*'} />
      <Centro top={760}>
        <div style={{position: 'relative'}}>
          <Mate ancho={540} yerba={0.25} montania={0} bombilla={0} />
          <div style={{position: 'absolute', left: 200 + raspa * 60, top: -60 + entra + Math.abs(raspa) * 22, transform: `rotate(${180 + 14 + raspa * 16}deg)`}}>
            <Cuchara tam={330} />
          </div>
        </div>
      </Centro>
      <Centro top={1440}>
        <Texto texto={'Con una cuchara, sacá los restos y *la telita de adentro.*'} desde={46} tam={50} />
      </Centro>
      <Sfx src="whoosh" en={0} vol={0.6} />
      <Sfx src="whoosh_corto" en={16} vol={0.5} />
      {[40, 56, 72, 88, 104].map((t) => <Sfx key={t} src="chisporroteo" en={t} vol={0.12} />)}
    </Escena>
  );
};

const Paso4: React.FC<{dur: number}> = ({dur}) => (
  <Escena dur={dur} entrada="derecha" salida="zoom">
    <Cabeza n={4} titulo={'Repetilo\n*2 o 3 días*'} />
    <Centro top={780}>
      <Sello tipo="bien" desde={14} tam={440} />
    </Centro>
    <Centro top={1340}>
      <Palabras texto="¡Y listo para el primer mate!" desde={46} tam={84} cada={3} acento={C.ok} />
    </Centro>
    <Sfx src="whoosh" en={0} vol={0.6} />
    <Sfx src="acierto" en={14} vol={0.8} />
    <Sfx src="pop" en={46} vol={0.4} />
  </Escena>
);

const CIERRE = 170;
export const bloquesCurar: Bloque[] = [
  {dur: 88, el: <Gancho dur={88} />},
  {dur: 82, el: <Curarlo dur={82} />, solapa: 4},
  {dur: 150, el: <Paso1 dur={150} />, solapa: 6},
  {dur: 175, el: <Paso2 dur={175} />, solapa: 6},
  {dur: 150, el: <Paso3 dur={150} />, solapa: 6},
  {dur: 130, el: <Paso4 dur={130} />, solapa: 6},
  {dur: CIERRE, el: <Cierre dur={CIERRE} titulo={'*Guardalo* para\ntu mate nuevo'} />, solapa: 6},
];
export const duracionCurar = duracion(bloquesCurar);
export const ReelCurar: React.FC = () => <Reel bloques={bloquesCurar} cierre={CIERRE} />;
