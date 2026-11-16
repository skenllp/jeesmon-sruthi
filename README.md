# Jeesmon & Sruthi — Engagement Invitation

Static site (HTML5 · CSS3 · vanilla JS), adapted from the Bestin & Mareena reference. No build step.

## Run locally
```
npx serve .        # or: python3 -m http.server 8000
```

## Deploy to Vercel
Import the folder (framework preset: **Other**, no build command, output = root). `vercel.json` adds cache and security headers.

**After you know the live domain**, replace `https://jeesmon-sruthi.vercel.app` in `index.html`
(canonical, `og:url`, `og:image`, `twitter:image`, JSON-LD). WhatsApp needs absolute image URLs, so do this before sharing the link.

## Connecting Google Sheets (wishes)
The form is in **preview mode** until you do this; wishes then stay on each visitor's device only.
1. Create a Google Sheet → **Extensions → Apps Script**.
2. Paste all of `Code.gs`, save.
3. **Deploy → New deployment → Web app** · Execute as **Me** · Who has access **Anyone**.
4. Copy the Web app URL (`https://script.google.com/macros/s/…/exec`) into `js/config.js` → `SCRIPT_URL`.
5. Test: open the site, send a wish, confirm a row appears in the `Wishes` sheet and on the Wishes Wall after refresh.
No secrets are stored in the site; the URL is a public endpoint. The script trims/limits input, blocks formula injection and ignores exact duplicates.

## Things you can change
- `js/config.js` — Sheets URL, music file, event start (`2026-12-31T15:00:00+05:30`).
- Map buttons — `data-map="ceremony|reception"` links in the Venue section of `index.html`.
- Music — `assets/audio/music.mp3` is the reference file; swap in music you have rights to.
