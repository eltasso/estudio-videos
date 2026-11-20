// Voz en off (Fish Audio). Los audios y su duración en frames los genera sonido/voz.py en public/voz/ y src/gen/voz.json.
import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import datos from './gen/voz.json';

type Linea = {archivo: string; frames: number; texto: string};
const D = datos as unknown as Record<string, Record<string, Linea>>;

// duración en frames de una línea (0 si no existe)
export const vf = (reel: string, id: string) => D[reel]?.[id]?.frames ?? 0;

export const Voz: React.FC<{reel: string; id: string; en?: number; vol?: number}> = ({reel, id, en = 0, vol = 1}) => {
  const l = D[reel]?.[id];
  if (!l) return null;
  return (
    <Sequence from={Math.round(en)} layout="none">
      <Audio src={staticFile(l.archivo)} volume={vol} />
    </Sequence>
  );
};
