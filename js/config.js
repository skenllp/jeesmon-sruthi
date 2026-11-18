/* ============================================================
   config.js — deployment settings

   FIREBASE
     Paste your Firebase web-app config here (Firebase console →
     Project settings → General → Your apps → Web app → Config).
     These values are public identifiers, not secrets; what protects
     the data is database.rules.json (publish it — see README.md).
     While apiKey / databaseURL are empty the wishes form runs in a
     clearly labelled preview mode (wishes stay on that device).

   MUSIC_SRC
     Path or URL of the background music file.
   ============================================================ */
window.INVITE_CONFIG = {
  FIREBASE: {
    apiKey: 'AIzaSyAT7vm7qvbs5xnsk4V-MbPpRIdq_nozQuQ',
    authDomain: 'jeesmon-sruthi.firebaseapp.com',
    databaseURL: 'https://jeesmon-sruthi-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'jeesmon-sruthi',
    storageBucket: 'jeesmon-sruthi.firebasestorage.app',
    messagingSenderId: '630044917446',
    appId: '1:630044917446:web:e11702dce8bf776549e1c7'
  },
  WISHES_PATH: 'wishes',
  MUSIC_SRC: 'assets/audio/music.mp3',
  /* Wedding ceremony start, written with an explicit +05:30 (Asia/Kolkata)
     offset so the countdown is correct on every device and time zone. */
  EVENT_START: '2026-12-31T15:00:00+05:30'
};
