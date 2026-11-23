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

/** Communications satellite: gold MLI-foil bus, two solar wings with cell grids, dish antenna. */
function Satellite({ p, x, y, scale = 1, rotate = 0 }: { p: string; x: number; y: number; scale?: number; rotate?: number }) {
  const cells = [-33, -22, -11, 0, 11, 22, 33];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      {/* Solar wings on booms */}
      <rect x={-118} y={-1.5} width={236} height={3} fill="#9ca3af" />
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${side * 74} 0)`}>
          <rect x={-40} y={-26} width={80} height={52} rx={1.5} fill={`url(#${p}cells)`} stroke="#cbd5e1" strokeWidth={1.6} />
          {cells.map((gx) => <line key={gx} x1={gx + 5.5} y1={-26} x2={gx + 5.5} y2={26} stroke="#c7d2fe" strokeOpacity={0.35} strokeWidth={0.6} />)}
          {[-17, -8.5, 0, 8.5, 17].map((gy) => <line key={gy} x1={-40} y1={gy} x2={40} y2={gy} stroke="#c7d2fe" strokeOpacity={0.3} strokeWidth={0.6} />)}
          <rect x={-40} y={-26} width={80} height={52} rx={1.5} fill={`url(#${p}sheen)`} />
        </g>
      ))}
      {/* Bus wrapped in gold thermal foil */}
      <rect x={-22} y={-24} width={44} height={48} rx={3} fill={`url(#${p}foil)`} stroke="#7c4a03" strokeWidth={1} />
      <path d="M-20 -14 l10 3 8 -4 10 5 12 -3 M-20 2 l7 -3 11 4 9 -2 13 3 M-20 15 l12 2 6 -4 12 3 10 -2" fill="none" stroke="#7c4a03" strokeOpacity={0.45} strokeWidth={0.8} />
      <rect x={-22} y={-24} width={44} height={10} fill="#fff7d6" opacity={0.25} />
      {/* Dish antenna and feed */}
      <ellipse cx={0} cy={-34} rx={17} ry={7} fill={`url(#${p}dish)`} stroke="#e5e7eb" strokeWidth={1} />
      <line x1={0} y1={-24} x2={0} y2={-31} stroke="#d1d5db" strokeWidth={2} />
      <line x1={0} y1={-34} x2={0} y2={-46} stroke="#e5e7eb" strokeWidth={1.2} />
      <circle cx={0} cy={-46} r={2} fill="#f8fafc" />
      {/* Thruster nozzles + status light */}
      <rect x={-12} y={24} width={7} height={5} fill="#6b7280" />
      <rect x={5} y={24} width={7} height={5} fill="#6b7280" />
      <circle className="cp-blink" cx={14} cy={-16} r={2} fill="#f87171" />
    </g>
  );
}

export default function LoginScene({ className, fit = 'slice' }: { className?: string; fit?: 'slice' | 'meet' }) {
  // Unique id prefix: the page renders two scenes (mobile + desktop) and SVG ids must not collide.
  const p = 'cp' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const sat = { x: 470, y: 330 };
  return (
    <svg className={className} viewBox="0 0 1440 810" preserveAspectRatio={`xMidYMid ${fit}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={p+'cells'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b1b4d" />
          <stop offset="0.5" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#0f2463" />
        </linearGradient>
        <linearGradient id={p+'sheen'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.2" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.45" stopColor="#dbeafe" stopOpacity={0.35} />
          <stop offset="0.6" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={p+'foil'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.35" stopColor="#d4a017" />
          <stop offset="0.6" stopColor="#f6d365" />
          <stop offset="1" stopColor="#a16207" />
        </linearGradient>
        <radialGradient id={p+'dish'} cx="40%" cy="40%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9ca3af" />
        </radialGradient>
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
      <Satellite p={p} x={sat.x} y={sat.y} scale={1.05} rotate={-24} />
      <g className="cp-float"><Satellite p={p} x={500} y={150} scale={0.45} rotate={18} /></g>
      <g className="cp-float" style={{ animationDelay: '1.5s' }}><Satellite p={p} x={600} y={200} scale={0.4} rotate={-30} /></g>
      <g className="cp-float" style={{ animationDelay: '0.8s' }}><Satellite p={p} x={1180} y={95} scale={0.35} rotate={35} /></g>
      <g className="cp-float" style={{ animationDelay: '2.2s' }}><Satellite p={p} x={580} y={600} scale={0.42} rotate={-15} /></g>

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
