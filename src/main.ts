/** Entry point: working portfolio, selection, schedule simulation, CSV, shell. */

import './shell/exec-shell.css';
import './app.css';
import { mountExecShell } from './shell/exec-shell.js';
import { evm, validateProject, type ProjectInputs } from './evm.ts';
import { metricsFor, sampleProjects, summarize } from './portfolio.ts';
import { simulateSchedule, type ScheduleResult } from './schedule.ts';
import { importProjects, toCsv } from './csv.ts';
import { fmtPct, renderEditor, renderRadar, renderSchedule, renderSummary, renderTable, type Field } from './ui.ts';

const REPO = 'https://github.com/Freddricklogan/strategic-project-radar';
const PAGES = 'https://freddricklogan.github.io/strategic-project-radar/';
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => { const n = document.getElementById(id); if (!n) throw new Error(`Missing #${id}`); return n as T; };

const state: { projects: ProjectInputs[]; selectedId: string | null; trials: number; seed: number; spiAdjust: boolean; schedule: ScheduleResult | null } = { projects: sampleProjects(), selectedId: 'p1', trials: 2000, seed: 42, spiAdjust: true, schedule: null };

function setStatus(text: string, tone: 'ok' | 'warn' | 'danger' | 'muted' = 'muted'): void { const s = $('status'); s.textContent = text; s.dataset['tone'] = tone; }

function selected(): ProjectInputs | null { return state.projects.find((p) => p.id === state.selectedId) ?? null; }

function runSchedule(): void {
  const p = selected();
  if (!p) { state.schedule = null; renderSchedule($('schedule'), $('schedule-chart'), null, null); return; }
  state.schedule = simulateSchedule(p, evm(p).spi, state.trials, state.seed, state.spiAdjust);
  renderSchedule($('schedule'), $('schedule-chart'), state.schedule, p);
}

function render(): void {
  const rows = metricsFor(state.projects);
  renderSummary($('summary'), summarize(state.projects));
  renderTable($('table'), rows, state.selectedId, select);
  renderRadar($('radar'), rows, state.selectedId, select);
  const p = selected();
  renderEditor($('editor'), p, p ? evm(p) : null, edit);
  runSchedule();
  shell.refreshKpis();
}

function select(id: string): void { state.selectedId = id; render(); }

function edit(field: Field, value: number): void {
  const p = selected();
  if (!p) return;
  const next = { ...p, [field]: value };
  const problems = validateProject(next);
  if (problems.length) { setStatus(`Change rejected: ${problems[0]}.`, 'danger'); render(); return; }
  state.projects = state.projects.map((x) => (x.id === p.id ? next : x));
  setStatus(`${p.name}: ${field} updated; EVM and schedule recomputed.`, 'ok');
  render();
}

$('trials').addEventListener('change', (e) => { const v = Number((e.target as HTMLInputElement).value); if (Number.isInteger(v) && v >= 1 && v <= 20000) { state.trials = v; runSchedule(); } });
$('seed').addEventListener('change', (e) => { state.seed = Number((e.target as HTMLInputElement).value); runSchedule(); });
$<HTMLInputElement>('spi-adjust').addEventListener('change', (e) => { state.spiAdjust = (e.target as HTMLInputElement).checked; runSchedule(); });

function download(filename: string, body: string): void { const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
$('export-csv').addEventListener('click', () => download('projects.csv', toCsv(state.projects)));
$('import-csv').addEventListener('click', () => $<HTMLInputElement>('file-csv').click());
$<HTMLInputElement>('file-csv').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
  if (!file) return;
  file.text().then((text) => {
    const { projects, warnings } = importProjects(text);
    if (!projects.length) { setStatus(`Import failed: ${warnings[0] ?? 'no valid rows.'}`, 'danger'); return; }
    state.projects = projects; state.selectedId = projects[0]?.id ?? null;
    setStatus(warnings.length ? `Imported ${projects.length} projects with ${warnings.length} warning(s): ${warnings[0]}` : `Imported ${projects.length} projects.`, warnings.length ? 'warn' : 'ok');
    render();
  }).catch(() => setStatus('Import failed: could not read the file.', 'danger'));
});
$('reset').addEventListener('click', () => { state.projects = sampleProjects(); state.selectedId = 'p1'; state.spiAdjust = true; $<HTMLInputElement>('spi-adjust').checked = true; setStatus('Sample portfolio restored.', 'ok'); render(); });

const shell = mountExecShell({
  title: 'Strategic Project Radar',
  tagline: 'Earned-value management across a project portfolio — PV, EV, CPI, SPI, EAC and TCPI from stated formulas — with a seeded Monte Carlo schedule-risk simulation from three-point estimates. Sample portfolio; illustrative.',
  repo: REPO, pagesUrl: PAGES,
  badges: [{ label: 'PMI earned-value formulas', tone: 'accent' }, { label: 'Seeded schedule risk', dot: true }, { label: 'Client-side only', dot: true }],
  kpis: [
    { label: 'Projects', compute: () => state.projects.length, tone: 'accent' },
    { label: 'Portfolio CPI', compute: () => { const v = summarize(state.projects).cpi; return v == null ? '—' : v.toFixed(2); }, tone: 'ok' },
    { label: 'Portfolio SPI', compute: () => { const v = summarize(state.projects).spi; return v == null ? '—' : v.toFixed(2); }, tone: 'warn' },
    { label: 'Red', compute: () => summarize(state.projects).counts.red, tone: 'danger' },
    { label: 'Expected overspend', compute: () => `$${Math.round(summarize(state.projects).exposure / 1000)}k` }
  ],
  tour: [
    { selector: '#radar', title: 'The portfolio on one chart', body: 'Schedule performance across, cost performance up, bubble size is budget. Everything below the amber line is late or over; below the red line is both, badly. Three of six sample projects are red.', action: () => { $('reset').click(); } },
    { selector: '#editor', title: 'The formulas, not a colour', body: 'Every EVM figure is computed from four inputs — budget, planned %, actual %, actual cost — with the formula printed beside it. The LMS migration is 45% done against 60% planned: SPI 0.75, six weeks behind.', action: () => select('p1') },
    { selector: '#schedule', title: 'When will it really finish?', body: 'Two thousand seeded draws from the three-point remaining estimate, stretched by the observed SPI. The answer is a P10/P50/P90, the probability of the planned date, and the contingency for 80% confidence.', action: () => {} },
    { selector: '#f-actualPct', title: 'Recover the schedule', body: 'This moves the LMS migration to 58% complete. Watch CPI, SPI, EAC, the health band and the schedule distribution all recompute from that one input.', action: () => edit('actualPct', 0.58) },
    { selector: '#summary', title: 'The portfolio roll-up', body: 'Portfolio CPI and SPI are computed on totals, not averaged; expected overspend is the sum of negative variance at completion; strategic weight shows how much of what matters is green.', action: () => { $('reset').click(); } }
  ]
});

$<HTMLInputElement>('trials').value = String(state.trials); $<HTMLInputElement>('seed').value = String(state.seed);
render();
setStatus(`Sample portfolio loaded — six projects, ${fmtPct(summarize(state.projects).weightedGreen)} of strategic weight on green. Select a project to see its formulas.`);
