/* ============================================================
   rsvp.js — "Leave Your Wishes" form + Wishes Wall
   Jeesmon & Sruthi — Engagement Invitation

   Wishes are stored in Firebase Realtime Database. Configuration: js/config.js (INVITE_CONFIG.FIREBASE).
   Setup steps are in README.md.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.INVITE_CONFIG || {};
  var FB = CFG.FIREBASE || {};
  var WISHES_PATH = String(CFG.WISHES_PATH || 'wishes');
  var CONNECTED = !!(String(FB.apiKey || '').trim() && String(FB.databaseURL || '').trim());
  var SDK_VER = '10.12.5';
  var db = null;

  var LS_SENT = 'js-wishes-sent-v1';       /* hashes of wishes already sent from this device */
  var LS_LOCAL = 'js-wishes-preview-v1';   /* preview-mode wall (only when not connected)    */
  var MAX_NAME = 80, MAX_WISH = 500, MIN_GAP_MS = 8000, MAX_CARDS = 200;

  var form = document.getElementById('rsvpForm');
  var submitBtn = document.getElementById('rsvpSubmit');
  var successBox = document.getElementById('rsvpSuccess');
  var wishesWall = document.getElementById('wishesWall');
  var wishesEmpty = document.getElementById('wishesEmpty');
  var noteEl = document.getElementById('rsvpNote');
  if (!form) return;

  var submitting = false;
  var lastSubmitAt = 0;

  /* ---------- tiny safe storage helpers ---------- */
  function lsGet(key, fallback) {
    try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }

  function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function hash(s) {
    var h = 5381, i;
    for (i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  function showErr(id, visible) {
    var el = document.getElementById(id);
    if (el) el.hidden = !visible;
  }
  function markInvalid(input, invalid) {
    if (!input) return;
    input.classList.toggle('is-invalid', invalid);
    input.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  }
  function setLoading(on) {
    submitting = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    var lbl = submitBtn.querySelector('.rsvp-submit__label');
    var spin = submitBtn.querySelector('.rsvp-submit__loading');
    if (lbl) lbl.hidden = on;
    if (spin) spin.hidden = !on;
  }
  function setSubmitError(msg) {
    var el = document.getElementById('errSubmit');
    if (!el) return;
    if (msg) el.textContent = msg;
    el.hidden = !msg;
  }

  /* ---------- validation ---------- */
  function validate() {
    var nameEl = document.getElementById('rsvpName');
    var wishEl = document.getElementById('rsvpWish');
    var nameOk = norm(nameEl.value).length >= 2 && norm(nameEl.value).length <= MAX_NAME;
    var wishOk = norm(wishEl.value).length >= 2 && wishEl.value.trim().length <= MAX_WISH;
    markInvalid(nameEl, !nameOk); showErr('errName', !nameOk);
    markInvalid(wishEl, !wishOk); showErr('errWish', !wishOk);
    if (!nameOk) nameEl.focus(); else if (!wishOk) wishEl.focus();
    return nameOk && wishOk;
  }

  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains('is-invalid')) {
      markInvalid(el, false);
      showErr(el.id === 'rsvpName' ? 'errName' : 'errWish', false);
    }
    setSubmitError('');
  });

  /* ---------- wall (built with textContent — user text is never parsed as HTML) ---------- */
  function addWishCard(name, wish, prepend) {
    if (wishesEmpty) wishesEmpty.hidden = true;
    if (wishesWall.querySelectorAll('.wish-card').length >= MAX_CARDS && !prepend) return;

    var article = document.createElement('article');
    article.className = 'wish-card';
    var q = document.createElement('p');
    q.className = 'wish-card__quote';
    q.textContent = String(wish);
    var m = document.createElement('p');
    m.className = 'wish-card__meta';
    m.textContent = String(name);
    article.appendChild(q);
    article.appendChild(m);

    var first = wishesWall.querySelector('.wish-card');
    if (prepend && first) wishesWall.insertBefore(article, first);
    else wishesWall.appendChild(article);
  }

  /* ---------- transport (Firebase Realtime Database, compat SDK loaded on demand) ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }
  var dbPromise = null;
  function getDb() {
    if (db) return Promise.resolve(db);
    if (dbPromise) return dbPromise;
    var base = 'https://www.gstatic.com/firebasejs/' + SDK_VER + '/';
    dbPromise = loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-database-compat.js'); })
      .then(function () {
        var app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(FB);
        db = window.firebase.database(app);
        return db;
      })
      .catch(function (err) { dbPromise = null; throw err; });
    return dbPromise;
  }

  function saveWish(data) {
    return getDb().then(function (d) {
      return d.ref(WISHES_PATH).push({
        name: data.name,
        wish: data.wish,
        createdAt: window.firebase.database.ServerValue.TIMESTAMP
      });
    });
  }

  function finishSuccess(name, wish) {
    setLoading(false);
    form.hidden = true;
    successBox.hidden = false;
    addWishCard(name, wish, true);
    var sent = lsGet(LS_SENT, []);
    sent.push(hash(norm(name).toLowerCase() + '|' + norm(wish).toLowerCase()));
    lsSet(LS_SENT, sent.slice(-50));
  }

  /* ---------- submit ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;                       /* prevent double-clicks while in flight */
    setSubmitError('');

    /* honeypot — bots fill hidden fields; pretend success, send nothing */
    var hp = document.getElementById('rsvpWebsite');
    if (hp && hp.value) { form.hidden = true; successBox.hidden = false; return; }

    if (!validate()) return;

    var name = norm(document.getElementById('rsvpName').value);
    var wish = document.getElementById('rsvpWish').value.trim().replace(/\r\n/g, '\n');
    var key = hash(name.toLowerCase() + '|' + norm(wish).toLowerCase());

    if (lsGet(LS_SENT, []).indexOf(key) !== -1) {
      setSubmitError('This wish has already been sent. Thank you!');
      return;
    }
    if (Date.now() - lastSubmitAt < MIN_GAP_MS) {
      setSubmitError('Please wait a moment before sending again.');
      return;
    }
    lastSubmitAt = Date.now();
    setLoading(true);

    if (!CONNECTED) {
      /* PREVIEW MODE — nothing leaves the device */
      var local = lsGet(LS_LOCAL, []);
      local.push({ name: name, wish: wish });
      lsSet(LS_LOCAL, local.slice(-50));
      setTimeout(function () { finishSuccess(name, wish); }, 500);
      return;
    }

    saveWish({ name: name, wish: wish }).then(function () {
      finishSuccess(name, wish);
    }).catch(function () {
      setLoading(false);
      lastSubmitAt = 0;
      setSubmitError('Something went wrong. Please check your connection and try again.');
    });
  });

  /* ---------- initial wall ---------- */
  function loadWishes() {
    if (!CONNECTED) {
      if (noteEl) {
        noteEl.hidden = false;
        noteEl.textContent = 'Preview mode: wishes are kept on this device only until Firebase is connected.';
      }
      lsGet(LS_LOCAL, []).slice().reverse().forEach(function (w) {
        if (w && w.name && w.wish) addWishCard(w.name, w.wish, false);
      });
      return;
    }
    getDb().then(function (d) {
      return d.ref(WISHES_PATH).orderByChild('createdAt').limitToLast(MAX_CARDS).once('value');
    }).then(function (snap) {
      var list = [];
      snap.forEach(function (child) { list.push(child.val()); });
      list.reverse().forEach(function (w) {   /* newest first */
        if (w && w.name && w.wish && String(w.wish).trim()) addWishCard(w.name, w.wish, false);
      });
    }).catch(function () { /* wall simply stays empty until the first wish arrives */ });
  }

  loadWishes();
})();
