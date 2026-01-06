// FILE: renderer.js
import { loadAllData } from "./data-loader.js";

function norm(v) {
  return String(v == null ? "" : v).trim();
}

function getField(row, names) {
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  }
  return "";
}

function cardName(row) { return norm(getField(row, ["Card Name", "Name", "Title"])); }
function cardType(row) { return norm(getField(row, ["Type"])); }
function cardSet(row) { return norm(getField(row, ["Set"])); }
function cardCost(row) { return norm(getField(row, ["Cost", "C"])); }
function cardMomentum(row) { return norm(getField(row, ["Momentum", "M"])); }

function cardGameText(row) {
  return norm(getField(row, ["Game Text", "Rules Text", "Rules", "Text", "Effect", "Ability", "Abilities", "Card Text", "Text Box"]));
}

function clearEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function pill(text) {
  var s = document.createElement("span");
  s.className = "pill";
  s.textContent = text;
  return s;
}

function renderCardTile(row) {
  var card = document.createElement("div");
  card.className = "card";

  var title = document.createElement("div");
  title.className = "cardTitle";
  title.textContent = cardName(row);
  card.appendChild(title);

  var meta = document.createElement("div");
  meta.className = "cardMeta";
  meta.appendChild(pill(cardType(row) || "Card"));

  var set = cardSet(row);
  if (set) meta.appendChild(pill(set));

  var cost = cardCost(row);
  if (cost) meta.appendChild(pill("Cost: " + cost));

  var mom = cardMomentum(row);
  if (mom) meta.appendChild(pill("Momentum: " + mom));

  card.appendChild(meta);

  var textDiv = document.createElement("div");
  textDiv.className = "cardText";
  var txt = cardGameText(row);
  textDiv.textContent = txt || "(no game text)";
  card.appendChild(textDiv);

  if (row.__sourceFile) {
    var src = document.createElement("div");
    src.className = "muted cardSmall";
    src.textContent = "Source: " + row.__sourceFile;
    card.appendChild(src);
  }

  return card;
}

export async function initApp() {
  var AEW = window.AEWDBG || {};
  var setStatus = AEW.setStatus ? AEW.setStatus : function () {};
  var showError = AEW.showError ? AEW.showError : function () {};

  var personaSelect = document.getElementById("personaSelect");
  var starterGrid = document.getElementById("starterGrid");
  var poolGrid = document.getElementById("poolGrid");

  if (!personaSelect || !starterGrid || !poolGrid) {
    showError("UI init failed", "Missing required DOM elements (personaSelect/starterGrid/poolGrid).");
    return;
  }

  var data;
  try {
    data = await loadAllData();
  } catch (e) {
    return;
  }

  // Personas: Name only, no type appended
  clearEl(personaSelect);
  var none = document.createElement("option");
  none.value = "";
  none.textContent = "(none)";
  personaSelect.appendChild(none);

  var namesSet = new Set();
  for (var i = 0; i < data.personas.length; i++) {
    if (data.personas[i].name) namesSet.add(data.personas[i].name);
  }
  var names = Array.from(namesSet).sort(function (a, b) { return a.localeCompare(b); });

  for (var j = 0; j < names.length; j++) {
    var opt = document.createElement("option");
    opt.value = names[j];
    opt.textContent = names[j];
    personaSelect.appendChild(opt);
  }

  function renderStarters(personaName) {
    clearEl(starterGrid);
    if (!personaName) {
      starterGrid.textContent = "No Persona selected.";
      return;
    }
    var starters = data.startersByPersona.get(personaName) || [];
    if (!starters.length) {
      starterGrid.textContent = "No starter cards found for this Persona.";
      return;
    }
    for (var k = 0; k < starters.length; k++) starterGrid.appendChild(renderCardTile(starters[k]));
  }

  function renderPool() {
    clearEl(poolGrid);
    var cap = 120;
    var rows = data.pool.slice(0, cap);
    for (var k = 0; k < rows.length; k++) poolGrid.appendChild(renderCardTile(rows[k]));
  }

  personaSelect.addEventListener("change", function () {
    renderStarters(personaSelect.value);
  });

  renderStarters("");
  renderPool();

  setStatus("Status: Loaded  Sets: " + data.sets.length + "  Cards: " + data.allRows.length);
}