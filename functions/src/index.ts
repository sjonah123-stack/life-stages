// Cloud Functions for life-stages — server-authoritative data integrity.
//
// The client already guards against empty-overwrites and keeps rolling
// snapshots, but those run in the browser and a buggy client could skip them.
// These functions enforce a backstop the client cannot bypass:
//   - archiveUserVersion: on every change to users/{uid}, archive the PRIOR
//     state into users/{uid}/versions (pruned to MAX_VERSIONS).
//   - listUserVersions / restoreUserVersion: callable APIs to inspect and roll
//     back, scoped to the caller's own uid.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { MAX_VERSIONS, shouldArchive } from './versioning';

initializeApp();

// Region pinned for predictable latency/cost. Change once if you relocate.
const REGION = 'us-central1';

// On every write to a user's document, archive the prior state. Writes to the
// versions SUBcollection don't re-trigger this (parent-doc triggers ignore
// subcollections), so there's no recursion.
export const archiveUserVersion = onDocumentWritten(
  { document: 'users/{uid}', region: REGION },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    // Hard delete: keep whatever versions already exist, archive nothing new.
    if (!after?.exists) return;

    const beforeData = before?.exists ? before.data() : null;
    if (!shouldArchive(!!before?.exists, beforeData)) return; // first creation

    const { uid } = event.params as { uid: string };
    const db = getFirestore();
    const versions = db.collection('users').doc(uid).collection('versions');
    try {
      await versions.add({
        snapshot: beforeData,
        archivedAt: FieldValue.serverTimestamp(),
      });
      // Prune everything past the newest MAX_VERSIONS.
      const stale = await versions
        .orderBy('archivedAt', 'desc')
        .offset(MAX_VERSIONS)
        .get();
      if (!stale.empty) {
        const batch = db.batch();
        stale.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (err) {
      logger.error('archiveUserVersion failed', { uid, err });
    }
  }
);

// List the caller's archived versions (metadata only — no payloads) for a
// restore UI.
export const listUserVersions = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const db = getFirestore();
  const snap = await db
    .collection('users').doc(uid).collection('versions')
    .orderBy('archivedAt', 'desc')
    .limit(MAX_VERSIONS)
    .get();
  return {
    versions: snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        archivedAt: v.archivedAt?.toMillis?.() ?? null,
        // A tiny preview so the UI can label versions without shipping payloads.
        hasDob: !!v.snapshot?.data?.dob,
        journalEntries: Object.keys(v.snapshot?.data?.journal ?? {}).length,
        milestones: (v.snapshot?.data?.milestones ?? []).length,
      };
    }),
  };
});

// Roll the caller's document back to one of their archived versions. Overwriting
// the doc itself triggers archiveUserVersion, so the pre-restore state is saved
// before it's replaced (restores are themselves undoable).
export const restoreUserVersion = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
  const versionId = String(request.data?.versionId ?? '');
  if (!versionId) throw new HttpsError('invalid-argument', 'versionId is required.');

  const db = getFirestore();
  const versionRef = db
    .collection('users').doc(uid).collection('versions').doc(versionId);
  const versionSnap = await versionRef.get();
  if (!versionSnap.exists) throw new HttpsError('not-found', 'No such version.');
  const snapshot = versionSnap.data()?.snapshot;
  if (!snapshot) throw new HttpsError('failed-precondition', 'Version has no snapshot.');

  await db.collection('users').doc(uid).set(snapshot, { merge: false });
  return { restored: true, versionId };
});
