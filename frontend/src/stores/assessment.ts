// Assessment state — persisted list of saved survey results + live-derived
// behavioral score. v2 stores a list (newest first) so users can save, retake,
// and delete individual results, and check off recommendations per result.
import { writable, derived, type Writable } from 'svelte/store';
import type { AssessmentResult, WealthScores } from '../types';
import { LS_PREFIX } from '../config';
import { readJSON, writeJSON, parseDOB, daysBetween } from '../utils';
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

// ---- Migration: lift v1 single-result LS into the v2 list shape ----
// Only runs once: the legacy key is cleared after a successful migration.
function migrateLegacyLocal(): AssessmentResult[] {
  const legacy = readJSON<unknown>(LEGACY_KEY, null);
  if (!legacy || typeof legacy !== 'object') return [];
  const r = legacy as Partial<AssessmentResult> & { v?: number };
  if (!r.takenAt || !r.answers || !r.selfScores) return [];
  const migrated: AssessmentResult = {
    v: 2,
    id: r.id ?? makeId(),
    takenAt: r.takenAt,
    answers: r.answers as AssessmentResult['answers'],
    selfScores: r.selfScores as AssessmentResult['selfScores'],
    completedRecommendations: r.completedRecommendations ?? {},
  };
  // Clear legacy key so we don't keep re-migrating.
  try { window.localStorage.removeItem(LS_PREFIX + LEGACY_KEY); } catch { /* noop */ }
  return [migrated];
}

// Normalise any inbound list (from LS, cloud, or upgrade path) to v2 shape.
export function normalizeResults(input: unknown): AssessmentResult[] {
  if (!Array.isArray(input)) return [];
  const out: AssessmentResult[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Partial<AssessmentResult>;
    if (!r.takenAt || !r.answers || !r.selfScores) continue;
    out.push({
      v: 2,
      id: r.id ?? makeId(),
      takenAt: r.takenAt,
      answers: r.answers,
      selfScores: r.selfScores,
      completedRecommendations: r.completedRecommendations ?? {},
    });
  }
  // Newest first.
  out.sort((a, b) => b.takenAt - a.takenAt);
  return out;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function persistedResults(): Writable<AssessmentResult[]> {
  let initial = normalizeResults(readJSON<unknown>(RESULTS_KEY, null));
  if (initial.length === 0) {
    // First load on the new shape — try lifting v1 single-result.
    initial = migrateLegacyLocal();
    if (initial.length > 0) writeJSON(RESULTS_KEY, initial);
  }
  const store = writable<AssessmentResult[]>(initial);
  let applyingExternal = false;
  store.subscribe((val) => {
    if (applyingExternal) return;
    writeJSON(RESULTS_KEY, val);
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LS_PREFIX + RESULTS_KEY) return;
      try {
        applyingExternal = true;
        store.set(normalizeResults(e.newValue ? JSON.parse(e.newValue) : []));
      } catch { /* ignore */ }
      finally { applyingExternal = false; }
    });
  }
  return store;
}

export const assessmentResults = persistedResults();

// Convenience: latest saved result, or null. Drives most of the UI.
export const latestAssessment = derived(assessmentResults, ($list) => $list[0] ?? null);

// Have any results been saved yet?
export const hasAssessment = derived(assessmentResults, ($list) => $list.length > 0);

// ---- Mutations ----

// Submit a freshly-completed survey: prepend to the list (newest first).
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

// Delete a specific saved result by id.
export function deleteAssessment(id: string): void {
  assessmentResults.update((list) => list.filter((r) => r.id !== id));
}

// Wipe all saved results — start over.
export function clearAllAssessments(): void {
  assessmentResults.set([]);
}

// Toggle a recommendation as completed/uncompleted on a specific saved result.
// Stamps the ISO date on completion; removes the entry on uncheck.
export function toggleRecommendation(resultId: string, recId: string): void {
  assessmentResults.update((list) =>
    list.map((r) => {
      if (r.id !== resultId) return r;
      const next = { ...r.completedRecommendations };
      if (next[recId]) {
        delete next[recId];
      } else {
        next[recId] = new Date().toISOString();
      }
      return { ...r, completedRecommendations: next };
    }),
  );
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
    // Journaled in past 4 weeks?
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
    social += Math.min(10, $people.length); // 1 pt per person, cap 10
    // ≥1 chat in past 30 days (+30) AND ≥3 chats in past 90 days (+20) — stack.
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
    // Journaled in past 7 days?
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
    // Honestly thin; UI labels this clearly.
    let financial = 0;
    if ($retirementAge && $retirementAge > 0) financial += 50;
    if ($careerField) financial += 50;
    financial = Math.min(100, financial);

    const out: WealthScores = { time, social, mental, physical, financial };
    return out;
  },
);
