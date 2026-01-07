// FILE: renderer.js
// Root renderer for AEW DBG Master Exporter (mobile-friendly, no-console debugging).
// Fixes null.onclick crash by creating toast UI inside #toastHost dynamically,
// and wiring only the element IDs that actually exist in index.html.

import { loadSetList, loadAllCardsFromSets } from "./data-loader.js";
import {
  createStore, ingestAllCards,
  setPersona, clearPersonas,
  addToDeck, removeFromDeck, deckCounts, clearDeck,
  exportDeckAsText, exportDeckAsLackeyDek,
  importDeckFromAny,
  saveToLocal, loadFromLocal, applyLocalPayload,
  getDeckWarnings,
  canAddToDeck,
} from "./store.js";

const store = createStore();

const $ = (id) => document.getElementById(id);

function nowTime() {
  const d = new Date();
  const hh = d.getHours() % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ap = d.getHours() >= 12 ? "PM" : "AM";
  return `${hh}:${mm}:${ss} ${ap}`;
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

// ----- Toast UI (built dynamically so it can't be missing) -----
let toastEls = null;

function ensureToast() {
  if (toastEls) return toastEls;

  const host = $("toastHost");
  if (!host) {
    // Last-ditch fallback
    return null;
  }

  host.innerHTML = `
    <div class="toastCard" id="toastCard" style="
      position:fixed; left:12px; right:12px; bottom:12px;
      background:#111; color:#fff; border-radius:14px;
      padding:14px; box-shadow:0 10px 30px rgba(0,0,0,.35);
      display:none; z-index:9999;
      ">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
        <div>
          <div id="toastTitle" style="font-weight:700; font-size:14px; line-height:1.2;">App Error</div>
          <div id="toastTime" style="opacity:.8; font-size:12px; margin-top:2px;">${escapeHtml(nowTime())}</div>
        </div>
        <div style="display:flex; gap:10px;">
          <button id="toastCopy" style="border-radius:12px; padding:8px 12px; border:1px solid rgba(255,255,255,.25); background:#222; color:#fff;">Copy</button>
          <button id="toastClose" style="border-radius:12px; padding:8px 12px; border:1px solid rgba(255,255,255,.25); background:#222; color:#fff;">Close</button>
        </div>
      </div>
      <pre id="toastBody" style="white-space:pre-wrap; margin:10px 0 0; font-size:12px; line-height:1.35; opacity:.95;"></pre>
    </div>
  `;

  const card = $("toastCard");
  const title = $("toastTitle");
  const body = $("toastBody");
  const time = $("toastTime");
  const btnClose = $("toastClose");
  const btnCopy = $("toastCopy");

  const hide = () => { if (card) card.style.display = "none"; };
  if (btnClose) btnClose.onclick = hide;

  if (btnCopy) {
    btnCopy.onclick = async () => {
      const text = `${title?.textContent || ""}\n\n${body?.textContent || ""}`.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
    };
  }

  toastEls = { card, title, body, time };
  return toastEls;
}

function toast(title, message) {
  const t = ensureToast();
  if (!t) return alert(`${title}\n\n${message}`);

  t.title.textContent = title || "Message";
  t.body.textContent = (message ?? "").toString();
  t.time.textContent = nowTime();
  t.card.style.display = "block";
}

function setStatusLine(setsCount, cardsCount, isError = false) {
  const s = $("statusLine");
  if (!s) return;
  if (isError) {
    s.textContent = `Status: ERROR (see popup)  Sets: (?)  Cards: (?)`;
  } else {
    s.textContent = `Status: Loaded  Sets: ${setsCount}  Cards: ${cardsCount}`;
  }
}

function fail(where, err) {
  setStatusLine(0, 0, true);
  toast(where || "App Error", err?.stack || err?.message || String(err));
}

// ----- UI helpers -----
function optionize(select, items, placeholder) {
  if (!select) return;
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder || "(none)";
  select.appendChild(opt0);
  for (const c of items) {
    const o = document.createElement("option");
    o.value = c.name;
    o.textContent = c.name;
    select.appendChild(o);
  }
}

function passesCardPoolFilters(c) {
  // Hard exclusions
  if (c.isPersona) return
