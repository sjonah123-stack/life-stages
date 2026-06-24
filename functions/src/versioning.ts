// Pure helpers for the user-doc versioning trigger. Kept free of the Admin SDK
// so they can be unit-tested without the Firestore emulator.

// How many archived versions to keep per user. ~20 covers a generous undo
// window without unbounded storage growth.
export const MAX_VERSIONS = 20;

// Archive a prior version only when there was prior data to preserve — i.e. on
// an update or delete, never on the very first creation of the doc (nothing to
// roll back to yet).
export function shouldArchive(hadBefore: boolean, beforeData: unknown): boolean {
  return hadBefore && beforeData != null;
}

// Given version ids ordered newest-first, return the ones to delete so only the
// most recent `keep` survive.
export function idsToPrune(orderedNewestFirst: string[], keep = MAX_VERSIONS): string[] {
  return orderedNewestFirst.slice(keep);
}
