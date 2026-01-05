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

  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div style="font-weight:900; font-size:16px; margin-bottom:6px;">${escapeHtml(name)}</div>
    <div style="margin-bottom:6px;">
      <span class="pill">${escapeHtml(type)}</span>
      ${set ? `<span class="pill">${escapeHtml(set)}</span>` : ""}
    </div>
    <div class="muted" style="font-size:13px;">
      ${cost ? `Cost: <b>${escapeHtml(cost)}</b>` : ""}
      ${mom ? ` &nbsp; Momentum: <b>${escapeHtml(mom)}</b>` : ""}
      ${row.__sourceFile ? `<div style="margin-top:6px;">Source: <code>${escapeHtml(row.__sourceFile)}</code></div>` : ""}
    </div>
  `;
  return div;
}

function renderPool(poolRows, gridEl) {
  clearEl(gridEl);

  if (!poolRows.length) {
    gridEl.innerHTML = `<div class="muted">No pool cards after exclusions. Check your Kit flag and Starting For usage.</div>`;
    return;
  }

  const MAX = 140;
  const rows = poolRows.slice(0, MAX);

  const info = document.createElement("div");
  info.className = "muted";
  info.style.gridColumn = "1 / -1";
  info.innerHTML = `Showing <b>${rows.length}</b> of <b>${poolRows.length}</b> pool cards (mobile cap).`;
  gridEl.appendChild(info);

  for (const r of rows) gridEl.appendChild(renderCardTile(r));
}

export async function initApp() {
  const AEW = window.AEWDBG || {};
  const setStatus = AEW.setStatus ? AEW.setStatus : () => {};
  const showError = AEW.showError ? AEW.showError : () => {};

  const personaSelect = document.getElementById("personaSelect");
  const clearPersonaBtn = document.getElementById("clearPersonaBtn");
  const starterGrid = document.getElementById("starterGrid");
  const poolGrid = document.getElementById("poolGrid");

  if (!personaSelect || !starterGrid || !poolGrid) {
    showError("UI init failed", new Error("Missing required DOM elements. Check index.html IDs."));
    return;
  }

  let data;
  try {
    data = await loadAllData();
  } catch (e) {
    // loadAllData already popped error
    return;
  }

  // Persona identity = Name only, no type suffix
  const personaNames = data.personas.map(p => p.name).filter(Boolean).sort((a, b) => a.localeCompare(b));

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

  renderPool(data.pool, poolGrid);
  renderStarters("");

  personaSelect.addEventListener("change", () => {
    renderStarters(personaSelect.value);
    setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}  Persona: ${personaSelect.value || "(none)"}`);
  });

  clearPersonaBtn?.addEventListener("click", () => {
    personaSelect.value = "";
    renderStarters("");
    setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}  Persona: (none)`);
  });

  setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}`);

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
}