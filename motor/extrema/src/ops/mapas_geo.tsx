// Auxiliar de la familia mapas: el mundo sale de world-atlas + d3-geo, pintado UNA vez en un canvas por encuadre y estilo.
// Sin imágenes externas. Cada escena es three.js sin postproceso ni sombras dinámicas (Actions va sin GPU).
import React, {useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, random, staticFile} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
// @ts-ignore
import {feature, mesh} from 'topojson-client';
// @ts-ignore
import atlas from 'world-atlas/countries-50m.json';
// @ts-ignore
import {geoMercator, geoEquirectangular, geoPath, geoGraticule, geoContains, geoBounds, geoCentroid, geoInterpolate, geoDistance} from 'd3-geo';
import {Look, fam, ANCHO, esSerif} from './base';

/* ─────────── atlas ─────────── */
const A: any = atlas;
let _t: any = null;
export const mundo = () => (_t ||= {land: feature(A, A.objects.land), paises: feature(A, A.objects.countries).features as any[], fronteras: mesh(A, A.objects.countries, (a: any, b: any) => a !== b)});
export {geoContains, geoBounds, geoCentroid, geoInterpolate, geoDistance, geoEquirectangular, geoMercator, geoPath};
export type LL = {lat: number; lon: number};
export const limpia = (p: any): LL | null => { const lat = Number(p?.lat), lon = Number(p?.lon); return p && p.lat != null && p.lon != null && Number.isFinite(lat) && Number.isFinite(lon) ? {lat: Math.max(-82, Math.min(82, lat)), lon: ((lon + 540) % 360) - 180} : null; };
export const paisDe = (p: LL) => { const m = mundo().paises, q = [p.lon, p.lat]; return m.find((f) => geoContains(f, q)) || null; };

/* ─────────── color ─────────── */
const rgb = (c: string) => { const k = new THREE.Color(); k.set(c); k.convertLinearToSRGB(); return [k.r * 255, k.g * 255, k.b * 255]; };
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`; };
export const lum = (c: string) => { const [r, g, b] = rgb(c); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
export const alfa = (c: string, o: number) => { const [r, g, b] = rgb(c); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${o})`; };
export type Tema = {mar: string; mar2: string; tierra: string; tierra2: string; costa: string; frontera: string; retic: string; fondo: string; halo: string; letra: string; acento: string; acento2: string; oscuro: boolean; mesa: string};
export const temaDe = (L: Look): Tema => {
  const fondo = L.fondo || L.papel, ac2 = L.acento2 || L.acento, claro = L.claro || '#ffffff', osc = !!L.oscuro;
  if (osc && lum(L.papel) > 0.55) { // mar profundo y tierra de papel
    const mar = mix(fondo, ac2, 0.28);
    return {mar, mar2: mix(fondo, ac2, 0.68), tierra: L.papel, tierra2: mix(L.papel, L.acento, 0.2), costa: mix(fondo, L.tinta, 0.8), frontera: alfa(L.tinta, 0.34), retic: alfa(claro, 0.1), fondo, halo: fondo, letra: claro, acento: L.acento, acento2: ac2, oscuro: true, mesa: fondo};
  }
  if (osc) {
    const negro = lum(fondo) < 0.1, tono = negro ? L.acento : ac2, mar = mix(fondo, tono, negro ? 0.05 : 0.08);
    return {mar, mar2: mix(fondo, tono, negro ? 0.26 : 0.3), tierra: mix(mix(fondo, claro, 0.24), L.acento, 0.1), tierra2: mix(fondo, L.acento, 0.22), costa: negro ? mix(L.acento, claro, 0.2) : mix(fondo, claro, 0.8), frontera: alfa(claro, 0.2), retic: alfa(claro, 0.07), fondo, halo: fondo, letra: claro, acento: L.acento, acento2: ac2, oscuro: true, mesa: fondo};
  }
  const mar = mix(fondo, ac2, 0.34);
  return {mar, mar2: mix(fondo, ac2, 0.12), tierra: claro, tierra2: mix(claro, L.acento, 0.12), costa: mix(L.tinta, ac2, 0.25), frontera: alfa(L.tinta, 0.26), retic: alfa(L.tinta, 0.08), fondo, halo: claro, letra: L.tinta, acento: L.acento, acento2: ac2, oscuro: false, mesa: mix(fondo, L.tinta, 0.1)};
};

/* ─────────── encuadre ─────────── */
export const D2R = Math.PI / 180;
export type Plano = {cw: number; ch: number; proj: any; ancho: number; alto: number; clave: string; toP: (p: LL) => [number, number]; toW: (p: LL) => [number, number]; radW: number};
export const centroLon = (pts: LL[]) => { // el centro del arco que contiene a todos (cruza el antimeridiano sin romperse)
  if (!pts.length) return 0;
  const s = pts.map((p) => p.lon).sort((a, b) => a - b); let gap = -1, ini = s[0];
  s.forEach((v, i) => { const sig = i + 1 < s.length ? s[i + 1] : s[0] + 360; if (sig - v > gap) { gap = sig - v; ini = sig; } });
  return ((ini + (360 - gap) / 2 + 540) % 360) - 180;
};
/** Plano Mercator rotado que contiene los puntos. `pad` = cuánto más grande es la lámina que el encuadre útil. La lámina va centrada en 0,0 del mundo. */
export const hazPlano = (pts: LL[], o: {minGrados?: number; pad?: number; lado?: number; aspecto?: number; holgura?: number; unidades?: number} = {}): Plano => {
  const {minGrados = 26, pad = 3, lado = 4096, aspecto = 1.45, holgura = 1.3, unidades = 10} = o;
  const q = pts.length ? pts : [{lat: 20, lon: 0}];
  const lon0 = centroLon(q), rot: [number, number] = [-lon0, 0];
  const m = geoMercator().rotate(rot).scale(1).translate([0, 0]);
  const xy = q.map((p) => m([p.lon, p.lat]) as [number, number]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const wb = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.7, minGrados * D2R) * holgura;
  const pw = Math.min(wb * pad, Math.PI * 2), ch = Math.round(lado / aspecto), esc = lado / pw;
  const proj = geoMercator().rotate(rot).scale(esc).translate([lado / 2 - cx * esc, ch / 2 - cy * esc]).clipExtent([[-8, -8], [lado + 8, ch + 8]]);
  const radW = unidades / wb, ancho = pw * radW, alto = ancho / aspecto;
  const toP = (p: LL) => proj([p.lon, p.lat]) as [number, number];
  // proyecta aunque el punto esté fuera de la lámina
  const toW = (p: LL): [number, number] => { const v = m([p.lon, p.lat]) as [number, number]; return [(v[0] - cx) * radW, (v[1] - cy) * radW]; };
  return {cw: lado, ch, proj, ancho, alto, toP, toW, radW, clave: [lon0, cx, cy, pw, lado, ch].map((v) => v.toFixed(4)).join('_')};
};

/* ─────────── pintura una sola vez ─────────── */
const cache = new Map<string, HTMLCanvasElement>();
export const guarda = (k: string, f: () => HTMLCanvasElement) => { let c = cache.get(k); if (!c) { c = f(); cache.set(k, c); if (cache.size > 8) cache.delete(cache.keys().next().value as string); } return c; };
export const nuevoLienzo = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const ruido = (w: number, h: number, sem: string) => { const c = nuevoLienzo(w, h), g = c.getContext('2d')!, d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = random(`${sem}-${i}`) * 255; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; } g.putImageData(d, 0, 0); return c; };
let _rg: HTMLCanvasElement | null = null, _rf: HTMLCanvasElement | null = null;
export const ruidoGrueso = () => (_rg ||= ruido(48, 32, 'mapa-g'));
export const ruidoFino = () => (_rf ||= ruido(240, 240, 'mapa-f'));

type Op = {ink?: boolean; borde?: boolean; bordeFade?: number; sinFondo?: boolean};
/** Pinta la lámina: mar con bandas de profundidad, retícula, tierra con relieve de papel, fronteras y costa. */
export const pinta = (g: CanvasRenderingContext2D, pl: {cw: number; ch: number; proj: any}, t: Tema, o: Op = {}) => {
  const {cw: W, ch: H, proj} = pl, k = W / 4096, m = mundo(), path = geoPath(proj, g);
  if (!o.sinFondo) {
    const gr = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.62); gr.addColorStop(0, t.mar); gr.addColorStop(1, mix(t.mar, t.fondo, 0.5));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = true;
    g.globalAlpha = 0.07; g.globalCompositeOperation = t.oscuro ? 'soft-light' : 'multiply'; g.drawImage(ruidoGrueso(), 0, 0, W, H); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  // retícula
  g.beginPath(); path(geoGraticule().step([10, 10])()); g.strokeStyle = t.retic; g.lineWidth = 2.2 * k; g.stroke();
  // bajíos: la costa se expande en bandas
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const [w, a] of [[64, 0.2], [40, 0.26], [20, 0.36]] as [number, number][]) { g.beginPath(); path(m.land); g.strokeStyle = alfa(t.mar2, a); g.lineWidth = w * k; g.stroke(); }
  // canto de la tierra: papel recortado apoyado sobre el mar
  g.save(); g.translate(5 * k, 9 * k); g.beginPath(); path(m.land); g.fillStyle = alfa('#000000', t.oscuro ? 0.5 : 0.26); g.fill(); g.restore();
  g.beginPath(); path(m.land); g.fillStyle = t.tierra; g.fill();
  // textura de la tierra sólo dentro de la tierra
  g.save(); g.beginPath(); path(m.land); g.clip();
  g.imageSmoothingEnabled = true;
  for (const [w, a] of [[60, 0.16], [30, 0.26]] as [number, number][]) { g.beginPath(); path(m.land); g.strokeStyle = alfa(t.tierra2, a); g.lineWidth = w * k; g.stroke(); }
  g.globalAlpha = 0.04; g.globalCompositeOperation = 'multiply'; g.drawImage(ruidoGrueso(), 0, 0, W, H);
  g.globalAlpha = 0.14; g.fillStyle = g.createPattern(ruidoFino(), 'repeat')!; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.restore();
  g.beginPath(); path(m.fronteras); g.strokeStyle = t.frontera; g.lineWidth = 2.6 * k; g.stroke();
  g.beginPath(); path(m.land); g.strokeStyle = t.costa; g.lineWidth = (o.ink ? 4.5 : 3.2) * k; g.stroke();
  if (o.borde !== false) { // la lámina se funde con el fondo en sus bordes
    const f = o.bordeFade ?? 0.13;
    const b = (x0: number, y0: number, x1: number, y1: number) => { const l = g.createLinearGradient(x0, y0, x1, y1); l.addColorStop(0, t.fondo); l.addColorStop(1, alfa(t.fondo, 0)); g.fillStyle = l; g.fillRect(0, 0, W, H); };
    b(0, 0, W * f, 0); b(W, 0, W * (1 - f), 0); b(0, 0, 0, H * f); b(0, H, 0, H * (1 - f));
  }
};
export const texDe = (c: HTMLCanvasElement, an = 8) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = an; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; };
export const useMapa = (pl: Plano, t: Tema, o: Op = {}) => useMemo(() => {
  const c = guarda(`m|${pl.clave}|${t.mar}|${t.tierra}|${t.costa}|${o.ink ? 1 : 0}`, () => { const c = nuevoLienzo(pl.cw, pl.ch); pinta(c.getContext('2d')!, pl, t, o); return c; });
  return texDe(c);
}, [pl.clave, t.mar, t.tierra, t.costa]);
/** Mancha radial blanda reutilizable (sombras de contacto, halos). Una sola textura por página. */
let _halo: THREE.Texture | null = null;
export const haloTex = () => { if (_halo) return _halo; const c = nuevoLienzo(128, 128), g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,.42)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); _halo = new THREE.CanvasTexture(c); return _halo; };

/* ─────────── escena ─────────── */
export type Pose = {p: [number, number, number]; l: [number, number, number]; fov?: number};
export const pose = (tx: number, tz: number, d: number, tilt: number, az = 0, fov = 30): Pose => {
  const t = tilt * D2R, a = az * D2R, back = d * Math.sin(t);
  return {p: [tx + Math.sin(a) * back, d * Math.cos(t), tz + Math.cos(a) * back], l: [tx, 0, tz], fov};
};
const _cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 2000);
export const proyector = (c: Pose) => {
  const cam = _cam.clone(); cam.fov = c.fov ?? 30; cam.position.set(...c.p); cam.up.set(0, 1, 0); cam.lookAt(...c.l); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); const v = new THREE.Vector3();
  return (x: number, y: number, z: number): [number, number, boolean] => { v.set(x, y, z).project(cam); return [(v.x * 0.5 + 0.5) * 1920, (-v.y * 0.5 + 0.5) * 1080, v.z < 1]; };
};
/** Distancia de cámara para que entren todos los puntos (x,z) en la zona útil del cuadro. */
export const distQueEntra = (pts: [number, number][], tx: number, tz: number, tilt: number, az = 0, fov = 30, mx = 0.68, arr = 0.56, ab = 0.4) => {
  const cabe = (d: number) => { const pr = proyector(pose(tx, tz, d, tilt, az, fov)); return pts.every(([x, z]) => { const [a, b] = pr(x, 0, z); const nx = a / 960 - 1, ny = 1 - b / 540; return Math.abs(nx) < mx && ny < arr && ny > -ab; }); };
  let lo = 1.5, hi = 240; if (!cabe(hi)) return hi; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (cabe(m)) hi = m; else lo = m; } return hi;
};
const Rig: React.FC<{c: Pose}> = ({c}) => { const cam = useThree((s) => s.camera) as THREE.PerspectiveCamera; cam.fov = c.fov ?? 30; cam.near = 0.05; cam.far = 2000; cam.up.set(0, 1, 0); cam.position.set(...c.p); cam.lookAt(...c.l); cam.updateProjectionMatrix(); return null; };
export const Lienzo: React.FC<{cam: Pose; children: React.ReactNode; antialias?: boolean}> = ({cam, children, antialias = true}) => (
  <ThreeCanvas width={1920} height={1080} flat gl={{antialias, preserveDrawingBuffer: true, powerPreference: 'high-performance'}} camera={{fov: cam.fov ?? 30, near: 0.05, far: 2000, position: cam.p}} style={{position: 'absolute', inset: 0}}>
    <Rig c={cam} />{children}
  </ThreeCanvas>
);
/** Foto como textura: retiene el cuadro hasta que llegó y se dibujó (ThreeCanvas no redibuja solo). */
export const useFoto = (id?: string) => {
  const [h] = useState(() => (id ? delayRender('foto ' + id, {timeoutInMilliseconds: 60000}) : 0));
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => { if (!id) return; let vivo = true; new THREE.TextureLoader().load(staticFile(`fotos/${id}.jpg`), (t) => { if (!vivo) return; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; setTex(t); }, undefined, () => continueRender(h)); return () => { vivo = false; }; }, [id, h]);
  return {tex, soltar: () => { if (id) continueRender(h); }};
};
/** Se monta con la textura ya puesta: fuerza el dibujo y libera el cuadro. */
export const Listo: React.FC<{soltar: () => void}> = ({soltar}) => {
  const adv = useThree((s) => s.advance);
  useEffect(() => { adv(performance.now()); let n = 0, id = 0; const paso = () => { adv(performance.now()); if (++n >= 2) soltar(); else id = requestAnimationFrame(paso); }; id = requestAnimationFrame(paso); return () => cancelAnimationFrame(id); }, []);
  return null;
};

/* ─────────── rótulos en la escena ─────────── */
export type Et = {x: number; y: number; txt: string; f0: number; o?: number; tam?: number; arriba?: number};
const _mide = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const anchoDe = (t: string, tam: number, f: string, may: boolean) => { const est = t.length * tam * Math.max(ANCHO[f] ?? 0.56, f === 'Syne' ? 0.74 : 0) * (may ? 1.22 : 1.04); if (!_mide) return est; _mide.font = `700 ${tam}px ${fam(f)}`; return Math.max(est, _mide.measureText(t).width * 1.04) + tam * 0.2; };
/** Reparte rótulos para que no se pisen ni se salgan: arriba del punto y, si choca, abajo. */
export const Etiquetas: React.FC<{et: Et[]; look: Look; fr: number; tema: Tema; alto?: number; mayus?: boolean; sinHalo?: boolean}> = ({et, look, fr, tema, alto = 104, mayus, sinHalo}) => {
  const may = mayus ?? !esSerif(look.display), hechas: {x0: number; x1: number; y0: number; y1: number}[] = [];
  return (<>{et.map((e, i) => {
    if (fr < e.f0 - 1 || (e.o ?? 1) <= 0.01) return null;
    const tam0 = e.tam ?? 76, txt = may ? e.txt.toUpperCase() : e.txt;
    let tam = tam0, w = anchoDe(txt, tam, look.display, may); if (w > 1500) { tam *= 1500 / w; w = 1500; }
    const cx = Math.max(w / 2 + 50, Math.min(1920 - w / 2 - 50, e.x));
    const caja = (y: number) => ({x0: cx - w / 2 - 14, x1: cx + w / 2 + 14, y0: y, y1: y + tam * 1.12});
    const pisa = (b: any) => b.y0 < 34 || b.y1 > 1046 || hechas.some((c) => b.x0 < c.x1 && b.x1 > c.x0 && b.y0 < c.y1 && b.y1 > c.y0);
    const al = e.arriba ?? alto;
    const cand = [e.y - al - tam * 1.1, e.y + 36, e.y - al - tam * 2.3, e.y + 44 + tam * 1.2, e.y - al - tam * 3.4];
    let top = cand.find((y) => !pisa(caja(y))); if (top === undefined) top = Math.max(40, Math.min(1040 - tam * 1.12, cand[0]));
    hechas.push(caja(top));
    const p = Math.min(1, Math.max(0, (fr - e.f0 + 1) / 5)), s = 0.7 + 0.3 * (1 - Math.pow(1 - p, 3));
    return <div key={i} style={{position: 'absolute', left: cx, top, transform: `translateX(-50%) scale(${s})`, transformOrigin: '50% 100%', opacity: p * (e.o ?? 1), fontFamily: fam(look.display), fontSize: tam, lineHeight: 1.12, fontStyle: may ? 'normal' : 'italic', fontWeight: 700, whiteSpace: 'nowrap', color: tema.letra, WebkitTextStroke: sinHalo ? undefined : `${Math.max(9, tam * 0.17)}px ${tema.halo}`, paintOrder: 'stroke fill', letterSpacing: may ? '0.01em' : '-0.01em'} as any}>{txt}</div>;
  })}</>);
};
