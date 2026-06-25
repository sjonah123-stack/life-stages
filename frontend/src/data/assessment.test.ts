// Tests for computeSelfScores — the count-driven normalization. This replaced
// a hardcoded /15 (3 questions × 5); these pin the behavior so adding or
// removing survey questions can't silently skew the 0-100 scores.
import { describe, expect, it } from 'vitest';
import { computeSelfScores, SURVEY } from './assessment';

describe('computeSelfScores', () => {
  it('returns 100 for a wealth when every answer is a 5', () => {
    const answers = SURVEY.filter((q) => q.wealth === 'time').map((q) => ({
      questionId: q.id,
      value: 5,
    }));
    expect(computeSelfScores(answers).time).toBe(100);
  });

  it('returns 20 for a wealth when every answer is a 1', () => {
    const answers = SURVEY.filter((q) => q.wealth === 'financial').map((q) => ({
      questionId: q.id,
      value: 1,
    }));
    // 1 of 5 on the Likert = 20%.
    expect(computeSelfScores(answers).financial).toBe(20);
  });

  it('normalizes by the actual answered count, not a fixed denominator', () => {
    // Two 'time' questions answered at 4 → (8 / (2*5)) * 100 = 80.
    const answers = [
      { questionId: 'time-1', value: 4 },
      { questionId: 'time-2', value: 4 },
    ];
    expect(computeSelfScores(answers).time).toBe(80);
  });

  it('leaves unanswered wealths at 0', () => {
    const scores = computeSelfScores([{ questionId: 'time-1', value: 5 }]);
    expect(scores.social).toBe(0);
    expect(scores.financial).toBe(0);
  });

  it('ignores answers for unknown question ids', () => {
    const scores = computeSelfScores([
      { questionId: 'time-1', value: 5 },
      { questionId: 'not-a-real-id', value: 5 },
    ]);
    // Only the one valid 'time' answer counts: (5 / (1*5)) * 100 = 100.
    expect(scores.time).toBe(100);
  });
});
