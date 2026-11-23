import { useEffect, useRef } from 'react';

/**
 * Photorealistic rotating Earth rendered on a canvas.
 * Textures: NASA Blue Marble / Earth at Night (public domain), via the three.js example set.
 * Each pixel of the disc is mapped to lat/lon once (lookup table); every frame only shifts longitude,
 * so the animation is cheap. Lighting (day/night terminator, ocean glint, atmosphere) is precomputed too.
 */

const TEX_W = 2048;
const TEX_H = 1024;

type Textures = { day: Uint8ClampedArray; night: Uint8ClampedArray; clouds: Uint8ClampedArray };
let texturesPromise: Promise<Textures> | null = null;

function loadPixels(src: string): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = TEX_W;
      c.height = TEX_H;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, TEX_W, TEX_H);
      resolve(ctx.getImageData(0, 0, TEX_W, TEX_H).data);
    };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function loadTextures() {
  texturesPromise ??= Promise.all([
    loadPixels('/textures/earth-day.jpg'),
    loadPixels('/textures/earth-night.png'),
    loadPixels('/textures/earth-clouds.png'),
  ]).then(([day, night, clouds]) => ({ day, night, clouds }));
  return texturesPromise;
}

interface Props {
  /** Canvas resolution in pixels (diameter). */
  size?: number;
  /** Longitude (degrees east) facing the viewer at start. India ≈ 78. */
  startLon?: number;
  /** Seconds per full rotation. */
  period?: number;
  className?: string;
}

export default function Globe({ size = 560, startLon = 105, period = 140, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    let raf = 0;
    let visible = true;

    // ---- Precompute per-pixel geometry and lighting ----
    const N = size;
    const R = N / 2;
    const count = N * N;
    const lonPx = new Float32Array(count); // texture x (unwrapped) at offset 0
    const row = new Int32Array(count); // texture row * TEX_W
    const light = new Float32Array(count); // diffuse day light 0..1
    const dayMix = new Float32Array(count); // 1 = day side, 0 = night side
    const spec = new Float32Array(count);
    const rim = new Float32Array(count);
    const inside = new Uint8Array(count);

    const tilt = (20 * Math.PI) / 180; // look slightly from the north (centre ≈ 20°N)
    const roll = (-12 * Math.PI) / 180; // axial tilt on screen
    const cT = Math.cos(tilt), sT = Math.sin(tilt), cR = Math.cos(roll), sR = Math.sin(roll);
    // Sun from the upper-left front (matches the blue/day half of the backdrop).
    let L = [-0.62, -0.42, 0.66];
    const ln = Math.hypot(L[0], L[1], L[2]);
    L = L.map((v) => v / ln);
    const H = [L[0], L[1], L[2] + 1];
    const hn = Math.hypot(H[0], H[1], H[2]);

    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const i = py * N + px;
        const x = (px + 0.5 - R) / R;
        const y = (py + 0.5 - R) / R;
        const d2 = x * x + y * y;
        if (d2 > 1) continue;
        inside[i] = 1;
        const z = Math.sqrt(1 - d2);
        // Screen normal (x right, y down, z towards viewer) -> world (undo roll, then tilt).
        const xr = x * cR + y * sR;
        const yr = -x * sR + y * cR;
        const wy = yr * cT - z * sT;
        const wz = yr * sT + z * cT;
        const lat = Math.asin(Math.max(-1, Math.min(1, -wy)));
        const lon = Math.atan2(xr, wz);
        lonPx[i] = ((lon / (2 * Math.PI)) + 0.5) * TEX_W;
        row[i] = Math.min(TEX_H - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * TEX_H))) * TEX_W;
        const nl = x * L[0] + y * L[1] + z * L[2];
        light[i] = Math.max(0, nl);
        const t = Math.min(1, Math.max(0, (nl + 0.08) / 0.3));
        dayMix[i] = t * t * (3 - 2 * t);
        const nh = Math.max(0, (x * H[0] + y * H[1] + z * H[2]) / hn);
        spec[i] = Math.pow(nh, 70) * 0.9;
        rim[i] = Math.pow(1 - z, 2.6);
      }
    }

    const image = ctx.createImageData(N, N);
    const out = image.data;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lon0 = ((startLon + 180) / 360) * TEX_W; // texture x of the start longitude

    const render = (tex: Textures, seconds: number) => {
      const spin = (seconds / period) * TEX_W;
      const off = lon0 - TEX_W / 2 - spin; // west-to-east rotation
      const cloudOff = off - spin * 0.15; // clouds drift slightly faster than the surface
      const { day, night, clouds } = tex;
      for (let i = 0; i < count; i++) {
        const o = i * 4;
        if (!inside[i]) {
          out[o + 3] = 0;
          continue;
        }
        let u = (lonPx[i] + off) % TEX_W;
        if (u < 0) u += TEX_W;
        let uc = (lonPx[i] + cloudOff) % TEX_W;
        if (uc < 0) uc += TEX_W;
        const t = (row[i] + (u | 0)) * 4;
        const tc = (row[i] + (uc | 0)) * 4;

        const dr = day[t], dg = day[t + 1], db = day[t + 2];
        const ca = (clouds[tc + 3] / 255) * (clouds[tc] / 255) * 0.85;
        const dm = dayMix[i];
        const lit = 0.18 + 1.05 * light[i];
        const ocean = db > dr + 12 && db > dg ? 1 : 0;
        const s = spec[i] * ocean * dm * 255;

        // Day side: surface, then clouds on top, plus sun glint on water.
        let r = (dr * (1 - ca) + 255 * ca) * lit + s * 0.9;
        let g = (dg * (1 - ca) + 255 * ca) * lit + s * 0.85;
        let b = (db * (1 - ca) + 255 * ca) * lit + s * 0.7;
        // Night side: city lights dimmed under clouds.
        const nlum = night[t] * (1 - ca * 0.8);
        r = r * dm + (1 - dm) * (nlum * 1.25 + dr * 0.04);
        g = g * dm + (1 - dm) * (nlum * 1.0 + dg * 0.05);
        b = b * dm + (1 - dm) * (nlum * 0.55 + db * 0.1);
        // Atmosphere: blue scattering towards the limb, brighter on the sunlit side.
        const a = rim[i] * (0.35 + 0.9 * dm);
        r = r * (1 - a) + 90 * a;
        g = g * (1 - a) + 160 * a;
        b = b * (1 - a) + 255 * a;
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    loadTextures()
      .then((tex) => {
        if (cancelled) return;
        const start = performance.now();
        render(tex, 0);
        if (reduced) return;
        let last = 0;
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          if (!visible || document.hidden || now - last < 33) return; // ~30 fps is plenty for a slow spin
          last = now;
          render(tex, (now - start) / 1000);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        /* Decorative: if textures fail, the SVG fallback sphere behind the canvas stays visible. */
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [size, startLon, period]);

  return <canvas ref={ref} width={size} height={size} className={className} aria-hidden="true" />;
}
