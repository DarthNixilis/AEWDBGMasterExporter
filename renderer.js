// FILE: renderer.js
import { loadAllData } from "./data-loader.js";

function norm(s) { return String(s ?? "").trim(); }
function getField(row, ...names) {
  for (const n of names) if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  return "";
}

function cardName(row) { return norm(getField(row, "Card Name", "Name", "Title")); }
function cardType(row) { return norm(getField(row, "Type")); }
function cardSet(row) { return norm(getField(row, "Set")); }
function cardCost(row) { return norm(getField(row, "Cost", "C")); }
function cardMomentum(row) { return norm(getField(row, "Momentum", "M")); }
function cardDamage(row) { return norm(getField(row, "Damage", "D")); }

function cardGameText(row) {
  return norm(getField(
    row,
    "Game Text",
    "Rules Text",
    "Rules",
    "Text",
    "Effect",
    "Ability",
    "Abilities",
    "Card Text",
    "Text Box"
  ));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function parseIntSafe(v) {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function isFinisher(row) {
  // Heuristic: finisher can appear in keyword/traits/type/text depending on export
  const fields = [
    cardType(row),
    norm(getField(row, "Keywords", "Keyword")),
    norm(getField(row, "Traits", "Trait")),
    cardGameText(row),
  ].join(" | ").toLowerCase();
  return fields.includes("finisher");
}

function renderCardTile(row, opts = {}) {
  const name = cardName(row);
  const type = cardType(row) || "Card";
  const set = cardSet(row);
  const cost = cardCost(row);
  const mom = cardMomentum(row);
  const dmg = cardDamage(row);
  const text = cardGameText(row);

  const div = document.createElement("div");
  div.className = "card";

  const metaPills = [];
  metaPills.push(`<span class="pill">${escapeHtml(type)}</span>`);
  if (set) metaPills.push(`<span class="pill">${escapeHtml(set)}</span>`);
  if (cost) metaPills.push(`<span class="pill">Cost: ${escapeHtml(cost)}</span>`);
  if (mom) metaPills.push(`<span class="pill">M: ${escapeHtml(mom)}</span>`);
  if (dmg) metaPills.push(`<span class="pill">D: ${escapeHtml(dmg)}</span>`);
  if (isFinisher(row)) metaPills.push(`<span class="pill">Finisher</span>`);

  div.innerHTML = `
    <div class="cardTitle">${escapeHtml(name)}</div>
    <div class="cardMeta">${metaPills.join(" ")}</div>
    ${text ? `<div class="cardText">${escapeHtml(text)}</div>` : `<div class="muted cardSmall">(no game text)</div>`}
    ${row.__sourceFile ? `<div class="muted cardSmall" style="margin-top:8px;">Source: <code>${escapeHtml(row.__sourceFile)}</code></div>` : ""}
  `;

  if (opts.actions && opts.actions.length) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "row";
    actionsRow.style.marginTop = "10px";
    for (const a of opts.actions) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = a.label;
      b.onclick = a.onClick;
      if (a.disabled) b.disabled = true;
      actionsRow.appendChild(b);
    }
    div.appendChild(actionsRow);
  }

  return div;
}

function ensureDeckUIExists() {
  // Inject a deck section below the pool if it doesn't exist yet
  if (document.getElementById("deckSection")) return;

  const poolGrid = document.getElementById("poolGrid");
  if (!poolGrid) return;

  const section = document.createElement("section");
  section.id = "deckSection";
  section.innerHTML = `
    <h2>Deck Builder</h2>
    <p class="muted" id="deckRulesLine">
      Starting Draw Deck: exactly 24 cards (Cost 0 only), max 2 copies per card in Starting. Purchase Deck: at least 36 cards.
      Max 3 copies total across both decks. Only 1 Finisher total.
    </p>

    <div class="row" style="margin: 10px 0;">
      <button id="exportDeckBtn" type="button">Copy deck list</button>
      <button id="exportDeckJsonBtn" type="button">Copy deck JSON</button>
      <button id="clearDeckBtn" type="button">Clear deck</button>
      <span class="muted" id="deckStatusLine"></span>
    </div>

    <div class="row" style="align-items:flex-start; gap:16px;">
      <div style="flex:1; min-width: 320px;">
        <h3>Starting Draw Deck (<span id="startCount">0</span>/24)</h3>
        <div id="startDeckList"></div>
      </div>
      <div style="flex:1; min-width: 320px;">
        <h3>Purchase Deck (<span id="purchaseCount">0</span> / 36+)</h3>
        <div id="purchaseDeckList"></div>
      </div>
    </div>
  `;

  // Insert just above poolGrid (so it’s visible without scrolling to the bottom of the page)
  poolGrid.parentElement.insertBefore(section, poolGrid);
}

function deckKey(row) {
  // Use Name as identity
  return cardName(row);
}

function formatDeckLine(name, qty) {
  return `${qty}x ${name}`;
}

export async function initApp() {
  const AEW = window.AEWDBG || {};
  const setStatus = AEW.setStatus ? AEW.setStatus : () => {};
  const showError = AEW.showError ? AEW.showError : () => {};

  const personaSelect = document.getElementById("personaSelect");
  const clearPersonaBtn = document.getElementById("clearPersonaBtn");
  const starterGrid = document.getElementById("starterGrid");
  const poolGrid = document.getElementById("poolGrid");

  const searchInput = document.getElementById("searchInput");
  const typeFilter = document.getElementById("typeFilter");
  const setFilter = document.getElementById("setFilter");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const poolSummary = document.getElementById("poolSummary");
  const showMoreBtn = document.getElementById("showMoreBtn");
  const showMoreHint = document.getElementById("showMoreHint");

  if (!personaSelect || !starterGrid || !poolGrid || !searchInput || !typeFilter || !setFilter || !poolSummary || !showMoreBtn || !showMoreHint) {
    showError("UI init failed", new Error("Missing required DOM elements. Check index.html IDs."));
    return;
  }

  ensureDeckUIExists();

  const startDeckListEl = document.getElementById("startDeckList");
  const purchaseDeckListEl = document.getElementById("purchaseDeckList");
  const startCountEl = document.getElementById("startCount");
  const purchaseCountEl = document.getElementById("purchaseCount");
  const deckStatusLine = document.getElementById("deckStatusLine");
  const exportDeckBtn = document.getElementById("exportDeckBtn");
  const exportDeckJsonBtn = document.getElementById("exportDeckJsonBtn");
  const clearDeckBtn = document.getElementById("clearDeckBtn");

  if (!startDeckListEl || !purchaseDeckListEl || !startCountEl || !purchaseCountEl || !deckStatusLine || !exportDeckBtn || !exportDeckJsonBtn || !clearDeckBtn) {
    showError("Deck UI init failed", new Error("Deck UI elements missing. (deckSection injection failed?)"));
    return;
  }

  let data;
  try {
    data = await loadAllData();
  } catch (e) {
    return;
  }

  // Persona dropdown: NAME ONLY
  const personaNames = Array.from(new Set(data.personas.map(p => p.name).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  clearEl(personaSelect);
  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = "(none)";
  personaSelect.appendChild(noneOpt);

  for (const nm of personaNames) {
    const opt = document.createElement("option");
    opt.value = nm;
    opt.textContent = nm;
    personaSelect.appendChild(opt);
  }

  // ---- Deck state ----
  // store as maps: name -> { row, qty, locked? }
  let selectedPersona = "";
  const startingDeck = new Map();
  const purchaseDeck = new Map();

  function totalCount(map) {
    let n = 0;
    for (const v of map.values()) n += v.qty;
    return n;
  }

  function copiesAcrossBoth(name) {
    const a = startingDeck.get(name)?.qty ?? 0;
    const b = purchaseDeck.get(name)?.qty ?? 0;
    return a + b;
  }

  function finisherCountAcrossBoth() {
    let count = 0;
    for (const v of startingDeck.values()) if (isFinisher(v.row)) count += v.qty;
    for (const v of purchaseDeck.values()) if (isFinisher(v.row)) count += v.qty;
    return count;
  }

  function addToDeck(map, row, { locked = false } = {}) {
    const name = deckKey(row);
    if (!name) return;

    const existing = map.get(name);
    if (existing) {
      map.set(name, { ...existing, qty: existing.qty + 1 });
    } else {
      map.set(name, { row, qty: 1, locked });
    }
  }

  function removeFromDeck(map, name) {
    const entry = map.get(name);
    if (!entry) return;
    if (entry.locked) return; // locked cards can't be removed
    if (entry.qty <= 1) map.delete(name);
    else map.set(name, { ...entry, qty: entry.qty - 1 });
  }

  function validateAdd(row, target) {
    const name = deckKey(row);
    const costN = parseIntSafe(cardCost(row));
    const totalCopies = copiesAcrossBoth(name);
    const finisherNow = isFinisher(row);

    // Global copy rule: max 3 across both decks
    if (totalCopies >= 3) {
      return `Cannot add "${name}": max 3 copies total across Starting + Purchase.`;
    }

    // Starting deck rules:
    if (target === "starting") {
      if (costN !== 0) {
        return `Cannot add "${name}" to Starting: Starting Draw Deck must be Cost 0 only.`;
      }
      const startingCopies = startingDeck.get(name)?.qty ?? 0;
      if (startingCopies >= 2) {
        return `Cannot add "${name}" to Starting: max 2 copies in Starting Draw Deck.`;
      }
    }

    // Finisher rule (project constraint)
    if (finisherNow) {
      const finTotal = finisherCountAcrossBoth();
      if (finTotal >= 1) {
        return `Cannot add "${name}": only 1 Finisher total is allowed in a deck.`;
      }
    }

    return null;
  }

  function renderDeckLists() {
    const startCount = totalCount(startingDeck);
    const purchaseCount = totalCount(purchaseDeck);

    startCountEl.textContent = String(startCount);
    purchaseCountEl.textContent = String(purchaseCount);

    // Status line with validity
    const startOk = startCount === 24;
    const purchaseOk = purchaseCount >= 36;
    const finOk = finisherCountAcrossBoth() <= 1;

    const issues = [];
    if (!startOk) issues.push(`Starting needs ${24 - startCount} more`);
    if (!purchaseOk) issues.push(`Purchase needs ${36 - purchaseCount} more`);
    if (!finOk) issues.push(`Too many Finishers`);

    deckStatusLine.textContent = issues.length ? `Fix: ${issues.join(" · ")}` : "Deck looks valid.";

    renderDeckMap(startingDeck, startDeckListEl, "starting");
    renderDeckMap(purchaseDeck, purchaseDeckListEl, "purchase");
  }

  function renderDeckMap(map, el, which) {
    clearEl(el);

    if (map.size === 0) {
      el.innerHTML = `<div class="muted">(empty)</div>`;
      return;
    }

    const entries = Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const e of entries) {
      const row = document.createElement("div");
      row.className = "row";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.margin = "6px 0";

      const left = document.createElement("div");
      left.innerHTML = `<b>${escapeHtml(formatDeckLine(e.name, e.qty))}</b> ${e.locked ? `<span class="pill">Locked</span>` : ""} ${isFinisher(e.row) ? `<span class="pill">Finisher</span>` : ""}`;

      const right = document.createElement("div");
      right.className = "row";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.disabled = !!e.locked;
      minus.onclick = () => {
        removeFromDeck(which === "starting" ? startingDeck : purchaseDeck, e.name);
        renderDeckLists();
        renderPool(); // update add buttons availability
      };

      right.appendChild(minus);

      row.appendChild(left);
      row.appendChild(right);
      el.appendChild(row);
    }
  }

  function autoLoadStarters(personaName) {
    // Clear locked starters from previous persona
    for (const [k, v] of startingDeck.entries()) {
      if (v.locked) startingDeck.delete(k);
    }

    if (!personaName) return;

    // Pull starters from mapping
    let starters = data.startersByPersona.get(personaName) || [];
    if (!starters.length) {
      const key = Array.from(data.startersByPersona.keys()).find(k => k.trim() === personaName.trim());
      if (key) starters = data.startersByPersona.get(key) || [];
    }

    // Add as locked to Starting deck
    for (const row of starters) {
      addToDeck(startingDeck, row, { locked: true });
    }
  }

  // ---- Starters section render ----
  function renderStarters(personaName) {
    clearEl(starterGrid);

    if (!personaName) {
      starterGrid.innerHTML = `<div class="muted">No Persona selected.</div>`;
      return;
    }

    let starters = data.startersByPersona.get(personaName) || [];
    if (!starters.length) {
      const key = Array.from(data.startersByPersona.keys()).find(k => k.trim() === personaName.trim());
      if (key) starters = data.startersByPersona.get(key) || [];
    }

    if (!starters.length) {
      starterGrid.innerHTML =
        `<div class="muted">No Starter/Kit cards found for <b>${escapeHtml(personaName)}</b>. Check the TSV column "Starting For".</div>`;
      return;
    }

    const sorted = [...starters].sort((a, b) => {
      const ta = cardType(a).localeCompare(cardType(b));
      if (ta !== 0) return ta;
      return cardName(a).localeCompare(cardName(b));
    });

    for (const r of sorted) {
      starterGrid.appendChild(renderCardTile(r, {
        actions: [
          { label: "Locked starter", onClick: () => {}, disabled: true }
        ]
      }));
    }
  }

  // ---- Pool filtering + rendering with Add buttons ----
  function buildTypeOptions(rows) {
    const set = new Set();
    for (const r of rows) {
      const t = cardType(r);
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function buildSetOptions(rows) {
    const set = new Set();
    for (const r of rows) {
      const s = cardSet(r);
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function fillSelect(selectEl, values, labeler) {
    clearEl(selectEl);
    for (const v of values) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = labeler(v);
      selectEl.appendChild(opt);
    }
  }

  function normalizeSearch(s) { return norm(s).toLowerCase(); }

  fillSelect(typeFilter, ["", ...buildTypeOptions(data.pool)], (v) => v || "All");
  fillSelect(setFilter, ["", ...buildSetOptions(data.pool)], (v) => v || "All");

  let poolLimit = 140;

  function filteredPoolRows() {
    const q = normalizeSearch(searchInput.value);
    const t = norm(typeFilter.value);
    const s = norm(setFilter.value);

    return data.pool.filter(row => {
      if (t && cardType(row) !== t) return false;
      if (s && cardSet(row) !== s) return false;
      if (!q) return true;

      const hay = (cardName(row) + "\n" + cardGameText(row)).toLowerCase();
      return hay.includes(q);
    });
  }

  function renderPool() {
    const rows = filteredPoolRows();
    clearEl(poolGrid);

    if (!rows.length) {
      poolGrid.innerHTML = `<div class="muted">No cards match your filters.</div>`;
      poolSummary.innerHTML = `0 matches. (Pool excludes Kits + anything with Starting For.)`;
      showMoreHint.textContent = "";
      return;
    }

    const shown = rows.slice(0, poolLimit);
    poolSummary.innerHTML = `<b>${rows.length}</b> match(es). (Pool excludes Kits + anything with Starting For.)`;

    for (const r of shown) {
      const name = deckKey(r);

      const errStart = validateAdd(r, "starting");
      const errPurchase = validateAdd(r, "purchase");

      const costN = parseIntSafe(cardCost(r));
      const canStart = errStart === null;
      const canPurchase = errPurchase === null;

      const actions = [];

      // Only show Starting button if it could ever be legal (cost 0)
      if (costN === 0 || costN === null) {
        actions.push({
          label: canStart ? "Add to Starting" : "Add to Starting (blocked)",
          disabled: !canStart,
          onClick: () => {
            const msg = validateAdd(r, "starting");
            if (msg) return showError("Deck rule", new Error(msg));
            addToDeck(startingDeck, r);
            renderDeckLists();
            renderPool();
          }
        });
      }

      actions.push({
        label: canPurchase ? "Add to Purchase" : "Add to Purchase (blocked)",
        disabled: !canPurchase,
        onClick: () => {
          const msg = validateAdd(r, "purchase");
          if (msg) return showError("Deck rule", new Error(msg));
          addToDeck(purchaseDeck, r);
          renderDeckLists();
          renderPool();
        }
      });

      poolGrid.appendChild(renderCardTile(r, { actions }));
    }

    if (shown.length < rows.length) {
      showMoreHint.textContent = `Showing ${shown.length} of ${rows.length}.`;
      showMoreBtn.disabled = false;
    } else {
      showMoreHint.textContent = `Showing all ${rows.length}.`;
      showMoreBtn.disabled = true;
    }
  }

  // ---- Export / Clear ----
  function exportDeckText() {
    const lines = [];
    lines.push(`Persona: ${selectedPersona || "(none)"}`);
    lines.push("");
    lines.push(`Starting Draw Deck (${totalCount(startingDeck)}/24):`);
    lines.push(...deckLinesFromMap(startingDeck));
    lines.push("");
    lines.push(`Purchase Deck (${totalCount(purchaseDeck)} / 36+):`);
    lines.push(...deckLinesFromMap(purchaseDeck));
    lines.push("");
    lines.push(`Finishers: ${finisherCountAcrossBoth()} (max 1)`);
    return lines.join("\n");
  }

  function deckLinesFromMap(map) {
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, qty: v.qty }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => formatDeckLine(e.name, e.qty));
  }

  function exportDeckJson() {
    const payload = {
      persona: selectedPersona || null,
      starting: Array.from(startingDeck.entries()).map(([name, v]) => ({ name, qty: v.qty, locked: !!v.locked })),
      purchase: Array.from(purchaseDeck.entries()).map(([name, v]) => ({ name, qty: v.qty })),
      finisherCount: finisherCountAcrossBoth(),
      counts: { starting: totalCount(startingDeck), purchase: totalCount(purchaseDeck) }
    };
    return JSON.stringify(payload, null, 2);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Android clipboard can be weird; fallback to popup with text
      showError("Copy failed", new Error(text));
    }
  }

  exportDeckBtn.onclick = () => copyToClipboard(exportDeckText());
  exportDeckJsonBtn.onclick = () => copyToClipboard(exportDeckJson());
  clearDeckBtn.onclick = () => {
    startingDeck.clear();
    purchaseDeck.clear();
    autoLoadStarters(selectedPersona);
    renderDeckLists();
    renderPool();
  };

  // ---- Events ----
  personaSelect.addEventListener("change", () => {
    selectedPersona = personaSelect.value || "";
    autoLoadStarters(selectedPersona);
    renderStarters(selectedPersona);
    renderDeckLists();
    renderPool();
    setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}  Persona: ${selectedPersona || "(none)"}`);
  });

  clearPersonaBtn?.addEventListener("click", () => {
    personaSelect.value = "";
    selectedPersona = "";
    autoLoadStarters("");
    renderStarters("");
    renderDeckLists();
    renderPool();
    setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}  Persona: (none)`);
  });

  const rerenderWithDebounce = debounce(() => {
    poolLimit = 140;
    renderPool();
  }, 120);

  searchInput.addEventListener("input", rerenderWithDebounce);
  typeFilter.addEventListener("change", () => { poolLimit = 140; renderPool(); });
  setFilter.addEventListener("change", () => { poolLimit = 140; renderPool(); });

  clearFiltersBtn?.addEventListener("click", () => {
    searchInput.value = "";
    typeFilter.value = "";
    setFilter.value = "";
    poolLimit = 140;
    renderPool();
  });

  showMoreBtn.addEventListener("click", () => {
    poolLimit += 140;
    renderPool();
  });

  // Initial render
  selectedPersona = "";
  autoLoadStarters("");
  renderStarters("");
  renderDeckLists();
  renderPool();

  setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}`);

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
                                                                                                                                    }
