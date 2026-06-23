/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Your one extraordinary life',
        short_name: 'Life',
        description:
          'Your interactive life dashboard — slide through every year, journal each week, see where you\'ve been.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F4F0E8',
        theme_color: '#F4F0E8',
        categories: ['lifestyle', 'productivity'],
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Don't cache cross-origin Firebase / OSM tiles. Same-origin only.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // Make new SW take over immediately on deploy — no need for users to
        // close all tabs or hard-reload to pick up new code. Pairs with
        // `registerType: 'autoUpdate'` above to give invisible auto-updates.
        // Trade-off: if a user is actively interacting when a deploy lands,
        // the new chunks load on next navigation, which may briefly show a
        // mismatched shell. Acceptable for a single-user personal app where
        // auto-save commits in-progress edits within 1.5s.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy deps so they cache independently and users on slower
        // connections don't pay for Firebase + Leaflet up-front when they
        // just want to read the Today page.
        manualChunks(id) {
          if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
            return 'firebase';
          }
          if (id.includes('node_modules/leaflet/')) {
            return 'leaflet';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
