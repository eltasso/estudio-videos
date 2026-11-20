// Renderiza todos los reels y deja en salida/:
//   <id>.mp4             → listo para subir (efectos + música de fondo)
//   <id>_sin-musica.mp4  → sólo efectos, para ponerle un audio en tendencia desde Instagram
//   portadas/<id>.jpg    → portada sugerida
// uso: node render.mjs [id,id,...]            (todo)
//      node render.mjs --remezclar [id,...]    (solo rehace la música/volumen, sin volver a renderizar la imagen)
import fs from 'fs'; import os from 'os'; import path from 'path'; import {execFileSync} from 'child_process'; import {fileURLToPath} from 'url';
import {bundle} from '@remotion/bundler'; import {getCompositions, renderMedia, renderStill, openBrowser} from '@remotion/renderer';

const root = path.dirname(fileURLToPath(import.meta.url));
const SAL = path.join(root, 'salida'); const TMP = path.join(SAL, '_tmp'); const POR = path.join(SAL, 'portadas');
for (const d of [SAL, TMP, POR]) fs.mkdirSync(d, {recursive: true});
const args = process.argv.slice(2);
const REMEZCLAR = args.includes('--remezclar');
const listaIds = args.find((a) => !a.startsWith('--'));
const soloIds = listaIds ? listaIds.split(',') : null;
const PORTADA = {'reel1-agua': 70, 'reel2-errores': 72, 'reel3-curar': 74, 'reel4-catalogo': 76};
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-y', ...args], {stdio: ['ignore', 'pipe', 'pipe']});

// normalización de volumen en 2 pasadas (-14 LUFS, lo que usa Instagram)
function normalizar(entrada, salida) {
  const out = execFileSync('bash', ['-c', `ffmpeg -hide_banner -i "${entrada}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p'`], {encoding: 'utf8'});
  const m = JSON.parse(out);
  ff(['-i', entrada, '-af', `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, '-ar', '48000', salida]);
}

// los sonidos se generan por código (no se suben al repo): si faltan, se crean
if (!fs.existsSync(path.join(root, 'public', 'musica', 'folk_alegre.wav'))) execFileSync('python3', [path.join(root, 'sonido', 'generar.py')], {stdio: 'inherit'});

const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', {browserExecutable: CHROME, chromiumOptions: {gl: 'swangle'}});
const comps = (await getCompositions(serveUrl, {puppeteerInstance: browser})).filter((c) => !soloIds || soloIds.includes(c.id));
for (const composition of comps) {
  const id = composition.id; const t0 = Date.now();
  const sinMusica = path.join(SAL, `${id}_sin-musica.mp4`);
  let crudo = path.join(TMP, `${id}_crudo.mp4`);
  if (REMEZCLAR) {
    if (!fs.existsSync(sinMusica)) { console.log(`${id}: falta ${sinMusica}, se saltea`); continue; }
    crudo = path.join(TMP, `${id}_base.mp4`);
    fs.copyFileSync(sinMusica, crudo);
  } else await renderMedia({composition, serveUrl, codec: 'h264', crf: 19, pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '320k', outputLocation: crudo,
    puppeteerInstance: browser, concurrency: Number(process.env.HILOS || os.cpus().length || 2), timeoutInMilliseconds: 120000,
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 25 === 0) process.stdout.write(`\r${id} ${Math.round(progress * 100)}%  `); }});
  const dur = composition.durationInFrames / composition.fps;
  const sfx = path.join(TMP, `${id}_sfx.wav`); const mezcla = path.join(TMP, `${id}_mezcla.wav`);
  ff(['-i', crudo, '-vn', '-ac', '2', '-ar', '48000', sfx]);
  // versión sin música
  const sfxN = path.join(TMP, `${id}_sfx_norm.wav`);
  normalizar(sfx, sfxN);
  if (!REMEZCLAR) ff(['-i', crudo, '-i', sfxN, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', sinMusica]);
  // versión con música: la música baja sola cuando suena un efecto (sidechain)
  const musica = path.join(root, 'public', 'musica', `${composition.props.musica}.wav`);
  const vol = composition.props.volMusica ?? 0.22;
  const fadeIni = Math.max(0, dur - 2.5).toFixed(2);
  ff(['-i', sfx, '-i', musica, '-filter_complex',
    `[0:a]asplit=2[s1][s2];[1:a]atrim=0:${dur.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,volume=${vol},afade=t=out:st=${fadeIni}:d=2.5[m];` +
    `[m][s1]sidechaincompress=threshold=0.04:ratio=3:attack=8:release=300[md];[md][s2]amix=inputs=2:duration=first:normalize=0[a]`,
    '-map', '[a]', '-ar', '48000', mezcla]);
  const mezN = path.join(TMP, `${id}_mezcla_norm.wav`);
  normalizar(mezcla, mezN);
  ff(['-i', crudo, '-i', mezN, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(SAL, `${id}.mp4`)]);
  if (!REMEZCLAR) await renderStill({composition, serveUrl, frame: PORTADA[id] ?? 60, output: path.join(POR, `${id}.jpg`), imageFormat: 'jpeg', jpegQuality: 92, puppeteerInstance: browser});
  console.log(`\r${id} listo en ${Math.round((Date.now() - t0) / 1000)} s (${dur.toFixed(1)} s de video)`);
}
await browser.close({silent: true});
fs.rmSync(TMP, {recursive: true, force: true});
