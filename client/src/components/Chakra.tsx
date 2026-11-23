/**
 * Sri Vishnu Chakram (Sudarshana Chakra) drawn as SVG: a ring of flames, a serrated rim,
 * ornamental bands, sixteen spokes and a lotus hub. Rendered inside the LoginScene SVG.
 */

const polar = (r: number, deg: number, cx: number, cy: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
};
const f = (n: number) => n.toFixed(1);

export default function Chakra({ cx, cy, r, p }: { cx: number; cy: number; r: number; p: string }) {
  const FLAMES = 36;
  const TEETH = 108; // a sacred number; also reads as a fine serrated edge
  const SPOKES = 16;

  // Flame tongues around the outer edge, each curling clockwise.
  const flames = Array.from({ length: FLAMES }, (_, i) => {
    const a = (360 / FLAMES) * i;
    const step = 360 / FLAMES;
    const [bx1, by1] = polar(r * 0.9, a - step * 0.42, cx, cy);
    const [bx2, by2] = polar(r * 0.9, a + step * 0.42, cx, cy);
    const [tx, ty] = polar(r * (i % 2 ? 0.97 : 1.02), a + step * 0.35, cx, cy);
    const [c1x, c1y] = polar(r * 1.0, a - step * 0.25, cx, cy);
    const [c2x, c2y] = polar(r * 0.97, a + step * 0.55, cx, cy);
    return `M${f(bx1)} ${f(by1)} Q${f(c1x)} ${f(c1y)} ${f(tx)} ${f(ty)} Q${f(c2x)} ${f(c2y)} ${f(bx2)} ${f(by2)} Z`;
  }).join(' ');

  const inner = Array.from({ length: FLAMES }, (_, i) => {
    const a = (360 / FLAMES) * i;
    const step = 360 / FLAMES;
    const [bx1, by1] = polar(r * 0.9, a - step * 0.18, cx, cy);
    const [bx2, by2] = polar(r * 0.9, a + step * 0.22, cx, cy);
    const [tx, ty] = polar(r * (i % 2 ? 0.95 : 0.99), a + step * 0.25, cx, cy);
    return `M${f(bx1)} ${f(by1)} L${f(tx)} ${f(ty)} L${f(bx2)} ${f(by2)} Z`;
  }).join(' ');

  const teeth = Array.from({ length: TEETH }, (_, i) => {
    const a = (360 / TEETH) * i;
    const [x1, y1] = polar(r * 0.82, a - 1.4, cx, cy);
    const [x2, y2] = polar(r * 0.82, a + 1.4, cx, cy);
    const [tx, ty] = polar(r * 0.89, a, cx, cy);
    return `M${f(x1)} ${f(y1)} L${f(tx)} ${f(ty)} L${f(x2)} ${f(y2)} Z`;
  }).join(' ');

  // Spokes: slender double-pointed blades between the hub and the inner band.
  const spokes = Array.from({ length: SPOKES }, (_, i) => {
    const a = (360 / SPOKES) * i;
    const [ax, ay] = polar(r * 0.26, a, cx, cy);
    const [bx, by] = polar(r * 0.66, a, cx, cy);
    const [lx, ly] = polar(r * 0.46, a - 3.2, cx, cy);
    const [rx, ry] = polar(r * 0.46, a + 3.2, cx, cy);
    return `M${f(ax)} ${f(ay)} Q${f(lx)} ${f(ly)} ${f(bx)} ${f(by)} Q${f(rx)} ${f(ry)} ${f(ax)} ${f(ay)} Z`;
  }).join(' ');

  const beads = Array.from({ length: 48 }, (_, i) => polar(r * 0.725, (360 / 48) * i, cx, cy));
  const knots = Array.from({ length: SPOKES }, (_, i) => polar(r * 0.66, (360 / SPOKES) * i, cx, cy));

  const petals = (n: number, len: number, w: number, rot: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (360 / n) * i + rot;
      const [ax, ay] = polar(r * 0.08, a, cx, cy);
      const [tx, ty] = polar(r * len, a, cx, cy);
      const [lx, ly] = polar(r * len * 0.6, a - w, cx, cy);
      const [rx, ry] = polar(r * len * 0.6, a + w, cx, cy);
      return `M${f(ax)} ${f(ay)} Q${f(lx)} ${f(ly)} ${f(tx)} ${f(ty)} Q${f(rx)} ${f(ry)} ${f(ax)} ${f(ay)} Z`;
    }).join(' ');

  return (
    <g>
      <defs>
        <radialGradient id={p + 'gold'} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset="0.45" stopColor="#f6c453" />
          <stop offset="0.8" stopColor="#d48a1c" />
          <stop offset="1" stopColor="#9a5b0c" />
        </radialGradient>
        <radialGradient id={p + 'fire'} cx="50%" cy="50%" r="50%">
          <stop offset="0.85" stopColor="#ffb347" />
          <stop offset="0.95" stopColor="#ff7a18" />
          <stop offset="1" stopColor="#ff4500" />
        </radialGradient>
        <radialGradient id={p + 'aura'} cx="50%" cy="50%" r="50%">
          <stop offset="0.55" stopColor="#fbbf24" stopOpacity={0} />
          <stop offset="0.85" stopColor="#f59e0b" stopOpacity={0.28} />
          <stop offset="1" stopColor="#f59e0b" stopOpacity={0} />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r * 1.18} fill={`url(#${p}aura)`} />

      <g className="cp-spin">
        <path d={flames} fill={`url(#${p}fire)`} opacity={0.9} />
        <path d={inner} fill="#ffd27a" opacity={0.85} />
        <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke={`url(#${p}gold)`} strokeWidth={r * 0.02} />
        <path d={teeth} fill={`url(#${p}gold)`} />
        <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke="#f6c453" strokeWidth={r * 0.018} />
        <circle cx={cx} cy={cy} r={r * 0.77} fill="none" stroke="#d48a1c" strokeWidth={r * 0.008} />
        {beads.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r * 0.012} fill="#ffe9a8" opacity={0.6} />)}
        <circle cx={cx} cy={cy} r={r * 0.68} fill="none" stroke="#f6c453" strokeWidth={r * 0.014} />
        <path d={spokes} fill={`url(#${p}gold)`} stroke="#fff1c1" strokeOpacity={0.5} strokeWidth={0.8} />
        {knots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r * 0.02} fill="#fff1c1" />)}
        <circle cx={cx} cy={cy} r={r * 0.26} fill="none" stroke="#f6c453" strokeWidth={r * 0.016} />
      </g>

      {/* Lotus hub turns the other way, slowly */}
      <g className="cp-spin-rev">
        <path d={petals(8, 0.22, 16, 0)} fill="#f6c453" opacity={0.9} />
        <path d={petals(8, 0.17, 14, 22.5)} fill="#ffe29a" opacity={0.95} />
        <circle cx={cx} cy={cy} r={r * 0.07} fill={`url(#${p}gold)`} stroke="#fff4c2" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={r * 0.025} fill="#fff8e1" />
      </g>
    </g>
  );
}
