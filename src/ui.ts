/** DOM rendering — textContent and createElement only. */

import type { EvmMetrics, Health, ProjectInputs } from './evm.ts';
import { HEALTH_THRESHOLDS } from './evm.ts';
import type { PortfolioSummary } from './portfolio.ts';
import type { ScheduleResult } from './schedule.ts';

type Props = Record<string, string | number | boolean | null | undefined>;
export function el(tag: string, props: Props = {}, kids: Array<Node | string | null | undefined> = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}
export function clear(node: Element): void { while (node.firstChild) node.removeChild(node.firstChild); }

export const fmtUsd = (v: number | null): string => (v == null ? '—' : `$${Math.round(v).toLocaleString('en-US')}`);
export const fmtIdx = (v: number | null): string => (v == null ? '—' : v.toFixed(2));
export const fmtPct = (v: number, dp = 0): string => `${(v * 100).toFixed(dp)}%`;
const HEALTH_LABEL: Record<Health, string> = { green: 'Green', amber: 'Amber', red: 'Red' };

export function renderSummary(host: HTMLElement, s: PortfolioSummary): void {
  clear(host);
  const rows: Array<[string, string, string?]> = [
    ['Budget at completion', fmtUsd(s.bac)],
    ['Earned value', fmtUsd(s.ev), 'BAC × actual % complete'],
    ['Actual cost', fmtUsd(s.ac)],
    ['Portfolio CPI', fmtIdx(s.cpi), 'EV ÷ AC on totals'],
    ['Portfolio SPI', fmtIdx(s.spi), 'EV ÷ PV on totals'],
    ['Expected overspend', fmtUsd(s.exposure), 'sum of negative VAC'],
    ['Strategic weight on green', fmtPct(s.weightedGreen), 'weight-weighted share of projects that are green']
  ];
  for (const [k, v, note] of rows) host.append(el('div', { class: 'spr-kv' }, [el('dt', {}, [el('span', { text: k }), note ? el('span', { class: 'spr-note', text: note }) : null]), el('dd', { text: v })]));
}

export type Field = 'bac' | 'plannedPct' | 'actualPct' | 'actualCost' | 'plannedWeeks' | 'elapsedWeeks' | 'remainingOptimistic' | 'remainingLikely' | 'remainingPessimistic' | 'strategicWeight';

export function renderTable(host: HTMLElement, rows: Array<{ project: ProjectInputs; metrics: EvmMetrics; health: Health }>, selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Project', 'Owner', 'BAC', 'Planned %', 'Actual %', 'AC', 'CPI', 'SPI', 'EAC', 'VAC', 'Health'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const { project: p, metrics: m, health: h } of rows) {
    const tr = el('tr', { class: p.id === selectedId ? 'is-selected' : '', tabindex: '0', role: 'button', 'aria-pressed': String(p.id === selectedId), 'aria-label': `Select ${p.name}` }, [
      el('th', { scope: 'row', text: p.name }), el('td', { text: p.owner }), el('td', { text: fmtUsd(p.bac) }),
      el('td', { text: fmtPct(p.plannedPct) }), el('td', { text: fmtPct(p.actualPct) }), el('td', { text: fmtUsd(m.ac) }),
      el('td', { 'data-tone': m.cpi == null ? null : m.cpi < HEALTH_THRESHOLDS.red ? 'danger' : m.cpi < HEALTH_THRESHOLDS.amber ? 'warn' : 'ok', text: fmtIdx(m.cpi) }),
      el('td', { 'data-tone': m.spi == null ? null : m.spi < HEALTH_THRESHOLDS.red ? 'danger' : m.spi < HEALTH_THRESHOLDS.amber ? 'warn' : 'ok', text: fmtIdx(m.spi) }),
      el('td', { text: fmtUsd(m.eac) }), el('td', { 'data-tone': m.vac == null ? null : m.vac < 0 ? 'danger' : 'ok', text: fmtUsd(m.vac) }),
      el('td', {}, [el('span', { class: 'spr-chip', 'data-health': h, text: HEALTH_LABEL[h] })])
    ]);
    tr.addEventListener('click', () => onSelect(p.id));
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p.id); } });
    body.append(tr);
  }
  host.append(body);
}

/** Bubble chart: x = SPI, y = CPI, radius by BAC, colour by health; 1.0 lines drawn. */
export function renderRadar(host: HTMLElement, rows: Array<{ project: ProjectInputs; metrics: EvmMetrics; health: Health }>, selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  const ns = 'http://www.w3.org/2000/svg';
  const W = 520; const H = 340; const pad = 40;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'spr-radar'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Portfolio radar: schedule performance across, cost performance up, bubble size is budget; ${rows.length} projects`);
  const lo = 0.5; const hi = 1.3;
  const sx = (v: number): number => pad + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (W - 2 * pad);
  const sy = (v: number): number => H - pad - ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (H - 2 * pad);
  const line = (x1: number, y1: number, x2: number, y2: number, cls: string): void => { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1)); l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2)); l.setAttribute('class', cls); svg.append(l); };
  const text = (x: number, y: number, t: string, cls: string): void => { const e = document.createElementNS(ns, 'text'); e.setAttribute('x', String(x)); e.setAttribute('y', String(y)); e.setAttribute('class', cls); e.textContent = t; svg.append(e); };
  line(pad, H - pad, W - pad, H - pad, 'spr-axis'); line(pad, pad, pad, H - pad, 'spr-axis');
  line(sx(1), pad, sx(1), H - pad, 'spr-ref'); line(pad, sy(1), W - pad, sy(1), 'spr-ref');
  line(sx(HEALTH_THRESHOLDS.amber), pad, sx(HEALTH_THRESHOLDS.amber), H - pad, 'spr-thr'); line(pad, sy(HEALTH_THRESHOLDS.amber), W - pad, sy(HEALTH_THRESHOLDS.amber), 'spr-thr');
  line(sx(HEALTH_THRESHOLDS.red), pad, sx(HEALTH_THRESHOLDS.red), H - pad, 'spr-thr spr-thr--red'); line(pad, sy(HEALTH_THRESHOLDS.red), W - pad, sy(HEALTH_THRESHOLDS.red), 'spr-thr spr-thr--red');
  text(W / 2, H - 8, 'SPI →  (behind schedule ← 1.0 → ahead)', 'spr-axis-label'); text(12, H / 2, 'CPI ↑', 'spr-axis-label spr-axis-label--y');
  const maxBac = Math.max(1, ...rows.map((r) => r.project.bac));
  rows.forEach(({ project: p, metrics: m, health: h }, i) => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'spr-dot' + (p.id === selectedId ? ' is-selected' : '')); g.setAttribute('data-health', h);
    g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', `${p.name}: SPI ${fmtIdx(m.spi)}, CPI ${fmtIdx(m.cpi)}, ${HEALTH_LABEL[h]}`);
    const r = 8 + 16 * Math.sqrt(p.bac / maxBac);
    const cx = sx(m.spi ?? 1); const cy = sy(m.cpi ?? 1);
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(r));
    const t = document.createElementNS(ns, 'text');
    const right = cx < W * 0.6;
    t.setAttribute('x', String(cx + (right ? r + 4 : -(r + 4)))); t.setAttribute('y', String(cy + (i % 2 === 0 ? -r - 2 : r + 11)));
    t.setAttribute('text-anchor', right ? 'start' : 'end'); t.setAttribute('class', 'spr-dot__label'); t.textContent = p.name;
    g.append(c, t);
    g.addEventListener('click', () => onSelect(p.id));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(p.id); } });
    svg.append(g);
  });
  host.append(svg);
}

export function renderEditor(host: HTMLElement, p: ProjectInputs | null, m: EvmMetrics | null, onEdit: (field: Field, value: number) => void): void {
  clear(host);
  if (!p || !m) { host.append(el('p', { class: 'spr-muted', text: 'Select a project in the table or radar.' })); return; }
  host.append(el('p', { class: 'spr-selected', text: `${p.name} — ${p.owner}` }));
  const fields: Array<[Field, string, string, (v: number) => string, (v: string) => number]> = [
    ['bac', 'Budget at completion ($)', '1000', String, Number],
    ['plannedPct', 'Planned % complete', '1', (v) => String(Math.round(v * 100)), (v) => Number(v) / 100],
    ['actualPct', 'Actual % complete', '1', (v) => String(Math.round(v * 100)), (v) => Number(v) / 100],
    ['actualCost', 'Actual cost ($)', '1000', String, Number],
    ['plannedWeeks', 'Planned duration (weeks)', '1', String, Number],
    ['elapsedWeeks', 'Weeks elapsed', '1', String, Number],
    ['remainingOptimistic', 'Remaining — optimistic (weeks)', '1', String, Number],
    ['remainingLikely', 'Remaining — most likely (weeks)', '1', String, Number],
    ['remainingPessimistic', 'Remaining — pessimistic (weeks)', '1', String, Number],
    ['strategicWeight', 'Strategic weight (1–5)', '1', String, Number]
  ];
  const grid = el('div', { class: 'spr-fields' });
  for (const [field, label, step, show, parse] of fields) {
    const id = `f-${field}`;
    const input = el('input', { type: 'number', id, step, value: show(p[field]) }) as HTMLInputElement;
    input.addEventListener('change', () => onEdit(field, parse(input.value)));
    grid.append(el('label', { for: id }, [label, input]));
  }
  host.append(grid);
  const dl = el('dl', { class: 'spr-metrics' });
  const rows: Array<[string, string, string]> = [
    ['PV', fmtUsd(m.pv), 'BAC × planned %'], ['EV', fmtUsd(m.ev), 'BAC × actual %'], ['AC', fmtUsd(m.ac), 'spent to date'],
    ['CV', fmtUsd(m.cv), 'EV − AC'], ['SV', fmtUsd(m.sv), 'EV − PV'], ['CPI', fmtIdx(m.cpi), 'EV ÷ AC'], ['SPI', fmtIdx(m.spi), 'EV ÷ PV'],
    ['EAC', fmtUsd(m.eac), 'BAC ÷ CPI'], ['ETC', fmtUsd(m.etc), 'EAC − AC'], ['VAC', fmtUsd(m.vac), 'BAC − EAC'], ['TCPI', fmtIdx(m.tcpi), '(BAC − EV) ÷ (BAC − AC)'],
    ['Schedule variance', m.svWeeks == null ? '—' : `${m.svWeeks} weeks`, '(SPI − 1) × elapsed']
  ];
  for (const [k, v, note] of rows) dl.append(el('div', { class: 'spr-kv' }, [el('dt', {}, [el('span', { text: k }), el('span', { class: 'spr-note', text: note })]), el('dd', { text: v })]));
  host.append(dl);
}

export function renderSchedule(host: HTMLElement, chart: HTMLElement, r: ScheduleResult | null, p: ProjectInputs | null): void {
  clear(host); clear(chart);
  if (!r || !p) { host.append(el('p', { class: 'spr-muted', text: 'Select a project to simulate.' })); return; }
  const rows: Array<[string, string, string?]> = [
    ['Planned finish', `week ${p.plannedWeeks}`],
    ['Deterministic finish', `week ${r.deterministic.toFixed(1)}`, 'elapsed + most likely ÷ SPI'],
    ['P10 / P50 / P90 finish', `${r.p10.toFixed(1)} / ${r.p50.toFixed(1)} / ${r.p90.toFixed(1)}`, 'weeks'],
    ['Probability of finishing on plan', fmtPct(r.onTime, 1)],
    ['Contingency for 80% confidence', r.contingencyP80 > 0 ? `+${r.contingencyP80.toFixed(1)} weeks` : 'none needed']
  ];
  for (const [k, v, note] of rows) host.append(el('div', { class: 'spr-kv' }, [el('dt', {}, [el('span', { text: k }), note ? el('span', { class: 'spr-note', text: note }) : null]), el('dd', { text: v })]));
  // histogram
  const ns = 'http://www.w3.org/2000/svg';
  const W = 520; const H = 160; const pad = 28;
  const min = Math.floor(Math.min(...r.totals)); const max = Math.ceil(Math.max(...r.totals));
  const bins = Math.max(1, Math.min(40, max - min));
  const counts = new Array<number>(bins).fill(0);
  for (const t of r.totals) { const i = Math.min(bins - 1, Math.floor(((t - min) / Math.max(1e-9, max - min)) * bins)); counts[i] = (counts[i] ?? 0) + 1; }
  const peak = Math.max(1, ...counts);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'spr-hist'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Distribution of finish week over ${r.totals.length} trials, from week ${min} to ${max}; planned finish week ${p.plannedWeeks}`);
  const bw = (W - 2 * pad) / bins;
  counts.forEach((c, i) => {
    const rect = document.createElementNS(ns, 'rect');
    const x = pad + i * bw; const h = (c / peak) * (H - 2 * pad);
    rect.setAttribute('x', String(x)); rect.setAttribute('y', String(H - pad - h)); rect.setAttribute('width', String(Math.max(1, bw - 1))); rect.setAttribute('height', String(h));
    const week = min + (i + 0.5) * ((max - min) / bins);
    rect.setAttribute('class', week <= p.plannedWeeks ? 'spr-bin spr-bin--ok' : 'spr-bin spr-bin--late');
    svg.append(rect);
  });
  const px = pad + ((p.plannedWeeks - min) / Math.max(1e-9, max - min)) * (W - 2 * pad);
  if (px >= pad && px <= W - pad) { const l = document.createElementNS(ns, 'line'); l.setAttribute('x1', String(px)); l.setAttribute('x2', String(px)); l.setAttribute('y1', String(pad)); l.setAttribute('y2', String(H - pad)); l.setAttribute('class', 'spr-plan'); svg.append(l); }
  const lab = (x: number, t: string, cls: string): void => { const e = document.createElementNS(ns, 'text'); e.setAttribute('x', String(x)); e.setAttribute('y', String(H - pad + 14)); e.setAttribute('class', cls); e.textContent = t; svg.append(e); };
  lab(pad, `week ${min}`, 'spr-tick'); lab(W - pad, `week ${max}`, 'spr-tick spr-tick--r');
  chart.append(svg);
}
