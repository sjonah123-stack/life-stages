// Constants and configuration for the app.
import type { Mood, Sex, Theme, DateString } from './types';

export const LIFESPAN = 90;
export const SLIDER_MAX = 100;

// Neutral placeholder for first-time visitors. Real DOB lives in
// localStorage (per-device) and Firestore (per-account).
export const DEFAULT_DOB: DateString = '2000-01-01';
export const DEFAULT_SEX: Sex = 'male';
export const DEFAULT_THEME: Theme = 'sunrise';

// Firebase config — all values are SAFE to expose publicly. Firestore
// security rules are what protect user data, not key secrecy.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDm1nHwSpl_A12P1NT_YfHDyBuS_2cdd9o',
  authDomain: 'life-stages-90806.firebaseapp.com',
  projectId: 'life-stages-90806',
  storageBucket: 'life-stages-90806.firebasestorage.app',
  messagingSenderId: '584064170759',
  appId: '1:584064170759:web:1e8824196bb9903db863a2',
  measurementId: 'G-QNL2E47SGG',
};

// --- AI features (Firebase AI Logic / Gemini) ---
// reCAPTCHA v3 site key for App Check. Empty = App Check disabled (the app runs
// fine without it). Set this once it's created in the Firebase console so AI
// calls are protected from billing abuse before enabling enforcement.
export const RECAPTCHA_SITE_KEY = '';

// Gemini model id for AI Logic. Verify the exact id in the Firebase AI Logic
// console model picker — ids change over time.
export const GEMINI_MODEL = 'gemini-2.5-flash';

// URL params we explicitly never write (and clean up if seen).
export const PRIVATE_URL_PARAMS = [
  'dob', 's', 'th', 'c', 'p', 'k', 'cf', 'r', 'pr', 'by', 'hy', 'm',
] as const;

// Mood selector options (in order). The empty string '' means no mood set.
export const MOOD_OPTIONS: Exclude<Mood, ''>[] = ['😞', '😕', '😐', '🙂', '😄'];

// Frequency labels for the rituals page.
export const FREQ_LABEL: Record<1 | 2 | 4 | 12, string> = {
  1: 'yearly',
  2: 'twice a year',
  4: 'quarterly',
  12: 'monthly',
};

// localStorage key prefix. All app data namespaced under this.
export const LS_PREFIX = 'lifeStages.';
