// Constants and configuration for the app.

export const LIFESPAN = 90;
export const SLIDER_MAX = 100;
export const DEFAULT_DOB = "2000-01-01"; // Neutral placeholder for first-time visitors. Real DOB lives in localStorage / Firestore.
export const DEFAULT_SEX = "male";
export const DEFAULT_THEME = "sunrise";

// Firebase config — all values are SAFE to expose publicly. Firestore security
// rules are what protect user data, not key secrecy.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDm1nHwSpl_A12P1NT_YfHDyBuS_2cdd9o",
  authDomain: "life-stages-90806.firebaseapp.com",
  projectId: "life-stages-90806",
  storageBucket: "life-stages-90806.firebasestorage.app",
  messagingSenderId: "584064170759",
  appId: "1:584064170759:web:1e8824196bb9903db863a2",
  measurementId: "G-QNL2E47SGG"
};

// URL params we explicitly never write (and clean up if seen).
export const PRIVATE_URL_PARAMS = ['dob','s','th','c','p','k','cf','r','pr','by','hy','m'];

// Mood selector options (in order).
export const MOOD_OPTIONS = ['😞', '😕', '😐', '🙂', '😄'];

// Frequency labels for rituals page.
export const FREQ_LABEL = { 1: 'yearly', 2: 'twice a year', 4: 'quarterly', 12: 'monthly' };
