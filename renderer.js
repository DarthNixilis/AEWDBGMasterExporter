// FILE: renderer.js
import { loadAllData } from "./data-loader.js";

function norm(v) { return String(v == null ? "" : v).trim(); }
function lower(v) { return norm(v).toLowerCase(); }

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
function cardDamage(row) { return norm(getField(row, ["Damage", "D"])); }

function cardText(row) {
  return norm(getField(row, ["Game Text", "Rules Text", "Rules", "Text", "Effect", "Ability", "Abilities", "Card Text", "Text Box"]));
}

function traitString(row) {
  return norm(getField(row, ["Traits", "Trait", "Keywords", "Keyword"]));
}

function splitTraits(s) {
  var t = norm(s);
  if (!t) return [];
  return t
    .split(/[,;/|]+/g)
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return !!x; });
}

function parseIntSafe(v) {
  var n = parseInt(norm(v), 10);
  return Number.isFinite(n) ? n : null;
}

function clearEl(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function pill(text) {
  var s = document.createElement("span");
  s.className = "pill";
  s.textContent = text;
  return s;
}

function isFinisher(row) {
  var blob = (cardType(row) + " " + cardText(row) + " " + traitString(row)).toLowerCase();
  return blob.indexOf("finisher") >= 0;
}

function renderCard(row, buttons) {
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

  var dmg = cardDamage(row);
  if (dmg) meta.appendChild(pill("Damage: " + dmg));

  if (isFinisher(row)) meta.appendChild(pill("Finisher"));

  card.appendChild(meta);

  var txt = cardText(row);
  var textDiv = document.createElement("div");
  textDiv.className = "cardText";
  textDiv.textContent = txt || "(no game text)";
  card.appendChild(textDiv);

  var traits = splitTraits(traitString(row));
  if (traits.length) {
    var tr = document.createElement("div");
    tr.className = "muted cardSmall";
    tr.textContent = "Traits: " + traits.join(", ");
    card.appendChild(tr);
  }

  if (row.__sourceFile) {
    var src = document.createElement("div");
    src.className = "muted cardSmall";
    src.textContent = "Source: " + row.__sourceFile;
    card.appendChild(src);
  }

  if (buttons && buttons.length) {
    var btnRow = document.createElement("div");
    btnRow.className = "btnRow";
    for (var i = 0; i < buttons.length; i++) btnRow.appendChild(buttons[i]);
    card.appendChild(btnRow);
  }

  return card;
}

function mkButton(label, onClick, disabled) {
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.disabled = !!disabled;
  b.onclick = onClick;
  return b;
}

function detectPersonaBucket(typeStr) {
  var t = lower(typeStr);
  if (t === "wrestler") return "wrestler";
  if (t === "manager") return "manager";
  if (t === "call name" || t === "callname" || t === "call-name") return "call";
  if (t === "faction" || t === "stable" || t === "team" || t === "tag team" || t === "tag-team") return "faction";
  return null;
}

function uniqueSorted(arr) {
  var s = new Set();
  for (var i = 0; i < arr.length; i++) {
    var v = norm(arr[i]);
    if (v) s.add(v);
  }
  return Array.from(s).sort(function (a, b) { return a.localeCompare(b); });
}

function fillPersonaSelect(selectEl, items) {
  clearEl(selectEl);
  var opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "(none)";
  selectEl.appendChild(opt0);

  for (var i = 0; i < items.length; i++) {
    var opt = document.createElement("option");
    opt.value = items[i];
    opt.textContent = items[i];
    selectEl.appendChild(opt);
  }
}

function fillFilterSelect(selectEl, values) {
  clearEl(selectEl);
  var o = document.createElement("option");
  o.value = "";
  o.textContent = "All";
  selectEl.appendChild(o);

  for (var i = 0; i < values.length; i++) {
    var opt = document.createElement("option");
    opt.value = values[i];
    opt.textContent = values[i];
    selectEl.appendChild(opt);
  }
}

function deckKey(row) { return cardName(row); }

export async function initApp() {
  var AEW = window.AEWDBG || {};
  var setStatus = AEW.setStatus || function () {};
  var showError = AEW.showError || function () {};

  var wrestlerSelect = document.getElementById("wrestlerSelect");
  var managerSelect = document.getElementById("managerSelect");
  var callNameSelect = document.getElementById("callNameSelect");
  var factionSelect = document.getElementById("factionSelect");
  var clearPersonasBtn = document.getElementById("clearPersonasBtn");

  var starterGrid = document.getElementById("starterGrid");
  var poolGrid = document.getElementById("poolGrid");

  var searchInput = document.getElementById("searchInput");
  var typeFilter = document.getElementById("typeFilter");
  var traitFilter = document.getElementById("traitFilter");
  var setFilter = document.getElementById("setFilter");
  var clearFiltersBtn = document.getElementById("clearFiltersBtn");
  var showMoreBtn = document.getElementById("showMoreBtn");
  var poolSummary = document.getElementById("poolSummary");

  var startDeckWindow = document.getElementById("startDeckWindow");
  var purchaseDeckWindow = document.getElementById("purchaseDeckWindow");
  var startCountEl = document.getElementById("startCount");
  var purchaseCountEl = document.getElementById("purchaseCount");
  var deckStatusLine = document.getElementById("deckStatusLine");
  var copyDeckBtn = document.getElementById("copyDeckBtn");
  var copyDeckJsonBtn = document.getElementById("copyDeckJsonBtn");
  var clearDeckBtn = document.getElementById("clearDeckBtn");

  if (!wrestlerSelect || !managerSelect || !callNameSelect || !factionSelect) {
    showError("UI init failed", "Missing Persona dropdown elements.");
    return;
  }
  if (!starterGrid || !poolGrid) {
    showError("UI init failed", "Missing starterGrid/poolGrid.");
    return;
  }
  if (!searchInput || !typeFilter || !traitFilter || !setFilter || !clearFiltersBtn || !showMoreBtn || !poolSummary) {
    showError("UI init failed", "Missing pool filter controls.");
    return;
  }
  if (!startDeckWindow || !purchaseDeckWindow || !startCountEl || !purchaseCountEl || !deckStatusLine || !copyDeckBtn || !copyDeckJsonBtn || !clearDeckBtn) {
    showError("UI init failed", "Missing deckbuilder elements.");
    return;
  }

  var data;
  try {
    data = await loadAllData();
  } catch (e) {
    return;
  }

  // Personas into 4 dropdowns
  var buckets = { wrestler: [], manager: [], call: [], faction: [] };
  for (var i = 0; i < data.personas.length; i++) {
    var p = data.personas[i];
    var bucket = detectPersonaBucket(p.type);
    if (!bucket) continue;
    buckets[bucket].push(p.name);
  }
  fillPersonaSelect(wrestlerSelect, uniqueSorted(buckets.wrestler));
  fillPersonaSelect(managerSelect, uniqueSorted(buckets.manager));
  fillPersonaSelect(callNameSelect, uniqueSorted(buckets.call));
  fillPersonaSelect(factionSelect, uniqueSorted(buckets.faction));

  // Deck state
  var selected = { wrestler: "", manager: "", call: "", faction: "" };
  var startingDeck = new Map();
  var purchaseDeck = new Map();

  function totalCount(map) {
    var n = 0;
    map.forEach(function (v) { n += v.qty; });
    return n;
  }

  function copiesAcrossBoth(name) {
    var a = startingDeck.get(name) ? startingDeck.get(name).qty : 0;
    var b = purchaseDeck.get(name) ? purchaseDeck.get(name).qty : 0;
    return a + b;
  }

  function finisherCountAcrossBoth() {
    var n = 0;
    startingDeck.forEach(function (v) { if (isFinisher(v.row)) n += v.qty; });
    purchaseDeck.forEach(function (v) { if (isFinisher(v.row)) n += v.qty; });
    return n;
  }

  function addToDeck(map, row) {
    var name = deckKey(row);
    if (!name) return;
    var cur = map.get(name);
    if (!cur) map.set(name, { row: row, qty: 1 });
    else map.set(name, { row: cur.row, qty: cur.qty + 1 });
  }

  function removeFromDeck(map, name) {
    var cur = map.get(name);
    if (!cur) return;
    if (cur.qty <= 1) map.delete(name);
    else map.set(name, { row: cur.row, qty: cur.qty - 1 });
  }

  function validateAdd(row, target) {
    var name = deckKey(row);
    var costN = parseIntSafe(cardCost(row));
    var totalCopies = copiesAcrossBoth(name);

    if (totalCopies >= 3) return "Max 3 copies total across Starting + Purchase.";

    if (target === "starting") {
      if (costN !== 0) return "Starting Draw Deck must be Cost 0 only.";
      var startCopies = startingDeck.get(name) ? startingDeck.get(name).qty : 0;
      if (startCopies >= 2) return "Max 2 copies per card in Starting Draw Deck.";
    }

    if (isFinisher(row) && finisherCountAcrossBoth() >= 1) return "Only 1 Finisher total is allowed in a deck.";
    return null;
  }

  function deckStatus() {
    var s = totalCount(startingDeck);
    var p = totalCount(purchaseDeck);
    var issues = [];

    if (s !== 24) issues.push("Starting needs " + String(24 - s) + " more");
    if (p < 36) issues.push("Purchase needs " + String(36 - p) + " more");
    if (finisherCountAcrossBoth() > 1) issues.push("Too many Finishers");

    if (issues.length) return "Fix: " + issues.join(" · ");
    return "Deck looks valid.";
  }

  function renderDeckList(map, el, which) {
    clearEl(el);
    if (map.size === 0) {
      var m = document.createElement("div");
      m.className = "muted";
      m.textContent = "(empty)";
      el.appendChild(m);
      return;
    }

    var items = [];
    map.forEach(function (v, k) { items.push({ name: k, qty: v.qty, row: v.row }); });
    items.sort(function (a, b) { return a.name.localeCompare(b.name); });

    for (var i = 0; i < items.length; i++) {
      (function () {
        var it = items[i];

        var rowDiv = document.createElement("div");
        rowDiv.className = "row";
        rowDiv.style.justifyContent = "space-between";
        rowDiv.style.margin = "6px 0";

        var left = document.createElement("div");
        left.textContent = String(it.qty) + "x " + it.name + (isFinisher(it.row) ? " (Finisher)" : "");

        var right = document.createElement("div");
        right.className = "row";

        var minus = mkButton("−", function () {
          removeFromDeck(which === "starting" ? startingDeck : purchaseDeck, it.name);
          renderDecks();
          renderPool();
        }, false);

        right.appendChild(minus);
        rowDiv.appendChild(left);
        rowDiv.appendChild(right);
        el.appendChild(rowDiv);
      })();
    }
  }

  function renderDecks() {
    startCountEl.textContent = String(totalCount(startingDeck));
    purchaseCountEl.textContent = String(totalCount(purchaseDeck));
    deckStatusLine.textContent = deckStatus();

    renderDeckList(startingDeck, startDeckWindow, "starting");
    renderDeckList(purchaseDeck, purchaseDeckWindow, "purchase");
  }

  function collectSelectedPersonaNames() {
    var names = [];
    if (selected.wrestler) names.push(selected.wrestler);
    if (selected.manager) names.push(selected.manager);
    if (selected.call) names.push(selected.call);
    if (selected.faction) names.push(selected.faction);
    return names;
  }

  function renderStarters() {
    clearEl(starterGrid);
    var names = collectSelectedPersonaNames();
    if (!names.length) {
      var m = document.createElement("div");
      m.className = "muted";
      m.textContent = "No Personas selected.";
      starterGrid.appendChild(m);
      return;
    }

    var used = 0;
    for (var i = 0; i < names.length; i++) {
      var personaName = names[i];

      var h = document.createElement("div");
      h.style.fontWeight = "900";
      h.style.margin = "8px 0";
      h.textContent = personaName;
      starterGrid.appendChild(h);

      var starters = data.startersByPersona.get(personaName) || [];
      if (!starters.length) {
        var mm = document.createElement("div");
        mm.className = "muted";
        mm.textContent = "(No Starter/Kit cards found for this Persona.)";
        starterGrid.appendChild(mm);
        continue;
      }

      for (var j = 0; j < starters.length; j++) {
        starterGrid.appendChild(renderCard(starters[j], null));
        used++;
      }
    }

    if (!used) {
      var z = document.createElement("div");
      z.className = "muted";
      z.textContent = "No starter cards found for selected Personas.";
      starterGrid.appendChild(z);
    }
  }

  // Filters
  var poolLimit = 90;

  function buildFilterOptions() {
    var types = uniqueSorted(data.pool.map(function (r) { return cardType(r); }));
    var sets = uniqueSorted(data.pool.map(function (r) { return cardSet(r); }));

    var allTraits = [];
    for (var i = 0; i < data.pool.length; i++) {
      var list = splitTraits(traitString(data.pool[i]));
      for (var k = 0; k < list.length; k++) allTraits.push(list[k]);
    }
    var traits = uniqueSorted(allTraits);

    fillFilterSelect(typeFilter, types);
    fillFilterSelect(setFilter, sets);
    fillFilterSelect(traitFilter, traits);
  }

  function matchesSearch(row, q) {
    if (!q) return true;
    var hay = (cardName(row) + "\n" + cardText(row)).toLowerCase();
    return hay.indexOf(q) >= 0;
  }

  function hasTrait(row, trait) {
    if (!trait) return true;
    var list = splitTraits(traitString(row));
    for (var i = 0; i < list.length; i++) {
      if (list[i] === trait) return true;
    }
    return false;
  }

  function filteredPoolRows() {
    var q = lower(searchInput.value);
    var t = norm(typeFilter.value);
    var tr = norm(traitFilter.value);
    var s = norm(setFilter.value);

    var out = [];
    for (var i = 0; i < data.pool.length; i++) {
      var row = data.pool[i];
      if (t && cardType(row) !== t) continue;
      if (s && cardSet(row) !== s) continue;
      if (tr && !hasTrait(row, tr)) continue;
      if (!matchesSearch(row, q)) continue;
      out.push(row);
    }
    return out;
  }

  function renderPool() {
    clearEl(poolGrid);

    var rows = filteredPoolRows();
    var shown = rows.slice(0, poolLimit);

    poolSummary.textContent = String(rows.length) + " match(es). Showing " + String(shown.length) + ".";

    if (!rows.length) {
      var m = document.createElement("div");
      m.className = "muted";
      m.textContent = "No cards match your filters.";
      poolGrid.appendChild(m);
      return;
    }

    for (var i = 0; i < shown.length; i++) {
      (function () {
        var row = shown[i];

        var btns = [];

        var errStart = validateAdd(row, "starting");
        var errBuy = validateAdd(row, "purchase");

        var costN = parseIntSafe(cardCost(row));
        var showStartBtn = (costN === 0);

        if (showStartBtn) {
          btns.push(mkButton("Add to Starting", function () {
            var msg = validateAdd(row, "starting");
            if (msg) return showError("Deck rule", msg);
            addToDeck(startingDeck, row);
            renderDecks();
            renderPool();
          }, !!errStart));
        }

        btns.push(mkButton("Add to Purchase", function () {
          var msg = validateAdd(row, "purchase");
          if (msg) return showError("Deck rule", msg);
          addToDeck(purchaseDeck, row);
          renderDecks();
          renderPool();
        }, !!errBuy));

        poolGrid.appendChild(renderCard(row, btns));
      })();
    }
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      showError("Copy failed", text);
    }
  }

  function deckLines(map) {
    var items = [];
    map.forEach(function (v, k) { items.push({ name: k, qty: v.qty }); });
    items.sort(function (a, b) { return a.name.localeCompare(b.name); });

    var lines = [];
    for (var i = 0; i < items.length; i++) {
      lines.push(String(items[i].qty) + "x " + items[i].name);
    }
    return lines;
  }

  function selectedSummary() {
    var parts = [];
    if (selected.wrestler) parts.push("Wrestler: " + selected.wrestler);
    if (selected.manager) parts.push("Manager: " + selected.manager);
    if (selected.call) parts.push("Call: " + selected.call);
    if (selected.faction) parts.push("Faction: " + selected.faction);
    return parts.length ? parts.join(" | ") : "(none)";
  }

  function exportDeckText() {
    var lines = [];
    lines.push("Personas: " + selectedSummary());
    lines.push("");
    lines.push("Starting Draw Deck (" + String(totalCount(startingDeck)) + "/24):");
    lines = lines.concat(deckLines(startingDeck));
    lines.push("");
    lines.push("Purchase Deck (" + String(totalCount(purchaseDeck)) + "/36+):");
    lines = lines.concat(deckLines(purchaseDeck));
    lines.push("");
    lines.push("Finishers: " + String(finisherCountAcrossBoth()) + " (max 1)");
    return lines.join("\n");
  }

  function exportDeckJson() {
    var payload = {
      personas: { wrestler: selected.wrestler || null, manager: selected.manager || null, call: selected.call || null, faction: selected.faction || null },
      starting: [],
      purchase: [],
      counts: { starting: totalCount(startingDeck), purchase: totalCount(purchaseDeck) }
    };

    startingDeck.forEach(function (v, k) { payload.starting.push({ name: k, qty: v.qty }); });
    purchaseDeck.forEach(function (v, k) { payload.purchase.push({ name: k, qty: v.qty }); });

    payload.starting.sort(function (a, b) { return a.name.localeCompare(b.name); });
    payload.purchase.sort(function (a, b) { return a.name.localeCompare(b.name); });

    return JSON.stringify(payload, null, 2);
  }

  function onPersonaChange() {
    selected.wrestler = wrestlerSelect.value || "";
    selected.manager = managerSelect.value || "";
    selected.call = callNameSelect.value || "";
    selected.faction = factionSelect.value || "";
    renderStarters();
    setStatus("Status: Loaded  Sets: " + String(data.sets.length) + "  Cards: " + String(data.allRows.length));
  }

  wrestlerSelect.addEventListener("change", onPersonaChange);
  managerSelect.addEventListener("change", onPersonaChange);
  callNameSelect.addEventListener("change", onPersonaChange);
  factionSelect.addEventListener("change", onPersonaChange);

  clearPersonasBtn.addEventListener("click", function () {
    wrestlerSelect.value = "";
    managerSelect.value = "";
    callNameSelect.value = "";
    factionSelect.value = "";
    onPersonaChange();
  });

  var rerenderPoolDebounced = debounce(function () {
    poolLimit = 90;
    renderPool();
  }, 120);

  searchInput.addEventListener("input", rerenderPoolDebounced);
  typeFilter.addEventListener("change", function () { poolLimit = 90; renderPool(); });
  traitFilter.addEventListener("change", function () { poolLimit = 90; renderPool(); });
  setFilter.addEventListener("change", function () { poolLimit = 90; renderPool(); });

  clearFiltersBtn.addEventListener("click", function () {
    searchInput.value = "";
    typeFilter.value = "";
    traitFilter.value = "";
    setFilter.value = "";
    poolLimit = 90;
    renderPool();
  });

  showMoreBtn.addEventListener("click", function () {
    poolLimit += 90;
    renderPool();
  });

  copyDeckBtn.onclick = function () { copyText(exportDeckText()); };
  copyDeckJsonBtn.onclick = function () { copyText(exportDeckJson()); };
  clearDeckBtn.onclick = function () {
    startingDeck.clear();
    purchaseDeck.clear();
    renderDecks();
    renderPool();
  };

  // Initial render
  buildFilterOptions();
  renderDecks();
  renderStarters();
  renderPool();

  setStatus("Status: Loaded  Sets: " + String(data.sets.length) + "  Cards: " + String(data.allRows.length));
}