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
  saveToLocal, loadFromLocal, applyLocalPayload,
  getDeckWarnings,
} from "./store.js";

const store = createStore();
const el = (id) => document.getElementById(id);

function nowTime() {
  const d = new Date();
  const hh = d.getHours() % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ap = d.getHours() >= 12 ? "PM" : "AM";
  return `${hh}:${mm}:${ss} ${ap}`;
}

function toast(title, message) {
  const t = el("toast");
  const tt = el("toastTitle");
  const tb = el("toastBody");
  if (!t || !tt || !tb) return alert(`${title}\n\n${message}`);
  tt.textContent = title || "Message";
  tb.textContent = (message ?? "").toString();
  t.classList.add("show");
  el("toastTime").textContent = nowTime();
}

function hideToast() {
  const t = el("toast");
  if (t) t.classList.remove("show");
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

function escapeHtml(s) {
  return (s ?? "").toString()
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function addButtonLabel(zone, card) {
  // Buttons don’t need "+1". Keep them short.
  return zone === "starting" ? "Starting" : "Purchase";
}

function makeCardTile(card, actions = []) {
  const div = document.createElement("div");
  div.className = "cardItem";

  const dmg = (card.damage !== "" && card.damage != null) ? ` · DMG ${card.damage}` : "";
  const mom = (card.momentum !== "" && card.momentum != null) ? ` · MOM ${card.momentum}` : "";
  const cost = (card.cost !== "" && card.cost != null) ? ` · Cost ${card.cost}` : "";

  div.innerHTML = `
    <div class="cardName">${escapeHtml(card.name)}</div>
    <div class="cardMeta">${escapeHtml(card.type || card.cardType || "")}${cost}${mom}${dmg} · Source: ${escapeHtml(card.set || "")}</div>
    <div class="cardText">${escapeHtml(card.gameText || "(no text)")}</div>
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

function deckButtonText(zone) {
  const counts = deckCounts(store);
  const n = zone === "starting" ? counts.starting : counts.purchase;
  return zone === "starting" ? `Starting (${n})` : `Purchase (${n})`;
}

function passesCardPoolFilters(c) {
  // Exclude all non-playable pools
  if (c.isPersona) return false;
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

let visiblePool = 60;

function renderStarterKit() {
  const host = el("starterCards");
  host.innerHTML = "";

  const picked = Object.values(store.selectedPersonas || {}).filter(Boolean);
  if (picked.length === 0) {
    host.textContent = "(No personas selected)";
    return;
  }

  for (const c of store.starterCards || []) {
    host.appendChild(makeCardTile(c, []));
  }

  if (!store.starterCards || store.starterCards.length === 0) {
    host.textContent = "(No starter/kit cards found for those personas)";
  }
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

  el("showMoreWrap").style.display = filtered.length > visiblePool ? "block" : "none";
  el("poolCount").textContent = `Showing ${Math.min(visiblePool, filtered.length)} of ${filtered.length} pool cards`;
}

function renderDeck() {
  el("btnAddStarting").textContent = deckButtonText("starting");
  el("btnAddPurchase").textContent = deckButtonText("purchase");

  const sHost = el("startingDeck");
  const pHost = el("purchaseDeck");
  sHost.innerHTML = "";
  pHost.innerHTML = "";

  const makeLine = (it, zone) => {
    const row = document.createElement("div");
    row.className = "deckRow";
    row.innerHTML = `
      <div class="deckQty">${it.qty}x</div>
      <div class="deckName">${escapeHtml(it.name)} <span class="deckSet">(${escapeHtml(it.set || "")})</span></div>
    `;
    const btn = document.createElement("button");
    btn.textContent = "−";
    btn.onclick = () => {
      const c = store.cards.find(x => x.name === it.name && x.set === it.set) || { name: it.name, set: it.set };
      removeFromDeck(store, zone, c);
      autosave();
      renderAll();
    };
    row.appendChild(btn);
    return row;
  };

  for (const it of store.deck.starting) sHost.appendChild(makeLine(it, "starting"));
  for (const it of store.deck.purchase) pHost.appendChild(makeLine(it, "purchase"));

  const warns = getDeckWarnings(store);
  el("deckWarnings").innerHTML = warns.length ? `<div class="warnBox"><b>Deck warnings:</b><ul>${warns.map(w => `<li>${escapeHtml(w)}</li>`).join("")}</ul></div>` : "";
}

function renderFilters() {
  // Type
  const types = [...new Set(store.cards.filter(passesCardPoolFilters)
    .map(c => (c.type || c.cardType || "").trim())
    .filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const typeSel = el("typeFilter");
  const curType = typeSel.value || "All";
  typeSel.innerHTML = `<option value="All">All</option>` + types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  typeSel.value = types.includes(curType) ? curType : "All";

  // Trait
  const traitSet = new Set();
  for (const c of store.cards) {
    if (!passesCardPoolFilters(c)) continue;
    for (const tr of (c.traits || "").split(/[,;|]/g).map(x => x.trim()).filter(Boolean)) traitSet.add(tr);
  }
  const traits = [...traitSet].sort((a, b) => a.localeCompare(b));

  const traitSel = el("traitFilter");
  const curTrait = traitSel.value || "All";
  traitSel.innerHTML = `<option value="All">All</option>` + traits.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  traitSel.value = traits.includes(curTrait) ? curTrait : "All";

  // Set
  const sets = [...new Set(store.cards.map(c => c.set).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const setSel = el("setFilter");
  const curSet = setSel.value || "All";
  setSel.innerHTML = `<option value="All">All</option>` + sets.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  setSel.value = sets.includes(curSet) ? curSet : "All";
}

function renderAll() {
  setStatus(`Status: Loaded Sets: ${store.sets.length} Cards: ${store.cards.length}`);

  optionize(el("personaWrestler"), store.personas["Wrestler"], "(none)");
  optionize(el("personaManager"), store.personas["Manager"], "(none)");
  optionize(el("personaCallName"), store.personas["Call Name"], "(none)");
  optionize(el("personaFaction"), store.personas["Faction"], "(none)");

  renderStarterKit();
  renderFilters();
  renderCardPool();
  renderDeck();
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function autosave() {
  try {
    saveToLocal(store);
    el("autosaveNote").textContent = "Auto-saved locally.";
  } catch (e) {
    el("autosaveNote").textContent = "Auto-save failed.";
  }
}

function wireUI() {
  el("toastClose").onclick = hideToast;

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

  el("btnExportTxt").onclick = () => downloadFile("deck.txt", exportDeckAsText(store));
  el("btnExportDek").onclick = () => downloadFile("deck.dek", exportDeckAsLackeyDek(store));

  el("btnClearDeck").onclick = () => { clearDeck(store); autosave(); renderAll(); };

  el("importFile").onchange = async () => {
    try {
      const f = el("importFile").files?.[0];
      if (!f) return;
      const text = await f.text();
      const r = importDeckFromAny(store, text);
      if (!r.ok) toast("Import failed", r.reason);
      else toast("Imported", `Imported from ${f.name}`);
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

    // Load sets
    const list = await loadSetList();
    const rows = await loadAllCardsFromSets(list.setFiles);

    ingestAllCards(store, rows, list.setFiles.map(f => f.split("/").pop() || f));

    // Restore local
    const loaded = loadFromLocal();
    if (loaded.ok) {
      applyLocalPayload(store, loaded.payload);
      el("personaWrestler").value = store.selectedPersonas["Wrestler"] || "";
      el("personaManager").value = store.selectedPersonas["Manager"] || "";
      el("personaCallName").value = store.selectedPersonas["Call Name"] || "";
      el("personaFaction").value = store.selectedPersonas["Faction"] || "";
    }

    renderAll();
    autosave();
  } catch (e) {
    failStatus(e, "Boot failed (data load/import)");
  }
}

boot();
