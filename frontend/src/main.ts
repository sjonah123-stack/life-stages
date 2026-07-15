import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initAuth } from './stores/auth';
import { initCloudSync } from './stores/cloud-sync';
import { initAchievementNotifier } from './stores/achievement-notifier';

const app = mount(App, {
  target: document.getElementById('app')!,
});

// Wire up cross-store cloud-sync subscriptions BEFORE auth observer fires.
// Order matters: auth's onAuthStateChanged callback calls loadFromCloud,
// which only does anything if cloud-sync has been initialized. The
// achievement notifier sits between the two: after cloud-sync (so its
// isApplyingCloud guard is meaningful) and before auth (so the first
// sign-in download is seeded silently, never toasted).
initCloudSync();
initAchievementNotifier();
initAuth();

export default app;
