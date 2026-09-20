import { describe, it, expect } from 'vitest';
import { evm, health, HEALTH_THRESHOLDS, validateProject, type ProjectInputs } from '../src/evm.ts';
import { sampleProjects } from '../src/portfolio.ts';

const base: ProjectInputs = { id: 'x', name: 'X', owner: 'o', bac: 100_000, plannedPct: 0.5, actualPct: 0.4, actualCost: 50_000, plannedWeeks: 20, elapsedWeeks: 10, remainingLikely: 10, remainingOptimistic: 8, remainingPessimistic: 15, strategicWeight: 3 };

describe('evm', () => {
  it('matches the PMI formulas on a textbook case', () => {
    const m = evm(base);
    expect(m.pv).toBe(50_000);
    expect(m.ev).toBe(40_000);
    expect(m.cv).toBe(-10_000);
    expect(m.sv).toBe(-10_000);
    expect(m.cpi).toBe(0.8);
    expect(m.spi).toBe(0.8);
    expect(m.eac).toBe(125_000);
    expect(m.etc).toBe(75_000);
    expect(m.vac).toBe(-25_000);
    expect(m.tcpi).toBe(1.2);           // (100k − 40k) / (100k − 50k)
    expect(m.svWeeks).toBe(-2);          // (0.8 − 1) × 10
  });
  it('handles zero cost, zero planned value and exhausted budget without dividing by zero', () => {
    const m = evm({ ...base, actualCost: 0, plannedPct: 0 });
    expect(m.cpi).toBeNull(); expect(m.spi).toBeNull(); expect(m.eac).toBeNull(); expect(m.svWeeks).toBeNull();
    expect(evm({ ...base, actualCost: 100_000 }).tcpi).toBeNull();
  });
});

describe('health', () => {
  it('bands on the worse of CPI and SPI at explicit thresholds', () => {
    expect(health(evm({ ...base, actualPct: 0.5 }))).toBe('green');                 // 1.0 / 1.0
    expect(health(evm({ ...base, actualPct: 0.47 }))).toBe('amber');                // 0.94
    expect(health(evm({ ...base, actualPct: 0.42 }))).toBe('red');                  // 0.84
    expect(health(evm({ ...base, actualPct: 0.5, actualCost: 52_000 }))).toBe('green');   // CPI 0.96 stays green
    expect(health(evm({ ...base, actualPct: 0.5, actualCost: 54_000 }))).toBe('amber');   // CPI 0.93
  });
  it('threshold constants are what the UI states', () => {
    expect(HEALTH_THRESHOLDS).toEqual({ amber: 0.95, red: 0.85 });
  });
});

describe('validateProject', () => {
  it('accepts the sample and reports every problem', () => {
    for (const p of sampleProjects()) expect(validateProject(p)).toEqual([]);
    const bad = validateProject({ ...base, name: '', bac: 0, plannedPct: 1.2, actualCost: -1, plannedWeeks: 0, remainingLikely: 5, remainingOptimistic: 6, strategicWeight: 7 });
    expect(bad).toHaveLength(7);
  });
});
