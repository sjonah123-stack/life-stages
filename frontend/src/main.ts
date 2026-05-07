import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { initAuth } from './stores/auth';
import { initCloudSync } from './stores/cloud-sync';

const app = mount(App, {
  target: document.getElementById('app')!,
});

// Wire up cross-store cloud-sync subscriptions BEFORE auth observer fires.
// Order matters: auth's onAuthStateChanged callback calls loadFromCloud,
// which only does anything if cloud-sync has been initialized.
initCloudSync();
initAuth();

export default app;
