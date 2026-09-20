/**
 * Earned-value management — the standard PMI arithmetic, stated so it can
 * be checked:
 *   PV  planned value    = budget at completion × planned % complete
 *   EV  earned value     = budget at completion × actual % complete
 *   AC  actual cost
 *   CV  = EV − AC     SV  = EV − PV
 *   CPI = EV ÷ AC     SPI = EV ÷ PV
 *   EAC = BAC ÷ CPI   (assumes current cost performance continues)
 *   ETC = EAC − AC    VAC = BAC − EAC
 *   TCPI = (BAC − EV) ÷ (BAC − AC)   efficiency needed to finish on budget
 */

export interface ProjectInputs {
  id: string;
  name: string;
  owner: string;
  /** Budget at completion. */
  bac: number;
  /** Planned fraction complete at the status date, 0–1. */
  plannedPct: number;
  /** Actual fraction complete at the status date, 0–1. */
  actualPct: number;
  actualCost: number;
  /** Planned duration in weeks and weeks elapsed at the status date. */
  plannedWeeks: number;
  elapsedWeeks: number;
  /** Remaining-work estimate for the schedule simulation: most likely, optimistic, pessimistic weeks. */
  remainingLikely: number;
  remainingOptimistic: number;
  remainingPessimistic: number;
  /** Strategic weight 1–5 for the portfolio view. */
  strategicWeight: number;
}

export interface EvmMetrics {
  pv: number; ev: number; ac: number;
  cv: number; sv: number;
  cpi: number | null; spi: number | null;
  eac: number | null; etc: number | null; vac: number | null; tcpi: number | null;
  /** Schedule variance expressed in weeks: (SPI − 1) × elapsed. */
  svWeeks: number | null;
}

const r2 = (v: number): number => Number(v.toFixed(2));

export function evm(p: ProjectInputs): EvmMetrics {
  const pv = p.bac * p.plannedPct;
  const ev = p.bac * p.actualPct;
  const ac = p.actualCost;
  const cpi = ac > 0 ? ev / ac : null;
  const spi = pv > 0 ? ev / pv : null;
  const eac = cpi != null && cpi > 0 ? p.bac / cpi : null;
  return {
    pv: r2(pv), ev: r2(ev), ac,
    cv: r2(ev - ac), sv: r2(ev - pv),
    cpi: cpi == null ? null : r2(cpi), spi: spi == null ? null : r2(spi),
    eac: eac == null ? null : r2(eac),
    etc: eac == null ? null : r2(eac - ac),
    vac: eac == null ? null : r2(p.bac - eac),
    tcpi: p.bac - ac > 0 ? r2((p.bac - ev) / (p.bac - ac)) : null,
    svWeeks: spi == null ? null : r2((spi - 1) * p.elapsedWeeks)
  };
}

export type Health = 'green' | 'amber' | 'red';

export const HEALTH_THRESHOLDS = { amber: 0.95, red: 0.85 } as const;

/** Health from the worse of CPI and SPI, at explicit thresholds. */
export function health(m: EvmMetrics): Health {
  const worst = Math.min(m.cpi ?? 1, m.spi ?? 1);
  if (worst < HEALTH_THRESHOLDS.red) return 'red';
  if (worst < HEALTH_THRESHOLDS.amber) return 'amber';
  return 'green';
}

export function validateProject(p: ProjectInputs): string[] {
  const out: string[] = [];
  if (!p.name.trim()) out.push('name is required');
  if (!(p.bac > 0)) out.push('bac must be positive');
  for (const k of ['plannedPct', 'actualPct'] as const) if (!(p[k] >= 0 && p[k] <= 1)) out.push(`${k} must be 0–1`);
  if (!(p.actualCost >= 0)) out.push('actualCost must be non-negative');
  if (!(p.plannedWeeks > 0)) out.push('plannedWeeks must be positive');
  if (!(p.elapsedWeeks >= 0)) out.push('elapsedWeeks must be non-negative');
  if (!(p.remainingOptimistic >= 0 && p.remainingLikely >= p.remainingOptimistic && p.remainingPessimistic >= p.remainingLikely)) out.push('remaining estimates must satisfy optimistic ≤ likely ≤ pessimistic, all non-negative');
  if (!Number.isInteger(p.strategicWeight) || p.strategicWeight < 1 || p.strategicWeight > 5) out.push('strategicWeight must be an integer 1–5');
  return out;
}
