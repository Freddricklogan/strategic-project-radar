/** Project CSV import/export with row-level validation. */

import { csvField, parseCsv } from './csv-core.ts';
import { validateProject, type ProjectInputs } from './evm.ts';

export const COLUMNS = ['id', 'name', 'owner', 'bac', 'planned_pct', 'actual_pct', 'actual_cost', 'planned_weeks', 'elapsed_weeks', 'remaining_optimistic', 'remaining_likely', 'remaining_pessimistic', 'strategic_weight'] as const;

export function toCsv(projects: ProjectInputs[]): string {
  const lines = [COLUMNS.join(',')];
  for (const p of projects) {
    lines.push([p.id, p.name, p.owner, p.bac, p.plannedPct, p.actualPct, p.actualCost, p.plannedWeeks, p.elapsedWeeks, p.remainingOptimistic, p.remainingLikely, p.remainingPessimistic, p.strategicWeight].map(csvField).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function importProjects(text: string): { projects: ProjectInputs[]; warnings: string[] } {
  const { headers, rows, warnings } = parseCsv(text);
  const required = COLUMNS.filter((c) => c !== 'id' && c !== 'owner');
  const missing = required.filter((c) => !headers.includes(c));
  if (headers.length && missing.length) return { projects: [], warnings: [`Missing required column(s): ${missing.join(', ')}.`] };
  const projects: ProjectInputs[] = [];
  const seen = new Set<string>();
  rows.forEach((r, idx) => {
    const n = (k: string): number => Number(r[k]);
    const p: ProjectInputs = {
      id: (r['id'] ?? '').trim().slice(0, 40) || `row-${idx + 1}`,
      name: (r['name'] ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
      owner: (r['owner'] ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
      bac: n('bac'), plannedPct: n('planned_pct'), actualPct: n('actual_pct'), actualCost: n('actual_cost'),
      plannedWeeks: n('planned_weeks'), elapsedWeeks: n('elapsed_weeks'),
      remainingOptimistic: n('remaining_optimistic'), remainingLikely: n('remaining_likely'), remainingPessimistic: n('remaining_pessimistic'),
      strategicWeight: n('strategic_weight')
    };
    const problems = validateProject(p);
    if (seen.has(p.id)) problems.push(`duplicate id "${p.id}"`);
    if (problems.length) { warnings.push(`Row ${idx + 2}: ${problems.join('; ')}; skipped.`); return; }
    seen.add(p.id);
    projects.push(p);
  });
  return { projects, warnings };
}
