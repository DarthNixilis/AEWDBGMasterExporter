// FILE: renderer.js
// Export warnings (non-blocking) + compact add buttons remain.

import { loadSetList, loadAllCardsFromSets } from "./data-loader.js";
import {
  createStore, ingestAllCards,
  setPersona, clearPersonas,
  addToDeck, removeFromDeck, deckCounts, clearDeck,
  exportDeckAsText, exportDeckAsLackeyDek,
  importDeckFromAny,
  canAddToDeck,
  saveToLocal, loadFromLocal, applyLocalPayload,
  getDeckWarnings,
} from "./store.js";

const store = createStore();
const el = (id) => document.getElementById(id);

function nowTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function toast(title, msg) {
  const host = el("toastHost");
  const wrap = document.createElement("div");
  wrap.className = "toast";

  const top = document.createElement("div");
  top.className = "toastTop";

  const left = document.createElement("div");
  left.innerHTML = `<div class="toastTitle">${escapeHtml(title)} <span class="toastTime">· ${escapeHtml(nowTime())}</span></div>`;

  const btns = document.createElement("div");
  btns.className = "toastBtns";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "Copy";
  copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(String(msg ?? "")); } catch {}
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
  body.textContent = String(msg ?? "");

  wrap.appendChild(top);
  wrap.appendChild(body);

  host.appendChild(wrap);
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function setStatus(text) { el("statusLine").textContent = text; }
function failStatus(err, where) {
  setStatus(`Status: ERROR (see popup) Sets: (?) Cards: (?)`);
  toast(where || "App Error", err?.stack || err?.message || String(err));
}

function optionize(select, items, placeholder) {
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

function fillFilter(select, values) {
  const cur = select.value || "All";
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "All";
  all.textContent = "All";
  select.appendChild(all);
  for (const v of values) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  }
  select.value = values.includes(cur) ? cur : "All";
}

function makeCardTile(card, actions = []) {
  const div = document.createElement("div");
  div.className = "cardItem";

  const dmg = card.damage ? ` · DMG ${card.damage}` : "";
  const cost = card.cost ? `Cost ${card.cost}` : "Cost ?";
  const mom = card.momentum ? ` · MOM ${card.momentum}` : "";

  div.innerHTML = `
    <div class="cardName">${escapeHtml(card.name)}</div>
    <div class="meta">${escapeHtml(card.type || card.cardType || "Card")} · ${escapeHtml(cost)}${escapeHtml(mom)}${escapeHtml(dmg)} · Source: ${escapeHtml(card.set)}</div>
    ${card.traits ? `<div class="pillRow">${card.traits.split(/[,;|]/g).map(t=>t.trim()).filter(Boolean).map(t=>`<span class="pill">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    ${card.gameText ? `<div class="gameText">${escapeHtml(card.gameText)}</div>` : ""}
  `;

  if (actions.length) {
    const br = document.createElement("div");
    br.className = "btnRow";
    for (const a of actions) {
      const b = document.createElement("button");
      b.textContent = a.label;
      if (a.className) b.className = a.className;
      if (a.disabled) b.disabled = true;
      b.onclick = a.onClick;
      br.appendChild(b);
    }
    div.appendChild(br);
  }

  return div;
}

let visiblePool = 60;

function passesCardPoolFilters(c) {
  if (c.isKit) return false;
  if (c.startingFor) return false;

  const q = (el("searchInput").value || "").trim().toLowerCase();
  if (q) {
    const hay = `${c.name} ${c.gameText || ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const t = el("typeFilter").value;
  if (t && t !== "All") {
    const ct = (c.type || c.cardType || "").trim();
    if (ct !== t) return false;
  }

  const tr = el("traitFilter").value;
  if (tr && tr !== "All") {
    const traits = (c.traits || "").split(/[,;|]/g).map(x => x.trim()).filter(Boolean);
    if (!traits.includes(tr)) return false;
  }

  const s = el("setFilter").value;
  if (s && s !== "All") {
    if (c.set !== s) return false;
  }

  return true;
}

function renderStarterCards() {
  const host = el("starterCards");
  host.innerHTML = "";
  if (!store.starterCards.length) {
    host.textContent = "(No personas selected)";
    return;
  }
  for (const c of store.starterCards) host.appendChild(makeCardTile(c));
}

function renderDeckLists() {
  const sBox = el("startingDeckBox");
  const pBox = el("purchaseDeckBox");
  sBox.innerHTML = "";
  pBox.innerHTML = "";

  const counts = deckCounts(store);
  el("startingDeckTitle").textContent = `Starting Draw Deck (${counts.starting}/24 target)`;
  el("purchaseDeckTitle").textContent = `Purchase Deck (${counts.purchase} / 36+ target)`;

  const renderMap = (box, zone, map) => {
    const items = [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.card.name.localeCompare(b.card.name));

    if (!items.length) {
      const d = document.createElement("div");
      d.className = "cardItem";
      d.textContent = "(empty)";
      box.appendChild(d);
      return;
    }

    for (const it of items) {
      box.appendChild(makeCardTile(it.card, [
        { label: `Remove (${it.qty})`, className: "secondary", onClick: () => { removeFromDeck(store, zone, it.key); autosave(); renderAll(); } },
        { label: `Add`, onClick: () => { const r = addToDeck(store, zone, it.card); if (!r.ok) toast("Deck rule", r.reason); autosave(); renderAll(); } },
      ]));
    }
  };

  renderMap(sBox, "starting", store.deck.starting);
  renderMap(pBox, "purchase", store.deck.purchase);
}

function renderFilters() {
  const types = [...new Set(store.cards.map(c => (c.type || c.cardType || "").trim()).filter(Boolean))].sort();
  const traits = [...new Set(store.cards.flatMap(c => (c.traits || "").split(/[,;|]/g).map(x => x.trim()).filter(Boolean)))].sort();
  const sets = [...new Set(store.cards.map(c => c.set).filter(Boolean))].sort();

  fillFilter(el("typeFilter"), types);
  fillFilter(el("traitFilter"), traits);
  fillFilter(el("setFilter"), sets);
}

function zoneCount(zone, card) {
  const key = `${card.name}||${card.set}`;
  const map = zone === "starting" ? store.deck.starting : store.deck.purchase;
  return map.get(key)?.qty ?? 0;
}

function addButtonLabel(zone, card) {
  const base = zone === "starting" ? "Starting" : "Purchase";
  const n = zoneCount(zone, card);
  return `${base} [${n}]`;
}

function renderCardPool() {
  const host = el("cardPool");
  host.innerHTML = "";

  const filtered = store.cards.filter(passesCardPoolFilters);
  const slice = filtered.slice(0, visiblePool);

  for (const c of slice) {
    const canStart = canAddToDeck(store, "starting", c);
    const canBuy = canAddToDeck(store, "purchase", c);

    host.appendChild(makeCardTile(c, [
      {
        label: addButtonLabel("starting", c),
        disabled: !canStart.ok,
        onClick: () => {
          const r = addToDeck(store, "starting", c);
          if (!r.ok) toast("Deck rule", r.reason);
          autosave();
          renderAll();
        }
      },
      {
        label: addButtonLabel("purchase", c),
        disabled: !canBuy.ok,
        onClick: () => {
          const r = addToDeck(store, "purchase", c);
          if (!r.ok) toast("Deck rule", r.reason);
          autosave();
          renderAll();
        }
      },
    ]));
  }

  if (filtered.length === 0) host.textContent = "(No cards match filters)";
}

function renderAll() {
  setStatus(`Status: Loaded Sets: ${store.sets.length} Cards: ${store.cards.length}`);
  renderFilters();
  renderStarterCards();
  renderDeckLists();
  renderCardPool();
}

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
function maybeWarnIllegalDeck() {
  const warnings = getDeckWarnings(store);
  if (warnings.length) {
    toast("Deck reminder (still exporting)", warnings.join("\n"));
  }
}

// ----- UI wiring -----
function wireUI() {
  const w = el("personaWrestler");
  const m = el("personaManager");
  const c = el("personaCallName");
  const f = el("personaFaction");

  w.onchange = () => { setPersona(store, "Wrestler", w.value); autosave(); renderAll(); };
  m.onchange = () => { setPersona(store, "Manager", m.value); autosave(); renderAll(); };
  c.onchange = () => { setPersona(store, "Call Name", c.value); autosave(); renderAll(); };
  f.onchange = () => { setPersona(store, "Faction", f.value); autosave(); renderAll(); };

  el("clearPersonas").onclick = () => {
    clearPersonas(store);
    w.value = ""; m.value = ""; c.value = ""; f.value = "";
    autosave();
    renderAll();
  };

  el("searchInput").oninput = () => { visiblePool = 60; renderCardPool(); };
  el("typeFilter").onchange = () => { visiblePool = 60; renderCardPool(); };
  el("traitFilter").onchange = () => { visiblePool = 60; renderCardPool(); };
  el("setFilter").onchange = () => { visiblePool = 60; renderCardPool(); };

  el("clearFilters").onclick = () => {
    el("searchInput").value = "";
    el("typeFilter").value = "All";
    el("traitFilter").value = "All";
    el("setFilter").value = "All";
    visiblePool = 60;
    renderCardPool();
  };

  el("showMore").onclick = () => {
    visiblePool += 60;
    renderCardPool();
  };

  el("copyDeckText").onclick = async () => {
    try {
      maybeWarnIllegalDeck();
      const txt = exportDeckAsText(store);
      await navigator.clipboard.writeText(txt);
      toast("Copied", "Deck list (text) copied.");
    } catch (e) {
      toast("Copy failed", e?.message || String(e));
    }
  };

  el("copyDeckLackey").onclick = async () => {
    try {
      maybeWarnIllegalDeck();
      const dek = exportDeckAsLackeyDek(store, { game: "AEW", set: "AEW" });
      await navigator.clipboard.writeText(dek);
      toast("Copied", "Lackey .dek copied.");
    } catch (e) {
      toast("Copy failed", e?.message || String(e));
    }
  };

  el("clearDeck").onclick = () => {
    clearDeck(store);
    autosave();
    toast("Deck", "Cleared.");
    renderAll();
  };

  el("importFile").onchange = () => {
    const f = el("importFile")?.files?.[0];
    el("importFileName").textContent = f ? `Selected: ${f.name || "(file)"}` : "(no file selected)";
  };

  el("importDeck").onclick = async () => {
    try {
      const r = await readSelectedFileText();
      if (!r.ok) { toast("Import", r.reason); return; }
      const out = importDeckFromAny(store, r.text);
      if (!out.ok) toast("Import failed", out.reason);
      else toast("Imported", `Imported from ${r.name}`);
      autosave();
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

    optionize(el("personaWrestler"), store.personas["Wrestler"], "(none)");
    optionize(el("personaManager"), store.personas["Manager"], "(none)");
    optionize(el("personaCallName"), store.personas["Call Name"], "(none)");
    optionize(el("personaFaction"), store.personas["Faction"], "(none)");

    const loaded = loadFromLocal(store);
    if (loaded.ok && loaded.payload) {
      applyLocalPayload(store, loaded.payload);
      el("personaWrestler").value = store.selectedPersonas["Wrestler"] || "";
      el("personaManager").value = store.selectedPersonas["Manager"] || "";
      el("personaCallName").value = store.selectedPersonas["Call Name"] || "";
      el("personaFaction").value = store.selectedPersonas["Faction"] || "";
    }

    renderAll();
    autosave();
  } catch (e) {
    failStatus(e, "Boot failed");
  }
}

boot();