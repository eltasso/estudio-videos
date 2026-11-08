// Edición extrema: renderiza a MP4 cada pieza de src/gen/manifest.ts. Corre en GitHub Actions (nunca en la PC del creador).
// uso: node render.mjs <carpeta_public> <salida_dir> <ids,separados,por,coma>
import fs from 'fs'; import os from 'os'; import path from 'path'; import {fileURLToPath} from 'url';
import {bundle} from '@remotion/bundler'; import {renderMedia, selectComposition, openBrowser} from '@remotion/renderer';
const [pub, outDir, ids] = process.argv.slice(2);
const root = path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(outDir, {recursive: true});
const res = {};
try {
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.resolve(pub)});
  const browser = await openBrowser('chrome', {chromiumOptions: {gl: 'swangle'}});
  for (const id of ids.split(',')) {
    const t0 = Date.now();
    try {
      const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
      await renderMedia({composition, serveUrl, codec: 'h264', crf: 18, pixelFormat: 'yuv420p', outputLocation: path.join(outDir, id + '.mp4'),
                         puppeteerInstance: browser, concurrency: Number(process.env.EXTREMA_HILOS || os.cpus().length || 2), timeoutInMilliseconds: 120000});
      res[id] = {ok: true, s: Math.round((Date.now() - t0) / 1000)};
    } catch (e) { res[id] = {ok: false, error: String(e.message || e).slice(0, 600)}; }
    console.log(id, JSON.stringify(res[id]));
    fs.writeFileSync(path.join(outDir, 'render.json'), JSON.stringify(res, null, 1));   // si el tiempo se corta, quedan las que llegaron
  }
  await browser.close({silent: true});
} catch (e) { res._error = String(e.message || e).slice(0, 600); console.log('render:', res._error); }
fs.writeFileSync(path.join(outDir, 'render.json'), JSON.stringify(res, null, 1));
