import { describe, it, expect } from 'vitest';
import { importProjects, toCsv } from '../src/csv.ts';
import { sampleProjects } from '../src/portfolio.ts';
import { csvField, parseCsv } from '../src/csv-core.ts';

describe('project CSV', () => {
  it('round-trips the sample', () => {
    const back = importProjects(toCsv(sampleProjects()));
    expect(back.warnings).toEqual([]);
    expect(back.projects).toEqual(sampleProjects());
  });
  it('requires columns, validates rows, rejects duplicates', () => {
    expect(importProjects('id,name\n1,x\n').warnings[0]).toMatch(/Missing required/);
    const head = 'id,name,bac,planned_pct,actual_pct,actual_cost,planned_weeks,elapsed_weeks,remaining_optimistic,remaining_likely,remaining_pessimistic,strategic_weight';
    const r = importProjects([head, 'a,Good,100,0.5,0.5,50,10,5,2,4,6,3', 'a,Dup,100,0.5,0.5,50,10,5,2,4,6,3', 'b,Bad,0,2,0.5,50,10,5,6,4,2,9'].join('\n'));
    expect(r.projects.map((p) => p.id)).toEqual(['a']);
    expect(r.projects[0]!.owner).toBe('');
    expect(r.warnings).toHaveLength(2);
  });
});

describe('csv-core', () => {
  it('parses quotes, doubled quotes, newlines, CRLF, BOM; reports ragged/empty/unterminated', () => {
    expect(parseCsv('﻿A,B\r\n"x, ""y""","l1\nl2"\r\n').rows).toEqual([{ a: 'x, "y"', b: 'l1\nl2' }]);
    expect(parseCsv('a,b\n1\n').warnings[0]).toMatch(/Row 2/);
    expect(parseCsv('').warnings).toEqual(['File is empty.']);
    expect(parseCsv('a\n"x').warnings[0]).toMatch(/Unterminated/);
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField(null)).toBe('');
  });
});
