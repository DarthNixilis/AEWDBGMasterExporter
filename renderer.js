// FILE: renderer.js
// Download buttons for TXT and DEK + non-blocking legality warnings + file import + compact add buttons.

import { loadSetList, loadAllCardsFromSets } from "./data-loader.js";
import {
  createStore, ingestAllCards,
  setPersona, clearPersonas,
  addToDeck, removeFromDeck, deckCounts, clearDeck,
  exportDeckAsText, exportDeckAsLackeyDek,
  importDeckFromAny,
  canAddToDeck,
  saveToLocal, loadFromLocal
} from "./store.js";

const store = createStore();
const el = (id) => document.getElementById(id);

const mustEl = (id) => {
  const n = el(id);
  if (!n) throw new Error(`Missing required element: #${id}`);
  return n;
};
const optEl = (id) => el(id);

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toast(title, msg) {
  const host = el("toastHost");
  if (!host) {
    // last resort if toastHost is missing
    alert(`${title}\n\n${msg}`);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "toast";

  const top = document.createElement("div");
  top.className = "toastTop";

  const left = document.createElement("div");
  left.innerHTML = `<div class="toastTitle">${escapeHtml(title)} · ${nowTime()}</div>`;

  const btns = document.createElement("div");
  btns.className = "toastBtns";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${msg}`);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 900);
    } catch {
      // ignore
    }
  };

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => wrap.remove();

  btns.appendChild(copyBtn);
  btns.appendChild(closeBtn);
  top.appendChild(left);
  top.appendChild(btns);

  const body = document.createElement("div");
  body.className = "toastMsg";
  body.textContent = msg;

  wrap.appendChild(top);
  wrap.appendChild(body);
  host.appendChild(wrap);

  // auto-expire after a bit (but leave enough time to copy)
  setTimeout(() => {
    if (wrap.isConnected) wrap.remove();
  }, 25000);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(text) {
  const n = el("statusLine");
  if (n) n.textContent = text;
}

function failStatus(err, prefix) {
  const msg = err && (err.stack || err.message) ? (err.stack || err.message) : String(err);
  setStatus(`Status: ERROR (see popup)  Sets: (?)  Cards: (?)`);
  toast(`${prefix} (data load/import)`, msg);
}

// ----- UI helpers -----
function optionize(selectEl, values, emptyLabel = "(none)") {
  selectEl.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = emptyLabel;
  selectEl.appendChild(empty);

  for (const v of values) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  }
}

function downloadFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ----- Rendering -----
function renderDeckSummaries() {
  const counts = deckCounts(store);

  const startLine = `Cards: ${counts.startingTotal || 0}`;
  const buyLine = `Cards: ${counts.purchaseTotal || 0}`;

  mustEl("startingDeckSummary").textContent = startLine;
  mustEl("purchaseDeckSummary").textContent = buyLine;
}

function renderStarterCards() {
  const host = mustEl("starterCards");
  host.innerHTML = "";

  const starters = store.starterCards || [];
  if (!starters.length) {
    host.innerHTML = `<div style="color:#656d76;">(none)</div>`;
    return;
  }

  for (const card of starters) {
    host.appendChild(renderCard(card));
  }
}

function renderCardPool() {
  const host = mustEl("cardPool");
  host.innerHTML = "";

  const pool = store.filteredPool || [];
  if (!pool.length) {
    host.innerHTML = `<div style="color:#656d76;">(no matches)</div>`;
    return;
  }

  for (const card of pool) {
    host.appendChild(renderCard(card));
  }
}

function renderCard(card) {
  const wrap = document.createElement("div");
  wrap.style.border = "1px solid #d0d7de";
  wrap.style.borderRadius = "12px";
  wrap.style.padding = "10px";
  wrap.style.background = "#fff";

  const title = document.createElement("div");
  title.style.fontWeight = "800";
  title.style.fontSize = "16px";
  title.textContent = card.Name || "(Unnamed)";

  const meta = document.createElement("div");
  meta.style.color = "#656d76";
  meta.style.marginTop = "4px";
  meta.style.fontSize = "13px";
  meta.textContent =
    `${card.Type || "?"} · Cost ${card.Cost ?? "?"} · MOM ${card.Momentum ?? "?"} · DMG ${card.Damage ?? "?"} · Source: ${card.Set || "?"}`;

  const text = document.createElement("div");
  text.style.marginTop = "8px";
  text.style.whiteSpace = "pre-wrap";
  text.textContent = (card["Game Text"] || card.Text || "").trim();

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "10px";
  btnRow.style.marginTop = "10px";
  btnRow.style.flexWrap = "wrap";

  // Compact add buttons (don’t show +1 text)
  const addStarting = document.createElement("button");
  addStarting.textContent = "Starting";
  addStarting.className = "secondary";
  addStarting.style.background = "#fff";
  addStarting.style.color = "#111827";
  addStarting.style.border = "1px solid #d0d7de";

  const addPurchase = document.createElement("button");
  addPurchase.textContent = "Purchase";
  addPurchase.className = "secondary";
  addPurchase.style.background = "#fff";
  addPurchase.style.color = "#111827";
  addPurchase.style.border = "1px solid #d0d7de";

  const counts = deckCounts(store);
  const ownedStart = counts.byCardStarting?.[card.Id] || 0;
  const ownedBuy = counts.byCardPurchase?.[card.Id] || 0;

  // We only enforce max copies, never total size
  const startOk = canAddToDeck(store, card, "starting");
  const buyOk = canAddToDeck(store, card, "purchase");

  addStarting.disabled = !startOk;
  addPurchase.disabled = !buyOk;

  if (!startOk && ownedStart > 0) addStarting.textContent = `Starting (${ownedStart})`;
  else if (ownedStart > 0) addStarting.textContent = `Starting (${ownedStart})`;

  if (!buyOk && ownedBuy > 0) addPurchase.textContent = `Purchase (${ownedBuy})`;
  else if (ownedBuy > 0) addPurchase.textContent = `Purchase (${ownedBuy})`;

  addStarting.onclick = () => {
    try {
      addToDeck(store, card, "starting", 1);
      autosave();
      renderAll();
    } catch (e) {
      toast("Add failed", e?.message || String(e));
    }
  };

  addPurchase.onclick = () => {
    try {
      addToDeck(store, card, "purchase", 1);
      autosave();
      renderAll();
    } catch (e) {
      toast("Add failed", e?.message || String(e));
    }
  };

  btnRow.appendChild(addStarting);
  btnRow.appendChild(addPurchase);

  wrap.appendChild(title);
  wrap.appendChild(meta);
  if (text.textContent) wrap.appendChild(text);
  wrap.appendChild(btnRow);

  return wrap;
}

function renderAll() {
  // status
  const setsCount = (store.setFiles || []).length || "?";
  const cardsCount = (store.allCards || []).length || "?";
  setStatus(`Status: Loaded  Sets: ${setsCount}  Cards: ${cardsCount}`);

  renderDeckSummaries();
  renderStarterCards();
  renderCardPool();
}

// ----- Filtering -----
function applyFilters() {
  const q = (mustEl("searchInput").value || "").trim().toLowerCase();
  const type = mustEl("typeFilter").value || "All";
  const trait = mustEl("traitFilter").value || "All";
  const set = mustEl("setFilter").value || "All";

  store.filteredPool = (store.cardPool || []).filter((c) => {
    if (type !== "All" && (c.Type || "") !== type) return false;
    if (set !== "All" && (c.Set || "") !== set) return false;

    // Trait filtering: supports “Traits” field with comma-separated values
    if (trait !== "All") {
      const raw = (c.Traits || c.Trait || "").toLowerCase();
      const has = raw.split(/[,|]/g).map(s => s.trim()).filter(Boolean);
      if (!has.includes(trait.toLowerCase())) return false;
    }

    if (!q) return true;
    const hay = `${c.Name || ""}\n${c["Game Text"] || c.Text || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function buildFilterOptions() {
  const typeSel = mustEl("typeFilter");
  const traitSel = mustEl("traitFilter");
  const setSel = mustEl("setFilter");

  const types = new Set();
  const traits = new Set();
  const sets = new Set();

  for (const c of store.cardPool || []) {
    if (c.Type) types.add(c.Type);
    if (c.Set) sets.add(c.Set);

    const raw = (c.Traits || c.Trait || "").trim();
    if (raw) {
      raw.split(/[,|]/g).map(s => s.trim()).filter(Boolean).forEach(t => traits.add(t));
    }
  }

  const optList = (sel, values) => {
    sel.innerHTML = "";
    sel.appendChild(new Option("All", "All"));
    [...values].sort((a, b) => a.localeCompare(b)).forEach(v => sel.appendChild(new Option(v, v)));
  };

  optList(typeSel, types);
  optList(traitSel, traits);
  optList(setSel, sets);
}

// ----- Local persistence -----
function autosave() {
  try { saveToLocal(store); } catch {}
}

// ----- File import -----
async function readSelectedFileText() {
  const input = el("importFile");
  const f = input?.files?.[0];
  if (!f) return { ok: false, reason: "No file selected." };
  const text = await f.text();
  return { ok: true, name: f.name || "(file)", text };
}

// ----- Export warning helper -----
function legalityWarning() {
  const counts = deckCounts(store);
  const msgs = [];

  // Your rule: don’t block, just warn gently if “not legal”.
  // Starting: typically 24. Purchase: typically 36+. But do not enforce here.
  if ((counts.startingTotal || 0) !== 24) msgs.push(`Starting deck is ${counts.startingTotal || 0} (expected 24).`);
  if ((counts.purchaseTotal || 0) < 36) msgs.push(`Purchase deck is ${counts.purchaseTotal || 0} (expected 36+).`);

  return msgs.length ? `NOTE: Deck may be illegal:\n- ${msgs.join("\n- ")}` : "";
}

function safeFilePart(s) {
  return String(s || "")
    .trim()
    .slice(0, 40)
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildDeckBaseName() {
  const picks = store.selectedPersonas || {};
  const parts = [
    picks.Wrestler,
    picks.Manager,
    picks["Call Name"],
    picks.Faction
  ].filter(Boolean).map(safeFilePart);

  const base = parts.length ? parts.join("__") : "AEW_Deck";
  return base || "AEW_Deck";
}

// ----- Wire UI -----
function wireUI() {
  const w = mustEl("personaWrestler");
  const m = mustEl("personaManager");
  const c = mustEl("personaCallName");
  const f = mustEl("personaFaction");

  w.onchange = () => { setPersona(store, "Wrestler", w.value); autosave(); renderAll(); };
  m.onchange = () => { setPersona(store, "Manager", m.value); autosave(); renderAll(); };
  c.onchange = () => { setPersona(store, "Call Name", c.value); autosave(); renderAll(); };
  f.onchange = () => { setPersona(store, "Faction", f.value); autosave(); renderAll(); };

  mustEl("clearPersonas").onclick = () => {
    clearPersonas(store);
    w.value = ""; m.value = ""; c.value = ""; f.value = "";
    autosave();
    renderAll();
  };

  mustEl("searchInput").oninput = () => { applyFilters(); renderCardPool(); };
  mustEl("typeFilter").onchange = () => { applyFilters(); renderCardPool(); };
  mustEl("traitFilter").onchange = () => { applyFilters(); renderCardPool(); };
  mustEl("setFilter").onchange = () => { applyFilters(); renderCardPool(); };

  mustEl("clearFilters").onclick = () => {
    mustEl("searchInput").value = "";
    mustEl("typeFilter").value = "All";
    mustEl("traitFilter").value = "All";
    mustEl("setFilter").value = "All";
    applyFilters();
    renderCardPool();
  };

  mustEl("showMore").onclick = () => {
    // placeholder: if you later re-add paging, hook it here
    toast("Show more", "Paging is not wired yet in this build.");
  };

  mustEl("downloadTxt").onclick = () => {
    try {
      const base = buildDeckBaseName();
      const warn = legalityWarning();
      const txt = exportDeckAsText(store, warn);
      downloadFile(`${base}.txt`, txt);
      if (warn) toast("Export note", warn);
    } catch (e) {
      toast("Download failed", e?.message || String(e));
    }
  };

  mustEl("downloadDek").onclick = () => {
    try {
      const base = buildDeckBaseName();
      const warn = legalityWarning();
      const dek = exportDeckAsLackeyDek(store, warn);
      downloadFile(`${base}.dek`, dek);
      if (warn) toast("Export note", warn);
    } catch (e) {
      toast("Download failed", e?.message || String(e));
    }
  };

  mustEl("clearDeck").onclick = () => {
    clearDeck(store);
    autosave();
    toast("Deck", "Cleared.");
    renderAll();
  };

  mustEl("importFile").onchange = () => {
    const f = el("importFile")?.files?.[0];
    mustEl("importFileName").textContent = f ? `Selected: ${f.name || "(file)"}` : "(no file selected)";
  };

  mustEl("importBtn").onclick = async () => {
    try {
      const r = await readSelectedFileText();
      if (!r.ok) {
        toast("Import", r.reason);
        return;
      }
      importDeckFromAny(store, r.text);
      autosave();
      toast("Import", `Imported: ${r.name}`);
      renderAll();
    } catch (e) {
      toast("Import failed", e?.message || String(e));
    }
  };
}

// ----- Boot -----
async function boot() {
  try {
    setStatus(`Status: Loading… Sets: (loading) Cards: (loading)`);
    wireUI();

    const setFiles = await loadSetList();
    const rows = await loadAllCardsFromSets(setFiles);

    ingestAllCards(store, rows, setFiles);

    optionize(mustEl("personaWrestler"), store.personas["Wrestler"], "(none)");
    optionize(mustEl("personaManager"), store.personas["Manager"], "(none)");
    optionize(mustEl("personaCallName"), store.personas["Call Name"], "(none)");
    optionize(mustEl("personaFaction"), store.personas["Faction"], "(none)");

    // restore deck + persona picks
    loadFromLocal(store);

    buildFilterOptions();
    applyFilters();

    renderAll();
    autosave();
  } catch (e) {
    failStatus(e, "Boot failed");
  }
}

boot();
