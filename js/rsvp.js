/* ============================================================
   rsvp.js — "Leave Your Wishes" form + Wishes Wall
   Jeesmon & Sruthi — Engagement Invitation

   Configuration lives in js/config.js (INVITE_CONFIG.SCRIPT_URL).
   Setup steps are in README.md.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.INVITE_CONFIG || {};
  var SCRIPT_URL = String(CFG.SCRIPT_URL || '').trim();
  var CONNECTED = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(SCRIPT_URL);

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

  /* ---------- transport ---------- */
  function postToSheet(data) {
    var body = JSON.stringify(data);
    /* text/plain keeps this a "simple" request (no CORS pre-flight) */
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (json) {
      if (json && (json.result === 'success' || json.result === 'duplicate')) return json;
      throw new Error((json && json.message) || 'Rejected');
    }).catch(function (err) {
      /* A CORS/redirect quirk can hide a delivered response. Re-send once in
         no-cors mode; the script de-duplicates, so a repeat cannot double-post. */
      if (err instanceof TypeError) {
        return fetch(SCRIPT_URL, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body
        }).then(function () { return { result: 'success', unverified: true }; });
      }
      throw err;
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

    postToSheet({
      name: name,
      wish: wish,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    }).then(function () {
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
        noteEl.textContent = 'Preview mode: wishes are kept on this device only until Google Sheets is connected.';
      }
      lsGet(LS_LOCAL, []).slice().reverse().forEach(function (w) {
        if (w && w.name && w.wish) addWishCard(w.name, w.wish, false);
      });
      return;
    }
    fetch(SCRIPT_URL + '?action=getWishes', { method: 'GET' })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (json) {
        if (!json || !Array.isArray(json.wishes)) return;
        json.wishes.forEach(function (w) {
          if (w && w.name && w.wish && String(w.wish).trim()) addWishCard(w.name, w.wish, false);
        });
      })
      .catch(function () { /* wall simply stays empty until the first wish arrives */ });
  }

  loadWishes();
})();
