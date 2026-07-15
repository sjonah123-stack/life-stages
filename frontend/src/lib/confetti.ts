// Hand-rolled canvas confetti — no dependency, same ethos as the
// hand-rolled SVG radar. A singleton full-viewport canvas is created
// lazily on the first burst and removed once the last particle settles,
// so idle cost is zero. Colors come from the editorial palette CSS vars.
//
// Respects prefers-reduced-motion: every entry point is a no-op.
import { prefersReducedMotion } from './motion';

export type ConfettiIntensity = 'small' | 'big';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number; // rotation velocity
  life: number;
  ttl: number; // frames to live
  round: boolean;
}

const MAX_PARTICLES = 300;
const GRAVITY = 0.16;
const DRAG = 0.985;

// Palette CSS vars sampled per burst, with hex fallbacks matching app.css.
const COLOR_VARS: [string, string][] = [
  ['--accent', '#B5654A'],
  ['--accent-soft', '#C98E72'],
  ['--accent-deep', '#8F4A34'],
  ['--money', '#C99A4A'],
  ['--growth', '#8A6D9F'],
  ['--health', '#7E8A55'],
];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let rafId: number | null = null;

function paletteColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return COLOR_VARS.map(([name, fallback]) => {
    const v = style.getPropertyValue(name).trim();
    return v || fallback;
  });
}

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (ctx) return ctx;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    canvas = null;
    return null;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  return ctx;
}

function resizeCanvas(): void {
  if (!canvas || !ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function teardown(): void {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  particles = [];
  window.removeEventListener('resize', resizeCanvas);
  canvas?.remove();
  canvas = null;
  ctx = null;
}

function frame(): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const alive: Particle[] = [];
  for (const p of particles) {
    p.life++;
    if (p.life >= p.ttl || p.y > window.innerHeight + 40) continue;
    p.vy += GRAVITY;
    p.vx *= DRAG;
    p.vy *= DRAG;
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.vr;

    // Fade out over the last 40% of life.
    const fadeStart = p.ttl * 0.6;
    const alpha =
      p.life < fadeStart ? 1 : 1 - (p.life - fadeStart) / (p.ttl - fadeStart);

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.round) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // A rectangle scaled on Y by the spin phase reads as a tumbling flake.
      const squish = 0.35 + 0.65 * Math.abs(Math.sin(p.rotation * 1.4));
      ctx.fillRect(-p.size / 2, (-p.size * squish) / 2, p.size, p.size * squish);
    }
    ctx.restore();
    alive.push(p);
  }
  particles = alive;
  if (particles.length > 0) {
    rafId = requestAnimationFrame(frame);
  } else {
    teardown();
  }
}

export function confettiBurst(
  x: number,
  y: number,
  opts: { count?: number; power?: number; colors?: string[] } = {},
): void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  const context = ensureCanvas();
  if (!context) return;

  const count = opts.count ?? 24;
  const power = opts.power ?? 7;
  const colors = opts.colors ?? paletteColors();

  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = power * (0.35 + Math.random() * 0.65);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 5,
      color: colors[i % colors.length],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      life: 0,
      ttl: 55 + Math.random() * 45,
      round: Math.random() < 0.25,
    });
  }
  if (rafId == null) rafId = requestAnimationFrame(frame);
}

// Burst from the center of an element; falls back to viewport center.
export function confettiFrom(
  el: HTMLElement | null,
  intensity: ConfettiIntensity = 'small',
): void {
  if (typeof window === 'undefined' || prefersReducedMotion()) return;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2.6;
  if (el) {
    const rect = el.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }
  if (intensity === 'big') {
    confettiBurst(x, y, { count: 80, power: 10 });
  } else {
    confettiBurst(x, y, { count: 22, power: 6.5 });
  }
}
