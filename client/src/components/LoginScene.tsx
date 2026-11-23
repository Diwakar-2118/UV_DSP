import { useId } from 'react';
import Chakra from './Chakra';
import Globe from './Globe';

/**
 * Decorative login illustration: globe, satellites and light beams linking to job boards.
 * Pure SVG (no external images, no third-party logos – boards are shown as text badges).
 */

// Deterministic star field so the scene is identical on every render.
const STARS = (() => {
  let s = 42;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 140 }, () => ({ x: rnd() * 1440, y: rnd() * 810, r: rnd() * 1.3 + 0.2, o: rnd() * 0.6 + 0.2 }));
})();

const GLOBE = { cx: 720, cy: 440, r: 175 };

export const BOARDS = [
  { name: 'Naukri', x: 770, y: 150, w: 128, color: '#3b82f6' },
  { name: 'LinkedIn', x: 1000, y: 112, w: 140, color: '#0a66c2', solid: true },
  { name: 'Indeed', x: 868, y: 520, w: 124, color: '#2557a7' },
  { name: 'Foundit', x: 815, y: 615, w: 132, color: '#7c3aed', solid: true },
  { name: 'Wellfound', x: 420, y: 712, w: 150, color: '#10b981' },
] as const;

/** Point on the globe rim pointing towards (x, y). */
function rim(x: number, y: number, inset = 0) {
  const a = Math.atan2(y - GLOBE.cy, x - GLOBE.cx);
  return { x: GLOBE.cx + Math.cos(a) * (GLOBE.r - inset), y: GLOBE.cy + Math.sin(a) * (GLOBE.r - inset) };
}

/**
 * Communications satellite in 3/4 view: a box-shaped bus wrapped in crinkled gold MLI foil
 * (turbulence + diffuse-lighting filter), white radiator top, two hinged solar arrays made of
 * individual cells, booms, a parabolic dish with feed struts and an omni antenna. Lit from the upper left.
 */
const CELL_COLS = [0, 1, 2, 3, 4, 5];
const CELL_ROWS = [0, 1, 2, 3];

function SolarWing({ p, side }: { p: string; side: 1 | -1 }) {
  // Panels are drawn for the right wing and mirrored for the left; skew gives a perspective tilt.
  const panel = (x0: number) => (
    <g transform={`translate(${x0} 0)`}>
      <rect x={-1.5} y={-21.5} width={63} height={45} fill="#64748b" />
      <rect x={-1.5} y={-21.5} width={63} height={43} fill={`url(#${p}frame)`} />
      {CELL_ROWS.map((r) =>
        CELL_COLS.map((c) => <rect key={`${r}-${c}`} x={c * 10} y={-20 + r * 10} width={9.2} height={9.2} fill={`url(#${p}cell)`} />),
      )}
      {CELL_ROWS.map((r) => <line key={r} x1={0} y1={-20 + r * 10 + 4.6} x2={60} y2={-20 + r * 10 + 4.6} stroke="#93a5d6" strokeOpacity={0.18} strokeWidth={0.4} />)}
      <rect x={0} y={-20} width={60} height={40} fill={`url(#${p}sheen)`} />
    </g>
  );
  return (
    <g transform={`scale(${side} 1) skewY(-9)`}>
      <rect x={30} y={-1.6} width={16} height={3.2} fill={`url(#${p}boom)`} />
      <rect x={44} y={-5} width={4} height={10} rx={1} fill="#94a3b8" />
      {panel(48)}
      <rect x={110} y={-3} width={4} height={6} fill="#94a3b8" />
      {panel(116)}
    </g>
  );
}

function Satellite({ p, x, y, scale = 1, rotate = 0 }: { p: string; x: number; y: number; scale?: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <SolarWing p={p} side={-1} />
      <SolarWing p={p} side={1} />
      {/* Bus: side (shadow), top (radiator) and front faces */}
      <path d="M20 -22 L30 -31 L30 13 L20 22 Z" fill={`url(#${p}foilDark)`} filter={`url(#${p}crinkle)`} />
      <path d="M-22 -22 L-12 -31 L30 -31 L20 -22 Z" fill="#e5e7eb" />
      {[-6, 2, 10, 18].map((dx) => <line key={dx} x1={-16 + dx} y1={-26.5} x2={-10 + dx} y2={-26.5} stroke="#94a3b8" strokeWidth={0.8} />)}
      <rect x={-22} y={-22} width={42} height={44} fill={`url(#${p}foil)`} filter={`url(#${p}crinkle)`} />
      <line x1={-22} y1={-22} x2={20} y2={-22} stroke="#fff7d6" strokeOpacity={0.9} strokeWidth={0.8} />
      <line x1={-22} y1={-22} x2={-22} y2={22} stroke="#fff7d6" strokeOpacity={0.6} strokeWidth={0.8} />
      {/* Sensor / star tracker on the front face */}
      <rect x={6} y={6} width={9} height={9} rx={1.5} fill="#1f2937" stroke="#9ca3af" strokeWidth={0.8} />
      <circle cx={10.5} cy={10.5} r={2.6} fill="#0ea5e9" opacity={0.6} />
      {/* Parabolic dish with feed struts */}
      <g transform="translate(-6 -40) rotate(-18)">
        <ellipse cx={0} cy={2} rx={17} ry={6.5} fill="#6b7280" />
        <ellipse cx={0} cy={0} rx={17} ry={6.5} fill={`url(#${p}dish)`} stroke="#f8fafc" strokeWidth={0.8} />
        <ellipse cx={-2} cy={-0.5} rx={8} ry={2.6} fill="#ffffff" opacity={0.35} />
        <path d="M-12 -2 L0 -16 M12 -2 L0 -16 M0 3 L0 -16" stroke="#cbd5e1" strokeWidth={0.8} fill="none" />
        <circle cx={0} cy={-16} r={1.8} fill="#e5e7eb" />
      </g>
      <line x1={-6} y1={-33} x2={-6} y2={-29} stroke="#9ca3af" strokeWidth={3} />
      {/* Omni antenna + thrusters */}
      <line x1={24} y1={-30} x2={27} y2={-44} stroke="#d1d5db" strokeWidth={1} />
      <circle cx={27} cy={-44} r={1.4} fill="#f1f5f9" />
      {[-14, -2, 10].map((tx) => <path key={tx} d={`M${tx} 22 l1.5 5 h5 l1.5 -5 z`} fill="#4b5563" />)}
      <circle className="cp-blink" cx={-17} cy={-17} r={1.6} fill="#f87171" />
    </g>
  );
}

export default function LoginScene({ className, fit = 'slice' }: { className?: string; fit?: 'slice' | 'meet' }) {
  // Unique id prefix: the page renders two scenes (mobile + desktop) and SVG ids must not collide.
  const p = 'cp' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const sat = { x: 545, y: 300 };
  return (
    <svg className={className} viewBox="0 0 1440 810" preserveAspectRatio={`xMidYMid ${fit}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={p+'cell'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a3f8f" />
          <stop offset="0.55" stopColor="#14225c" />
          <stop offset="1" stopColor="#0a1238" />
        </linearGradient>
        <linearGradient id={p+'frame'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id={p+'sheen'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.15" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.38" stopColor="#c7d7ff" stopOpacity={0.32} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.05} />
          <stop offset="0.7" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={p+'boom'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id={p+'foil'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe7a3" />
          <stop offset="0.4" stopColor="#e0a526" />
          <stop offset="0.7" stopColor="#f3c851" />
          <stop offset="1" stopColor="#9a6408" />
        </linearGradient>
        <linearGradient id={p+'foilDark'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b7801a" />
          <stop offset="1" stopColor="#5e3b05" />
        </linearGradient>
        <radialGradient id={p+'dish'} cx="35%" cy="35%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#d1d5db" />
          <stop offset="1" stopColor="#8b95a5" />
        </radialGradient>
        <filter id={p+'crinkle'} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.11" numOctaves={2} seed={7} result="n" />
          <feDiffuseLighting in="n" surfaceScale={2.4} lightingColor="#ffffff" result="l">
            <feDistantLight azimuth={225} elevation={48} />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1={1.35} k2={0} k3={0} k4={0} result="c" />
          <feComposite in="c" in2="SourceGraphic" operator="in" />
        </filter>
        <radialGradient id={p+'atmo'} cx="50%" cy="50%" r="50%">
          <stop offset="0.86" stopColor="#7dd3fc" stopOpacity={0} />
          <stop offset="0.9" stopColor="#7dd3fc" stopOpacity={0.55} />
          <stop offset="1" stopColor="#3b82f6" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={p+'beam'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
        <filter id={p+'glow'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={p+'softglow'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}

      {/* Sri Vishnu Chakram (Sudarshana Chakra) haloing the Earth */}
      <g opacity={0.4}>
        <Chakra p={p + 'ch'} cx={GLOBE.cx} cy={GLOBE.cy} r={300} />
      </g>

      {/* Beams to job boards */}
      {BOARDS.map((b, i) => {
        const start = rim(b.x, b.y, 10);
        const end = { x: b.x < GLOBE.cx ? b.x + b.w / 2 : b.x - b.w / 2 + 8, y: b.y };
        return (
          <g key={b.name}>
            <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={`url(#${p}beam)`} strokeWidth={6} opacity={0.25} filter={`url(#${p}glow)`} />
            <line className="cp-beam" style={{ animationDelay: `${i * 0.35}s` }} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#e0f2fe" strokeWidth={2} strokeLinecap="round" />
            <circle cx={start.x} cy={start.y} r={4} fill="#e0f2fe" filter={`url(#${p}glow)`} />
          </g>
        );
      })}

      {/* Satellite uplink beam */}
      <line x1={sat.x + 40} y1={sat.y + 30} x2={rim(sat.x, sat.y, 20).x} y2={rim(sat.x, sat.y, 20).y} stroke="#bae6fd" strokeWidth={14} opacity={0.18} filter={`url(#${p}glow)`} />
      <line className="cp-beam" x1={sat.x + 40} y1={sat.y + 30} x2={rim(sat.x, sat.y, 20).x} y2={rim(sat.x, sat.y, 20).y} stroke="#f0f9ff" strokeWidth={3} />

      {/* Globe: photorealistic canvas (NASA textures) over a plain sphere fallback */}
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r + 10} fill="#38bdf8" opacity={0.35} filter={`url(#${p}softglow)`} />
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill="#0b3a75" />
      <foreignObject x={GLOBE.cx - GLOBE.r} y={GLOBE.cy - GLOBE.r} width={GLOBE.r * 2} height={GLOBE.r * 2}>
        <Globe className="block h-full w-full rounded-full" />
      </foreignObject>
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r * 1.12} fill={`url(#${p}atmo)`} pointerEvents="none" />

      {/* Satellites */}
      <Satellite p={p} x={sat.x} y={sat.y} scale={0.7} rotate={-22} />
      <g className="cp-float"><Satellite p={p} x={520} y={150} scale={0.32} rotate={16} /></g>
      <g className="cp-float" style={{ animationDelay: '0.8s' }}><Satellite p={p} x={1185} y={95} scale={0.27} rotate={32} /></g>
      <g className="cp-float" style={{ animationDelay: '2.2s' }}><Satellite p={p} x={585} y={610} scale={0.3} rotate={-14} /></g>

      {/* Ground dish near the bottom-left badge */}
      <g transform="translate(330 748)">
        <path d="M-22 -6 a26 26 0 0 0 44 0 z" fill="#cbd5e1" stroke="#e2e8f0" />
        <line x1={0} y1={-6} x2={10} y2={-22} stroke="#e2e8f0" strokeWidth={2} />
        <rect x={-4} y={-4} width={8} height={18} fill="#94a3b8" />
      </g>

      {/* Job board badges (text only) */}
      {BOARDS.map((b) => (
        <g key={b.name} transform={`translate(${b.x} ${b.y})`}>
          <rect x={-b.w / 2 - 4} y={-26} width={b.w + 8} height={52} rx={26} fill={b.color} opacity={0.35} filter={`url(#${p}softglow)`} />
          <rect x={-b.w / 2} y={-22} width={b.w} height={44} rx={22} fill={'solid' in b ? b.color : '#0b1430'} stroke={b.color} strokeWidth={2} />
          <text x={0} y={7} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={700} fontFamily="Inter, Segoe UI, sans-serif">{b.name}</text>
        </g>
      ))}

      {/* Sparkle */}
      <path d="M1340 760 l6 -22 6 22 22 6 -22 6 -6 22 -6 -22 -22 -6z" fill="#94a3b8" opacity={0.45} />
    </svg>
  );
}
