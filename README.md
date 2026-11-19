# Jees & Sruthi — Wedding Invitation

Static site (HTML5 · CSS3 · vanilla JS), adapted from the Bestin & Mareena reference (hero, layout and styling follow it). No build step.

## Run locally
```
npx serve .        # or: python3 -m http.server 8000
```

## Deploy to Vercel
Import the folder (framework preset: **Other**, no build command, output = root). `vercel.json` adds cache and security headers.

**After you know the live domain**, replace `https://jeesmon-sruthi.vercel.app` in `index.html`
(canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD). WhatsApp needs absolute image URLs, so do this before sharing the link.

## Connecting Firebase Realtime Database (wishes)
The form is in **preview mode** until you do this; wishes then stay on each visitor's device only.
1. [Firebase console](https://console.firebase.google.com) → your project → **Build → Realtime Database → Create database** (locked mode).
2. Copy the database URL shown at the top of the **Data** tab (e.g. `https://your-project-default-rtdb.firebaseio.com`).
3. **Project settings → General → Your apps → Web (</>)** → register an app → copy the config into `js/config.js` → `FIREBASE`, and put the database URL in `databaseURL`.
4. Realtime Database → **Rules** → paste the contents of `database.rules.json` → Publish. Guests can read the wall and add a wish; nobody can edit or delete from the site.
5. Test: send a wish on the live site; it appears under `wishes` in the Data tab and on the Wishes Wall after a refresh. Delete unwanted wishes in the console.

## Things you can change
- `js/config.js` — Firebase config, music file, event start (`2026-12-31T16:00:00+05:30`).
- Map buttons — `data-map="ceremony|reception"` links in the Venue section of `index.html`.
- Music — `assets/audio/music.mp3` is the reference file; swap in music you have rights to.
