// Cloud sync (Firestore). Collects state from all the persisted stores,
// writes it under users/{uid}, debounced on changes. Applies state on
// sign-in. Any change in any store schedules an upload after 2s of quiet.
import { get } from 'svelte/store';
import { getFirebase, doc, setDoc, getDoc, serverTimestamp } from '../lib/firebase';
import {
  dob, sex, theme, country, partnership, kids, careerField,
  smoker, exerciseLevel, sleepHours, familyLongevity,
} from './personal';
import {
  milestones, journal, letters, people, books, rituals,
  priorities, bestYear, hardestYear,
} from './collections';
import { assessmentResults, setFromCloud as setAssessmentFromCloud } from './assessment';
import {
  netWorthEntries, savingsGoals, savingsRate, givingEntries,
  setFromCloud as setFinancialFromCloud,
} from './financial';
import { currentUser, setSyncStatus, setOnSignedInCallback } from './auth';
import type { CloudPayload } from '../types';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let applyingCloud = false;

export function collectStateForCloud(): CloudPayload {
  return {
    v: 2,
    dob: get(dob),
    sex: get(sex),
    theme: get(theme),
    country: get(country),
    partnership: get(partnership),
    kids: get(kids),
    careerField: get(careerField),
    smoker: get(smoker),
    exerciseLevel: get(exerciseLevel),
    sleepHours: get(sleepHours),
    familyLongevity: get(familyLongevity),
    priorities: get(priorities),
    bestYear: get(bestYear),
    hardestYear: get(hardestYear),
    milestones: get(milestones),
    journal: get(journal),
    letters: get(letters),
    people: get(people),
    books: get(books),
    rituals: get(rituals),
    assessmentResults: get(assessmentResults),
    netWorthEntries: get(netWorthEntries),
    savingsGoals: get(savingsGoals),
    savingsRate: get(savingsRate),
    givingEntries: get(givingEntries),
    updated: Date.now(),
  };
}

export function applyCloudState(cloud: Partial<CloudPayload>): void {
  if (!cloud || typeof cloud !== 'object') return;
  applyingCloud = true;
  try {
    if (cloud.dob !== undefined && cloud.dob != null) dob.set(cloud.dob);
    if (cloud.sex !== undefined && cloud.sex) sex.set(cloud.sex);
    if (cloud.theme !== undefined && cloud.theme) theme.set(cloud.theme);
    if (cloud.country !== undefined) country.set(cloud.country);
    if (cloud.partnership !== undefined) partnership.set(cloud.partnership);
    if (cloud.kids !== undefined) kids.set(cloud.kids);
    if (cloud.careerField !== undefined) careerField.set(cloud.careerField);
    // `cloud.retirementAge` may be present in legacy docs; we accept it on
    // read (no error) but no longer mirror it to a store. See types.ts.
    if (cloud.smoker !== undefined) smoker.set(cloud.smoker);
    if (cloud.exerciseLevel !== undefined) exerciseLevel.set(cloud.exerciseLevel);
    if (cloud.sleepHours !== undefined) sleepHours.set(cloud.sleepHours);
    if (cloud.familyLongevity !== undefined) familyLongevity.set(cloud.familyLongevity);
    if (cloud.priorities !== undefined) priorities.set(cloud.priorities);
    if (cloud.bestYear !== undefined) bestYear.set(cloud.bestYear);
    if (cloud.hardestYear !== undefined) hardestYear.set(cloud.hardestYear);
    if (cloud.milestones !== undefined) milestones.set(cloud.milestones);
    if (cloud.journal !== undefined) journal.set(cloud.journal);
    if (cloud.letters !== undefined) letters.set(cloud.letters);
    if (cloud.people !== undefined) people.set(cloud.people);
    if (cloud.books !== undefined) books.set(cloud.books);
    if (cloud.rituals !== undefined) rituals.set(cloud.rituals);
    setAssessmentFromCloud(cloud);
    setFinancialFromCloud(cloud);
  } finally {
    // Allow store subscriptions to finish before re-enabling cloud writes.
    setTimeout(() => { applyingCloud = false; }, 0);
  }
}

export async function loadFromCloud(): Promise<void> {
  const { db } = getFirebase();
  const user = get(currentUser);
  if (!db || !user) return;
  setSyncStatus('syncing', 'Loading from cloud…');
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const cloudDoc = snap.data() as { data?: CloudPayload };
      if (cloudDoc?.data) applyCloudState(cloudDoc.data);
      setSyncStatus('synced', 'Synced ✓');
    } else {
      // First sign-in for this account — push current local up.
      setSyncStatus('synced', 'Synced ✓');
      saveToCloud();
    }
  } catch (err: any) {
    setSyncStatus('error', `Load failed: ${err.message}`);
  }
}

export async function saveToCloud(): Promise<void> {
  const { db } = getFirebase();
  const user = get(currentUser);
  if (!db || !user) return;
  setSyncStatus('syncing', 'Saving…');
  try {
    const ref = doc(db, 'users', user.uid);
    const payload = collectStateForCloud();
    await setDoc(
      ref,
      { data: payload, updated_at: serverTimestamp() },
      { merge: true }
    );
    setSyncStatus('synced', 'Synced ✓');
  } catch (err: any) {
    setSyncStatus('error', `Save failed: ${err.message}`);
  }
}

export function scheduleCloudSave(): void {
  if (applyingCloud) return; // we're applying a cloud doc — don't bounce back
  const user = get(currentUser);
  if (!user) return;
  if (saveTimer) clearTimeout(saveTimer);
  setSyncStatus('syncing', 'Saving in 2s…');
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveToCloud();
  }, 2000);
}

// Subscribe every persisted store; any change schedules a cloud upload.
function subscribeAll(): void {
  const everyStore = [
    dob, sex, theme, country, partnership, kids, careerField,
    smoker, exerciseLevel, sleepHours, familyLongevity,
    priorities, bestYear, hardestYear,
    milestones, journal, letters, people, books, rituals,
    assessmentResults,
    netWorthEntries, savingsGoals, savingsRate, givingEntries,
  ];
  everyStore.forEach((s) => s.subscribe(() => scheduleCloudSave()));
}

// Bootstrap. Called from main.ts so we know it runs once on app load.
export function initCloudSync(): void {
  setOnSignedInCallback(() => loadFromCloud());
  subscribeAll();
}
