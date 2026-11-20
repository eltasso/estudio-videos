// Ilustraciones de línea dibujadas en SVG (estilo del logo: trazo crema/dorado sobre verde). Se "dibujan" solas con dib 0→1.
import React from 'react';
import {interpolate, random, useCurrentFrame, Easing} from 'remotion';
import {C, FUENTE_TEXTO, FUENTE_TITULO} from './marca';

const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const trazo = (dib: number, color: string = C.crema, ancho = 7) => ({
  pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - dib, fill: 'none', stroke: color, strokeWidth: ancho, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
});

export const useDibujo = (desde = 0, largo = 24) => {
  const f = useCurrentFrame();
  return interpolate(f - desde, [0, largo], [0, 1], {...cl, easing: Easing.inOut(Easing.cubic)});
};

// ───────── el mate (calabaza con virola y bombilla) ─────────
export const Mate: React.FC<{
  dib?: number; ancho?: number; yerba?: number; bombilla?: number; angBombilla?: number; montania?: number; brillo?: number; virolaDorada?: boolean; children?: React.ReactNode;
}> = ({dib = 1, ancho = 520, yerba = 1, bombilla = 1, angBombilla = 0, montania = 1, brillo = 0, virolaDorada = true, children}) => {
  const f = useCurrentFrame();
  const alto = (ancho * 520) / 400;
  const lleno = Math.min(1, dib * 1.6);
  const yv = yerba * Math.max(0, Math.min(1, dib * 2 - 0.8)); // la yerba aparece cuando el mate ya está dibujado
  return (
    <svg width={ancho} height={alto} viewBox="0 -40 400 560" style={{overflow: 'visible'}}>
      <defs>
        <clipPath id="boca"><ellipse cx={200} cy={150} rx={99} ry={23} /></clipPath>
        <linearGradient id="chorro" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#bfe0f0" stopOpacity={0} />
          <stop offset="0.45" stopColor="#bfe0f0" stopOpacity={0.9} />
          <stop offset="1" stopColor="#bfe0f0" stopOpacity={0.95} />
        </linearGradient>
        <linearGradient id="cuerpo" x1="0" x2="1">
          <stop offset="0" stopColor={C.cuero} stopOpacity={0.55} />
          <stop offset="0.5" stopColor={C.cuero} stopOpacity={0.25} />
          <stop offset="1" stopColor={C.cuero} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      {/* relleno suave del cuerpo */}
      <path d="M100,185 C 70,240 40,290 45,350 C 52,440 120,490 200,490 C 280,490 348,440 355,350 C 360,290 330,240 300,185 Z" fill="url(#cuerpo)" opacity={lleno} />
      {/* costura de cuero */}
      <path d="M62,300 C 120,330 280,330 338,300" {...trazo(dib, C.dorado, 3)} strokeDasharray="0.012 0.018" strokeDashoffset={0} opacity={lleno * 0.8} />
      {/* cuerpo */}
      <path d="M100,185 C 70,240 40,290 45,350 C 52,440 120,490 200,490 C 280,490 348,440 355,350 C 360,290 330,240 300,185" {...trazo(dib)} />
      <ellipse cx={200} cy={494} rx={70} ry={9} {...trazo(dib, C.crema, 5)} opacity={0.6} />
      {/* virola (borde de alpaca) */}
      <path d="M95,150 L100,186 C 160,206 240,206 300,186 L305,150" {...trazo(dib, virolaDorada ? C.dorado : C.crema, 7)} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={i} cx={120 + i * 26.6} cy={178 + Math.sin((i / 6) * Math.PI) * 9} r={4} fill={C.dorado} opacity={Math.max(0, dib * 2 - 1)} />
      ))}
      {/* yerba adentro */}
      <g clipPath="url(#boca)" opacity={yv}>
        <rect x={90} y={120} width={220} height={60} fill={C.yerbaOsc} />
      </g>
      <path d={`M104,153 Q ${150} ${150 - 70 * montania * yerba} ${292} ${143 - 6 * montania} L 296,156 Z`} fill={C.yerba} opacity={yv} />
      {new Array(14).fill(0).map((_, i) => (
        <circle key={i} cx={115 + random(`yx${i}`) * 170} cy={150 - random(`yy${i}`) * 34 * montania * yerba * (1 - Math.abs(random(`yx${i}`) - 0.35))}
          r={2.5 + random(`yr${i}`) * 3} fill={C.yerbaOsc} opacity={yv * 0.9} />
      ))}
      {children}
      {/* bombilla */}
      <g transform={`rotate(${angBombilla} 236 150)`} opacity={bombilla}>
        <path d="M236,152 L294,42 Q300,30 314,27 L334,25" {...trazo(Math.min(1, dib * 1.3), C.dorado, 11)} />
        <path d="M236,152 L294,42 Q300,30 314,27 L334,25" fill="none" stroke="#fff6dd" strokeWidth={3} strokeLinecap="round" opacity={0.5 * Math.min(1, dib * 1.3)} />
        <rect x={277} y={60} width={26} height={14} rx={4} transform="rotate(-62 290 67)" fill={C.dorado} opacity={Math.max(0, dib * 2 - 1)} />
      </g>
      {/* aro de la boca encima de todo */}
      <ellipse cx={200} cy={150} rx={105} ry={26} {...trazo(dib, virolaDorada ? C.dorado : C.crema, 8)} />
      {brillo > 0 && (
        <path d="M78,300 C 80,260 95,230 112,210" stroke="#fff" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.25 * brillo + Math.sin(f / 8) * 0.05} />
      )}
    </svg>
  );
};

// ───────── la pava ─────────
export const Pava: React.FC<{dib?: number; ancho?: number; vapor?: number; burbujas?: number; inclinar?: number; chorro?: number}> = ({
  dib = 1, ancho = 520, vapor = 0, burbujas = 0, inclinar = 0, chorro = 0,
}) => {
  const f = useCurrentFrame();
  const alto = (ancho * 440) / 500;
  return (
    <svg width={ancho} height={alto} viewBox="0 0 500 440" style={{overflow: 'visible'}}>
      <g transform={`rotate(${-inclinar} 250 300)`}>
        <path d="M110,380 L150,170 Q160,150 190,150 L310,150 Q340,150 350,170 L390,380 Q392,395 375,395 L125,395 Q108,395 110,380 Z" {...trazo(dib)} fill={C.cremaSuave} fillOpacity={0.08 * dib} />
        <path d="M128,300 L372,300" {...trazo(dib, C.dorado, 4)} opacity={0.7} />
        <path d="M175,150 Q250,112 325,150" {...trazo(dib)} />
        <circle cx={250} cy={118} r={13} {...trazo(dib, C.dorado, 6)} />
        <path d="M168,152 C 160,40 340,40 332,152" {...trazo(dib, C.dorado, 9)} />
        <path d="M134,250 C 100,230 76,200 56,166 L42,174 C 62,214 92,268 124,292" {...trazo(dib)} />
        {/* vapor */}
        {[0, 1, 2].map((i) => {
          const fase = ((f + i * 14) % 42) / 42;
          return (
            <path key={i} d={`M${50 + i * 14},${150 - fase * 120} c -14,-18 14,-30 0,-48 c -14,-18 14,-30 0,-48`} fill="none" stroke={C.crema} strokeWidth={6} strokeLinecap="round"
              opacity={vapor * Math.sin(fase * Math.PI) * 0.8} />
          );
        })}
        {/* burbujitas en el pico */}
        {new Array(10).fill(0).map((_, i) => {
          const per = 18 + Math.floor(random(`bp${i}`) * 14);
          const fase = ((f + i * 7) % per) / per;
          const x = 30 + random(`bx${i}`) * 70;
          return <circle key={i} cx={x} cy={165 - fase * 90} r={8 + random(`br${i}`) * 10} fill="none" stroke={C.crema} strokeWidth={3} opacity={burbujas * Math.sin(fase * Math.PI)} />;
        })}
      </g>
      {chorro > 0 && (
        <path d={`M52,${178} C 40,240 34,300 34,${300 + 120 * chorro}`} fill="none" stroke="#bfe0f0" strokeWidth={12} strokeLinecap="round" opacity={0.8} />
      )}
    </svg>
  );
};

// ───────── termómetro ─────────
export const Termometro: React.FC<{temp: number; dib?: number; alto?: number; zona?: number}> = ({temp, dib = 1, alto = 900, zona = 0}) => {
  const ancho = (alto * 300) / 900;
  const t2y = (t: number) => 660 - ((t - 20) / 80) * 600;
  const col = temp > 88 ? C.rojo : temp > 82 ? '#e0a046' : C.ok;
  const yTop = t2y(temp);
  return (
    <svg width={ancho} height={alto} viewBox="0 0 300 900" style={{overflow: 'visible'}}>
      {/* zona ideal 70–80 */}
      <rect x={40} y={t2y(80)} width={140} height={t2y(70) - t2y(80)} rx={10} fill={C.ok} opacity={0.18 * zona} />
      <rect x={40} y={t2y(80)} width={140} height={t2y(70) - t2y(80)} rx={10} fill="none" stroke={C.ok} strokeWidth={3} strokeDasharray="10 8" opacity={zona} />
      <rect x={78} y={yTop} width={34} height={720 - yTop} rx={17} fill={col} opacity={dib} />
      <circle cx={95} cy={740} r={52} fill={col} opacity={dib} />
      <path d="M60,690 L60,70 A35,35 0 0 1 130,70 L130,690 A70,70 0 1 1 60,690" {...trazo(dib, C.crema, 7)} />
      {[40, 60, 80, 100].map((t) => (
        <g key={t} opacity={dib}>
          <line x1={140} x2={175} y1={t2y(t)} y2={t2y(t)} stroke={C.crema} strokeWidth={5} strokeLinecap="round" />
          <text x={190} y={t2y(t) + 13} fill={C.cremaSuave} fontFamily={FUENTE_TEXTO} fontWeight={600} fontSize={38}>{t}°</text>
        </g>
      ))}
      {[30, 50, 70, 90].map((t) => (
        <line key={t} x1={140} x2={160} y1={t2y(t)} y2={t2y(t)} stroke={C.crema} strokeWidth={3} strokeLinecap="round" opacity={dib * 0.7} />
      ))}
    </svg>
  );
};

// ───────── reloj de 24 h ─────────
export const Reloj: React.FC<{dib?: number; tam?: number; vueltas?: number}> = ({dib = 1, tam = 380, vueltas = 0}) => (
  <svg width={tam} height={tam} viewBox="0 0 400 400" style={{overflow: 'visible'}}>
    <circle cx={200} cy={200} r={170} {...trazo(dib, C.crema, 9)} fill={C.crema} fillOpacity={0.06} />
    {new Array(12).fill(0).map((_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const r1 = i % 3 === 0 ? 128 : 140;
      return <line key={i} x1={200 + Math.sin(a) * r1} y1={200 - Math.cos(a) * r1} x2={200 + Math.sin(a) * 152} y2={200 - Math.cos(a) * 152} stroke={C.dorado} strokeWidth={i % 3 === 0 ? 8 : 4} strokeLinecap="round" opacity={dib} />;
    })}
    <line x1={200} y1={200} x2={200} y2={110} stroke={C.crema} strokeWidth={12} strokeLinecap="round" transform={`rotate(${vueltas * 30} 200 200)`} opacity={dib} />
    <line x1={200} y1={200} x2={200} y2={70} stroke={C.dorado} strokeWidth={7} strokeLinecap="round" transform={`rotate(${vueltas * 360} 200 200)`} opacity={dib} />
    <circle cx={200} cy={200} r={14} fill={C.dorado} opacity={dib} />
  </svg>
);

// ───────── cuchara ─────────
export const Cuchara: React.FC<{tam?: number; dib?: number}> = ({tam = 300, dib = 1}) => (
  <svg width={tam * 0.4} height={tam} viewBox="0 0 120 300" style={{overflow: 'visible'}}>
    <ellipse cx={60} cy={60} rx={40} ry={56} {...trazo(dib, C.crema, 7)} fill={C.crema} fillOpacity={0.15} />
    <path d="M60,116 L60,290" {...trazo(dib, C.crema, 14)} />
    <path d="M44,40 Q48,26 60,22" stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.5 * dib} />
  </svg>
);

// ───────── yerba que cae dentro del mate (partículas) ─────────
export const LluviaYerba: React.FC<{desde?: number; cant?: number; ancho?: number; caida?: number; x0?: number; y0?: number; y1?: number}> = ({
  desde = 0, cant = 60, ancho = 140, caida = 26, x0 = 200, y0 = -260, y1 = 150,
}) => {
  const f = useCurrentFrame();
  return (
    <g>
      {new Array(cant).fill(0).map((_, i) => {
        const ini = desde + random(`ly${i}`) * 34;
        const t = (f - ini) / caida;
        if (t < 0 || t > 1) return null;
        const y = y0 + (y1 - y0) * t * t;
        const x = x0 + (random(`lx${i}`) - 0.5) * ancho * (0.4 + 0.6 * t);
        const r = random(`lr${i}`) * 360 + f * 8;
        const s = 4 + random(`ls${i}`) * 7;
        return <rect key={i} x={x - s / 2} y={y - s / 4} width={s} height={s / 2} rx={1.5} transform={`rotate(${r} ${x} ${y})`} fill={i % 3 ? C.yerba : C.yerbaOsc} />;
      })}
    </g>
  );
};

// ───────── número grande que cuenta (ej: 100°) ─────────
export const Cifra: React.FC<{valor: number; sufijo?: string; color?: string; tam?: number}> = ({valor, sufijo = '°', color = C.crema, tam = 220}) => (
  <div style={{fontFamily: FUENTE_TITULO, fontStyle: 'italic', fontWeight: 700, fontSize: tam, lineHeight: 1, color, textShadow: '0 10px 40px rgba(0,0,0,.45)',
    fontVariantNumeric: 'tabular-nums'}}>
    {Math.round(valor)}
    <span style={{fontSize: tam * 0.6}}>{sufijo}</span>
  </div>
);
