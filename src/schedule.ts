/**
 * Monte Carlo schedule risk. Remaining duration is drawn from a triangular
 * distribution (optimistic, most likely, pessimistic) — the three-point
 * estimate a project manager already has — scaled by the observed schedule
 * performance so a project that has been slipping keeps slipping. Seeded.
 */

import type { ProjectInputs } from './evm.ts';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inverse-CDF sample from a triangular distribution. */
export function triangular(rng: () => number, a: number, m: number, b: number): number {
  if (b <= a) return a;
  const u = rng();
  const f = (m - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m));
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return a + (b - a) * (idx - lo);
}

export interface ScheduleResult {
  /** Total duration (elapsed + remaining) per trial, weeks. */
  totals: number[];
  p10: number; p50: number; p90: number;
  /** Probability of finishing within the planned duration. */
  onTime: number;
  /** Weeks of contingency needed for 80% confidence, relative to plan (0 if none). */
  contingencyP80: number;
  /** Deterministic finish: elapsed + most likely ÷ SPI. */
  deterministic: number;
}

/**
 * @param spiAdjust when true, remaining estimates are divided by SPI (capped to [0.5, 1.5]) so observed slippage carries forward.
 */
export function simulateSchedule(p: ProjectInputs, spi: number | null, trials: number, seed: number, spiAdjust = true): ScheduleResult {
  if (!Number.isInteger(trials) || trials < 1 || trials > 20000) throw new Error('trials must be 1–20000');
  const factor = spiAdjust && spi != null && spi > 0 ? 1 / Math.min(Math.max(spi, 0.5), 1.5) : 1;
  const rng = mulberry32(seed);
  const totals: number[] = [];
  for (let t = 0; t < trials; t += 1) {
    const remaining = triangular(rng, p.remainingOptimistic, p.remainingLikely, p.remainingPessimistic) * factor;
    totals.push(p.elapsedWeeks + remaining);
  }
  const sorted = totals.slice().sort((a, b) => a - b);
  const p80 = percentile(sorted, 0.8);
  return {
    totals,
    p10: percentile(sorted, 0.1), p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9),
    onTime: totals.filter((x) => x <= p.plannedWeeks).length / trials,
    contingencyP80: Math.max(0, p80 - p.plannedWeeks),
    deterministic: p.elapsedWeeks + p.remainingLikely * factor
  };
}
