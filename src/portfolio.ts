/** Portfolio roll-up: weighted health, exposure, and the sample projects. */

import { evm, health, type EvmMetrics, type Health, type ProjectInputs } from './evm.ts';

export interface PortfolioSummary {
  projects: number;
  bac: number;
  ev: number;
  ac: number;
  /** Portfolio CPI and SPI on totals, not averages. */
  cpi: number | null;
  spi: number | null;
  counts: Record<Health, number>;
  /** Sum of VAC over projects where it is negative — expected overspend. */
  exposure: number;
  /** Strategic-weight-weighted share of projects that are green. */
  weightedGreen: number;
}

export function summarize(projects: ProjectInputs[]): PortfolioSummary {
  const counts: Record<Health, number> = { green: 0, amber: 0, red: 0 };
  let bac = 0; let ev = 0; let ac = 0; let pv = 0; let exposure = 0; let w = 0; let wg = 0;
  for (const p of projects) {
    const m = evm(p);
    const h = health(m);
    counts[h] += 1;
    bac += p.bac; ev += m.ev; ac += m.ac; pv += m.pv;
    if (m.vac != null && m.vac < 0) exposure += -m.vac;
    w += p.strategicWeight;
    if (h === 'green') wg += p.strategicWeight;
  }
  return {
    projects: projects.length, bac, ev, ac,
    cpi: ac > 0 ? Number((ev / ac).toFixed(2)) : null,
    spi: pv > 0 ? Number((ev / pv).toFixed(2)) : null,
    counts, exposure: Number(exposure.toFixed(2)), weightedGreen: w > 0 ? wg / w : 0
  };
}

export function metricsFor(projects: ProjectInputs[]): Array<{ project: ProjectInputs; metrics: EvmMetrics; health: Health }> {
  return projects.map((project) => { const metrics = evm(project); return { project, metrics, health: health(metrics) }; });
}

export const SAMPLE_PROJECTS: ProjectInputs[] = [
  { id: 'p1', name: 'LMS migration', owner: 'S. Patel', bac: 420_000, plannedPct: 0.6, actualPct: 0.45, actualCost: 236_000, plannedWeeks: 40, elapsedWeeks: 24, remainingLikely: 18, remainingOptimistic: 14, remainingPessimistic: 30, strategicWeight: 5 },
  { id: 'p2', name: 'Career-readiness credential launch', owner: 'F. Logan', bac: 150_000, plannedPct: 0.5, actualPct: 0.55, actualCost: 70_000, plannedWeeks: 26, elapsedWeeks: 13, remainingLikely: 11, remainingOptimistic: 9, remainingPessimistic: 16, strategicWeight: 5 },
  { id: 'p3', name: 'Data warehouse consolidation', owner: 'M. Chen', bac: 600_000, plannedPct: 0.35, actualPct: 0.3, actualCost: 225_000, plannedWeeks: 52, elapsedWeeks: 18, remainingLikely: 36, remainingOptimistic: 30, remainingPessimistic: 50, strategicWeight: 4 },
  { id: 'p4', name: 'Campus Wi-Fi refresh', owner: 'A. Rivera', bac: 280_000, plannedPct: 0.8, actualPct: 0.78, actualCost: 210_000, plannedWeeks: 20, elapsedWeeks: 16, remainingLikely: 4, remainingOptimistic: 3, remainingPessimistic: 7, strategicWeight: 2 },
  { id: 'p5', name: 'Student portal accessibility remediation', owner: 'F. Logan', bac: 95_000, plannedPct: 0.7, actualPct: 0.5, actualCost: 82_000, plannedWeeks: 16, elapsedWeeks: 11, remainingLikely: 8, remainingOptimistic: 6, remainingPessimistic: 14, strategicWeight: 4 },
  { id: 'p6', name: 'Research computing cluster', owner: 'M. Chen', bac: 750_000, plannedPct: 0.25, actualPct: 0.25, actualCost: 180_000, plannedWeeks: 60, elapsedWeeks: 15, remainingLikely: 45, remainingOptimistic: 40, remainingPessimistic: 60, strategicWeight: 3 }
];

export function sampleProjects(): ProjectInputs[] {
  return structuredClone(SAMPLE_PROJECTS);
}
