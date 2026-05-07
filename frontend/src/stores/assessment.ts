// Assessment state — persisted list of saved survey results + live-derived
// behavioral score. v2 stores a list (newest first) so users can save, retake,
// and delete individual results, and check off recommendations per result.
import { derived } from 'svelte/store';
import type { AssessmentResult, WealthScores } from '../types';
import type { RecommendationId } from '../data/assessment';
import { LS_PREFIX } from '../config';
import { parseDOB, daysBetween } from '../utils';
import { persistedJSON } from './persisted';
import {
  dob, partnership, careerField, retirementAge,
  smoker, exerciseLevel, sleepHours, familyLongevity,
} from './personal';
import {
  milestones, journal, letters, places, people, books, rituals,
} from './collections';
import { getEntry, weekKey, currentWeekIndex } from './journal-helpers';

const RESULTS_KEY = 'assessmentResults';
const LEGACY_KEY = 'assessment'; // v1 single-result key

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Coerce a single value to a v2 entry, dropping malformed input.
function coerceResult(raw: unknown): AssessmentResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AssessmentResult>;
  if (!r.takenAt || !r.answers || !r.selfScores) return null;
  return {
    v: 2,
    id: r.id ?? makeId(),
    takenAt: r.takenAt,
    answers: r.answers,
    selfScores: r.selfScores,
    completedRecommendations: r.completedRecommendations ?? {},
  };
}

// Sanitize any inbound array (LS, cloud, legacy) to v2-shaped, newest-first.
function normalizeList(input: unknown): AssessmentResult[] {
  if (!Array.isArray(input)) return [];
  const out: AssessmentResult[] = [];
  for (const r of input) {
    const c = coerceResult(r);
    if (c) out.push(c);
  }
  return out.sort((a, b) => b.takenAt - a.takenAt);
}

// Initial-load normalization. Lifts a v1 single-result LS entry into the v2
// list shape on first run, then clears the legacy key.
function loadInitial(raw: unknown): AssessmentResult[] {
  const list = normalizeList(raw);
  if (list.length > 0) return list;
  // Try v1 legacy single-result.
  let legacy: unknown = null;
  try {
    const stored = window.localStorage.getItem(LS_PREFIX + LEGACY_KEY);
    if (stored) legacy = JSON.parse(stored);
  } catch { /* ignore */ }
  const lifted = normalizeList(legacy ? [legacy] : []);
  if (lifted.length > 0) {
    try { window.localStorage.removeItem(LS_PREFIX + LEGACY_KEY); } catch { /* noop */ }
  }
  return lifted;
}

export const assessmentResults = persistedJSON<AssessmentResult[]>(
  RESULTS_KEY,
  [],
  loadInitial,
);

// Latest saved result (newest first), or null if none.
export const latestAssessment = derived(assessmentResults, ($list) => $list[0] ?? null);

// Have any results been saved yet?
export const hasAssessment = derived(assessmentResults, ($list) => $list.length > 0);

// ---- Mutations ----

export function submitAssessment(
  partial: Omit<AssessmentResult, 'v' | 'id' | 'completedRecommendations'>,
): AssessmentResult {
  const result: AssessmentResult = {
    v: 2,
    id: makeId(),
    completedRecommendations: {},
    ...partial,
  };
  assessmentResults.update((list) => [result, ...list]);
  return result;
}

export function deleteAssessment(id: string): void {
  assessmentResults.update((list) => list.filter((r) => r.id !== id));
}

export function clearAllAssessments(): void {
  assessmentResults.set([]);
}

// Toggle a recommendation as completed/uncompleted on a specific saved result.
// Stamps the ISO date on completion; removes the entry on uncheck.
export function toggleRecommendation(resultId: string, recId: RecommendationId): void {
  assessmentResults.update((list) =>
    list.map((r) => {
      if (r.id !== resultId) return r;
      const next = { ...r.completedRecommendations };
      if (next[recId]) delete next[recId];
      else next[recId] = new Date().toISOString();
      return { ...r, completedRecommendations: next };
    }),
  );
}

// Cloud-sync entry point. Accepts either a v2 list or a v1 single-result
// fallback so the sync layer doesn't need to know the schema history.
export function setFromCloud(cloud: { assessmentResults?: unknown; assessmentResult?: unknown }): void {
  if (cloud.assessmentResults !== undefined) {
    assessmentResults.set(normalizeList(cloud.assessmentResults));
  } else if (cloud.assessmentResult) {
    assessmentResults.set(normalizeList([cloud.assessmentResult]));
  }
}

// ---- Behavioral scores — derived from existing app data ----
// Each wealth scores 0-100. Read from every relevant store so the score
// recomputes any time underlying data changes. Cap at 100 in case rules
// over-add.

export const behavioralScores = derived(
  [
    dob, partnership, careerField, retirementAge,
    smoker, exerciseLevel, sleepHours, familyLongevity,
    milestones, journal, letters, places, people, books, rituals,
  ],
  ([
    $dob, $partnership, $careerField, $retirementAge,
    $smoker, $exerciseLevel, $sleepHours, $familyLongevity,
    $milestones, $journal, $letters, $places, $people, $books, $rituals,
  ]) => {
    // ---- Time ----
    let time = 0;
    if ($dob) time += 20;
    const todayWeekIdx = currentWeekIndex();
    const journaledRecent = (() => {
      if (!$dob) return false;
      for (let w = todayWeekIdx; w >= Math.max(0, todayWeekIdx - 4); w--) {
        const e = getEntry(weekKey(w));
        if (e.text && e.text.trim()) return true;
      }
      return false;
    })();
    if (journaledRecent) time += 20;
    if ($milestones.some((m) => m.completed)) time += 20;
    if ($milestones.some((m) => !m.completed)) time += 20;
    if ($places.length >= 1) time += 20;
    time = Math.min(100, time);

    // ---- Social ----
    let social = 0;
    social += Math.min(10, $people.length);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let any30 = false;
    let count90 = 0;
    for (const p of $people) {
      for (const it of p.interactions ?? []) {
        const d = parseDOB(it.date);
        if (!d) continue;
        const daysAgoVal = daysBetween(d, today);
        if (daysAgoVal <= 30) any30 = true;
        if (daysAgoVal <= 90) count90++;
      }
    }
    if (any30) social += 30;
    if (count90 >= 3) social += 20;
    if ($rituals.length >= 1) social += 20;
    if ($partnership) social += 20;
    social = Math.min(100, social);

    // ---- Mental ----
    let mental = 0;
    const journaled7d = (() => {
      if (!$dob) return false;
      const e = getEntry(weekKey(todayWeekIdx));
      return !!(e.text && e.text.trim());
    })();
    if (journaled7d) mental += 25;
    const totalEntries = Object.values($journal).filter((v) => {
      if (typeof v === 'string') return !!v.trim();
      return !!(v as { text?: string })?.text?.trim();
    }).length;
    if (totalEntries >= 10) mental += 25;
    if (Object.keys($letters).length >= 1) mental += 25;
    if ($books.length >= 3) mental += 25;
    mental = Math.min(100, mental);

    // ---- Physical ----
    let physical = 0;
    if ($sleepHours && $sleepHours > 0) physical += 25;
    if ($exerciseLevel) physical += 25;
    if ($smoker) physical += 25;
    if ($familyLongevity && $familyLongevity > 0) physical += 25;
    physical = Math.min(100, physical);

    // ---- Financial ----
    // Honestly thin; UI labels this clearly. See `data/assessment.ts`
    // RECOMMENDATIONS.financial for the "coming soon" note shown to users.
    let financial = 0;
    if ($retirementAge && $retirementAge > 0) financial += 50;
    if ($careerField) financial += 50;
    financial = Math.min(100, financial);

    const out: WealthScores = { time, social, mental, physical, financial };
    return out;
  },
);
