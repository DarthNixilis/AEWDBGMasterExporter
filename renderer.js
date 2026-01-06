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
function cardCost(row) { return norm(getField(row, "Cost")); }
function cardMomentum(row) { return norm(getField(row, "Momentum")); }

// Game text can be under different headers depending on export version.
// We’ll display the first non-empty one.
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
    "Card Text"
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

function renderCardTile(row) {
  const name = cardName(row);
  const type = cardType(row) || "Card";
  const set = cardSet(row);
  const cost = cardCost(row);
  const mom = cardMomentum(row);
  const text = cardGameText(row);

  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div class="cardTitle">${escapeHtml(name)}</div>
    <div class="cardMeta">
      <span class="pill">${escapeHtml(type)}</span>
      ${set ? `<span class="pill">${escapeHtml(set)}</span>` : ""}
      ${cost ? `<span class="pill">Cost: ${escapeHtml(cost)}</span>` : ""}
      ${mom ? `<span class="pill">Momentum: ${escapeHtml(mom)}</span>` : ""}
    </div>
    ${text ? `<div class="cardText">${escapeHtml(text)}</div>` : `<div class="muted cardSmall">(no game text column found for this card)</div>`}
    ${row.__sourceFile ? `<div class="muted cardSmall" style="margin-top:8px;">Source: <code>${escapeHtml(row.__sourceFile)}</code></div>` : ""}
  `;
  return div;
}

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

function normalizeSearch(s) {
  return norm(s).toLowerCase();
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

  let data;
  try {
    data = await loadAllData();
  } catch (e) {
    return;
  }

  // Persona dropdown: NAME ONLY (no type appended)
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
    opt.textContent = nm; // Name only
    personaSelect.appendChild(opt);
  }

  // Build filter dropdown options from pool
  fillSelect(typeFilter, ["", ...buildTypeOptions(data.pool)], (v) => v || "All");
  fillSelect(setFilter, ["", ...buildSetOptions(data.pool)], (v) => v || "All");

  // Pool rendering state
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

    for (const r of shown) poolGrid.appendChild(renderCardTile(r));

    if (shown.length < rows.length) {
      showMoreHint.textContent = `Showing ${shown.length} of ${rows.length}.`;
      showMoreBtn.disabled = false;
    } else {
      showMoreHint.textContent = `Showing all ${rows.length}.`;
      showMoreBtn.disabled = true;
    }
  }

  function renderStarters(personaName) {
    clearEl(starterGrid);

    if (!personaName) {
      starterGrid.innerHTML = `<div class="muted">No Persona selected.</div>`;
      return;
    }

    let starters = data.startersByPersona.get(personaName) || [];

    // Loose match fallback (whitespace weirdness)
    if (!starters.length) {
      const key = Array.from(data.startersByPersona.keys()).find(k => k.trim() === personaName.trim());
      if (key) starters = data.startersByPersona.get(key) || [];
    }

    if (!starters.length) {
      starterGrid.innerHTML =
        `<div class="muted">No Starter/Kit cards found for <b>${escapeHtml(personaName)}</b>. Check the TSV column name "Starting For" and values.</div>`;
      return;
    }

    const sorted = [...starters].sort((a, b) => {
      const ta = cardType(a).localeCompare(cardType(b));
      if (ta !== 0) return ta;
      return cardName(a).localeCompare(cardName(b));
    });

    for (const r of sorted) starterGrid.appendChild(renderCardTile(r));
  }

  // Events
  personaSelect.addEventListener("change", () => {
    renderStarters(personaSelect.value);
    setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}  Persona: ${personaSelect.value || "(none)"}`);
  });

  clearPersonaBtn?.addEventListener("click", () => {
    personaSelect.value = "";
    renderStarters("");
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
  renderStarters("");
  renderPool();
  setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}`);

  function fillSelect(selectEl, values, labeler) {
    clearEl(selectEl);
    for (const v of values) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = labeler(v);
      selectEl.appendChild(opt);
    }
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
}