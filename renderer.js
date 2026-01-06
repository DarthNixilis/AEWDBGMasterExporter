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

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function pill(text) {
  const s = document.createElement("span");
  s.className = "pill";
  s.textContent = text;
  return s;
}

function renderCardTile(row) {
  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("div");
  title.className = "cardTitle";
  title.textContent = cardName(row);
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "cardMeta";
  meta.appendChild(pill(cardType(row) || "Card"));

  if (cardSet(row)) meta.appendChild(pill(cardSet(row)));
  if (cardCost(row)) meta.appendChild(pill(`Cost: ${cardCost(row)}`));
  if (cardMomentum(row)) meta.appendChild(pill(`Momentum: ${cardMomentum(row)}`));

  card.appendChild(meta);

  const text = cardGameText(row);
  const textDiv = document.createElement("div");
  textDiv.className = "cardText";
  textDiv.textContent = text || "(no game text)";
  card.appendChild(textDiv);

  if (row.__sourceFile) {
    const src = document.createElement("div");
    src.className = "muted cardSmall";
    src.textContent = `Source: ${row.__sourceFile}`;
    card.appendChild(src);
  }

  return card;
}

export async function initApp() {
  const AEW = window.AEWDBG || {};
  const setStatus = AEW.setStatus || (() => {});
  const showError = AEW.showError || (() => {});

  const personaSelect = document.getElementById("personaSelect");
  const starterGrid = document.getElementById("starterGrid");
  const poolGrid = document.getElementById("poolGrid");

  if (!personaSelect || !starterGrid || !poolGrid) {
    showError("UI init failed", "Missing required DOM elements");
    return;
  }

  let data;
  try {
    data = await loadAllData();
  } catch {
    return;
  }

  // Populate persona dropdown (Name only)
  clearEl(personaSelect);
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "(none)";
  personaSelect.appendChild(none);

  const personaNames = Array.from(
    new Set(data.personas.map(p => p.name).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  for (const name of personaNames) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    personaSelect.appendChild(opt);
  }

  function renderStarters(name) {
    clearEl(starterGrid);
    if (!name) {
      starterGrid.textContent = "No Persona selected.";
      return;
    }

    const starters = data.startersByPersona.get(name) || [];
    if (!starters.length) {
      starterGrid.textContent = "No starter cards found.";
      return;
    }

    for (const r of starters) starterGrid.appendChild(renderCardTile(r));
  }

  function renderPool() {
    clearEl(poolGrid);
    for (const r of data.pool.slice(0, 120)) {
      poolGrid.appendChild(renderCardTile(r));
    }
  }

  personaSelect.addEventListener("change", () => {
    renderStarters(personaSelect.value);
  });

  renderStarters("");
  renderPool();

  setStatus(`Status: Loaded  Sets: ${data.sets.length}  Cards: ${data.allRows.length}`);
}
