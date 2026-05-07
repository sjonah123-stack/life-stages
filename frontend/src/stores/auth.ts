// Auth state — wired to Firebase Authentication.
import { writable } from 'svelte/store';
import {
  getFirebase, isFirebaseConfigured,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, fbSignOut, onAuthStateChanged,
} from '../lib/firebase';
import { clearAllLocalData } from '../utils';

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const currentUser = writable<AuthUser | null>(null);

export type SyncStatus = '' | 'syncing' | 'synced' | 'error';
export const syncStatus = writable<SyncStatus>('');
export const syncMessage = writable<string>('');

export function setSyncStatus(status: SyncStatus, message = ''): void {
  syncStatus.set(status);
  syncMessage.set(message);
}

// ---- Init: wire onAuthStateChanged once at module load ----

let authInitialized = false;
let onSignedInCallback: (() => void) | null = null;

export function setOnSignedInCallback(fn: () => void): void {
  onSignedInCallback = fn;
}

export function initAuth(): void {
  if (!isFirebaseConfigured()) return;
  const { auth } = getFirebase();
  if (!auth) return;

  // Handle the case where signInWithRedirect was used.
  getRedirectResult(auth).catch((err) => {
    if (err && err.code !== 'auth/no-redirect-operation') {
      setSyncStatus('error', `Sign-in error: ${err.message}`);
    }
  });

  onAuthStateChanged(auth, (user) => {
    const previousUid = (() => {
      let u: AuthUser | null = null;
      currentUser.subscribe((v) => (u = v))();
      return (u as AuthUser | null)?.uid ?? null;
    })();
    const newUid = user?.uid ?? null;
    currentUser.set(
      user
        ? {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
          }
        : null
    );

    if (!authInitialized) {
      authInitialized = true;
      if (user) onSignedInCallback?.();
      return;
    }
    // Auth state changed AFTER initial load (sign-in / sign-out / switch).
    // Wipe local data + reload so no in-memory state carries across accounts.
    if (previousUid !== newUid) {
      clearAllLocalData();
      window.location.reload();
    }
  });
}

// ---- Public API ----

export async function signInWithGoogle(): Promise<void> {
  const { auth } = getFirebase();
  if (!auth) return;
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      try {
        await signInWithRedirect(auth, provider);
      } catch (err2: any) {
        setSyncStatus('error', `Sign-in error: ${err2.message}`);
      }
    } else {
      setSyncStatus('error', `Sign-in error: ${err.message}`);
    }
  }
}

export async function signOut(): Promise<void> {
  const { auth } = getFirebase();
  if (!auth) return;
  const ok = confirm(
    'Sign out and clear data on this device?\n\n' +
      'Your cloud-synced data is safe — it returns the next time you sign in.'
  );
  if (!ok) return;
  await fbSignOut(auth);
  // The auth observer handles the LS wipe + reload after Firebase fires SIGNED_OUT.
}
