// Identidad de Raíz Matera (sacada de sus historias): verde monte, crema, dorado de alpaca y cuero.
// Fuentes locales (Lora itálica variable + Poppins, licencia OFL) en public/fuentes: el render no depende de internet.
import {continueRender, delayRender, staticFile} from 'remotion';

export const FUENTE_TITULO = 'Lora';    // serif itálica, como "Todo lo que tu mate estaba esperando."
export const FUENTE_TEXTO = 'Poppins';  // sans para etiquetas y botones

if (typeof document !== 'undefined') {
  const espera = delayRender('Cargando fuentes');
  const lista: [string, string, string, string][] = [
    ['Lora', 'lora-italic-variable.woff2', '400 700', 'italic'],
    ['Poppins', 'poppins-500.woff2', '500', 'normal'],
    ['Poppins', 'poppins-600.woff2', '600', 'normal'],
    ['Poppins', 'poppins-700.woff2', '700', 'normal'],
    ['Poppins', 'poppins-800.woff2', '800', 'normal'],
  ];
  Promise.all(lista.map(([fam, archivo, weight, style]) =>
    new FontFace(fam, `url(${staticFile('fuentes/' + archivo)}) format('woff2')`, {weight, style}).load().then((ff) => { document.fonts.add(ff); })))
    .then(() => continueRender(espera))
    .catch((e) => { console.error(e); continueRender(espera); });
}

export const C = {
  fondo: '#1c2919',
  fondoClaro: '#2b3b26',
  fondoOscuro: '#111a10',
  crema: '#f4e6c8',
  cremaSuave: 'rgba(244,230,200,0.78)',
  dorado: '#d8b56d',
  doradoOsc: '#a8843e',
  cuero: '#9a6235',
  yerba: '#8fae5d',
  yerbaOsc: '#5d7a35',
  rojo: '#e2623f',
  ok: '#a9cf7a',
};

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const USUARIO = '@raizmatera.qq';
