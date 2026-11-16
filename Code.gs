// ============================================================
//  Code.gs — Google Apps Script for the Jeesmon & Sruthi
//  engagement invitation (Wishes form + Wishes Wall)
//
//  HOW TO DEPLOY  (full walkthrough in README.md)
//  1. Create a Google Sheet → Extensions → Apps Script
//  2. Paste this ENTIRE file into Code.gs and save
//  3. Deploy → New deployment → type "Web app"
//       Execute as: Me      Who has access: Anyone
//  4. Copy the Web app URL into js/config.js → SCRIPT_URL
//  After editing this file later: Deploy → Manage deployments →
//  pencil icon → Version: "New version" → Deploy.
// ============================================================

var SHEET_NAME = 'Wishes';
var HEADERS = ['Timestamp', 'Name', 'Wish'];
var MAX_NAME = 80;
var MAX_WISH = 500;
var DEDUPE_LOOKBACK = 200;   // rows checked for an identical earlier wish
var WALL_LIMIT = 200;        // most recent wishes returned to the website

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold').setBackground('#14110C')
      .setFontColor('#D4B86A').setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 420);
  }
  return sheet;
}

// Stop spreadsheet formula injection (=, +, -, @ at the start of a cell)
function safeCell(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function clean(v, max) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'getWishes') return getWishesResponse();
  return jsonResponse({ result: 'ok', message: 'Wishes API is running.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (x) { data = {}; }
    }
    if ((!data.name || !data.wish) && e && e.parameter) {
      data.name = data.name || e.parameter.name;
      data.wish = data.wish || e.parameter.wish;
      data.timestamp = data.timestamp || e.parameter.timestamp;
    }

    var name = clean(data.name, MAX_NAME);
    var wish = clean(data.wish, MAX_WISH);
    if (name.length < 2 || wish.length < 2) {
      return jsonResponse({ result: 'error', message: 'Name and wish are required.' });
    }

    var sheet = getSheet();
    var last = sheet.getLastRow();
    if (last > 1) {
      var from = Math.max(2, last - DEDUPE_LOOKBACK + 1);
      var rows = sheet.getRange(from, 2, last - from + 1, 2).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase() === name.toLowerCase() &&
            String(rows[i][1]).toLowerCase() === wish.toLowerCase()) {
          return jsonResponse({ result: 'duplicate' });
        }
      }
    }

    var stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM yyyy, hh:mm a');
    sheet.appendRow([stamp, safeCell(name), safeCell(wish)]);
    return jsonResponse({ result: 'success' });

  } catch (err) {
    return jsonResponse({ result: 'error', message: 'Could not save wish.' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function getWishesResponse() {
  try {
    var sheet = getSheet();
    var last = sheet.getLastRow();
    if (last <= 1) return jsonResponse({ wishes: [] });

    var from = Math.max(2, last - WALL_LIMIT + 1);
    var rows = sheet.getRange(from, 2, last - from + 1, 2).getValues();
    var wishes = [];
    for (var r = rows.length - 1; r >= 0; r--) {          // newest first
      var name = String(rows[r][0] || '').replace(/^'/, '').trim();
      var wish = String(rows[r][1] || '').replace(/^'/, '').trim();
      if (name && wish) wishes.push({ name: name, wish: wish });
    }
    return jsonResponse({ wishes: wishes });
  } catch (err) {
    return jsonResponse({ wishes: [] });
  }
}
