// Fotogramas sueltos para revisar el diseño sin renderizar todo: node fotos.mjs <id> <frame,frame,...> <carpeta>
import path from 'path'; import {fileURLToPath} from 'url';
import {bundle} from '@remotion/bundler'; import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
const root = path.dirname(fileURLToPath(import.meta.url));
const [id, frames, out] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', {browserExecutable: process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell', chromiumOptions: {gl: 'swangle'}});
const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
console.log(id, composition.durationInFrames, 'frames');
for (const fr of frames.split(',').map(Number)) {
  await renderStill({composition, serveUrl, frame: fr, output: path.join(out, `${id}_${String(fr).padStart(4, '0')}.png`), puppeteerInstance: browser, scale: 0.5});
}
await browser.close({silent: true});
