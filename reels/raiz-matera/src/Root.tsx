import React from 'react';
import {Composition} from 'remotion';
import {FPS, H, W} from './marca';
import {ReelAgua, duracionAgua} from './reels/agua';
import {ReelErrores, duracionErrores} from './reels/errores';
import {ReelCurar, duracionCurar} from './reels/curar';
import {ReelCatalogo, duracionCatalogo} from './reels/catalogo';

// musica / volMusica: los usa render.mjs para la versión "con música" (se mezcla después con ffmpeg).
export const REELS = [
  {id: 'reel1-agua', comp: ReelAgua, dur: duracionAgua, musica: 'folk_chill', volMusica: 0.4},
  {id: 'reel2-errores', comp: ReelErrores, dur: duracionErrores, musica: 'folk_alegre', volMusica: 0.36},
  {id: 'reel3-curar', comp: ReelCurar, dur: duracionCurar, musica: 'folk_chill', volMusica: 0.4},
  {id: 'reel4-catalogo', comp: ReelCatalogo, dur: duracionCatalogo, musica: 'folk_alegre', volMusica: 0.62},
];

export const Root: React.FC = () => (
  <>
    {REELS.map((r) => (
      <Composition key={r.id} id={r.id} component={r.comp} durationInFrames={r.dur} fps={FPS} width={W} height={H}
        defaultProps={{musica: r.musica, volMusica: r.volMusica}} />
    ))}
  </>
);
