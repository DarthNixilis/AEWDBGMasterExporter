// FILE: renderer.js
import { loadAllData } from "./data-loader.js";

function norm(s) { return String(s ?? "").trim(); }
function getField(row, ...names) {
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  }
  return "";
}

function computeCardName(row) {
  return norm(getField(row, "Card Name", "Name", "Title"));
}
function computeType(row) { return norm(getField(row, "Type")); }
function computeSet(row) { return norm(getField(row, "Set")); }
function computeCost(row) { return norm(getField(row, "Cost")); }
function computeMomentum(row) { return norm(getField(row, "Momentum")); }

function renderCardTile(row) {
  const name = computeCardName(row);
  const type = computeType(row);
  const set = computeSet(row);
  const cost = computeCost(row);
  const mom = computeMomentum(row);

  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <h4>${escapeHtml(name)}</h4>
    <div>
      <span class="pill">${escapeHtml(type || "Card")}</span>
      ${set ? `<span class="pill">${escapeHtml(set)}</span>` : ""}
    </div>
    <div class="muted" style="margin-top:6px;">
      ${cost ? `Cost: <strong>${escapeHtml(cost)}</strong>` : ""}
      ${mom ? ` &nbsp; Momentum: <strong>${escapeHtml(mom)}</strong>` : ""}
      ${row.__sourceFile ? `<div style="margin-top:6px;">Source: <code>${escapeHtml(row.__sourceFile)}</code></div>` : ""}
    </div>
  `;
  return div;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export async function initApp() {
  const { showError, setStatus } = window.AEWDBG;

  const personaSelect = document.getElementById("personaSelect");
  const clearPersonaBtn = document.getElementById("clearPersonaBtn");
  const starterGrid = document.getElementById("starterGrid");
  const poolGrid = document.getElementById("poolGrid");

  if (!personaSelect || !starterGrid || !poolGrid) {
    showError("UI init failed", "Missing required DOM elements. Check index.html IDs.");
    return;
  }

  let data;
  try {
    data = await loadAllData();
  } catch (e) {
    // loadAllData already shows popup + status, just stop
    return;
  }

  // Fill persona dropdown (identity is NAME ONLY)
  const names = data.personas.map(p => p.name).filter(Boolean);
  names.sort((a, b) => a.localeCompare(b));

  clearEl(personaSelect);
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "(none)";
  personaSelect.appendChild(opt0);

  for (const name of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    personaSelect.appendChild(opt);
  }

  // Render initial pool
  renderPool(data.pool, poolGrid);

  function renderStartersForPersona(personaName) {
    clearEl(starterGrid);

    if (!personaName) {
      starterGrid.innerHTML = `<div class="muted">No Persona selected.</div>`;
      return;
    }

    // Starter cards based on Starting For / Signature For mapping
    const starters = data.startersByPersona.get(personaName) || [];

    // If nothing matched exactly, try a loose match (helps if TSV has weird whitespace)
    let resolved = starters;
    if (resolved.length === 0) {
      const key = Array.from(data.startersByPersona.keys()).find(k => k.trim() === personaName.trim());
      if (key) resolved = data.startersByPersona.get(key) || [];
    }

    if (resolved.length === 0) {
      starterGrid.innerHTML = `<div class="muted">No Starter/Kit cards found for <strong>${escapeHtml(personaName)}</strong>. (Check the TSV "Starting For" column spelling + values.)</div>`;
      return;
    }

    // Sort by Type then Name
    const sorted = [...resolved].sort((a, b) => {
      const ta = computeType(a).localeCompare(computeType(b));
      if (ta !== 0) return ta;
      return computeCardName(a).localeCompare(computeCardName(b));
    });

    for (const row of sorted) {
      starterGrid.appendChild(renderCardTile(row));
    }
  }

  personaSelect.addEventListener("change", () => {
    const personaName = personaSelect.value;
    renderStartersForPersona(personaName);
    setStatus(`Status: Loaded · Sets: ${data.sets.length} · Cards: ${data.allRows.length} · Persona: ${personaName || "(none)"}`);
  });

  clearPersonaBtn?.addEventListener("click", () => {
    personaSelect.value = "";
    renderStartersForPersona("");
    setStatus(`Status: Loaded · Sets: ${data.sets.length} · Cards: ${data.allRows.length} · Persona: (none)`);
  });

  // Initial render
  renderStartersForPersona("");
  setStatus(`Status: Loaded · Sets: ${data.sets.length} · Cards: ${data.allRows.length}`);
}

function renderPool(poolRows, gridEl) {
  clearEl(gridEl);

  // Keep it light on mobile: show first N, but easy to change later
  const MAX = 120;
  const rows = poolRows.slice(0, MAX);

  if (poolRows.length === 0) {
    gridEl.innerHTML = `<div class="muted">No cards in pool after exclusions. That usually means your "Starting For" column is filled on everything, or Kits are marked broadly.</div>`;
    return;
  }

  const header = document.createElement("div");
  header.className = "muted";
  header.style.gridColumn = "1 / -1";
  header.innerHTML = `Showing <strong>${rows.length}</strong> of <strong>${poolRows.length}</strong> pool cards (mobile-friendly cap).`;
  gridEl.appendChild(header);

  for (const row of rows) {
    gridEl.appendChild(renderCardTile(row));
  }
}
