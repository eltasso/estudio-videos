// Prueba rápida SIN video: monta el componente con react-dom/server en varios cuadros y junta los errores. Corre como el usuario sin claves.
// node smoke.mjs <archivo.tsx> <cuadros>   -> imprime "OK" o los errores
import {createRequire} from 'module';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const T = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(T + '/package.json');
const esbuild = req('esbuild');
const [, , archivo, cuadros] = process.argv;
const frames = Number(cuadros), base = path.basename(archivo, '.tsx');
const shim = T + '/smoke_shim_' + base;
fs.mkdirSync(shim, {recursive: true});
fs.writeFileSync(shim + '/remotion.mjs', `export * from '${T}/node_modules/remotion/dist/cjs/index.js';
export const useCurrentFrame = () => globalThis.__FR;
export const useVideoConfig = () => ({fps: 30, width: 1920, height: 1080, durationInFrames: globalThis.__DUR, id: 'x', defaultProps: {}, props: {}});
export const delayRender = () => 0; export const continueRender = () => {};
export const staticFile = (s) => '/' + s;
export const Img = () => null; export const OffthreadVideo = () => null; export const Video = () => null; export const Audio = () => null;
export const Sequence = (p) => p.children; export const Loop = (p) => p.children; export const Freeze = (p) => p.children;
export const Series = Object.assign((p) => p.children, {Sequence: (p) => p.children});
`);
fs.writeFileSync(shim + '/fuente.mjs', `export const loadFont = () => ({fontFamily: 'X', waitUntilDone: () => Promise.resolve()});`);
fs.writeFileSync(shim + '/tres.mjs', `export const ThreeCanvas = () => null; export const useVideoTexture = () => null; export const useOffthreadVideoTexture = () => null;`);
const out = shim + '/salida.cjs', entrada = shim + '/entrada.tsx';
fs.writeFileSync(entrada, `import React from 'react';\nimport {renderToStaticMarkup} from 'react-dom/server';\nimport Scene from '${path.resolve(archivo).replace(/\\/g, '/')}';\nexport {React, renderToStaticMarkup, Scene};\n`);
try {
  await esbuild.build({entryPoints: [entrada], bundle: true, format: 'cjs', platform: 'node', outfile: out, external: ['react', 'react-dom', 'react-dom/*', 'react/*'], sourcemap: 'inline', logLevel: 'silent', nodePaths: [T + '/node_modules'],
    loader: {'.tsx': 'tsx', '.ts': 'ts'}, jsx: 'automatic',
    plugins: [{name: 'shim', setup(b) {
      b.onResolve({filter: /^@remotion\/three/}, () => ({path: shim + '/tres.mjs'}));
      b.onResolve({filter: /^remotion$/}, () => ({path: shim + '/remotion.mjs'}));
      b.onResolve({filter: /^@remotion\/google-fonts/}, () => ({path: shim + '/fuente.mjs'}));
    }}]});
} catch (e) { console.log('DOES NOT COMPILE: ' + String(e.message || e).slice(0, 900)); process.exit(0); }
const {React, renderToStaticMarkup, Scene} = createRequire(out)(out);
globalThis.__DUR = frames;
const lista = [...new Set([0, 4, frames * .25, frames * .5, frames * .55, frames * .75, frames - 2, frames - 1].map((f) => Math.max(0, Math.min(frames - 1, Math.round(f)))))];
const errs = []; let largo = 0;
for (const f of lista) {
  globalThis.__FR = f;
  try { const h = renderToStaticMarkup(React.createElement(Scene)); largo = Math.max(largo, h.length); if (/NaN/.test(h)) errs.push(`frame ${f}: NaN in the output (a style or path got NaN)`); }
  catch (e) { const m = String((e && e.stack) || e); if (!/can only be called inside a component that was registered/.test(m)) errs.push(`frame ${f}: ` + m.split('\n').slice(0, 3).join(' / ').slice(0, 400)); }
}
if (largo > 1500000) errs.push('the scene is too heavy (' + largo + ' chars of markup): use fewer elements');
console.log(errs.length ? errs.slice(0, 4).join('\n') : 'OK ' + largo);
