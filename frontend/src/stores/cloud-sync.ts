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
import {
  habits, habitChecks,
  setFromCloud as setHabitsFromCloud,
} from './habits';
import {
  bodyEntries,
  setFromCloud as setBodyFromCloud,
} from './body';
import { currentUser, setSyncStatus, setOnSignedInCallback } from './auth';
import { uploadJournalPhoto, isDataUrl } from '../lib/photos';
import type { CloudPayload, Journal } from '../types';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let applyingCloud = false;

// Rolling backups: before overwriting the main doc, the current payload is
// written to users/{uid}/snapshots/{slot}, round-robin over a fixed number of
// slots. Bounded storage, no listing/pruning needed. `snapshotSeq` is seeded
// from the cloud doc on load so the rotation continues across sessions.
const SNAPSHOT_SLOTS = 5;
let snapshotSeq = 0;

// A payload is "empty" when it carries no meaningful user data. Used to refuse
// overwriting a populated cloud doc with a blank local state — the data-loss
// class where an empty save races ahead of (or replaces) real cloud data.
export function isPayloadEmpty(p: Partial<CloudPayload> | null | undefined): boolean {
  if (!p) return true;
  if (p.dob) return false;
  const arrays: unknown[] = [
    p.milestones, p.people, p.books, p.rituals, p.priorities,
    p.netWorthEntries, p.savingsGoals, p.givingEntries,
    p.habits, p.habitChecks, p.bodyEntries, p.assessmentResults,
  ];
  if (arrays.some((a) => Array.isArray(a) && a.length > 0)) return false;
  // journal + letters are keyed objects, not arrays.
  if (p.journal && Object.keys(p.journal).length > 0) return false;
  if (p.letters && Object.keys(p.letters).length > 0) return false;
  return true;
}

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
    habits: get(habits),
    habitChecks: get(habitChecks),
    bodyEntries: get(bodyEntries),
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
    setHabitsFromCloud(cloud);
    setBodyFromCloud(cloud);
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
      const cloudDoc = snap.data() as { data?: CloudPayload; snapshotSeq?: number };
      if (typeof cloudDoc.snapshotSeq === 'number') snapshotSeq = cloudDoc.snapshotSeq;
      const cloudData = cloudDoc?.data;
      if (isPayloadEmpty(cloudData) && !isPayloadEmpty(collectStateForCloud())) {
        // The cloud doc is blank but this device still has data (e.g. recovering
        // after an earlier bad write wiped the cloud). Keep local and push it
        // back up instead of letting the empty cloud overwrite it on apply.
        setSyncStatus('synced', 'Synced ✓');
        saveToCloud();
      } else {
        if (cloudData) applyCloudState(cloudData);
        setSyncStatus('synced', 'Synced ✓');
      }
    } else {
      // First sign-in for this account — push current local up.
      setSyncStatus('synced', 'Synced ✓');
      saveToCloud();
    }
  } catch (err: any) {
    setSyncStatus('error', `Load failed: ${err.message}`);
  }
}

// Before anything reaches the cloud, move any base64 journal photos to Cloud
// Storage and replace them with their download URL. This keeps the Firestore
// doc small (well clear of the 1 MB limit) regardless of how many photos exist.
// Best-effort per photo: a failed upload leaves that entry as a data URL to
// retry on the next save, and never blocks the rest of the sync.
async function migrateJournalPhotos(uid: string): Promise<void> {
  const current = get(journal);
  let changed = false;
  const next: Journal = { ...current };
  for (const [key, entry] of Object.entries(current)) {
    if (!entry || !isDataUrl(entry.photo)) continue;
    try {
      const url = await uploadJournalPhoto(uid, key, entry.photo);
      next[key] = { ...entry, photo: url };
      changed = true;
    } catch {
      /* keep the data URL; retry next save */
    }
  }
  if (changed) journal.set(next);
}

export async function saveToCloud(): Promise<void> {
  const { db } = getFirebase();
  const user = get(currentUser);
  if (!db || !user) return;
  setSyncStatus('syncing', 'Saving…');
  try {
    await migrateJournalPhotos(user.uid);
    const ref = doc(db, 'users', user.uid);
    const payload = collectStateForCloud();

    // Guard: never overwrite a populated cloud doc with empty local state.
    // If local is empty, read the existing doc first; if the cloud already has
    // real data, refuse the write rather than blanking it.
    if (isPayloadEmpty(payload)) {
      const existing = await getDoc(ref);
      const existingData = existing.exists()
        ? (existing.data() as { data?: CloudPayload }).data
        : undefined;
      if (!isPayloadEmpty(existingData)) {
        setSyncStatus('synced', 'Synced ✓');
        return;
      }
    } else {
      // Roll a backup before overwriting, so a bad write is self-recoverable.
      // Best-effort: a snapshot failure must never block the real save.
      const slot = snapshotSeq % SNAPSHOT_SLOTS;
      snapshotSeq += 1;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'snapshots', String(slot)),
          { data: payload, savedAt: serverTimestamp() }
        );
      } catch { /* snapshots are best-effort */ }
    }

    await setDoc(
      ref,
      { data: payload, updated_at: serverTimestamp(), snapshotSeq },
      { merge: true }
    );
    setSyncStatus('synced', 'Synced ✓');
  } catch (err: any) {
    setSyncStatus('error', `Save failed: ${err.message}`);
  }
}

// ---- User-owned export / import ----
// A backup the user fully controls: download everything as JSON, restore it
// anywhere. Works offline and across accounts — the ultimate integrity net.

export function exportStateAsJson(): string {
  return JSON.stringify({ app: 'life-stages', exported: Date.now(), ...collectStateForCloud() }, null, 2);
}

// Restore from a previously exported JSON string. Returns false on malformed
// input (caller shows an error). On success, local stores are updated and the
// imported state is pushed to the cloud.
export function importStateFromJson(raw: string): boolean {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return false; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  // A valid backup carries at least one recognised field.
  const p = parsed as Partial<CloudPayload>;
  if (isPayloadEmpty(p) && p.sex === undefined && p.savingsRate === undefined) return false;
  applyCloudState(p);
  // applyCloudState suppresses the auto-upload; push the imported state up once
  // the suppression flag clears.
  setTimeout(() => scheduleCloudSave(), 0);
  return true;
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
    habits, habitChecks, bodyEntries,
  ];
  everyStore.forEach((s) => s.subscribe(() => scheduleCloudSave()));
}

// Bootstrap. Called from main.ts so we know it runs once on app load.
export function initCloudSync(): void {
  setOnSignedInCallback(() => loadFromCloud());
  subscribeAll();
}
