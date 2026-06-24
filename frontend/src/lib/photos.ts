// Journal photos live in Cloud Storage, not inside the Firestore user doc.
// Embedding base64 in the doc bloats it toward Firestore's 1 MB limit (a dozen
// photos can break saves), so each photo is uploaded to Storage and the entry
// keeps only the download URL. `photo` may still be a `data:` URL locally (e.g.
// added while signed out); it's migrated to a Storage URL on the next sync.
import {
  getFirebase, storageRef, uploadString, getDownloadURL, deleteObject,
} from './firebase';

// Storage object path for a journal photo. Keys are week-start date strings;
// sanitise to be safe in a path even though they're already YYYY-MM-DD.
export function journalPhotoPath(uid: string, key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `users/${uid}/journal/${safeKey}.jpg`;
}

export function isDataUrl(value: string | undefined | null): boolean {
  return !!value && value.startsWith('data:');
}

// Upload a base64 data-URL photo to Storage; return its download URL.
export async function uploadJournalPhoto(
  uid: string, key: string, dataUrl: string,
): Promise<string> {
  const { storage } = getFirebase();
  if (!storage) throw new Error('Storage unavailable');
  const ref = storageRef(storage, journalPhotoPath(uid, key));
  await uploadString(ref, dataUrl, 'data_url');
  return getDownloadURL(ref);
}

// Best-effort delete of a journal photo object (e.g. when an entry is cleared).
export async function deleteJournalPhoto(uid: string, key: string): Promise<void> {
  const { storage } = getFirebase();
  if (!storage) return;
  try {
    await deleteObject(storageRef(storage, journalPhotoPath(uid, key)));
  } catch {
    /* already gone / never uploaded — ignore */
  }
}
