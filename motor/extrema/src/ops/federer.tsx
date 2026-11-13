// Familia Federer: las piezas de la edición de Dr. Federer (vidrio oscuro, acento + alerta, Inter pesada),
// con los colores tomados del estilo del video. Cada pieza vive sobre la foto real del momento.
import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {OpProps, Acto, Look, golpeDe, fam} from './base';
import {Encuadre, va, salta, curva} from '../kit';
import {rgba, mezclar, lum, palabrasDe} from './clinico_kit';

const CL = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const tinta = (l: Look) => (l.oscuro ? l.fondo || l.papel || '#0B1419' : mezclar(l.tinta, '#000000', 0.3));
const crema = (l: Look) => (l.oscuro ? l.claro || '#F5F9FA' : '#F5F9FA');
const acento = (l: Look) => (lum(l.acento) < 0.22 ? mezclar(l.acento, '#ffffff', 0.35) : l.acento);
const alerta = (l: Look) => { const c = l.acento2 && l.acento2 !== l.acento ? l.acento2 : '#E4141B'; return lum(c) < 0.22 ? mezclar(c, '#ffffff', 0.35) : c; };
const rojizo = (c?: string) => { if (!c) return false; const n = parseInt(c.slice(1, 7), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return r > 120 && r > g * 1.5 && r > b * 1.5; };
const parMito = (l: Look): [string, string] => { const m = rojizo(l.acento) ? l.acento : rojizo(l.acento2) ? l.acento2! : '#E4141B'; let v = m === l.acento ? (l.acento2 && !rojizo(l.acento2) ? l.acento2 : '#12B3AE') : l.acento; if (lum(v) < 0.22) v = mezclar(v, '#ffffff', 0.35); return [lum(m) < 0.22 ? mezclar(m, '#ffffff', 0.35) : m, v]; };
const letra = (l: Look) => fam(l.texto || 'Inter');
const tam = (t: string, ancho: number, max: number, renglones = 2, min = 40) => { const n = Math.max(6, Math.ceil((t || '').length / renglones)); return Math.round(Math.max(min, Math.min(max, ancho / (n * 0.56)))); };
const VIDRIO = 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))';

/* La foto del momento detrás de todo: empuje lento, apenas oscurecida para que el vidrio se lea. */
const Fondo: React.FC<{ac: Acto; look: Look; blur?: number; luz?: number; velo?: number; zoom?: [number, number]}> = ({ac, look, blur = 0, luz = 0.8, velo = 0.55, zoom = [1.03, 1.1]}) => {
  const fr = useCurrentFrame(), f = ac.fotos[0], I = tinta(look);
  const z = interpolate(fr, [ac.a, ac.b], zoom, CL);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: I}}>
    {f && <div style={{position: 'absolute', inset: blur ? -50 : 0, transform: `scale(${z})`, transformOrigin: `${(f.foco?.[0] ?? 0.5) * 100}% ${(f.foco?.[1] ?? 0.5) * 100}%`}}><Encuadre id={f.id} foco={f.foco} filtro={`${blur ? `blur(${blur}px) ` : ''}brightness(${luz}) saturate(1.05)`} /></div>}
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(120% 95% at 50% 45%, ${rgba(I, velo * 0.25)}, ${rgba(I, velo)})`}} />
  </div>);
};

const Tilde: React.FC<{c: string; t?: number}> = ({c, t = 30}) => <div style={{width: t * 0.34, height: t * 0.62, borderRight: `${t * 0.14}px solid ${c}`, borderBottom: `${t * 0.14}px solid ${c}`, transform: 'translateY(-12%) rotate(45deg)'}} />;
const Cruz: React.FC<{c: string; t?: number}> = ({c, t = 30}) => (<div style={{position: 'relative', width: t * 0.7, height: t * 0.7}}>{[45, -45].map((g) => <div key={g} style={{position: 'absolute', left: 0, top: '50%', width: '100%', height: t * 0.14, marginTop: -t * 0.07, background: c, borderRadius: 3, transform: `rotate(${g}deg)`}} />)}</div>);
const Chip: React.FC<{c: string; ok: boolean; label?: string; look: Look}> = ({c, ok, label, look}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
    <div style={{width: 54, height: 54, borderRadius: 14, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{ok ? <Tilde c="#fff" t={40} /> : <Cruz c="#fff" t={40} />}</div>
    {label && <div style={{fontFamily: letra(look), fontSize: 30, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', color: c}}>{label}</div>}
  </div>
);

/* ═══════════ MITO → VERDAD: la creencia aparece tachada y en el golpe la tarjeta gira y muestra la verdad ═══════════ */
const Mito: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, [R, A] = parMito(look), C = crema(look);
  const inS = salta(fr, ac.a, {damping: 18, stiffness: 110}), giro = Math.max(ac.a + 14, G - 8), deg = interpolate(fr, [giro, giro + 16], [0, 180], CL);
  const tacha = va(fr, ac.a + 10, 14, 0, 1, curva.ios), mito = String(d.mito || ''), verdad = String(d.verdad || '');
  const cara = (atras: boolean, kids: React.ReactNode) => (<div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: atras ? 'rotateX(180deg)' : undefined, borderRadius: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 90px', background: `${VIDRIO}, ${rgba(tinta(look), 0.72)}`, border: `2px solid ${rgba(atras ? A : R, 0.45)}`, boxShadow: '0 40px 110px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'}}>{kids}</div>);
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: letra(look)}}>
    <Fondo ac={ac} look={look} blur={8} luz={0.9} velo={0.4} />
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{perspective: 1600, opacity: inS, transform: `scale(${0.92 + 0.08 * inS})`}}>
        <div style={{position: 'relative', width: 1240, height: 460, transformStyle: 'preserve-3d', transform: `rotateX(${deg}deg)`}}>
          {cara(false, <><Chip c={R} ok={false} label={d.rot_mito} look={look} />
            <div style={{position: 'relative', marginTop: 26, alignSelf: 'flex-start'}}>
              <div style={{fontSize: tam(mito, 1060, 92), fontWeight: 800, color: C, lineHeight: 1.1, opacity: 1 - 0.35 * tacha}}>{mito}</div>
              <div style={{position: 'absolute', left: -8, right: -8, top: '52%', height: 7, background: R, borderRadius: 4, transformOrigin: 'left', transform: `scaleX(${tacha})`}} />
            </div></>)}
          {cara(true, <><Chip c={A} ok label={d.rot_verdad} look={look} /><div style={{fontSize: tam(verdad, 1060, 92), fontWeight: 800, color: C, lineHeight: 1.1, marginTop: 26}}>{verdad}</div></>)}
        </div>
      </div>
    </div>
  </div>);
};

/* ═══════════ GOLPE DE SECCIÓN: barrido diagonal, número gigante y el título que aterriza en el golpe ═══════════ */
const Stinger: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, A = d.tono === 'alerta' ? alerta(look) : acento(look), C = crema(look), I = tinta(look);
  const ent = va(fr, ac.a, 12, 0, 1, curva.expo), sal = va(fr, ac.b - 12, 12, 0, 1, curva.entra);
  const nS = salta(fr, ac.a + 8, {damping: 12, mass: 0.6, stiffness: 150}), tS = salta(fr, Math.max(ac.a + 14, G - 3), {damping: 16, stiffness: 130}), k = fr - ac.a;
  const shake = k < 20 ? Math.sin(k * 1.6) * (20 - k) * 0.4 : 0, titulo = String(d.titulo || ''), num = String(d.numero || '');
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: letra(look), background: I}}>
    <Fondo ac={ac} look={look} blur={6} luz={0.55} velo={0.75} zoom={[1.12, 1.02]} />
    <div style={{position: 'absolute', top: 0, bottom: 0, left: '-20%', width: '80%', transform: `translateX(${(1 - ent) * -2200 + sal * 2200}px) skewX(-14deg)`, background: `linear-gradient(90deg, ${A}, ${rgba(A, 0.85)})`}} />
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(90% 90% at 50% 50%, transparent, ${rgba(I, 0.6)})`}} />
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateX(${shake}px)`}}>
      <div style={{textAlign: 'center', maxWidth: 1600}}>
        {d.rotulo && <div style={{fontSize: 44, fontWeight: 800, letterSpacing: 10, textTransform: 'uppercase', color: C, opacity: nS}}>{d.rotulo}</div>}
        {num && <div style={{fontSize: num.length > 2 ? 260 : 340, fontWeight: 800, lineHeight: 0.92, color: '#fff', opacity: nS, transform: `scale(${1.4 - 0.4 * nS})`, textShadow: `0 0 60px ${A}`}}>{num}</div>}
        <div style={{fontSize: tam(titulo, 1500, num ? 80 : 130), fontWeight: 800, color: C, letterSpacing: -0.5, lineHeight: 1.05, opacity: tS, transform: `translateY(${(1 - tS) * 24}px)`}}>{titulo}</div>
      </div>
    </div>
  </div>);
};

/* ═══════════ FRASE CINÉTICA: la frase entra palabra por palabra clavada a la voz; las del golpe se resaltan ═══════════ */
const Frase: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), A = acento(look), C = crema(look);
  const gol = new Set((ac.lineas || []).filter((l) => l.rol === 'golpe').flatMap((l) => l.w.map((w) => w[1] + ':' + w[0])));
  const ws = palabrasDe(ac.lineas || [], ac.a), largo = ws.reduce((s, w) => s + w[0].length + 1, 0);
  const t = largo < 40 ? 104 : largo < 80 ? 86 : largo < 130 ? 68 : 56;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: letra(look)}}>
    <Fondo ac={ac} look={look} luz={0.92} velo={0.5} />
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 35%, ${rgba(tinta(look), 0.78)})`}} />
    <div style={{position: 'absolute', left: 120, right: 120, bottom: 140, display: 'flex', flexWrap: 'wrap', gap: '12px 22px', justifyContent: 'center', lineHeight: 1.14}}>
      {ws.map(([w, f], i) => {
        if (fr < f - 2) return null;
        const p = salta(fr, f, {damping: 15, mass: 0.5, stiffness: 150}), hl = gol.has(f + ':' + w);
        return (<span key={i} style={{position: 'relative', display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 26}px)`}}>
          {hl && <span style={{position: 'absolute', top: 6, bottom: 6, left: -12, right: -12, background: A, borderRadius: 10, transform: `scaleX(${interpolate(p, [0.3, 1], [0, 1], CL)})`, transformOrigin: 'left', opacity: 0.92}} />}
          <span style={{position: 'relative', fontSize: t, fontWeight: 800, letterSpacing: -1, color: hl ? (lum(A) > 0.62 ? '#10181d' : '#fff') : C, textShadow: hl ? 'none' : '0 4px 24px rgba(0,0,0,0.6)'}}>{w}</span>
        </span>);
      })}
    </div>
  </div>);
};

/* ═══════════ GUARDÁ ESTO: tarjeta de vidrio con los pasos, cada uno con su miniatura, entrando al nombrarlo ═══════════ */
const Guarda: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), d = ac.datos || {}, A = acento(look), C = crema(look), inS = salta(fr, ac.a, {damping: 20, stiffness: 110});
  const pasos: any[] = (d.pasos || []).slice(0, 4), n = Math.max(1, pasos.length), G = golpeDe(ac);
  const en = pasos.map((p, i) => (typeof p.en === 'number' ? p.en : ac.a + 10 + i * Math.max(5, Math.round((G - ac.a - 10) / n))));
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: letra(look)}}>
    <Fondo ac={ac} look={look} blur={10} luz={0.9} velo={0.42} />
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 1180, borderRadius: 34, background: `${VIDRIO}, ${rgba(tinta(look), 0.7)}`, border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 50px 130px rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', padding: '52px 70px 46px', opacity: inS, transform: `translateY(${(1 - inS) * 30}px) scale(${0.95 + 0.05 * inS})`}}>
        {d.aviso && <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20}}><div style={{width: 14, height: 14, borderRadius: 7, background: A, boxShadow: `0 0 0 6px ${rgba(A, 0.25)}`}} /><div style={{fontSize: 26, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: A}}>{d.aviso}</div></div>}
        <div style={{fontSize: tam(String(d.titulo || ''), 1040, 62, 2), fontWeight: 800, color: C, letterSpacing: -0.6, lineHeight: 1.05, marginBottom: 28}}>{d.titulo}</div>
        {pasos.map((p, i) => {
          const s = salta(fr, en[i], {damping: 20, stiffness: 130}), foto = p.foto || ac.fotos[i % Math.max(1, ac.fotos.length)];
          return (<div key={i} style={{display: 'flex', alignItems: 'center', gap: 24, padding: '14px 0', borderTop: i ? '1px solid rgba(255,255,255,0.09)' : 'none', opacity: s, transform: `translateX(${(1 - s) * 16}px)`}}>
            {foto ? (<div style={{position: 'relative', flex: '0 0 auto', width: 132, height: 92, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.16)', boxShadow: '0 10px 26px rgba(0,0,0,0.4)'}}>
              <Encuadre id={foto.id} foco={foto.foco} />
              <div style={{position: 'absolute', left: 8, top: 8, width: 34, height: 34, borderRadius: 18, background: A, color: '#fff', fontSize: 19, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
            </div>) : <div style={{flex: '0 0 auto', width: 56, height: 56, borderRadius: 28, background: A, color: '#fff', fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>}
            <div style={{fontSize: 40, fontWeight: 600, color: C, lineHeight: 1.2}}>{p.t}</div>
          </div>);
        })}
      </div>
    </div>
  </div>);
};

/* ═══════════ LUPA: la foto quieta, la cámara se mete en el detalle, aro en el golpe y su nombre abajo ═══════════ */
const Lupa: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, A = d.tono === 'alerta' ? alerta(look) : acento(look), C = crema(look), f = ac.fotos[0];
  const fx = typeof d.x === 'number' ? d.x : f?.foco?.[0] ?? 0.5, fy = typeof d.y === 'number' ? d.y : f?.foco?.[1] ?? 0.45;
  const z0 = ac.a + 8, z1 = Math.max(z0 + 14, G - 2), z = interpolate(fr, [z0, z1], [1, 1.9], {...CL, easing: curva.suave}), ox = interpolate(fr, [z0, z1], [50, fx * 100], CL), oy = interpolate(fr, [z0, z1], [50, fy * 100], CL);
  const aro = salta(fr, G - 2, {damping: 14, stiffness: 130}), et = salta(fr, G + 6, {damping: 18, stiffness: 120});
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: letra(look), background: tinta(look)}}>
    {f && <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: `${ox}% ${oy}%`}}><Encuadre id={f.id} filtro="saturate(1.05)" /></div>}
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(38% 42% at ${fx * 100}% ${fy * 100}%, transparent 55%, ${rgba(tinta(look), 0.45 * aro)})`}} />
    <div style={{position: 'absolute', left: `${fx * 100}%`, top: `${fy * 100}%`, transform: 'translate(-50%,-50%)', opacity: aro}}>
      <div style={{width: 300, height: 300, borderRadius: 160, border: `6px solid ${A}`, boxShadow: `0 0 0 9px ${rgba(A, 0.18)}, 0 0 40px ${rgba(A, 0.5)}`, transform: `scale(${1.5 - 0.5 * aro})`}} />
    </div>
    {d.etiqueta && <div style={{position: 'absolute', left: '50%', bottom: 110, transform: `translateX(-50%) translateY(${(1 - et) * 18}px)`, opacity: et}}>
      <div style={{background: rgba(tinta(look), 0.92), border: `1px solid ${rgba(A, 0.4)}`, borderRadius: 16, padding: '18px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', whiteSpace: 'nowrap'}}><span style={{fontSize: 48, fontWeight: 800, color: C}}>{d.etiqueta}</span></div>
    </div>}
  </div>);
};

/* ═══════════ LISTA: panel de vidrio al costado de la foto; los hechos tachados, el actual encendido, los que vienen borrosos ═══════════ */
const Lista: React.FC<OpProps> = ({ac, look}) => {
  const fr = useCurrentFrame(), G = golpeDe(ac), d = ac.datos || {}, A = acento(look), C = crema(look), I = tinta(look);
  const items: any[] = (d.items || []).slice(0, 7), n = items.length, act = Math.max(0, Math.min(n - 1, Math.round((d.actual ?? 1) - 1)));
  const lado = d.lado === 'izq' ? 'left' : 'right', inS = salta(fr, ac.a, {damping: 26, mass: 1, stiffness: 78}), luz = va(fr, G - 2, 10);
  const fs = n > 5 ? 34 : 38;
  return (<div style={{position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: letra(look)}}>
    <Fondo ac={ac} look={look} luz={0.95} velo={0.35} />
    <div style={{position: 'absolute', top: 0, bottom: 0, [lado]: 0, width: 900, background: `linear-gradient(${lado === 'right' ? 270 : 90}deg, ${rgba(I, 0.55)}, transparent)`}} />
    <div style={{position: 'absolute', [lado]: 72, top: '50%', width: 780, transform: `translateY(-50%) translateX(${(1 - inS) * (lado === 'right' ? 90 : -90)}px) scale(${0.9 + 0.1 * inS})`, transformOrigin: `${lado} center`, opacity: inS}}>
      <div style={{background: `linear-gradient(180deg, ${rgba(I, 0.94)}, ${rgba(I, 0.88)})`, borderRadius: 26, padding: '34px 34px 28px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 34px 90px rgba(0,0,0,0.5)', backdropFilter: 'blur(7px)'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, gap: 20}}>
          <div style={{fontSize: 40, fontWeight: 800, color: C, letterSpacing: -0.3, lineHeight: 1.1}}>{d.titulo}</div>
          <div style={{fontSize: 24, fontWeight: 800, color: A, background: rgba(A, 0.16), padding: '7px 15px', borderRadius: 11, whiteSpace: 'nowrap'}}>{act + 1}/{n}</div>
        </div>
        {items.map((it, i) => {
          const hecho = i < act, cur = i === act, fut = i > act, rs = salta(fr, ac.a + 4 + i * 3, {damping: 24, mass: 1, stiffness: 90}), on = cur ? luz : 0;
          return (<div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, padding: '13px 16px', borderRadius: 15, marginBottom: 8, background: rgba(A, 0.14 * on), border: `1px solid ${rgba(A, 0.5 * on)}`, opacity: (hecho ? 0.6 : cur ? 0.8 + 0.2 * on : 0.85) * rs, transform: `translateX(${(1 - rs) * 12}px) scale(${1 + 0.03 * on})`, transformOrigin: 'left center'}}>
            <div style={{flex: '0 0 auto', width: 44, height: 44, borderRadius: 23, background: cur ? mezclar('#ffffff', A, 0.3 + 0.7 * on) : hecho ? 'rgba(255,255,255,0.10)' : 'transparent', border: cur ? 'none' : '2px solid rgba(255,255,255,0.28)', color: cur ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 21, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{hecho ? <Tilde c="rgba(255,255,255,0.8)" t={26} /> : i + 1}</div>
            <div style={{position: 'relative', flex: 1, fontSize: fs, fontWeight: cur ? 800 : 600, color: C, lineHeight: 1.15, textDecoration: hecho ? 'line-through' : 'none', filter: fut ? 'blur(7px)' : 'none'}}>{it.t}</div>
          </div>);
        })}
      </div>
    </div>
  </div>);
};

export const OPS: Record<string, React.FC<OpProps>> = {fed_mito: Mito, fed_stinger: Stinger, fed_frase: Frase, fed_guarda: Guarda, fed_lupa: Lupa, fed_lista: Lista};
