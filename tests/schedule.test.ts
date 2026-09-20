import { describe, it, expect } from 'vitest';
import { mulberry32, percentile, simulateSchedule, triangular } from '../src/schedule.ts';
import { sampleProjects } from '../src/portfolio.ts';

const p = sampleProjects()[0]!;

describe('triangular', () => {
  it('stays within bounds and has the right mean', () => {
    const rng = mulberry32(3);
    const xs = Array.from({ length: 20000 }, () => triangular(rng, 10, 14, 30));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...xs)).toBeLessThanOrEqual(30);
    const mean = xs.reduce((a, x) => a + x, 0) / xs.length;
    expect(Math.abs(mean - (10 + 14 + 30) / 3)).toBeLessThan(0.15);
  });
  it('degenerates to the point when bounds coincide', () => {
    expect(triangular(mulberry32(1), 5, 5, 5)).toBe(5);
  });
  it('percentile interpolates and handles empty', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe('simulateSchedule', () => {
  it('is reproducible and ordered', () => {
    const a = simulateSchedule(p, 0.75, 500, 42);
    const b = simulateSchedule(p, 0.75, 500, 42);
    expect(a.totals).toEqual(b.totals);
    expect(a.p10).toBeLessThanOrEqual(a.p50);
    expect(a.p50).toBeLessThanOrEqual(a.p90);
  });
  it('SPI adjustment stretches a slipping project and is capped', () => {
    const noAdj = simulateSchedule(p, 0.75, 500, 1, false);
    const adj = simulateSchedule(p, 0.75, 500, 1, true);
    expect(adj.p50).toBeGreaterThan(noAdj.p50);
    expect(adj.deterministic).toBeCloseTo(p.elapsedWeeks + p.remainingLikely / 0.75, 6);
    const capped = simulateSchedule(p, 0.1, 10, 1, true);
    expect(capped.deterministic).toBeCloseTo(p.elapsedWeeks + p.remainingLikely / 0.5, 6);
    expect(simulateSchedule(p, null, 10, 1).deterministic).toBe(p.elapsedWeeks + p.remainingLikely);
  });
  it('reports on-time probability and P80 contingency consistently', () => {
    const r = simulateSchedule(p, 0.75, 2000, 7);
    expect(r.onTime).toBeGreaterThanOrEqual(0);
    expect(r.onTime).toBeLessThanOrEqual(1);
    const early = simulateSchedule({ ...p, plannedWeeks: 1000 }, 1, 200, 7);
    expect(early.onTime).toBe(1);
    expect(early.contingencyP80).toBe(0);
  });
  it('rejects bad trial counts', () => {
    expect(() => simulateSchedule(p, 1, 0, 1)).toThrow();
  });
});
