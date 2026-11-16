/* ============================================================
   config.js — deployment settings (no secrets live here)

   SCRIPT_URL
     Paste the Web App URL of your deployed Google Apps Script
     (see README.md → "Connecting Google Sheets").
     Leave it empty ('') until the script is deployed and tested.
     While empty, the wishes form runs in a clearly labelled
     preview mode: wishes are kept on that visitor's device only.

   MUSIC_SRC
     Path or URL of the background music file. Replace
     assets/audio/music.mp3 or point this at another file you
     have the right to use.
   ============================================================ */
window.INVITE_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzo4zh_hYjELAWH_ZNRIfQ2SbM-_mUosUrOZuWr-tJHJFZZciptWq1AJEsY6S4SSkQ5zw/exec',
  MUSIC_SRC: 'assets/audio/music.mp3',
  /* Engagement ceremony start, written with an explicit +05:30 (Asia/Kolkata)
     offset so the countdown is correct on every device and time zone. */
  EVENT_START: '2026-12-31T15:00:00+05:30'
};
