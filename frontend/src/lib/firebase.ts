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
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { FIREBASE_CONFIG, RECAPTCHA_SITE_KEY } from '../config';

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
    // App Check must initialize before other services. Runs only when a
    // reCAPTCHA site key is set AND we're not on localhost — reCAPTCHA v3 can't
    // verify a localhost origin (it 400s and spams the console), and the dev
    // server doesn't need protection. Required to safely expose the client-side
    // AI SDK on prod (prevents billing abuse once enforcement is on).
    const onLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (RECAPTCHA_SITE_KEY && !onLocalhost) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
      } catch {
        /* a duplicate init or unsupported env — ignore */
      }
    }
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
