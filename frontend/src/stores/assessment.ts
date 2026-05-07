// Assessment state — persisted survey result + live-derived behavioral score.
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

// ---- Persisted result store (latest only; v2 tracks history) ----

function persistedAssessment(key: string): Writable<AssessmentResult | null> {
  const start = readJSON<AssessmentResult | null>(key, null);
  const store = writable<AssessmentResult | null>(start);
  let applyingExternal = false;
  store.subscribe((val) => {
    if (applyingExternal) return;
    writeJSON(key, val);
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== LS_PREFIX + key) return;
      try {
        applyingExternal = true;
        store.set(e.newValue ? JSON.parse(e.newValue) : null);
      } catch (err) { /* ignore */ }
      finally { applyingExternal = false; }
    });
  }
  return store;
}

export const assessmentResult = persistedAssessment('assessment');

// Derived: have they taken it yet?
export const hasAssessment = derived(assessmentResult, ($r) => !!$r);

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
  }
);

// Submit a survey result — overwrites the latest.
export function submitAssessment(result: AssessmentResult): void {
  assessmentResult.set(result);
}

// Clear the result so the user is shown the intro/CTA again.
export function clearAssessment(): void {
  assessmentResult.set(null);
}
