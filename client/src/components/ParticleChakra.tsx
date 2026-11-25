import { useEffect, useRef } from 'react';

/**
 * Sri Vishnu Chakram (Sudarshana Chakra) made of stardust.
 * ~5k particles are placed on the chakra's geometry (lotus hub, 16 spokes, beaded bands,
 * 108-tooth rim, flame crown) in a flat disc, which spins and is viewed with a 3D tilt.
 * Interaction: the cursor stirs particles, a click sends a pulse, dragging tilts the disc.
 */

interface P {
  r: number; // radius in disc units (1 = rim)
  a: number; // angle in disc
  z: number; // small thickness
  size: number;
  base: number; // base brightness
  hue: 0 | 1 | 2; // 0 ivory, 1 gold, 2 ember
  tw: number; // twinkle phase
  ox: number; oy: number; vx: number; vy: number; // screen-space displacement + velocity
  sx: number; sy: number; // last drawn screen position
}

const TAU = Math.PI * 2;
const COLORS = ['255,246,224', '246,196,83', '255,138,60'];

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function buildParticles(): P[] {
  const rnd = rand(108);
  const g = (sd = 1) => (rnd() + rnd() + rnd() - 1.5) * sd; // cheap gaussian-ish
  const out: P[] = [];
  const add = (r: number, a: number, size: number, base: number, hue: 0 | 1 | 2 = 1, z = g(0.012)) =>
    out.push({ r, a, z, size, base, hue, tw: rnd() * TAU, ox: 0, oy: 0, vx: 0, vy: 0, sx: 0, sy: 0 });

  // Bindu + lotus hub
  for (let i = 0; i < 260; i++) add(Math.abs(g(0.05)), rnd() * TAU, 1.3, 1, 0);
  for (let k = 0; k < 8; k++)
    for (let i = 0; i < 55; i++) {
      const t = rnd();
      const w = Math.sin(t * Math.PI) * 0.16;
      add(0.07 + t * 0.15, (k / 8) * TAU + g(w), 1, 0.85, t < 0.5 ? 0 : 1);
    }
  // Concentric bands
  const ring = (r: number, n: number, sd: number, base: number, hue: 0 | 1 | 2 = 1) => {
    for (let i = 0; i < n; i++) add(r + g(sd), rnd() * TAU, 0.9, base, hue);
  };
  ring(0.26, 560, 0.006, 0.9);
  ring(0.66, 800, 0.006, 0.85);
  ring(0.77, 600, 0.004, 0.6);
  ring(0.82, 900, 0.005, 0.9);
  ring(0.9, 1000, 0.006, 0.95);
  // 16 spokes: lens-shaped blades
  for (let k = 0; k < 16; k++)
    for (let i = 0; i < 70; i++) {
      const t = rnd();
      const w = Math.sin(t * Math.PI) * 0.055;
      add(0.26 + t * 0.4, (k / 16) * TAU + g(w * 0.7), 1, 0.9, t > 0.85 ? 0 : 1);
    }
  // 48 beads between the bands
  for (let k = 0; k < 48; k++) for (let i = 0; i < 7; i++) add(0.725 + g(0.005), (k / 48) * TAU + g(0.005), 1.05, 0.95, 0);
  // 108 teeth
  for (let k = 0; k < 108; k++)
    for (let i = 0; i < 6; i++) {
      const t = rnd();
      add(0.82 + t * 0.07, (k / 108) * TAU + g((1 - t) * 0.012), 0.9, 0.8, 1);
    }
  // Flame crown: 36 curling tongues
  for (let k = 0; k < 36; k++) {
    const len = k % 2 ? 0.1 : 0.15;
    for (let i = 0; i < 30; i++) {
      const t = rnd();
      const w = (1 - t) * 0.03;
      add(0.9 + t * len, (k / 36) * TAU + t * 0.07 + g(w), t > 0.6 ? 1.1 : 0.9, 0.95 - t * 0.3, t > 0.55 ? 2 : 1);
    }
  }
  // Cosmic dust halo
  for (let i = 0; i < 1100; i++) {
    const r = 0.15 + Math.pow(rnd(), 0.7) * 1.45;
    add(r, rnd() * TAU, 0.7, 0.25 + rnd() * 0.35, rnd() < 0.7 ? 0 : 1, g(0.08));
  }
  // A few brighter stars caught in the halo
  for (let i = 0; i < 40; i++) add(0.3 + rnd() * 1.1, rnd() * TAU, 1.3, 1, 0, g(0.06));
  return out;
}

export default function ParticleChakra({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const parts = buildParticles();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    let stars: HTMLCanvasElement | null = null;
    const mouse = { x: -9999, y: -9999, down: false, lastX: 0, lastY: 0, moved: 0 };
    let tiltX = 1.0; // radians: tilt of the disc away from the viewer (galaxy-like at ~1.0)
    let tiltY = -0.25;
    let targetX = tiltX, targetY = tiltY;
    let spin = 0;
    let raf = 0;
    let last = performance.now();

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    {
      const s = sprite.getContext('2d')!;
      const gr = s.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,240,200,1)');
      gr.addColorStop(0.25, 'rgba(255,214,130,0.55)');
      gr.addColorStop(1, 'rgba(255,190,90,0)');
      s.fillStyle = gr;
      s.fillRect(0, 0, 32, 32);
    }

    const layout = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const wide = W >= 1024;
      cx = wide ? W * 0.5 : W * 0.5;
      cy = wide ? H * 0.5 : H * 0.3;
      R = wide ? Math.min(H * 0.4, W * 0.26) : Math.min(W * 0.46, H * 0.26);
      // Static star field
      stars = document.createElement('canvas');
      stars.width = canvas.width;
      stars.height = canvas.height;
      const s = stars.getContext('2d')!;
      const rnd = rand(7);
      for (let i = 0; i < (W * H) / 2600; i++) {
        const b = rnd();
        s.fillStyle = `rgba(255,255,255,${0.08 + b * b * 0.6})`;
        const sz = (b > 0.97 ? 1.6 : 0.8) * dpr;
        s.fillRect(rnd() * stars.width, rnd() * stars.height, sz, sz);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) spin += dt * 0.06;
      tiltX += (targetX - tiltX) * 0.06;
      tiltY += (targetY - tiltY) * 0.06;
      if (!mouse.down && !reduced) {
        // drift slowly back towards the resting pose
        targetX += (1.0 + Math.sin(now / 9000) * 0.08 - targetX) * 0.004;
        targetY += (-0.25 - targetY) * 0.004;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (stars) ctx.drawImage(stars, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Core glow
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.3);
      glow.addColorStop(0, 'rgba(255,222,160,0.30)');
      glow.addColorStop(0.25, 'rgba(214,160,80,0.12)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.4, R * 1.4 * (0.35 + 0.65 * Math.abs(Math.cos(tiltX))), tiltY * 0.6, 0, TAU);
      ctx.fill();

      const cX = Math.cos(tiltX), sX = Math.sin(tiltX), cY = Math.cos(tiltY), sY = Math.sin(tiltY);
      const focal = 3.2;
      const t = now / 1000;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const a = p.a + spin * (p.r < 0.25 ? -1.6 : 1); // hub counter-rotates like the original
        let x = Math.cos(a) * p.r;
        let y = Math.sin(a) * p.r;
        let z = p.z;
        // tilt around X, then around Z-ish (Y) for a slanted disc
        const y1 = y * cX - z * sX;
        const z1 = y * sX + z * cX;
        const x2 = x * cY - y1 * sY;
        const y2 = x * sY + y1 * cY;
        const k = focal / (focal + z1);
        let sx = cx + x2 * R * k;
        let sy = cy + y2 * R * k;

        // Cursor stirring + spring back
        if (!reduced) {
          const dx = sx + p.ox - mouse.x;
          const dy = sy + p.oy - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 16000) {
            const f = (1 - d2 / 16000) * 1.6;
            const d = Math.sqrt(d2) || 1;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
          p.vx += -p.ox * 0.02;
          p.vy += -p.oy * 0.02;
          p.vx *= 0.9;
          p.vy *= 0.9;
          p.ox += p.vx;
          p.oy += p.vy;
        }
        sx += p.ox;
        sy += p.oy;
        p.sx = sx;
        p.sy = sy;

        const tw = 0.75 + 0.25 * Math.sin(t * 1.7 + p.tw);
        const depth = 0.75 + 0.35 * (1 - (z1 + 1) / 2);
        const alpha = Math.min(1, p.base * tw * depth);
        const size = p.size * k * (R / 320 + 0.55);
        if (p.size >= 1.3) {
          const s = size * 5;
          ctx.globalAlpha = alpha * 0.4;
          ctx.drawImage(sprite, sx - s / 2, sy - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(${COLORS[p.hue]},${alpha})`;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = pos(e);
      if (mouse.down) {
        targetY += (p.x - mouse.lastX) * 0.005;
        targetX = Math.max(-0.2, Math.min(1.45, targetX + (p.y - mouse.lastY) * 0.005));
        mouse.moved += Math.abs(p.x - mouse.lastX) + Math.abs(p.y - mouse.lastY);
      }
      mouse.lastX = p.x;
      mouse.lastY = p.y;
      mouse.x = p.x;
      mouse.y = p.y;
    };
    const onDown = (e: PointerEvent) => {
      const p = pos(e);
      mouse.down = true;
      mouse.moved = 0;
      mouse.lastX = p.x;
      mouse.lastY = p.y;
    };
    const onUp = (e: PointerEvent) => {
      if (mouse.down && mouse.moved < 6) {
        // Click: pulse outwards from the click point
        const p = pos(e);
        for (const q of parts) {
          const dx = q.sx - p.x;
          const dy = q.sy - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 420) {
            const f = (1 - d / 420) * 26;
            q.vx += (dx / d) * f;
            q.vy += (dy / d) * f;
          }
        }
      }
      mouse.down = false;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
      mouse.down = false;
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(canvas);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
