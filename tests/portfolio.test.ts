import { describe, it, expect } from 'vitest';
import { metricsFor, sampleProjects, summarize } from '../src/portfolio.ts';
import { evm } from '../src/evm.ts';

describe('summarize', () => {
  it('rolls up on totals, counts health bands and sums negative VAC as exposure', () => {
    const ps = sampleProjects();
    const s = summarize(ps);
    expect(s.projects).toBe(6);
    expect(s.bac).toBe(ps.reduce((a, p) => a + p.bac, 0));
    const ev = ps.reduce((a, p) => a + evm(p).ev, 0);
    const ac = ps.reduce((a, p) => a + p.actualCost, 0);
    expect(s.cpi).toBe(Number((ev / ac).toFixed(2)));
    expect(s.counts.green + s.counts.amber + s.counts.red).toBe(6);
    const negVac = ps.map((p) => evm(p).vac ?? 0).filter((v) => v < 0).reduce((a, v) => a - v, 0);
    expect(s.exposure).toBeCloseTo(negVac, 2);
    expect(s.weightedGreen).toBeGreaterThanOrEqual(0);
    expect(s.weightedGreen).toBeLessThanOrEqual(1);
  });
  it('the sample has the expected bands', () => {
    const bands = Object.fromEntries(metricsFor(sampleProjects()).map((m) => [m.project.id, m.health]));
    expect(bands['p1']).toBe('red');    // SPI 0.75
    expect(bands['p2']).toBe('green');  // CPI 1.18, SPI 1.1
    expect(bands['p5']).toBe('red');    // CPI 0.58
    expect(bands['p6']).toBe('green');
  });
  it('empty portfolio', () => {
    const s = summarize([]);
    expect(s.cpi).toBeNull();
    expect(s.weightedGreen).toBe(0);
  });
});
