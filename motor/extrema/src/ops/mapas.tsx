// Familia MAPAS: lugares y viajes en 3D real. El mapa sale del atlas (mapas_geo.tsx); cada op recibe lugar, lat, lon y la palabra.
import React, {useMemo} from 'react';
import {useCurrentFrame, interpolate, random} from 'remotion';
import * as THREE from 'three';
import {OpProps, golpeDe, Rotulo, Linea, Look} from './base';
import {va, salta, curva, Encuadre} from '../kit';
import {temaDe, Tema, hazPlano, Plano, useMapa, limpia, LL, geoInterpolate, pose, Pose, proyector, distQueEntra, Lienzo, Etiquetas, Et, haloTex, alfa, lum, D2R, mix, guarda, nuevoLienzo, pinta, texDe, geoEquirectangular, geoPath, geoContains, geoBounds, geoCentroid, geoDistance, paisDe, mundo, useFoto, Listo} from './mapas_geo';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));

/* ─────────── piezas comunes ─────────── */
export const Luces: React.FC = () => (<><ambientLight intensity={1.15} /><directionalLight position={[-5, 12, 6]} intensity={2.3} color="#fff4e2" /></>);

/** Pin 3D: cae del cielo, clava EXACTO en f0, se aplasta y suelta una onda. */
export const Pin: React.FC<{x: number; z: number; f0: number; fr: number; color: string; k?: number; base?: number}> = ({x, z, f0, fr, color, k = 1, base = 0}) => {
  const t0 = f0 - 8, p = cl((fr - t0) / 8), y = fr < f0 ? 8 * k * (1 - p * p) : 0, s = salta(fr, f0, {damping: 7, stiffness: 300, mass: 0.55});
  const sy = fr < f0 ? 1.1 : 0.62 + 0.38 * s, sxz = fr < f0 ? 0.92 : 1.22 - 0.22 * s, e = cl((fr - f0) / 24), eo = 1 - Math.pow(1 - e, 2.2);
  return (<group position={[x, base, z]} visible={fr >= t0}>
    <mesh position={[0, 0.02 * k, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={(0.75 + (y / k) * 0.09) * k} renderOrder={2}><planeGeometry args={[1.6, 1.6]} /><meshBasicMaterial map={haloTex()} color="#000000" transparent opacity={0.62 * p} depthWrite={false} /></mesh>
    <group position={[0, y, 0]} scale={[k * sxz, k * sy, k * sxz]}>
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.2, 0.72, 20]} /><meshStandardMaterial color={color} roughness={0.34} metalness={0.05} /></mesh>
      <mesh position={[0, 0.83, 0]}><sphereGeometry args={[0.3, 28, 20]} /><meshStandardMaterial color={color} roughness={0.26} metalness={0.08} /></mesh>
      <mesh position={[0, 0.83, 0.2]}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>
    <mesh position={[0, 0.03 * k, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={(0.3 + 2.7 * eo) * k} visible={fr >= f0 && e < 1} renderOrder={3}><ringGeometry args={[0.95, 1, 64]} /><meshBasicMaterial color={color} transparent opacity={(1 - e) * 0.95} depthWrite={false} /></mesh>
  </group>);
};

/** La frase dicha, abajo, dentro de la escena. No repite el nombre del lugar que ya está clavado en el mapa. */
export const PieFrase: React.FC<{lineas: Linea[]; look: Look; tema: Tema; ya?: string[]; hasta: number; y?: number}> = ({lineas, look, tema, ya = [], hasta, y = 56}) => {
  const n = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''), lug = ya.map(n);
  const ls = lineas.filter((l) => !lug.some((u) => u && n(l.w.map((x) => x[0]).join('')) === u));
  if (!ls.length) return null;
  return (<><div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 400, background: `linear-gradient(transparent, ${alfa(tema.fondo, tema.oscuro ? 0.82 : 0.86)} 78%)`}} />
    <Rotulo lineas={ls} look={look} sobreFoto={tema.oscuro} area={{x: 150, bottom: y, w: 1620, alin: 'center'}} maxGolpe={148} lead={62} renglones={1} hasta={hasta} /></>);
};

const Plancha: React.FC<{pl: Plano; tema: Tema; tex: THREE.Texture}> = ({pl, tex}) => (<mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[pl.ancho, pl.alto]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>);
/** Aire encima de la escena: bruma del horizonte, charco de luz en el foco y fundidos. */
export const Aire: React.FC<{tema: Tema; x?: number; y?: number; sale: number; entra?: number}> = ({tema, x = 960, y = 560, sale, entra = 0}) => (<>
  <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${tema.fondo} 0%, ${alfa(tema.fondo, 0)} 30%)`}} />
  <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1200px 760px at ${x.toFixed(0)}px ${y.toFixed(0)}px, transparent 42%, ${alfa(tema.fondo, tema.oscuro ? 0.62 : 0.34)} 100%)`}} />
  <div style={{position: 'absolute', inset: 0, background: tema.fondo, opacity: Math.max(sale, entra)}} />
</>);

class Poli extends THREE.Curve<THREE.Vector3> {
  p: THREE.Vector3[]; c: number[]; L: number;
  constructor(p: THREE.Vector3[]) { super(); this.p = p; this.c = [0]; for (let i = 1; i < p.length; i++) this.c.push(this.c[i - 1] + p[i].distanceTo(p[i - 1])); this.L = this.c[this.c.length - 1] || 1; }
  getPoint(t: number, o = new THREE.Vector3()) { const s = cl(t) * this.L, c = this.c; let lo = 0, hi = c.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; } const d = c[hi] - c[lo] || 1; return o.copy(this.p[lo]).lerp(this.p[hi], (s - c[lo]) / d); }
  getPointAt(t: number, o = new THREE.Vector3()) { return this.getPoint(t, o); }
}
/** La ruta por gran círculo, con arco; `marcas` = fracción del largo en cada parada. */
const hazRuta = (pl: Plano, pts: LL[], arco: number) => {
  const v: THREE.Vector3[] = [], por: number[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const A = pts[i], B = pts[i + 1], f = geoInterpolate([A.lon, A.lat], [B.lon, B.lat]), [ax, az] = pl.toW(A), [bx, bz] = pl.toW(B), H = Math.min(Math.hypot(bx - ax, bz - az) * 0.3, 3) * arco + 0.05, polar = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].some((k) => Math.abs((f(k / 12) as [number, number])[1]) > 70);
    por.push(v.length);
    for (let j = i ? 1 : 0; j <= 56; j++) { const t = j / 56, q = f(t) as [number, number], [x0, z0] = pl.toW({lon: q[0], lat: q[1]}), x = polar ? lerp(ax, bx, t) : x0, z = polar ? lerp(az, bz, t) : z0; v.push(new THREE.Vector3(x, 0.05 + Math.sin(Math.PI * t) * H, z)); }
  }
  por.push(v.length - 1);
  const curva3 = new Poli(v.length > 1 ? v : [new THREE.Vector3(), new THREE.Vector3(0.01, 0, 0)]), marcas = por.map((i) => (curva3.c[Math.min(i, curva3.c.length - 1)] ?? 0) / curva3.L);
  return {curva3, marcas, suelo: new Poli(curva3.p.map((q) => new THREE.Vector3(q.x, 0.02, q.z)))};
};
const SEG = 420, RAD = 7;
const tiempos = (raw: any[], a: number, b: number) => {
  const n = raw.length, t: number[] = [];
  raw.forEach((r, i) => { let f = Number(r?.en); if (!Number.isFinite(f)) f = a + ((i + 0.5) / n) * (b - a); t.push(cl(Math.max(f, i ? t[i - 1] + 5 : a + 1), a + 1, b - 4)); });
  return t;
};
/** Tramo a tramo: en cada fracción de la ruta se llega EN el cuadro de su palabra. */
const avance = (fr: number, ens: number[], marcas: number[], ini: number) => {
  if (ens.length < 2) return 0;
  if (fr <= ens[0]) return 0;
  for (let i = 0; i + 1 < ens.length; i++) if (fr <= ens[i + 1]) return lerp(marcas[i], marcas[i + 1], curva.suave(cl((fr - ens[i]) / (ens[i + 1] - ens[i]))));
  return 1;
};
const puntosDe = (ac: any, clave = 'puntos') => (Array.isArray(ac.datos?.[clave]) ? ac.datos[clave] : []).map((r: any) => ({r, q: limpia(r)})).filter((x: any) => x.q) as {r: any; q: LL}[];

/* ═══════════ map_ruta: mapa inclinado, la ruta se traza y cada pin clava en su palabra ═══════════ */
const Ruta: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), {a, b} = ac, T = b - a, tema = useMemo(() => temaDe(look), [look.fondo, look.papel, look.acento]);
  const P0 = puntosDe(ac), P = P0.length ? P0 : [{r: {lugar: ''}, q: {lat: 20, lon: 0}}], ll = P.map((x) => x.q);
  const pl = useMemo(() => hazPlano(ll, {pad: 3.1}), [JSON.stringify(ll)]), tex = useMapa(pl, tema);
  const R = useMemo(() => hazRuta(pl, ll, ac.var === 'tierra' ? 0 : 1), [pl.clave, ac.var]);
  const tubo = useMemo(() => new THREE.TubeGeometry(R.curva3, SEG, 0.055, RAD, false), [R]), sombra = useMemo(() => new THREE.TubeGeometry(R.suelo, SEG, 0.06, 4, false), [R]), brillo = useMemo(() => new THREE.TubeGeometry(R.curva3, SEG, 0.13, RAD, false), [R]);
  const ens = tiempos(P.map((x) => x.r), a, b), u = avance(fr, ens, R.marcas, a), tL = ens[ens.length - 1];
  const nC = Math.floor(u * SEG);
  tubo.setDrawRange(0, nC * RAD * 6); brillo.setDrawRange(0, nC * RAD * 6); sombra.setDrawRange(0, nC * 4 * 6);
  const W = ll.map((q) => pl.toW(q)), cx = (Math.min(...W.map((w) => w[0])) + Math.max(...W.map((w) => w[0]))) / 2, cz = (Math.min(...W.map((w) => w[1])) + Math.max(...W.map((w) => w[1]))) / 2;
  const cab = R.curva3.getPoint(u), dFit = useMemo(() => Math.max(9, distQueEntra(W, cx, cz, 44, 0, 30, 0.7, 0.62, 0.5)), [pl.clave]);
  // cámara: entra de arriba, persigue la cabeza de la ruta y en la última palabra se abre para mostrar todo el viaje
  const sigue = cl((T - 50) / 80), pb = va(fr, tL + 1, Math.max(8, Math.min(32, b - tL - 3)), 0, 1, curva.suave), hit = interpolate(fr, [G, G + 3, G + 14], [0, 0.03, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dCerca = lerp(dFit, Math.max(dFit * 0.52, 8), sigue), tx = lerp(lerp(cx, cab.x, sigue), cx, pb), tz = lerp(lerp(cz, cab.z, sigue), cz, pb);
  const tilt = lerp(16, 54, va(fr, a, 26, 0, 1, curva.expo)) - 10 * pb, az = lerp(-16, 0, va(fr, a, 40, 0, 1, curva.suave)) + 3 * Math.sin((fr - a) / 60);
  const cam = pose(tx, tz, lerp(dCerca, dFit, pb) * (1 - hit) * lerp(1.32, 1, va(fr, a, 22, 0, 1, curva.expo)) * lerp(1, 1.06, va(fr, b - 12, 12, 0, 1, curva.suave)), tilt, az);
  const pr = proyector(cam), k = cl(lerp(dCerca, dFit, pb) / 14, 0.55, 1.5);
  const et: Et[] = P.map((x, i) => { const [wx, wz] = W[i], [sx, sy] = pr(wx, 0, wz), t = String(x.r.lugar || ''); return {x: sx, y: sy, txt: t, f0: ens[i], o: t && sx > -200 && sx < 2120 && sy > -60 && sy < 1100 ? 1 : 0, arriba: 120}; });
  const dato = String(ac.datos?.dato || ''), datoF = Number.isFinite(Number(ac.datos?.dato_en)) && ac.datos?.dato_en != null ? Number(ac.datos.dato_en) : tL + 4;
  if (dato && P.length > 1) { const m = R.curva3.getPoint(R.marcas[Math.floor((R.marcas.length - 1) / 2)] * 0.5 + 0.25), [sx, sy] = pr(m.x, m.y, m.z); et.push({x: sx, y: sy, txt: dato, f0: datoF, tam: 104, arriba: 20}); }
  const [fx, fy] = pr(tx, 0, tz);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: tema.fondo}}>
    <Lienzo cam={cam}>
      <color attach="background" args={[tema.fondo]} /><Luces />
      <Plancha pl={pl} tema={tema} tex={tex} />
      <mesh geometry={sombra} renderOrder={1}><meshBasicMaterial color="#000000" transparent opacity={tema.oscuro ? 0.5 : 0.24} depthWrite={false} /></mesh>
      <mesh geometry={brillo} renderOrder={2}><meshBasicMaterial color={tema.acento} transparent opacity={0.28} depthWrite={false} /></mesh>
      <mesh geometry={tubo} renderOrder={3}><meshBasicMaterial color={tema.acento} toneMapped={false} /></mesh>
      <group position={[cab.x, cab.y, cab.z]} visible={u > 0.001 && u < 0.999}>
        <mesh><sphereGeometry args={[0.13, 20, 16]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <sprite scale={[1.5, 1.5, 1]} renderOrder={4}><spriteMaterial map={haloTex()} color={tema.acento} transparent depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} /></sprite>
      </group>
      {P.map((x, i) => <Pin key={i} x={W[i][0]} z={W[i][1]} f0={ens[i]} fr={fr} color={tema.acento} k={k} />)}
    </Lienzo>
    <Aire tema={tema} x={fx} y={fy} sale={va(fr, b - 6, 6, 0, 1, curva.suave)} entra={va(fr, a, 10, 1, 0, curva.suave)} />
    <div style={{position: 'absolute', inset: 0, opacity: 1 - va(fr, b - 6, 6, 0, 1, curva.suave)}}><Etiquetas et={et} look={look} fr={fr} tema={tema} /></div>
    <PieFrase lineas={ac.lineas} look={look} tema={tema} ya={P.map((x) => String(x.r.lugar || '')).concat(dato)} hasta={b} />
  </div>);
};

/* ═══════════ map_picada: del espacio a un lugar; el pin clava en la palabra ═══════════ */
const enEsfera = (lat: number, lon: number, r = 1) => { const phi = (lon + 180) * D2R, th = (90 - lat) * D2R; return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th)); };
const V_GLOBO = `varying vec2 vUv; varying vec3 vN; varying vec3 vP; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 p = modelViewMatrix * vec4(position, 1.0); vP = p.xyz; gl_Position = projectionMatrix * p; }`;
const F_GLOBO = `uniform sampler2D map; uniform float uBorde; uniform vec3 uAire; varying vec2 vUv; varying vec3 vN; varying vec3 vP;
void main(){ vec4 c = texture2D(map, vUv); vec3 n = normalize(vN); float d = max(0.0, dot(n, normalize(vec3(-0.5, 0.55, 0.68)))); float r = pow(1.0 - max(0.0, dot(n, normalize(-vP))), 3.0);
  float a = 1.0; if (uBorde > 0.0) a = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(0.0, 0.2, 1.0 - vUv.y);
  gl_FragColor = vec4(c.rgb * (0.36 + 0.86 * d) + uAire * r * 0.75, a);
  #include <colorspace_fragment>
}`;
const F_AIRE = `uniform vec3 uAire; uniform float uI; varying vec3 vN; varying vec3 vP; void main(){ float d = abs(dot(normalize(vN), normalize(-vP))); float f = smoothstep(0.0, 0.34, d); f = f * f * uI; gl_FragColor = vec4(uAire * f, f);
  #include <colorspace_fragment>
}`;
const estrellas = () => { const g = new THREE.BufferGeometry(), n = 900, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = new THREE.Vector3(random('e' + i) - 0.5, random('f' + i) - 0.5, random('g' + i) - 0.5).normalize().multiplyScalar(60); p.set([v.x, v.y, v.z], i * 3); } g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return g; };
const Picada: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, b} = ac, tema = useMemo(() => temaDe(look), [look.fondo, look.papel, look.acento]);
  const q = limpia(ac.datos) || {lat: 20, lon: 0}, lugar = String(ac.datos?.lugar || ''), en = Number(ac.datos?.en), G = cl(Number.isFinite(en) && ac.datos?.en != null ? en : golpeDe(ac), a + 8, b - 6);
  const mundoTex = useMemo(() => { const W = 4096, H = 2048, proj = geoEquirectangular().rotate([0, 0]).scale(W / (2 * Math.PI)).translate([W / 2, H / 2]); return texDe(guarda(`g|${tema.mar}|${tema.tierra}|${tema.costa}`, () => { const c = nuevoLienzo(W, H); pinta(c.getContext('2d')!, {cw: W, ch: H, proj}, tema, {borde: false}); return c; })); }, [tema.mar, tema.tierra]);
  const DLON = 60, DLAT = 30, parche = useMemo(() => { const W = 3072, H = 1536, esc = W / (DLON * D2R), proj = geoEquirectangular().rotate([-q.lon, 0]).scale(esc).translate([W / 2, H / 2 + q.lat * D2R * esc]).clipExtent([[-8, -8], [W + 8, H + 8]]); return texDe(guarda(`p|${q.lat}|${q.lon}|${tema.mar}|${tema.tierra}`, () => { const c = nuevoLienzo(W, H); pinta(c.getContext('2d')!, {cw: W, ch: H, proj}, tema, {borde: false}); return c; })); }, [q.lat, q.lon, tema.mar]);
  const aire = useMemo(() => new THREE.Color(tema.oscuro ? mix(tema.mar2, '#9fd0ff', 0.55) : mix(tema.acento2, '#ffffff', 0.25)), [tema.mar2]);
  const matG = useMemo(() => new THREE.ShaderMaterial({vertexShader: V_GLOBO, fragmentShader: F_GLOBO, uniforms: {map: {value: mundoTex}, uBorde: {value: 0}, uAire: {value: aire}}}), [mundoTex]);
  const matP = useMemo(() => new THREE.ShaderMaterial({vertexShader: V_GLOBO, fragmentShader: F_GLOBO, transparent: true, depthWrite: false, uniforms: {map: {value: parche}, uBorde: {value: 1}, uAire: {value: aire}}}), [parche]);
  const matA = useMemo(() => new THREE.ShaderMaterial({vertexShader: V_GLOBO, fragmentShader: F_AIRE, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: {uAire: {value: aire}, uI: {value: 1}}}), [aire]);
  const cielo = useMemo(estrellas, []);
  const parcheG = useMemo(() => { const lat1 = Math.min(84, q.lat + DLAT / 2), lat0 = Math.max(-84, q.lat - DLAT / 2); return new THREE.SphereGeometry(1.0009, 72, 40, (q.lon - DLON / 2 + 180) * D2R, DLON * D2R, (90 - lat1) * D2R, (lat1 - lat0) * D2R); }, [q.lat, q.lon]);
  // la picada termina EN la palabra: distancia exponencial, la dirección llega antes
  const S = Math.max(a + 1, G - Math.min(44, (G - a) * 0.82)), corto = G - a < 22;
  const dIni = (corto ? 2.5 : 3.5) * lerp(1.34, 1, va(fr, a, 20, 0, 1, curva.expo)), dFin = 1.44;
  const pd = cl((fr - S) / Math.max(1, G - S)), td = pd < 0.5 ? 4 * pd * pd * pd : 1 - Math.pow(-2 * pd + 2, 3) / 2;
  const dist = Math.exp(lerp(Math.log(dIni), Math.log(dFin), td)) * lerp(1, 0.965, va(fr, G, b - G, 0, 1, curva.suave)) * (1 + interpolate(fr, [G, G + 2, G + 12], [0, -0.012, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const ta = va(fr, a, Math.max(4, G - a) * 0.92, 0, 1, curva.suave), lat0 = cl(q.lat - 16, -60, 60), lon0 = q.lon - 72, deriva = 2.2 * Math.sin((fr - a) / 40) * (1 - ta * 0.6);
  const baja = cl((fr - S) / Math.max(1, G - S)), inclina = 7.5 * baja;
  const pos = enEsfera(lerp(lat0, q.lat, ta) - inclina, lerp(lon0, q.lon, ta) + deriva, dist), mira = enEsfera(q.lat, q.lon, 1).multiplyScalar(baja);
  const cam: Pose = {p: [pos.x, pos.y, pos.z], l: [mira.x, mira.y, mira.z], fov: 35};
  matA.uniforms.uI.value = 0.95 * cl((dist - 1.12) / 0.5);
  const pr = proyector(cam), pv = enEsfera(q.lat, q.lon, 1.002), [sx, sy] = pr(pv.x, pv.y, pv.z);
  const n = enEsfera(q.lat, q.lon, 1), qt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
  const foto = ac.fotos[0], tI = G + Math.max(12, (b - G) * 0.34), iris = foto && b - tI > 12 ? va(fr, tI, Math.min(20, b - tI - 4), 0, 1, curva.suave) : 0;
  const sale = va(fr, b - 6, 6, 0, 1, curva.suave), fondo = tema.oscuro ? tema.fondo : mix(tema.fondo, '#0b1826', 0.82);
  const et: Et[] = lugar ? [{x: sx, y: sy, txt: lugar, f0: G, tam: 100, arriba: 170}] : [];
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: fondo}}>
    <Lienzo cam={cam}>
      <color attach="background" args={[fondo]} /><Luces />
      <points geometry={cielo}><pointsMaterial color="#e8eeff" size={2.4} sizeAttenuation={false} transparent opacity={0.7} depthWrite={false} /></points>
      <mesh material={matG}><sphereGeometry args={[1, 96, 64]} /></mesh>
      <mesh material={matP} geometry={parcheG} renderOrder={1} />
      <mesh material={matA} renderOrder={2}><sphereGeometry args={[1.07, 72, 48]} /></mesh>
      <group position={[n.x, n.y, n.z]} quaternion={qt}><Pin x={0} z={0} f0={G} fr={fr} color={tema.acento} k={0.052} /></group>
    </Lienzo>
    {iris > 0 && foto && <div style={{position: 'absolute', inset: 0, clipPath: `circle(${(iris * 1500).toFixed(1)}px at ${sx.toFixed(0)}px ${sy.toFixed(0)}px)`}}><Encuadre id={foto.id} foco={foto.foco} zoom={1.12 - iris * 0.1} /></div>}
    {iris > 0 && iris < 1 && <div style={{position: 'absolute', left: sx - iris * 1500, top: sy - iris * 1500, width: iris * 3000, height: iris * 3000, borderRadius: '50%', border: `10px solid ${tema.acento}`, boxSizing: 'border-box'}} />}
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(75% 75% at 50% 50%, transparent 58%, ${alfa('#000000', 0.5)} 100%)`}} />
    <div style={{position: 'absolute', inset: 0}}><Etiquetas et={iris > 0.4 ? et.map((e) => ({...e, x: 960, y: 760, arriba: 40})) : et} look={look} fr={fr} tema={iris > 0.4 ? {...tema, letra: '#ffffff', halo: '#14100a'} : tema} /></div>
    <PieFrase lineas={ac.lineas} look={look} tema={{...tema, fondo, oscuro: true}} ya={[lugar]} hasta={b} />
    <div style={{position: 'absolute', inset: 0, background: fondo, opacity: Math.max(sale, va(fr, a, 8, 1, 0, curva.suave))}} />
  </div>);
};

/* ═══════════ map_maqueta: el mapa se arma pieza por pieza y el país de la palabra se levanta ═══════════ */
type Anillo = [number, number][];
const anillosDe = (f: any, proj: any) => { const r: Anillo[] = []; let c: Anillo = []; const ctx = {moveTo: (x: number, y: number) => { c = [[x, y]]; r.push(c); }, lineTo: (x: number, y: number) => c.push([x, y]), closePath: () => {}, arc: () => {}, beginPath: () => {}}; geoPath(proj, ctx as any)(f); return r; };
const area2 = (a: Anillo) => { let s = 0; for (let i = 0; i < a.length; i++) { const [x0, y0] = a[i], [x1, y1] = a[(i + 1) % a.length]; s += x0 * y1 - x1 * y0; } return s / 2; };
const dentroDe = (p: [number, number], a: Anillo) => { let d = false; for (let i = 0, j = a.length - 1; i < a.length; j = i++) if ((a[i][1] > p[1]) !== (a[j][1] > p[1]) && p[0] < ((a[j][0] - a[i][0]) * (p[1] - a[i][1])) / (a[j][1] - a[i][1]) + a[i][0]) d = !d; return d; };
const bloque = (f: any, pl: Plano, alto: number): THREE.BufferGeometry | null => {
  const U = pl.ancho / pl.cw, an = anillosDe(f, pl.proj).filter((r) => r.length > 3 && Math.abs(area2(r)) > 40); if (!an.length) return null;
  const signo = Math.sign(area2(an.reduce((m, r) => (Math.abs(area2(r)) > Math.abs(area2(m)) ? r : m), an[0])));
  const pt = (x: number, y: number) => new THREE.Vector2((x - pl.cw / 2) * U, -(y - pl.ch / 2) * U), ext = an.filter((r) => Math.sign(area2(r)) === signo), hue = an.filter((r) => Math.sign(area2(r)) !== signo);
  const shapes = ext.map((r) => { const s = new THREE.Shape(r.map(([x, y]) => pt(x, y))); hue.filter((h) => dentroDe(h[0], r)).forEach((h) => s.holes.push(new THREE.Path(h.map(([x, y]) => pt(x, y))))); return s; });
  const W = pl.ancho, H = pl.alto, ladoU = 5 / pl.cw, ladoV = 1 - 5 / pl.ch;
  const uv = {generateTopUV: (_: any, v: number[], a: number, b: number, c: number) => [a, b, c].map((i) => new THREE.Vector2((v[i * 3] + W / 2) / W, (v[i * 3 + 1] + H / 2) / H)), generateSideWallUV: () => [0, 1, 2, 3].map(() => new THREE.Vector2(ladoU, ladoV))};
  const g = new THREE.ExtrudeGeometry(shapes, {depth: alto, bevelEnabled: false, UVGenerator: uv as any, curveSegments: 1}); g.rotateX(-Math.PI / 2); return g;
};
const Maqueta: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, b} = ac, tema = useMemo(() => temaDe(look), [look.fondo, look.papel, look.acento]);
  const q = limpia(ac.datos) || {lat: 20, lon: 0}, lugar = String(ac.datos?.lugar || ''), en = Number(ac.datos?.en), G = cl(Number.isFinite(en) && ac.datos?.en != null ? en : golpeDe(ac), a + 6, b - 5);
  const m = useMemo(() => {
    const pa: any = paisDe(q), trozo = pa ? (pa.geometry.type === 'MultiPolygon' ? {type: 'Polygon', coordinates: pa.geometry.coordinates.find((c: any) => geoContains({type: 'Polygon', coordinates: c} as any, [q.lon, q.lat])) || pa.geometry.coordinates[0]} : pa.geometry) : null;
    const bb = trozo ? geoBounds(trozo as any) : null, pts: LL[] = bb ? [{lon: bb[0][0], lat: bb[0][1]}, {lon: bb[1][0], lat: bb[1][1]}, q] : [q];
    const pl = hazPlano(pts, {pad: 1.3, holgura: 2.1, minGrados: 11, lado: 3072, aspecto: 1.5});
    const lista = mundo().paises.filter((f: any) => f !== pa).map((f: any) => ({f, d: geoDistance(geoCentroid(f), [q.lon, q.lat])})).sort((x: any, y: any) => x.d - y.d);
    const piezas = lista.slice(0, 60).map((x: any) => bloque(x.f, pl, 0.26)).filter(Boolean).slice(0, 30) as THREE.BufferGeometry[];
    return {pa, pl, piezas, obj: pa ? bloque(pa, pl, 0.26) : null};
  }, [q.lat, q.lon]);
  const {pl, piezas, obj, pa} = m;
  const tex = useMemo(() => texDe(guarda(`q|${pl.clave}|${tema.mar}|${tema.tierra}`, () => { const c = nuevoLienzo(pl.cw, pl.ch), g = c.getContext('2d')!; pinta(g, pl, tema, {borde: false}); g.fillStyle = mix(tema.tierra, tema.oscuro ? '#000000' : tema.costa, 0.5); g.fillRect(0, 0, 14, 14); return c; })), [pl.clave, tema.mar]);
  const mats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshLambertMaterial({map: tex})), [tex]), matO = useMemo(() => new THREE.MeshLambertMaterial({color: tema.acento, emissive: new THREE.Color(tema.acento), emissiveIntensity: 0.15}), [tema.acento]);
  const lado = useMemo(() => new THREE.MeshBasicMaterial({toneMapped: false}), []), ladoO = useMemo(() => new THREE.MeshBasicMaterial({color: mix(tema.acento, '#000000', 0.36), toneMapped: false}), [tema.acento]);
  const w = Math.max(10, G - a) * 0.85, s = salta(fr, G, {damping: 8.5, stiffness: 190, mass: 0.75}), gOn = va(fr, G - 1, 10, 0, 1, curva.expo), apaga = 1 - 0.46 * gOn;
  mats.forEach((m, i) => m.color.setScalar(apaga * [1, 0.9, 0.8][i])); lado.color.set(mix(tema.tierra, tema.oscuro ? '#000000' : tema.costa, 0.58)).multiplyScalar(apaga); matO.emissiveIntensity = 0.12 + 0.35 * (1 - cl((fr - G) / 18));
  const [tx, tz] = pl.toW(q), W0 = pl.ancho + 0.8, H0 = pl.alto + 0.8;
  const dFit = useMemo(() => distQueEntra([[-pl.ancho / 2, -pl.alto / 2], [pl.ancho / 2, -pl.alto / 2], [-pl.ancho / 2, pl.alto / 2], [pl.ancho / 2, pl.alto / 2]], 0, 0, 44, 0, 30, 0.9, 0.82, 0.82), [pl.clave]);
  const ent = va(fr, a, 34, 0, 1, curva.expo), az = lerp(-30, 2, va(fr, a, Math.max(30, b - a), 0, 1, curva.suave)) + Math.sin((fr - a) / 44) * 2, push = lerp(1, 0.74, va(fr, G - 2, 22, 0, 1, curva.suave));
  const cam = pose(tx * gOn * 0.65, tz * gOn * 0.65, dFit * lerp(1.34, 1, ent) * push, lerp(24, 47, ent), az);
  const H = 0.26 + 0.85 * s, pr = proyector(cam), [sx, sy] = pr(tx, H, tz), sale = va(fr, b - 6, 6, 0, 1, curva.suave);
  const caida = (rk: number, n: number) => { const f0 = a + 2 + (rk / Math.max(1, n)) * w; return {f0, y: fr < f0 ? 6 : 6 * (1 - salta(fr, f0, {damping: 11, stiffness: 170, mass: 0.7}))}; };
  const objC = caida(piezas.length * 0.2, piezas.length);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: tema.mesa}}>
    <Lienzo cam={cam}>
      <color attach="background" args={[tema.mesa]} /><Luces />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.44, 0]} scale={[W0 * 1.3, H0 * 1.3, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={haloTex()} color="#000000" transparent opacity={tema.oscuro ? 0.9 : 0.5} depthWrite={false} /></mesh>
      <mesh position={[0, -0.2, 0]}><boxGeometry args={[W0, 0.4, H0]} /><meshLambertMaterial color={mix(tema.mesa, tema.oscuro ? '#ffffff' : '#000000', 0.2)} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}><planeGeometry args={[pl.ancho, pl.alto]} /><meshLambertMaterial map={tex} color={new THREE.Color(apaga, apaga, apaga)} /></mesh>
      {piezas.map((g, i) => { const c = caida(i, piezas.length); return <mesh key={i} geometry={g} material={[mats[i % 3], lado]} position={[0, c.y, 0]} visible={fr >= c.f0} />; })}
      {obj && <mesh geometry={obj} material={[matO, ladoO]} position={[0, objC.y, 0]} scale={[1, H / 0.26, 1]} visible={fr >= objC.f0} />}
      {obj && <mesh position={[tx, 0.3, tz]} rotation={[-Math.PI / 2, 0, 0]} scale={Math.max(0.001, pl.ancho * 0.62)} visible={gOn > 0.01} renderOrder={1}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={haloTex()} color={tema.acento} transparent opacity={0.6 * gOn} depthWrite={false} blending={tema.oscuro ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={false} /></mesh>}
      {!pa && <Pin x={tx} z={tz} f0={G} fr={fr} color={tema.acento} k={1.1} />}
    </Lienzo>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1250px 800px at 50% 52%, transparent 48%, ${alfa('#000000', tema.oscuro ? 0.55 : 0.2)} 100%)`}} />
    <div style={{position: 'absolute', inset: 0}}><Etiquetas et={lugar ? [{x: sx, y: sy, txt: lugar, f0: G + 2, tam: 104, arriba: 40}] : []} look={look} fr={fr} tema={tema} /></div>
    <PieFrase lineas={ac.lineas} look={look} tema={tema} ya={[lugar]} hasta={b} />
    <div style={{position: 'absolute', inset: 0, background: tema.mesa, opacity: Math.max(sale, va(fr, a, 8, 1, 0, curva.suave))}} />
  </div>);
};

/* ═══════════ map_pergamino: el rollo se desenrolla sobre la mesa, la ruta se entinta y la X cae en la palabra ═══════════ */
const V_ROLLO = `uniform float uL; uniform float uR; varying vec2 vUv; varying float vT;
void main(){ vUv = uv; vec3 p = position; float a = abs(p.x), sg = p.x < 0.0 ? -1.0 : 1.0; vT = 0.0;
  if (a > uL) { float th = (a - uL) / uR, r = uR + 0.0065 * th; p.x = sg * (uL + r * sin(th)); p.y = r * (1.0 - cos(th)) + 0.004; vT = th; }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const F_ROLLO = `uniform sampler2D map; uniform vec3 uDorso; varying vec2 vUv; varying float vT;
void main(){ vec3 c = gl_FrontFacing ? texture2D(map, vUv).rgb : uDorso; float k = 1.0; if (vT > 0.0) { float m = mod(vT, 6.2832); k = 0.62 + 0.42 * max(0.0, cos(m - 2.4)); } gl_FragColor = vec4(c * k, 1.0);
  #include <colorspace_fragment>
}`;
const papelMapa = (L: Look) => { const claro = L.claro || '#fff9ec', p = lum(L.papel) > 0.6 ? mix(L.papel, '#d9c28e', 0.3) : mix(claro, '#d9c28e', 0.5), tinta = lum(L.tinta) < 0.45 ? L.tinta : '#2C2318', roja = lum(L.acento) < 0.5 ? L.acento : mix(L.acento, '#6a1608', 0.62); return {p, tinta, roja}; };
const pintaRollo = (c: HTMLCanvasElement, pl: Plano, p: string, tinta: string, roja: string) => {
  const g = c.getContext('2d')!, W = c.width, H = c.height, t: Tema = {mar: p, mar2: mix(p, tinta, 0.2), tierra: mix(p, '#ffffff', 0.32), tierra2: mix(p, tinta, 0.28), costa: tinta, frontera: alfa(tinta, 0.22), retic: alfa(tinta, 0.13), fondo: p, halo: p, letra: tinta, acento: roja, acento2: tinta, oscuro: false, mesa: p};
  pinta(g, pl, t, {ink: true, borde: false});
  for (let i = 0; i < 26; i++) { const x = random('m' + i) * W, y = random('n' + i) * H, r = (0.04 + random('o' + i) * 0.14) * W, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, alfa('#5b3a12', 0.05)); gr.addColorStop(1, alfa('#5b3a12', 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62); v.addColorStop(0, alfa('#4a2c0a', 0)); v.addColorStop(1, alfa('#4a2c0a', 0.42)); g.fillStyle = v; g.fillRect(0, 0, W, H);
  // doble filete y rosa de los vientos
  const m = W * 0.05; g.strokeStyle = alfa(tinta, 0.6); g.lineWidth = W * 0.0018; g.strokeRect(m, m, W - 2 * m, H - 2 * m); g.lineWidth = W * 0.0006; g.strokeRect(m + W * 0.007, m + W * 0.007, W - 2 * m - W * 0.014, H - 2 * m - W * 0.014);
  g.save(); g.translate(W * 0.885, H * 0.8); const R = H * 0.115; for (let i = 0; i < 8; i++) { g.save(); g.rotate((i * Math.PI) / 4); const l = i % 2 ? R * 0.58 : R; g.beginPath(); g.moveTo(0, -l); g.lineTo(R * 0.09, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = alfa(tinta, 0.82); g.fill(); g.beginPath(); g.moveTo(0, -l); g.lineTo(-R * 0.09, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = i % 2 ? alfa(tinta, 0.3) : roja; g.fill(); g.restore(); } g.beginPath(); g.arc(0, 0, R * 0.72, 0, 7); g.strokeStyle = alfa(tinta, 0.55); g.lineWidth = W * 0.001; g.stroke(); g.restore();
};
const madera = (L: Look) => guarda(`w|${L.fondo}`, () => { const c = nuevoLienzo(1600, 1000), g = c.getContext('2d')!, base = lum(L.fondo || L.papel) < 0.3 ? '#2e2016' : '#6b4a2c'; for (let k = 0; k < 7; k++) { const y0 = (k * 1000) / 7; g.fillStyle = mix(base, '#000000', 0.08 + random('tb' + k) * 0.26); g.fillRect(0, y0, 1600, 145); for (let i = 0; i < 110; i++) { const y = y0 + random(`v${k}${i}`) * 143, a = 0.03 + random(`u${k}${i}`) * 0.08; g.strokeStyle = random(`c${k}${i}`) > 0.5 ? alfa('#000000', a) : alfa('#d9a56a', a * 0.6); g.lineWidth = 1 + random(`w${k}${i}`) * 2.4; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(500, y + random(`x${k}${i}`) * 14 - 7, 1100, y + random(`z${k}${i}`) * 14 - 7, 1600, y); g.stroke(); } g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, y0 + 142, 1600, 4); } return c; });
const Pergamino: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), {a, b} = ac, T = b - a, tema = useMemo(() => temaDe(look), [look.fondo, look.papel, look.acento]), {p, tinta, roja} = useMemo(() => papelMapa(look), [look.papel, look.tinta, look.acento]);
  const P0 = puntosDe(ac), P = P0.length ? P0 : [{r: {lugar: ''} as any, q: {lat: 20, lon: 0}}], ll = P.map((x) => x.q), WP = 15, HP = 9.2;
  const pl = useMemo(() => hazPlano(ll, {pad: 1.15, holgura: 1.6, minGrados: ll.length < 2 ? 62 : 36, lado: 3072, aspecto: WP / HP, unidades: WP / 1.15}), [JSON.stringify(ll)]), esc = WP / pl.ancho;
  const tex = useMemo(() => texDe(guarda(`r|${pl.clave}|${p}|${tinta}`, () => { const c = nuevoLienzo(pl.cw, pl.ch); pintaRollo(c, pl, p, tinta, roja); return c; }), 4), [pl.clave, p]);
  const mesaTex = useMemo(() => texDe(madera(look), 4), [look.fondo]);
  const dorso = useMemo(() => new THREE.Color(mix(p, '#8a6a3a', 0.35)), [p]), Rr = 0.3, Lmax = WP / 2 - 2 * Math.PI * Rr * 0.55;
  const mat = useMemo(() => new THREE.ShaderMaterial({vertexShader: V_ROLLO, fragmentShader: F_ROLLO, side: THREE.DoubleSide, uniforms: {map: {value: tex}, uL: {value: 0.2}, uR: {value: Rr}, uDorso: {value: dorso}}}), [tex]);
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(WP, HP, 420, 1); g.rotateX(-Math.PI / 2); return g; }, []);
  const tA = a + Math.max(10, Math.min(30, (G - a) * 0.5)), abre = salta(fr, a + 2, {damping: 17, stiffness: Math.max(40, 2600 / Math.max(10, tA - a)), mass: 1}), L = 0.25 + (Lmax - 0.25) * Math.min(1.012, abre);
  mat.uniforms.uL.value = L;
  const W = ll.map((q) => { const [x, z] = pl.toW(q); return [x * esc, z * esc] as [number, number]; });
  const ens = tiempos(P.map((x) => x.r), Math.max(a, tA - 1), b);
  // ruta punteada de tinta, trazo de pluma: se agrega guión por guión
  const R = useMemo(() => { const v: THREE.Vector3[] = [], por: number[] = []; for (let i = 0; i + 1 < W.length; i++) { const [ax, az] = W[i], [bx, bz] = W[i + 1], d = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / d, nz = (bx - ax) / d, bu = d * 0.09; por.push(v.length); for (let j = i ? 1 : 0; j <= 40; j++) { const t = j / 40, s = Math.sin(Math.PI * t) * bu; v.push(new THREE.Vector3(ax + (bx - ax) * t + nx * s, 0.014, az + (bz - az) * t + nz * s)); } } por.push(Math.max(0, v.length - 1)); const c = new Poli(v.length > 1 ? v : [new THREE.Vector3(), new THREE.Vector3(0.01, 0, 0)]); return {c, marcas: por.map((i) => (c.c[i] ?? 0) / c.L)}; }, [pl.clave]);
  const guiones = useMemo(() => { const paso = 0.27, n = Math.max(1, Math.floor(R.c.L / paso)), pos = new Float32Array(n * 12), idx: number[] = [], A = 0.085, a0 = new THREE.Vector3(), b0 = new THREE.Vector3(); for (let i = 0; i < n; i++) { const t0 = i / n, t1 = t0 + 0.6 / n; R.c.getPoint(t0, a0); R.c.getPoint(t1, b0); const dx = b0.x - a0.x, dz = b0.z - a0.z, l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * A * 0.5, nz = (dx / l) * A * 0.5; pos.set([a0.x + nx, 0.014, a0.z + nz, a0.x - nx, 0.014, a0.z - nz, b0.x + nx, 0.014, b0.z + nz, b0.x - nx, 0.014, b0.z - nz], i * 12); const q = i * 4; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); return {g, n}; }, [R]);
  const u = avance(fr, ens, R.marcas, a); guiones.g.setDrawRange(0, Math.floor(u * guiones.n) * 6);
  const tilt = lerp(22, 40, va(fr, a, Math.max(20, T * 0.6), 0, 1, curva.suave)), az = lerp(10, -5, va(fr, a, T, 0, 1, curva.suave)) + 1.6 * Math.sin((fr - a) / 36);
  const dFit = useMemo(() => distQueEntra([[-WP / 2, -HP / 2], [WP / 2, -HP / 2], [-WP / 2, HP / 2], [WP / 2, HP / 2]], 0, 0, 38, 0, 30, 0.94, 0.86, 0.86), []);
  const last = W[W.length - 1], tL = ens[ens.length - 1], hit = interpolate(fr, [tL, tL + 3, tL + 16], [0, 0.04, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), acerca = va(fr, tL - 4, Math.max(8, Math.min(30, b - tL)), 0, 1, curva.suave);
  const cam = pose(last[0] * 0.22 * acerca, last[1] * 0.22 * acerca, dFit * lerp(1.16, 0.9, acerca) * (1 - hit), tilt, az);
  const pr = proyector(cam), sale = va(fr, b - 6, 6, 0, 1, curva.suave), xs = salta(fr, tL, {damping: 9, stiffness: 340, mass: 0.6});
  const et: Et[] = P.map((x, i) => { const [sx, sy] = pr(W[i][0], 0, W[i][1]); return {x: sx, y: sy, txt: String(x.r.lugar || ''), f0: ens[i] + 1, tam: 84, arriba: i === P.length - 1 ? 92 : 34}; }).filter((e) => e.txt);
  const tMano = {...tema, letra: tinta, halo: alfa(p, 0.92)}, lookMano = {...look, display: look.mano || look.display};
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#1a120b'}}>
    <Lienzo cam={cam}>
      <color attach="background" args={['#1a120b']} /><Luces />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}><planeGeometry args={[42, 26]} /><meshBasicMaterial map={mesaTex} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0.18]} scale={[(2 * L + 2.4) * 1.16, (HP + 1.5) * 1.3, 1]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={haloTex()} color="#000000" transparent opacity={0.92} depthWrite={false} /></mesh>
      <mesh geometry={geo} material={mat} />
      {[-1, 1].map((s) => <group key={s} position={[s * L, Rr + 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><mesh><cylinderGeometry args={[Rr * 0.52, Rr * 0.52, HP + 1.05, 20]} /><meshStandardMaterial color="#5b3417" roughness={0.5} /></mesh>{[-1, 1].map((e) => <mesh key={e} position={[0, (e * (HP + 1.12)) / 2, 0]}><sphereGeometry args={[Rr * 0.8, 18, 14]} /><meshStandardMaterial color="#3d210d" roughness={0.3} metalness={0.2} /></mesh>)}</group>)}
      <mesh geometry={guiones.g} renderOrder={2}><meshBasicMaterial color={roja} toneMapped={false} side={THREE.DoubleSide} /></mesh>
      {P.map((_, i) => { const k = salta(fr, ens[i], {damping: 11, stiffness: 300, mass: 0.6}); return i < P.length - 1 ? <mesh key={i} position={[W[i][0], 0.016, W[i][1]]} rotation={[-Math.PI / 2, 0, 0]} scale={Math.max(0.001, k)} visible={fr >= ens[i]}><ringGeometry args={[0.12, 0.25, 26]} /><meshBasicMaterial color={tinta} toneMapped={false} /></mesh> : null; })}
      <group position={[last[0], 0.03, last[1]]} rotation={[0, 0.2, 0]} scale={Math.max(0.001, 2.1 - 1.1 * xs)} visible={fr >= tL}>
        {[Math.PI / 4, -Math.PI / 4].map((r, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, r]}><planeGeometry args={[1.75, 0.3]} /><meshBasicMaterial color={roja} toneMapped={false} /></mesh>)}
      </group>
    </Lienzo>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1200px 780px at 50% 50%, ${alfa('#ffd9a0', 0.09)} 0%, transparent 52%, ${alfa('#000000', 0.55)} 100%)`}} />
    <div style={{position: 'absolute', inset: 0, opacity: va(fr, tA - 2, 5, 0, 1)}}><Etiquetas et={et} look={lookMano} fr={fr} tema={tMano} mayus={false} /></div>
    <PieFrase lineas={ac.lineas} look={look} tema={{...tema, fondo: '#120c07', oscuro: true}} ya={P.map((x) => String(x.r.lugar || ''))} hasta={b} />
    <div style={{position: 'absolute', inset: 0, background: '#120c07', opacity: Math.max(sale, va(fr, a, 8, 1, 0, curva.suave))}} />
  </div>);
};

/* ═══════════ map_onda: mapa apagado; en la palabra una onda de luz sale del lugar y prende el mundo ═══════════ */
const V_PLANO = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const F_ONDA = `uniform sampler2D map; uniform sampler2D masc; uniform vec2 uC; uniform float uR; uniform float uAsp; uniform vec3 uAc; uniform float uB; varying vec2 vUv;
void main(){ vec4 t = texture2D(map, vUv); float m = texture2D(masc, vUv).r; vec2 d = (vUv - uC) * vec2(uAsp, 1.0); float r = length(d);
  float dentro = 1.0 - smoothstep(uR - 0.02, uR, r), borde = smoothstep(uR - 0.06, uR - 0.004, r) * (1.0 - smoothstep(uR, uR + 0.006, r));
  float g = dot(t.rgb, vec3(0.3, 0.59, 0.11)); vec3 ap = mix(vec3(g), t.rgb, 0.4) * 0.3; vec3 pr = mix(t.rgb, uAc, m * 0.82);
  vec3 c = mix(ap, pr, dentro) + uAc * borde * (0.32 + 0.9 * m) * uB;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
const Onda: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, b} = ac, T = b - a, tema = useMemo(() => temaDe(look), [look.fondo, look.papel, look.acento]), d = ac.datos || {};
  const q = limpia(d) || {lat: 20, lon: 0}, lugar = String(d.lugar || ''), en = Number(d.en), G = cl(Number.isFinite(en) && d.en != null ? en : golpeDe(ac), a + 6, b - 8);
  const D = puntosDe(ac, 'destinos'), todos = [q, ...D.map((x) => x.q)];
  const pl = useMemo(() => hazPlano(todos, {pad: 3, minGrados: 34, holgura: 1.35}), [JSON.stringify(todos)]), tex = useMapa(pl, tema);
  const masc = useMemo(() => { const c = guarda(`k|${pl.clave}`, () => { const W = 1400, H = Math.round((W * pl.ch) / pl.cw), c = nuevoLienzo(W, H), g = c.getContext('2d')!, e = W / pl.cw; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.setTransform(e, 0, 0, e, 0, 0); const pa = geoPath(pl.proj, g); g.beginPath(); pa(mundo().land as any); g.fillStyle = '#fff'; g.fill(); return c; }); const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; return t; }, [pl.clave]);
  const [ox, oz] = pl.toW(q), W = D.map((x) => pl.toW(x.q)), asp = pl.ancho / pl.alto, uC = useMemo(() => new THREE.Vector2(ox / pl.ancho + 0.5, 0.5 - oz / pl.alto), [pl.clave]);
  const dm = W.reduce((m, [x, z]) => Math.max(m, Math.hypot(x - ox, z - oz)), 0), Rmax = Math.max(dm * 1.32, pl.ancho * 0.24) / pl.alto;
  const ac3 = useMemo(() => new THREE.Color(tema.acento), [tema.acento]);
  const mat = useMemo(() => new THREE.ShaderMaterial({vertexShader: V_PLANO, fragmentShader: F_ONDA, uniforms: {map: {value: tex}, masc: {value: masc}, uC: {value: uC}, uR: {value: 0}, uAsp: {value: asp}, uAc: {value: ac3}, uB: {value: 1}}}), [tex]);
  const durO = Math.max(16, Math.min(70, (b - G) * 0.82)), uO = cl((fr - G) / durO), onda = 1 - Math.pow(1 - uO, 2.4), R = onda * Rmax * 1.02;
  mat.uniforms.uR.value = fr < G ? 0.0 : R; mat.uniforms.uB.value = 1 - 0.75 * cl((uO - 0.72) / 0.28);
  const arcos = useMemo(() => D.map((x) => { const r = hazRuta(pl, [q, x.q], 0.8); return {g: new THREE.TubeGeometry(r.curva3, 96, 0.05, 6, false), c: r.curva3}; }), [pl.clave]);
  const llega = D.map((x, i) => { const e = Number(x.r.en); if (x.r.en != null && Number.isFinite(e)) return cl(e, G + 2, b - 3); const dd = Math.hypot(W[i][0] - ox, W[i][1] - oz) / (Rmax * pl.alto), tt = 1 - Math.pow(1 - cl(dd), 1 / 2.4); return G + tt * durO; });
  arcos.forEach((x, i) => x.g.setDrawRange(0, Math.floor(cl((fr - G) / Math.max(2, llega[i] - G)) * 96) * 36));
  const all: [number, number][] = [[ox, oz], ...W], cx = (Math.min(...all.map((w) => w[0])) + Math.max(...all.map((w) => w[0]))) / 2, cz = (Math.min(...all.map((w) => w[1])) + Math.max(...all.map((w) => w[1]))) / 2;
  const dFit = useMemo(() => Math.max(11, distQueEntra(all.length > 1 ? all : [[ox - 4, oz - 2], [ox + 4, oz + 2]], cx, cz, 46, 0, 30, 0.72, 0.62, 0.5)), [pl.clave]);
  const abre = va(fr, G - 2, Math.max(14, Math.min(44, b - G - 4)), 0, 1, curva.suave), dIni = Math.max(5.5, dFit * 0.42), tx = lerp(ox, cx, abre), tz = lerp(oz, cz, abre);
  const dAhora = lerp(dIni * lerp(1.2, 1, va(fr, a, Math.max(14, G - a), 0, 1, curva.suave)), dFit, abre);
  const cam = pose(tx, tz, dAhora, lerp(58, 46, abre), -8 + 8 * va(fr, a, T, 0, 1, curva.suave) + 2.4 * Math.sin((fr - a) / 50));
  const pr = proyector(cam), k = cl(dAhora / 14, 0.42, 1.3), [sx, sy] = pr(ox, 0, oz), sale = va(fr, b - 6, 6, 0, 1, curva.suave), f0 = Math.min(G, a + Math.max(4, Math.min(16, (G - a) * 0.5)));
  const et: Et[] = [...(lugar ? [{x: sx, y: sy, txt: lugar, f0: f0 + 1, tam: 92, arriba: 118}] : []), ...D.filter((x) => x.r.lugar).map((x) => { const i = D.indexOf(x), [ax, ay] = pr(W[i][0], 0, W[i][1]); return {x: ax, y: ay, txt: String(x.r.lugar), f0: llega[i], tam: 66, arriba: 84}; })];
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: tema.fondo}}>
    <Lienzo cam={cam}>
      <color attach="background" args={[tema.fondo]} /><Luces />
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat}><planeGeometry args={[pl.ancho, pl.alto]} /></mesh>
      {arcos.map((x, i) => <mesh key={i} geometry={x.g} renderOrder={3}><meshBasicMaterial color={tema.oscuro ? '#ffffff' : tema.tierra} toneMapped={false} /></mesh>)}
      <Pin x={ox} z={oz} f0={f0} fr={fr} color={tema.acento} k={k} />
      {W.map((w, i) => <Pin key={i} x={w[0]} z={w[1]} f0={llega[i]} fr={fr} color={tema.oscuro ? '#ffffff' : tema.acento2} k={k * 0.74} />)}
      <mesh position={[ox, 0.05, oz]} rotation={[-Math.PI / 2, 0, 0]} visible={fr >= G && fr < G + 16} scale={Math.max(0.001, 0.6 + 10 * k * cl((fr - G) / 16))}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={haloTex()} color="#ffffff" transparent opacity={0.9 * (1 - cl((fr - G) / 16))} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    </Lienzo>
    <Aire tema={tema} x={sx} y={sy} sale={sale} entra={va(fr, a, 8, 1, 0, curva.suave)} />
    <div style={{position: 'absolute', inset: 0, opacity: 1 - sale}}><Etiquetas et={et} look={look} fr={fr} tema={tema} /></div>
    <PieFrase lineas={ac.lineas} look={look} tema={tema} ya={[lugar, ...D.map((x) => String(x.r.lugar || ''))]} hasta={b} />
  </div>);
};

/* ═══════════ map_postales: fotos clavadas en el mapa, se levantan en su palabra y la cámara viaja de una a otra ═══════════ */
const Cartel: React.FC<{tex: THREE.Texture | null; foco?: [number, number]; x: number; z: number; f0: number; f1: number; fr: number; claro: string; color: string}> = ({tex, foco, x, z, f0, f1, fr, claro, color}) => {
  useMemo(() => { if (tex) { const r = 1.6 / 1.79; tex.repeat.set(r, 1); tex.offset.set((1 - r) * (foco ? foco[0] : 0.5), 0); tex.needsUpdate = true; } }, [tex]);
  const s = salta(fr, f0, {damping: 9, stiffness: 170, mass: 0.7}), giro = (-Math.PI / 2) * (1 - s), CW = 3.5, CH = CW / 1.6, e = cl((fr - f0) / 22);
  const va1 = va(fr, f1, 10, 0, 1, curva.suave);
  return (<group position={[x, 0, z]} scale={Math.max(0.001, 1 - va1)} visible={fr >= f0 - 1 && va1 < 1}>
    <mesh position={[0.25, 0.015, 0.1]} rotation={[-Math.PI / 2, 0, 0]} scale={[CW * 1.5, 1.5 + CH * 0.5 * (1 - s), 1]} renderOrder={1}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={haloTex()} color="#000000" transparent opacity={0.6} depthWrite={false} /></mesh>
    <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={Math.max(0.001, 0.4 + 3.2 * (1 - Math.pow(1 - e, 2)))} visible={e > 0 && e < 1} renderOrder={2}><ringGeometry args={[0.95, 1, 64]} /><meshBasicMaterial color={color} transparent opacity={1 - e} depthWrite={false} /></mesh>
    <group rotation={[giro, 0, 0]}>
      <mesh position={[0, 0.34, -0.06]}><cylinderGeometry args={[0.06, 0.08, 0.7, 12]} /><meshStandardMaterial color="#6b4a2c" roughness={0.6} /></mesh>
      <mesh position={[0, 0.66 + CH / 2, -0.06]}><boxGeometry args={[CW + 0.3, CH + 0.3, 0.1]} /><meshStandardMaterial color={claro} roughness={0.5} /></mesh>
      {tex && <mesh position={[0, 0.66 + CH / 2, 0.002]}><planeGeometry args={[CW, CH]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>}
    </group>
  </group>);
};
const Postales: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), {a, b} = ac, tema = useMemo(() => temaDe(look), [look.fondo, look.papel, look.acento]);
  const P0 = puntosDe(ac).slice(0, 4), P = P0.length ? P0 : [{r: {lugar: ''} as any, q: {lat: 20, lon: 0}}], ll = P.map((x) => x.q), ens = tiempos(P.map((x) => x.r), a + 6, b);
  const fotos = ac.fotos, f = [useFoto(fotos[0]?.id), useFoto(fotos[1]?.id), useFoto(fotos[2]?.id), useFoto(fotos[3]?.id)];
  const listos = f.every((x, i) => !fotos[i]?.id || x.tex);
  const pl = useMemo(() => hazPlano(ll, {pad: 2.6, holgura: 1.4, minGrados: 16}), [JSON.stringify(ll)]), tex = useMapa(pl, tema);
  const W = ll.map((q) => pl.toW(q));
  const R = useMemo(() => hazRuta(pl, ll, 0), [pl.clave]), tubo = useMemo(() => new THREE.TubeGeometry(R.curva3, 300, 0.05, 5, false), [R]);
  const u = avance(fr, ens, R.marcas, a); tubo.setDrawRange(0, Math.floor(u * 300) * 30);
  // la cámara vuela a cada cartel y llega justo cuando se levanta
  let i = 0; while (i + 1 < ens.length && fr >= ens[i + 1] - 18) i++;
  const v0 = Math.max(0, i - 1), t1 = ens[i], t0 = i === 0 ? a : Math.max(ens[i - 1] + 2, t1 - 18), p = i === 0 ? 1 : curva.suave(cl((fr - t0) / Math.max(4, t1 - t0)));
  const tx = lerp(W[v0][0], W[i][0], p), tz = lerp(W[v0][1], W[i][1], p), vuelo = Math.sin(Math.PI * p) * (i ? 0.9 : 0), dC = 9.2 * lerp(1.24, 1, va(fr, a, 24, 0, 1, curva.expo)) * (1 + vuelo);
  const hit = interpolate(fr, [ens[i], ens[i] + 4, ens[i] + 16], [0, 0.035, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), az = 7 * Math.sin((fr - a) / 58) - 4 * (i % 2 ? -1 : 1);
  const c0 = pose(tx, tz, dC * (1 - hit), 66, az), cam: Pose = {p: [c0.p[0], c0.p[1] + 1.25, c0.p[2]], l: [c0.l[0], 1.45, c0.l[2]], fov: 30};
  const pr = proyector(cam), sale = va(fr, b - 6, 6, 0, 1, curva.suave);
  const et: Et[] = P.map((x, j) => { const [sx, sy] = pr(W[j][0], 0, W[j][1]); return {x: sx, y: sy, txt: String(x.r.lugar || ''), f0: ens[j] + 3, tam: 92, arriba: -50, o: x.r.lugar && j === i ? 1 : 0}; });
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: tema.fondo}}>
    <Lienzo cam={cam}>
      <color attach="background" args={[tema.fondo]} /><Luces />
      <Plancha pl={pl} tema={tema} tex={tex} />
      <mesh geometry={tubo} renderOrder={2}><meshBasicMaterial color={tema.acento} toneMapped={false} /></mesh>
      {P.map((x, j) => <Cartel key={j} tex={f[j]?.tex ?? null} foco={fotos[j]?.foco} x={W[j][0]} z={W[j][1]} f0={ens[j]} f1={j + 1 < P.length && Math.hypot(W[j + 1][0] - W[j][0], W[j + 1][1] - W[j][1]) < 5.5 ? ens[j + 1] - 6 : 1e9} fr={fr} claro={tema.oscuro ? '#f4efe3' : '#ffffff'} color={tema.acento} />)}
      {listos && <Listo soltar={() => f.forEach((x) => x.soltar())} />}
    </Lienzo>
    <Aire tema={tema} sale={sale} entra={va(fr, a, 8, 1, 0, curva.suave)} />
    <PieFrase lineas={ac.lineas} look={look} tema={tema} ya={P.map((x) => String(x.r.lugar || ''))} hasta={b} y={46} />
    <div style={{position: 'absolute', inset: 0, opacity: 1 - sale}}><Etiquetas et={et} look={look} fr={fr} tema={tema} /></div>
  </div>);
};

export const OPS: Record<string, React.FC<OpProps>> = {map_ruta: Ruta, map_picada: Picada, map_maqueta: Maqueta, map_pergamino: Pergamino, map_onda: Onda, map_postales: Postales};
