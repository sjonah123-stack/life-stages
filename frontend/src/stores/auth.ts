// Auth state. Phase 4 stub — exposes the same shape components will
// eventually consume. Phase 13 wires this to Firebase Auth.
import { writable, type Readable } from 'svelte/store';

// Subset of the Firebase User interface we actually read.
export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const currentUser = writable<AuthUser | null>(null);

// Status of the most recent cloud sync, surfaced near the auth pill.
export type SyncStatus = '' | 'syncing' | 'synced' | 'error';
export const syncStatus = writable<SyncStatus>('');
export const syncMessage = writable<string>('');

export function setSyncStatus(status: SyncStatus, message = '') {
  syncStatus.set(status);
  syncMessage.set(message);
}

// Phase 13 will replace these.
export async function signInWithGoogle(): Promise<void> {
  console.warn('Auth not wired up yet — Phase 13.');
}

export async function signOut(): Promise<void> {
  console.warn('Auth not wired up yet — Phase 13.');
}
