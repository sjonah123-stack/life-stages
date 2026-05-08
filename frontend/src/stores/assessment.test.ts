// Tests for the wealth-assessment store. The migration paths (v1
// single-result → v2 list, both LS-load and cloud-doc) are the most
// important — they only run once per session and silent failure means
// data loss for users.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  assessmentResults,
  latestAssessment,
  hasAssessment,
  submitAssessment,
  deleteAssessment,
  clearAllAssessments,
  toggleRecommendation,
  setFromCloud,
} from './assessment';
import type { AssessmentResult, SurveyAnswer } from '../types';

const sampleAnswers: SurveyAnswer[] = [
  { questionId: 'time-1', value: 4 },
  { questionId: 'time-2', value: 3 },
];

const sampleScores = { time: 70, social: 60, mental: 55, physical: 80, financial: 50 };

beforeEach(() => {
  // Reset the in-memory store between tests; LS is cleared by global setup.
  clearAllAssessments();
});

describe('submitAssessment', () => {
  it('adds a result with v=2, an id, and empty completedRecommendations', () => {
    const result = submitAssessment({
      takenAt: 1000,
      answers: sampleAnswers,
      selfScores: sampleScores,
    });

    expect(result.v).toBe(2);
    expect(result.id).toBeTruthy();
    expect(result.completedRecommendations).toEqual({});
    expect(result.takenAt).toBe(1000);
    expect(result.selfScores).toEqual(sampleScores);
  });

  it('prepends each new result so the list is newest first', () => {
    const a = submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    const b = submitAssessment({ takenAt: 2000, answers: [], selfScores: sampleScores });
    const list = get(assessmentResults);
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it('hasAssessment becomes true after the first submit', () => {
    expect(get(hasAssessment)).toBe(false);
    submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    expect(get(hasAssessment)).toBe(true);
  });

  it('latestAssessment tracks the newest result', () => {
    expect(get(latestAssessment)).toBeNull();
    const r1 = submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    expect(get(latestAssessment)?.id).toBe(r1.id);
    const r2 = submitAssessment({ takenAt: 2000, answers: [], selfScores: sampleScores });
    expect(get(latestAssessment)?.id).toBe(r2.id);
  });

  it('persists to LS under lifeStages.assessmentResults', () => {
    submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    const stored = JSON.parse(window.localStorage.getItem('lifeStages.assessmentResults')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].v).toBe(2);
  });
});

describe('deleteAssessment', () => {
  it('removes a result by id, leaving others intact', () => {
    const a = submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    const b = submitAssessment({ takenAt: 2000, answers: [], selfScores: sampleScores });

    deleteAssessment(a.id);

    const list = get(assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it('is a no-op for an unknown id', () => {
    submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    deleteAssessment('does-not-exist');
    expect(get(assessmentResults)).toHaveLength(1);
  });
});

describe('toggleRecommendation', () => {
  it('marks a rec as completed (stamps an ISO date)', () => {
    const r = submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    toggleRecommendation(r.id, 'time-set-dob');

    const updated = get(latestAssessment);
    expect(updated?.completedRecommendations['time-set-dob']).toMatch(
      /^\d{4}-\d{2}-\d{2}T/, // ISO 8601 prefix
    );
  });

  it('toggles back to uncompleted on a second call', () => {
    const r = submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    toggleRecommendation(r.id, 'time-set-dob');
    toggleRecommendation(r.id, 'time-set-dob');

    const updated = get(latestAssessment);
    expect(updated?.completedRecommendations['time-set-dob']).toBeUndefined();
  });

  it('only affects the specified result, not other saved ones', () => {
    const a = submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    const b = submitAssessment({ takenAt: 2000, answers: [], selfScores: sampleScores });

    toggleRecommendation(a.id, 'time-set-dob');

    const list = get(assessmentResults);
    const aAfter = list.find((r) => r.id === a.id)!;
    const bAfter = list.find((r) => r.id === b.id)!;
    expect(aAfter.completedRecommendations['time-set-dob']).toBeTruthy();
    expect(bAfter.completedRecommendations['time-set-dob']).toBeUndefined();
  });

  it('is a no-op for an unknown result id', () => {
    submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    toggleRecommendation('unknown-id', 'time-set-dob');
    expect(get(latestAssessment)?.completedRecommendations).toEqual({});
  });
});

describe('setFromCloud — v2 list', () => {
  it('replaces the local list with cloud.assessmentResults', () => {
    submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });

    const remote: AssessmentResult[] = [
      {
        v: 2,
        id: 'remote-1',
        takenAt: 5000,
        answers: [],
        selfScores: sampleScores,
        completedRecommendations: {},
      },
    ];
    setFromCloud({ assessmentResults: remote });

    const list = get(assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('remote-1');
  });

  it('drops malformed entries instead of corrupting the store', () => {
    setFromCloud({
      assessmentResults: [
        { /* missing required fields */ },
        {
          v: 2,
          id: 'good',
          takenAt: 1000,
          answers: [],
          selfScores: sampleScores,
          completedRecommendations: {},
        },
        null,
      ],
    });

    const list = get(assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('good');
  });

  it('sorts by takenAt newest-first regardless of input order', () => {
    setFromCloud({
      assessmentResults: [
        { v: 2, id: 'oldest', takenAt: 1000, answers: [], selfScores: sampleScores, completedRecommendations: {} },
        { v: 2, id: 'middle', takenAt: 2000, answers: [], selfScores: sampleScores, completedRecommendations: {} },
        { v: 2, id: 'newest', takenAt: 3000, answers: [], selfScores: sampleScores, completedRecommendations: {} },
      ],
    });

    const ids = get(assessmentResults).map((r) => r.id);
    expect(ids).toEqual(['newest', 'middle', 'oldest']);
  });

  it('coerces missing id to a fresh id', () => {
    setFromCloud({
      assessmentResults: [
        { v: 2, takenAt: 1000, answers: [], selfScores: sampleScores, completedRecommendations: {} },
      ],
    });
    const list = get(assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBeTruthy();
  });

  it('coerces missing completedRecommendations to {}', () => {
    setFromCloud({
      assessmentResults: [
        { v: 2, id: 'r1', takenAt: 1000, answers: [], selfScores: sampleScores },
      ],
    });
    expect(get(assessmentResults)[0].completedRecommendations).toEqual({});
  });
});

describe('setFromCloud — v1 legacy single-result fallback', () => {
  it('lifts a v1 single-result into the v2 list shape', () => {
    setFromCloud({
      assessmentResult: {
        v: 1,
        takenAt: 1000,
        answers: sampleAnswers,
        selfScores: sampleScores,
      },
    });

    const list = get(assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].v).toBe(2);
    expect(list[0].id).toBeTruthy();
    expect(list[0].completedRecommendations).toEqual({});
    expect(list[0].selfScores).toEqual(sampleScores);
  });

  it('prefers cloud.assessmentResults over the legacy field when both are present', () => {
    setFromCloud({
      assessmentResults: [
        { v: 2, id: 'new-shape', takenAt: 5000, answers: [], selfScores: sampleScores, completedRecommendations: {} },
      ],
      assessmentResult: {
        v: 1,
        takenAt: 1000,
        answers: [],
        selfScores: sampleScores,
      },
    });

    const list = get(assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('new-shape');
  });

  it('skips both branches if neither field is present', () => {
    submitAssessment({ takenAt: 1000, answers: [], selfScores: sampleScores });
    const before = get(assessmentResults);
    setFromCloud({});
    expect(get(assessmentResults)).toEqual(before);
  });
});

describe('initial-load migration from legacy LS key', () => {
  // The store's `loadInitial` runs at module import time, so each test
  // that wants to verify it must reset modules and re-import after seeding.
  afterEach(() => {
    vi.resetModules();
  });

  it('lifts a v1 entry under lifeStages.assessment into the v2 list and clears the legacy key', async () => {
    window.localStorage.setItem(
      'lifeStages.assessment',
      JSON.stringify({
        v: 1,
        takenAt: 1000,
        answers: sampleAnswers,
        selfScores: sampleScores,
      }),
    );

    vi.resetModules();
    const fresh = await import('./assessment');

    const list = get(fresh.assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].v).toBe(2);
    expect(list[0].selfScores).toEqual(sampleScores);

    // Legacy key removed so it doesn't keep re-migrating.
    expect(window.localStorage.getItem('lifeStages.assessment')).toBeNull();
  });

  it('does not migrate when the v2 list key is already populated', async () => {
    window.localStorage.setItem(
      'lifeStages.assessmentResults',
      JSON.stringify([
        { v: 2, id: 'existing', takenAt: 5000, answers: [], selfScores: sampleScores, completedRecommendations: {} },
      ]),
    );
    window.localStorage.setItem(
      'lifeStages.assessment',
      JSON.stringify({ v: 1, takenAt: 1000, answers: [], selfScores: sampleScores }),
    );

    vi.resetModules();
    const fresh = await import('./assessment');

    const list = get(fresh.assessmentResults);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('existing');
    // Legacy key is left alone in this branch (we didn't need to lift it).
    expect(window.localStorage.getItem('lifeStages.assessment')).not.toBeNull();
  });
});
