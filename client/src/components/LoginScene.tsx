import { useId } from 'react';

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

function Satellite({ p, x, y, scale = 1, rotate = 0 }: { p: string; x: number; y: number; scale?: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${side * 58} 0)`}>
          <rect x={-40} y={-22} width={80} height={44} rx={3} fill={`url(#${p}panel)`} stroke="#93c5fd" strokeOpacity={0.6} strokeWidth={1.2} />
          {[-20, 0, 20].map((gx) => <line key={gx} x1={gx} y1={-22} x2={gx} y2={22} stroke="#bfdbfe" strokeOpacity={0.35} />)}
          <line x1={-40} y1={0} x2={40} y2={0} stroke="#bfdbfe" strokeOpacity={0.35} />
        </g>
      ))}
      <rect x={-18} y={-4} width={36} height={8} fill="#cbd5e1" />
      <rect x={-16} y={-18} width={32} height={36} rx={6} fill={`url(#${p}metal)`} stroke="#e2e8f0" strokeWidth={1} />
      <circle cx={0} cy={0} r={7} fill="#0ea5e9" opacity={0.9} />
      <circle cx={0} cy={0} r={3} fill="#e0f2fe" />
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
        <radialGradient id={p+'ocean'} cx="38%" cy="36%" r="72%">
          <stop offset="0%" stopColor="#8fd3ff" />
          <stop offset="22%" stopColor="#2f86dc" />
          <stop offset="58%" stopColor="#0d3f8f" />
          <stop offset="100%" stopColor="#04122f" />
        </radialGradient>
        <linearGradient id={p+'night'} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.45" stopColor="#020617" stopOpacity={0} />
          <stop offset="1" stopColor="#020617" stopOpacity={0.85} />
        </linearGradient>
        <radialGradient id={p+'halo'} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#60a5fa" stopOpacity={0} />
          <stop offset="86%" stopColor="#60a5fa" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={p+'panel'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id={p+'metal'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
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
        <clipPath id={p+'globeClip'}>
          <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} />
        </clipPath>
      </defs>

      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}

      {/* Orbit rings */}
      {[260, 340, 430].map((r, i) => (
        <circle key={r} cx={GLOBE.cx} cy={GLOBE.cy} r={r} fill="none" stroke="#93c5fd" strokeOpacity={0.12 - i * 0.03} strokeWidth={i === 0 ? 2 : 1} strokeDasharray={i === 1 ? '2 8' : undefined} />
      ))}
      <text x={GLOBE.cx - 70} y={GLOBE.cy - 340} fill="#93c5fd" opacity={0.35} fontSize={16}>Job discovery</text>

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

      {/* Globe */}
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r + 40} fill={`url(#${p}halo)`} />
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r + 6} fill="#3b82f6" opacity={0.35} filter={`url(#${p}softglow)`} />
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill={`url(#${p}ocean)`} />
      <g clipPath={`url(#${p}globeClip)`}>
        {/* Stylised continents */}
        <g fill="#2f7a4f" opacity={0.55}>
          <path d="M610 330c30-25 80-30 110-12 18 12 8 34-12 40-22 8-26 30-48 34-24 5-40-12-52-30-8-12-8-22 2-32z" />
          <path d="M700 400c26-6 52 6 60 30 8 26-6 48 4 70 10 22-8 44-30 48-26 4-36-18-40-40-4-20-20-30-18-52 2-26 4-50 24-56z" />
          <path d="M780 340c30-6 70 2 86 26 10 16-6 30-24 32-20 2-30 18-48 16-22-2-30-20-34-36-2-18 4-34 20-38z" />
          <path d="M800 470c18-4 34 10 34 26s-14 30-28 28c-16-2-24-16-22-30 2-12 6-22 16-24z" />
          <path d="M580 470c16-8 36 0 40 16 4 18-10 30-24 32-16 2-28-10-30-24-1-10 4-19 14-24z" />
        </g>
        {/* Graticule */}
        {[40, 90, 140].map((rx) => <ellipse key={rx} cx={GLOBE.cx} cy={GLOBE.cy} rx={rx} ry={GLOBE.r} fill="none" stroke="#fff" strokeOpacity={0.08} />)}
        {[-90, -30, 30, 90].map((dy) => <ellipse key={dy} cx={GLOBE.cx} cy={GLOBE.cy + dy} rx={GLOBE.r * Math.cos(Math.asin(dy / GLOBE.r))} ry={10} fill="none" stroke="#fff" strokeOpacity={0.07} />)}
        <rect x={GLOBE.cx - GLOBE.r} y={GLOBE.cy - GLOBE.r} width={GLOBE.r * 2} height={GLOBE.r * 2} fill={`url(#${p}night)`} />
        {/* City lights on the night side */}
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={GLOBE.cx + 40 + ((i * 37) % 120)} cy={GLOBE.cy - 90 + ((i * 53) % 190)} r={1.4} fill="#fde68a" opacity={0.75} />
        ))}
      </g>
      <circle cx={GLOBE.cx} cy={GLOBE.cy} r={GLOBE.r} fill="none" stroke="#bae6fd" strokeOpacity={0.5} strokeWidth={1.5} />

      {/* Satellites */}
      <Satellite p={p} x={sat.x} y={sat.y} scale={1.25} rotate={-24} />
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
