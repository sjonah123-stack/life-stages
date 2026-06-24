import { describe, it, expect } from 'vitest';
import {
  normalizeAiMilestones, normalizeInsight, normalizePrompts,
  milestonePrompt, journalInsightPrompt,
} from './ai';

describe('normalizeAiMilestones', () => {
  it('keeps well-formed milestones and stamps completed:false', () => {
    const out = normalizeAiMilestones(
      [{ label: 'Run a marathon', measure: '26.2 mi', age: 30, why: 'discipline' }], 23,
    );
    expect(out).toEqual([
      { age: 30, label: 'Run a marathon', completed: false, measure: '26.2 mi', why: 'discipline' },
    ]);
  });

  it('clamps age to (currentAge, LIFESPAN] and rounds', () => {
    expect(normalizeAiMilestones([{ label: 'a', age: 5 }], 23)[0].age).toBe(24); // below floor
    expect(normalizeAiMilestones([{ label: 'b', age: 200 }], 23)[0].age).toBe(90); // above cap
    expect(normalizeAiMilestones([{ label: 'c', age: 40.6 }], 23)[0].age).toBe(41); // rounded
  });

  it('drops entries without a label and caps at 3', () => {
    const raw = [
      { label: '', age: 30 },
      { label: 'one', age: 30 }, { label: 'two', age: 31 },
      { label: 'three', age: 32 }, { label: 'four', age: 33 },
    ];
    const out = normalizeAiMilestones(raw, 23);
    expect(out.map((m) => m.label)).toEqual(['one', 'two', 'three']);
  });

  it('returns [] for non-array / garbage input', () => {
    expect(normalizeAiMilestones(null, 23)).toEqual([]);
    expect(normalizeAiMilestones('nope', 23)).toEqual([]);
  });
});

describe('normalizeInsight', () => {
  it('keeps up to 4 string themes and a trimmed reflection', () => {
    const out = normalizeInsight({ themes: ['a', 'b', 'c', 'd', 'e', 7], reflection: '  hi  ' });
    expect(out.themes).toEqual(['a', 'b', 'c', 'd']);
    expect(out.reflection).toBe('hi');
  });
  it('tolerates missing/garbage fields', () => {
    expect(normalizeInsight(null)).toEqual({ themes: [], reflection: '' });
    expect(normalizeInsight({ themes: 'x' })).toEqual({ themes: [], reflection: '' });
  });
});

describe('normalizePrompts', () => {
  it('keeps up to 3 non-empty trimmed strings', () => {
    expect(normalizePrompts(['  a ', '', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
    expect(normalizePrompts('nope')).toEqual([]);
  });
});

describe('prompt builders', () => {
  it('milestonePrompt names the stage, age, and bounds', () => {
    const p = milestonePrompt('Building', 23);
    expect(p).toContain('Building');
    expect(p).toContain('23');
  });
  it('journalInsightPrompt includes the entries and caps to the last 30', () => {
    const entries = Array.from({ length: 40 }, (_, i) => `entry ${i}`);
    const p = journalInsightPrompt(entries);
    expect(p).toContain('entry 39');
    expect(p).not.toContain('entry 5:'); // entry 0-9 trimmed out (only last 30 kept)
  });
});
