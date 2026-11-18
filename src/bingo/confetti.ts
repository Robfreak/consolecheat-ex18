import { mulberry32 } from "./prng.ts";

// Canvas confetti without a library. Pure particle math; the UI draws it.

export type Particle = { x: number; y: number; vx: number; vy: number; size: number; color: string; rot: number; vr: number };

export const CONFETTI_COLORS = ["#0070d1", "#7eb6ff", "#d2b48a", "#8fceab", "#e09898", "#f3f5f8"];
export const CONFETTI_MS = 2600;

export function createConfetti(seed: number, count: number, width: number, height: number): Particle[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: width / 2 + (rand() - 0.5) * width * 0.3,
    y: height * 0.35 + (rand() - 0.5) * 40,
    vx: (rand() - 0.5) * 0.9,
    vy: -0.4 - rand() * 0.7,
    size: 6 + rand() * 6,
    color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)] ?? "#ffffff",
    rot: rand() * Math.PI,
    vr: (rand() - 0.5) * 0.02,
  }));
}

/** Advances by `dt` milliseconds with gravity and a little drag. */
export function stepConfetti(particles: readonly Particle[], dt: number): Particle[] {
  return particles.map((p) => ({
    ...p,
    x: p.x + p.vx * dt,
    y: p.y + p.vy * dt,
    vx: p.vx * 0.995,
    vy: p.vy + 0.0012 * dt,
    rot: p.rot + p.vr * dt,
  }));
}

/** Static scatter for prefers-reduced-motion: same colours, no movement. */
export function staticConfetti(seed: number, count: number, width: number, height: number): Particle[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height * 0.6,
    vx: 0,
    vy: 0,
    size: 6 + rand() * 5,
    color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)] ?? "#ffffff",
    rot: rand() * Math.PI,
    vr: 0,
  }));
}
