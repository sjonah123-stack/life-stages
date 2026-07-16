# Publishing life-stages to the app stores

The app is a PWA, already store-ready (manifest has `id`, name, icons incl. maskable
512px, standalone display; HTTPS via Firebase Hosting). Both stores accept packaged
PWAs — you never rewrite the app; you wrap the live URL. **PWABuilder does the
packaging for both.**

The steps below need accounts, payments, and store logins, so they're yours to do
(Claude can prep code/assets but won't create accounts or submit).

## Option A — Google Play (easiest, ~$25 one-time)

1. Go to https://www.pwabuilder.com → enter `https://life-stages-90806.web.app` →
   it scores the manifest/SW → **Package for stores → Android**.
2. Download the package. It's a "Trusted Web Activity" (the Play app opens your live
   site full-screen; updates ship instantly with every `firebase deploy`).
3. PWABuilder gives you a **SHA-256 signing fingerprint**. The app must prove it owns
   the website: ask Claude to add `/.well-known/assetlinks.json` with that fingerprint
   to `frontend/public/` and deploy (2-minute change). Without it, Play shows a browser
   bar on top of the app.
4. Create a **Google Play Console** account (https://play.google.com/console, $25
   one-time), create an app, upload the `.aab` from step 2, fill the listing
   (name, description, screenshots — grab them from your phone), and submit for review.
   Review typically takes a few days.

## Option B — Apple App Store (harder, $99/year)

1. Join the **Apple Developer Program** (https://developer.apple.com, $99/yr).
2. PWABuilder → **Package for stores → iOS** gives you an Xcode project wrapping the
   PWA in a WebView shell.
3. Open it in Xcode on the Mac, set your signing team, build, and upload via
   **App Store Connect**. Fill the listing + screenshots, submit for review.
4. Caveat: Apple is stricter with wrapped websites — apps that are "just a website"
   sometimes get rejected under guideline 4.2. The offline support, home-screen
   behavior, and native-feel touches (swipe nav, standalone display) help the case.
   If rejected, Capacitor (https://capacitorjs.com) with a couple of native touches
   (haptics, share sheet) is the usual second attempt.

## Do first, either store

- Take 3–5 phone screenshots (Today, Journal, Budget, Progress) — both stores want them.
- Write the one-paragraph store description (README's opening paragraph is a good base).
- Play store also wants a 512×512 icon (have it: `frontend/public/icon-512.png`) and a
  1024×500 feature graphic (ask Claude to generate one from the icon artwork).

## What's already handled in the codebase

- `manifest.webmanifest`: `id`, `lang`, `name/short_name`, `description`, theme/bg
  colors, `display: standalone`, portrait orientation, icons (SVG + 192 + 512 maskable).
- `apple-touch-icon.png` for iOS home screen.
- Offline service worker (`vite-plugin-pwa`, auto-update).
- Viewport locked against pinch-zoom-out (`minimum-scale=1`); zoom-in stays allowed.
