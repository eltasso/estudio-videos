// Armado común de un reel: fondo + escenas + logo chico + grano + barra de progreso.
import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {C} from '../marca';
import {Bloque, duracion, Fondo, Grano, Linea, Marca, Palabras, Progreso} from '../kit';

export const Reel: React.FC<{bloques: Bloque[]; cierre: number}> = ({bloques, cierre}) => {
  const total = duracion(bloques);
  return (
    <AbsoluteFill style={{background: C.fondo}}>
      <Fondo />
      <Linea bloques={bloques} />
      <Sequence durationInFrames={total - cierre + 4}>
        <Marca />
      </Sequence>
      <Grano />
      <Progreso />
    </AbsoluteFill>
  );
};

// texto explicativo (sans, más chico)
export const Texto: React.FC<{texto: string; desde?: number; tam?: number; ancho?: number; color?: string; acento?: string}> = ({
  texto, desde = 0, tam = 48, ancho = 860, color = C.crema, acento = C.dorado,
}) => (
  <Palabras texto={texto} desde={desde} cada={1.6} tam={tam} ancho={ancho} fuente="texto" peso={500} interlineado={1.38} color={color} acento={acento} pincel={false} />
);
