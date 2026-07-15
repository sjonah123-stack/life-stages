import { describe, it, expect } from 'vitest';
import {
  normalizeAiMilestones, normalizeInsight, normalizePrompts,
  milestonePrompt, journalInsightPrompt,
  weeklyReflectionPrompt, normalizeWeeklyReflection,
  budgetCoachPrompt, normalizeBudgetAdvice,
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
    const p = milestonePrompt({ stage: 'Building', currentAge: 23 });
    expect(p).toContain('Building');
    expect(p).toContain('23');
  });
  it('milestonePrompt folds in personal context (role, aspiration, weakest wealth)', () => {
    const p = milestonePrompt({
      stage: 'Building',
      currentAge: 30,
      role: 'real estate investor',
      aspiration: 'a portfolio that funds my family',
      weakestWealth: 'Physical Wealth',
      priorities: ['health', 'money'],
    });
    expect(p).toContain('real estate investor');
    expect(p).toContain('a portfolio that funds my family');
    expect(p).toContain('Physical Wealth');
    expect(p).toContain('health, money');
  });
  it('milestonePrompt tells the model not to repeat existing goals', () => {
    const p = milestonePrompt({
      stage: 'Building',
      currentAge: 30,
      existingMilestones: ['Run a marathon'],
    });
    expect(p).toContain('Run a marathon');
    expect(p).toMatch(/do NOT repeat/i);
  });

  it('normalizeAiMilestones keeps a valid wealthKey and drops an invalid one', () => {
    const ok = normalizeAiMilestones([{ label: 'a', age: 40, wealthKey: 'physical' }], 23);
    expect(ok[0].wealthKey).toBe('physical');
    const bad = normalizeAiMilestones([{ label: 'b', age: 40, wealthKey: 'nonsense' }], 23);
    expect(bad[0].wealthKey).toBeUndefined();
  });
  it('journalInsightPrompt includes the entries and caps to the last 30', () => {
    const entries = Array.from({ length: 40 }, (_, i) => `entry ${i}`);
    const p = journalInsightPrompt(entries);
    expect(p).toContain('entry 39');
    expect(p).not.toContain('entry 5:'); // entry 0-9 trimmed out (only last 30 kept)
  });
  it('weeklyReflectionPrompt includes habit count, stage, and recent entries', () => {
    const p = weeklyReflectionPrompt({
      stage: 'Building',
      recentEntries: ['felt stretched at work', 'good run on saturday'],
      habitCheckins: 4,
      weakestWealth: 'Social Wealth',
    });
    expect(p).toContain('Building');
    expect(p).toContain('4 habit');
    expect(p).toContain('Social Wealth');
    expect(p).toContain('good run on saturday');
  });
  it('weeklyReflectionPrompt handles an empty week without crashing', () => {
    const p = weeklyReflectionPrompt({ stage: 'Building', recentEntries: [], habitCheckins: 0 });
    expect(p).toContain('not journaled recently');
  });
});

describe('normalizeWeeklyReflection', () => {
  it('trims fields and keeps a valid wealthKey', () => {
    const out = normalizeWeeklyReflection({
      reflection: '  steady week  ',
      focus: '  call a friend  ',
      wealthKey: 'social',
    });
    expect(out).toEqual({ reflection: 'steady week', focus: 'call a friend', wealthKey: 'social' });
  });
  it('drops an invalid wealthKey and tolerates garbage', () => {
    expect(normalizeWeeklyReflection({ reflection: 'x', focus: 'y', wealthKey: 'bogus' }))
      .toEqual({ reflection: 'x', focus: 'y' });
    expect(normalizeWeeklyReflection(null)).toEqual({ reflection: '', focus: '' });
  });
});

describe('budgetCoachPrompt', () => {
  it('includes month summaries, plan, and savings goal', () => {
    const p = budgetCoachPrompt({
      months: [
        {
          month: '2026-06',
          income: 3200,
          expenses: 2100,
          categories: [{ category: 'Housing', total: 1200 }],
        },
      ],
      expectedIncome: 3200,
      budget: [{ category: 'Food', amount: 500 }],
      savingsGoal: { label: 'Emergency fund', target: 10000, saved: 800 },
    });
    expect(p).toContain('Month 2026-06: income $3200, spent $2100 (Housing $1200)');
    expect(p).toContain('$3200 of income per month');
    expect(p).toContain('Food $500');
    expect(p).toContain('"Emergency fund" ($800 of $10000');
    expect(p).toContain('never invent amounts');
  });
});

describe('normalizeBudgetAdvice', () => {
  it('trims and caps well-formed advice', () => {
    const out = normalizeBudgetAdvice({
      observations: ['  a  ', 'b', 'c', 'd'],
      recommendations: [
        { category: ' Food ', advice: ' cook twice a week ' },
        { category: '', advice: 'dropped — no category' },
        { category: 'NoAdvice' },
      ],
      suggestedPlan: [
        { category: 'Housing', amount: 1200.6 },
        { category: 'Bad', amount: -5 },
        { category: '', amount: 100 },
      ],
    });
    expect(out.observations).toEqual(['a', 'b', 'c']); // capped at 3
    expect(out.recommendations).toEqual([{ category: 'Food', advice: 'cook twice a week' }]);
    expect(out.suggestedPlan).toEqual([{ category: 'Housing', amount: 1201 }]);
  });

  it('degrades garbage to empty advice', () => {
    expect(normalizeBudgetAdvice(null)).toEqual({
      observations: [],
      recommendations: [],
      suggestedPlan: [],
    });
    expect(normalizeBudgetAdvice({ observations: 'x', recommendations: 3, suggestedPlan: {} }))
      .toEqual({ observations: [], recommendations: [], suggestedPlan: [] });
  });
});
