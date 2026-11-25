import { useId } from 'react';
import clsx from 'clsx';

/**
 * Loading visual: a satellite orbiting a small planet, with a signal beam linking the two
 * and ripples spreading from the planet while the app "connects".
 */
export function SatelliteMark({ size = 40, className }: { size?: number; className?: string }) {
  const p = 'sl' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={clsx('shrink-0 overflow-visible', className)} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${p}planet`} cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="0.35" stopColor="#38bdf8" />
          <stop offset="0.75" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0b1d4f" />
        </radialGradient>
        <radialGradient id={`${p}glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#38bdf8" stopOpacity={0.35} />
          <stop offset="1" stopColor="#38bdf8" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${p}panel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>

      {/* Signal ripples from the planet */}
      {[0, 1, 2].map((i) => (
        <circle key={i} className="cpl-ripple" style={{ animationDelay: `${i * 0.6}s` }} cx="60" cy="72" r="20" fill="none" stroke="#7dd3fc" strokeWidth="1.5" />
      ))}

      {/* Orbit path */}
      <ellipse cx="60" cy="72" rx="44" ry="44" fill="none" stroke="#93c5fd" strokeOpacity="0.25" strokeDasharray="2 5" />

      {/* Planet */}
      <circle cx="60" cy="72" r="30" fill={`url(#${p}glow)`} />
      <circle cx="60" cy="72" r="20" fill={`url(#${p}planet)`} />
      <path d="M46 66c5-4 12-5 16-2 3 2 1 5-2 6-4 1-5 4-9 4-4 0-6-3-5-8zM64 76c4-1 8 1 9 5 0 3-3 5-6 4-3-1-5-6-3-9z" fill="#34d399" opacity="0.55" />
      <circle cx="60" cy="72" r="20" fill="none" stroke="#e0f2fe" strokeOpacity="0.5" />

      {/* Orbiting satellite with its beam always pointing at the planet */}
      <g className="cpl-orbit">
        <line className="cpl-beam" x1="60" y1="36" x2="60" y2="51" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(60 28)">
          <rect x="-21" y="-4" width="14" height="8" rx="1" fill={`url(#${p}panel)`} stroke="#bfdbfe" strokeWidth="0.6" />
          <rect x="7" y="-4" width="14" height="8" rx="1" fill={`url(#${p}panel)`} stroke="#bfdbfe" strokeWidth="0.6" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="#cbd5e1" strokeWidth="1.2" />
          <rect x="-5" y="-5" width="10" height="10" rx="1.5" fill="#f6c453" stroke="#a16207" strokeWidth="0.6" />
          <path d="M-3 5 q3 4 6 0" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          <circle className="cpl-blink" cx="3" cy="-2" r="1.2" fill="#f87171" />
        </g>
      </g>
    </svg>
  );
}

/** Full-screen loader shown while the app starts. */
export function AppLoader({ label = 'Connecting to CareerPilot AI' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 dark:bg-[#030712]" role="status" aria-live="polite">
      <SatelliteMark size={176} />
      <div className="text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
          {label}
          <span className="cpl-dots" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Establishing a secure link</p>
      </div>
    </div>
  );
}
