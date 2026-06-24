// Firebase initialization. Single source of truth for the auth + db handles.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut as fbSignOut, onAuthStateChanged,
  type Auth, type User,
} from 'firebase/auth';
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL, deleteObject,
  type FirebaseStorage,
} from 'firebase/storage';
import { FIREBASE_CONFIG } from '../config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export function getFirebase() {
  if (!app && isFirebaseConfigured()) {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return { app, auth, db, storage };
}

export {
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  fbSignOut as fbSignOut, onAuthStateChanged,
  doc, setDoc, getDoc, serverTimestamp,
  storageRef, uploadString, getDownloadURL, deleteObject,
};
export type { User };
