// FILE: store.js
// State + rules + export/import + localStorage persistence.

function norm(s) { return (s ?? "").toString().trim(); }
function splitList(s) {
  const t = norm(s);
  if (!t) return [];
  return t.split(/[,;|]/g).map(x => x.trim()).filter(Boolean);
}

export function buildImageIdFromName(name) {
  const tokens = norm(name)
    .replace(/['".…]/g, "")
    .split(/[^A-Za-z0-9]+/g)
    .filter(Boolean)
    .map(tok => tok.charAt(0).toUpperCase() + tok.slice(1));
  return (tokens.join("") || "Card") + ".jpg";
}

export function createStore() {
  return {
    sets: [],
    cards: [],
    personas: { Wrestler: [], Manager: [], "Call Name": [], Faction: [] },
    selectedPersonas: { Wrestler: "", Manager: "", "Call Name": "", Faction: "" },
    starterCards: [],
    deck: {
      starting: new Map(), // key -> { card, qty }
      purchase: new Map(),
    },
  };
}

export function classifyCard(row) {
  const name = norm(row.Name || row.Card || row["Card Name"]);
  const type = norm(row.Type || row["Card Type"] || row["Type / Kind"]);
  const cardType = norm(row["Card Type"] || row.Type || "");
  const startingFor = norm(row["Starting For"] || row.StartingFor || row["StartingFor"]);
  const traits = norm(row.Traits || row.Trait || row["Trait(s)"]);
  const cost = norm(row.Cost || row["Cost"]);
  const momentum = norm(row.Momentum || row["Momentum"]);
  const damage = norm(row.Damage || row["Damage"] || row.DMG || row["DMG"]);
  const gameText = norm(row["Game Text"] || row.GameText || row.Text || row["Rules Text"]);
  const set = norm(row.Set || row.__sourceSetFile || "");
  const imageId = norm(row.Image || row["Image File"] || row.ImageFile || row["ImageFile"]);

  const personaKind = ["Wrestler", "Manager", "Call Name", "Faction"].includes(type) ? type : "";

  const isKit =
    /kit/i.test(cardType) ||
    /kit/i.test(type);

  const isPersona =
    personaKind !== "" ||
    /persona/i.test(cardType);

  return {
    raw: row,
    name,
    type,
    cardType,
    personaKind,
    startingFor,
    traits,
    cost,
    momentum,
    damage,
    gameText,
    set,
    imageId: imageId || buildImageIdFromName(name),
    isKit,
    isPersona,
  };
}

export function ingestAllCards(store, rows, setFiles) {
  store.sets = [...setFiles];
  store.cards = rows.map(classifyCard).filter(c => c.name);

  store.personas = { Wrestler: [], Manager: [], "Call Name": [], Faction: [] };
  for (const c of store.cards) {
    const kind = c.personaKind;
    if (kind && store.personas[kind]) store.personas[kind].push(c);
  }
  for (const k of Object.keys(store.personas)) {
    store.personas[k].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function setPersona(store, kind, name) {
  store.selectedPersonas[kind] = name || "";
  recomputeStarterCards(store);
}

export function clearPersonas(store) {
  store.selectedPersonas = { Wrestler: "", Manager: "", "Call Name": "", Faction: "" };
  recomputeStarterCards(store);
}

export function recomputeStarterCards(store) {
  const picked = Object.values(store.selectedPersonas).filter(Boolean);
  if (picked.length === 0) { store.starterCards = []; return; }

  const starters = [];
  for (const c of store.cards) {
    const sf = splitList(c.startingFor);
    if (sf.length === 0) continue;
    if (picked.some(p => sf.includes(p))) starters.push(c);
  }

  const personaCards = store.cards.filter(c => picked.includes(c.name) && c.isPersona);

  const uniq = new Map();
  for (const c of [...personaCards, ...starters]) uniq.set(c.name + "||" + c.set, c);
  store.starterCards = [...uniq.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Deck rules ----------
function keyForCard(c) { return `${c.name}||${c.set}`; }

export function deckCounts(store) {
  let s = 0, p = 0;
  for (const v of store.deck.starting.values()) s += v.qty;
  for (const v of store.deck.purchase.values()) p += v.qty;
  return { starting: s, purchase: p, total: s + p };
}

export function isFinisher(card) {
  const t = norm(card.type || card.cardType);
  return /finisher/i.test(t);
}

export function cardCostIsZero(card) {
  const c = norm(card.cost);
  const n = Number(c);
  return Number.isFinite(n) && n === 0;
}

function totalCopiesAcrossBoth(store, cardKey) {
  const a = store.deck.starting.get(cardKey)?.qty ?? 0;
  const b = store.deck.purchase.get(cardKey)?.qty ?? 0;
  return a + b;
}

function countFinishers(store) {
  let n = 0;
  for (const v of store.deck.starting.values()) if (isFinisher(v.card)) n += v.qty;
  for (const v of store.deck.purchase.values()) if (isFinisher(v.card)) n += v.qty;
  return n;
}

export function canAddToDeck(store, zone, card) {
  const cardKey = keyForCard(card);

  // max 3 total copies
  if (totalCopiesAcrossBoth(store, cardKey) >= 3) return { ok: false, reason: "Max 3 copies total." };

  // finisher
  if (isFinisher(card) && countFinishers(store) >= 1) return { ok: false, reason: "Only 1 Finisher total." };

  // starting rules
  if (zone === "starting") {
    const cur = store.deck.starting.get(cardKey)?.qty ?? 0;
    if (!cardCostIsZero(card)) return { ok: false, reason: "Starting can only include Cost 0." };
    if (cur >= 2) return { ok: false, reason: "Max 2 copies in Starting." };
    if (deckCounts(store).starting >= 24) return { ok: false, reason: "Starting deck is full (24)." };
  }

  return { ok: true };
}

export function addToDeck(store, zone, card) {
  const check = canAddToDeck(store, zone, card);
  if (!check.ok) return check;

  const cardKey = keyForCard(card);
  const target = zone === "starting" ? store.deck.starting : store.deck.purchase;
  const cur = target.get(cardKey);
  if (cur) cur.qty += 1;
  else target.set(cardKey, { card, qty: 1 });

  return { ok: true };
}

export function removeFromDeck(store, zone, cardKey) {
  const target = zone === "starting" ? store.deck.starting : store.deck.purchase;
  const cur = target.get(cardKey);
  if (!cur) return;
  cur.qty -= 1;
  if (cur.qty <= 0) target.delete(cardKey);
}

export function clearDeck(store) {
  store.deck.starting.clear();
  store.deck.purchase.clear();
}

// ---------- Export formats ----------
function sortDeckMap(map) {
  return [...map.values()].sort((a, b) => a.card.name.localeCompare(b.card.name));
}

export function exportDeckAsText(store) {
  const lines = [];

  // Main block = Starting Draw Deck
  for (const { card, qty } of sortDeckMap(store.deck.starting)) {
    lines.push(`${qty}\t${card.name}`);
  }

  lines.push(`Purchase_Deck:`);
  for (const { card, qty } of sortDeckMap(store.deck.purchase)) {
    lines.push(`${qty}\t${card.name}`);
  }

  lines.push(`Starting:`);
  for (const c of store.starterCards) {
    lines.push(`1\t${c.name}`);
  }

  return lines.join("\n");
}

export function exportDeckAsLackeyDek(store, opts = {}) {
  const game = opts.game || "AEW";
  const setName = opts.set || "AEW";

  const xmlEscape = (s) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const zoneToCards = (map) => {
    const out = [];
    for (const { card, qty } of sortDeckMap(map)) {
      for (let i = 0; i < qty; i++) {
        out.push(
          `\t\t<card><name id="${xmlEscape(card.imageId)}">${xmlEscape(card.name)}</name><set>${xmlEscape(setName)}</set></card>`
        );
      }
    }
    return out.join("\n");
  };

  // Lackey "Starting" zone = personas/starter cards (1 each)
  const startingZoneCards = store.starterCards.map(c =>
    `\t\t<card><name id="${xmlEscape(c.imageId)}">${xmlEscape(c.name)}</name><set>${xmlEscape(setName)}</set></card>`
  ).join("\n");

  const deckZoneCards = zoneToCards(store.deck.starting);
  const purchaseZoneCards = zoneToCards(store.deck.purchase);

  return [
    `<deck version="0.8">`,
    `\t<meta>`,
    `\t\t<game>${xmlEscape(game)}</game>`,
    `\t</meta>`,
    `\t<superzone name="Deck">`,
    deckZoneCards || ``,
    `\t</superzone>`,
    `\t<superzone name="Purchase_Deck">`,
    purchaseZoneCards || ``,
    `\t</superzone>`,
    `\t<superzone name="Starting">`,
    startingZoneCards || ``,
    `\t</superzone>`,
    `</deck>`,
  ].join("\n");
}

// ---------- Import (all formats) ----------
export function importDeckFromAny(store, text) {
  const t = (text ?? "").trim();
  if (!t) return { ok: false, reason: "Nothing to import." };

  try {
    if (t.startsWith("<deck")) return importFromLackeyDek(store, t);
    if (t.startsWith("{") || t.startsWith("[")) return importFromJSON(store, t);
    return importFromTextList(store, t);
  } catch (e) {
    return { ok: false, reason: `Import failed:\n${e?.message || e}` };
  }
}

function findCardByNameBestEffort(store, name) {
  const n = norm(name);
  if (!n) return null;
  let c = store.cards.find(x => x.name === n);
  if (c) return c;
  c = store.cards.find(x => x.name.toLowerCase() === n.toLowerCase());
  return c || null;
}

function importFromTextList(store, t) {
  clearDeck(store);
  let zone = "deck";
  const lines = t.split(/\r?\n/g).map(s => s.trim()).filter(Boolean);

  for (const line of lines) {
    if (/^Purchase_Deck\s*:/i.test(line)) { zone = "purchase"; continue; }
    if (/^Starting\s*:/i.test(line)) { zone = "startingZone"; continue; }

    const m = line.match(/^(\d+)\s+(.+)$|^(\d+)\t(.+)$/);
    let qty, name;
    if (m) { qty = Number(m[1] || m[3]); name = m[2] || m[4]; }
    else { qty = 1; name = line; }

    const card = findCardByNameBestEffort(store, name);
    if (!card) continue;

    if (zone === "deck") for (let i = 0; i < qty; i++) addToDeck(store, "starting", card);
    else if (zone === "purchase") for (let i = 0; i < qty; i++) addToDeck(store, "purchase", card);
    else {
      const key = `${card.name}||${card.set}`;
      const map = new Map(store.starterCards.map(x => [`${x.name}||${x.set}`, x]));
      map.set(key, card);
      store.starterCards = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  return { ok: true };
}

function importFromLackeyDek(store, xml) {
  clearDeck(store);
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const deckNode = doc.querySelector("deck");
  if (!deckNode) throw new Error("Missing <deck> root.");

  const zones = doc.querySelectorAll("superzone");
  for (const z of zones) {
    const name = z.getAttribute("name") || "";
    const cards = z.querySelectorAll("card > name");

    for (const n of cards) {
      const cardName = n.textContent || "";
      const imageId = n.getAttribute("id") || "";
      const card = findCardByNameBestEffort(store, cardName);
      if (!card) continue;
      if (imageId) card.imageId = imageId;

      if (name === "Deck") addToDeck(store, "starting", card);
      else if (name === "Purchase_Deck") addToDeck(store, "purchase", card);
      else if (name === "Starting") {
        const key = `${card.name}||${card.set}`;
        const map = new Map(store.starterCards.map(x => [`${x.name}||${x.set}`, x]));
        map.set(key, card);
        store.starterCards = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  }
  return { ok: true };
}

function importFromJSON(store, jsonText) {
  clearDeck(store);
  const data = JSON.parse(jsonText);

  const getList = (obj, keys) => {
    for (const k of keys) if (obj && Array.isArray(obj[k])) return obj[k];
    return null;
  };

  if (Array.isArray(data)) {
    for (const it of data) {
      const zone = norm(it.zone || it.Zone);
      const name = norm(it.name || it.Name);
      const qty = Number(it.qty || it.Qty || 1);
      const card = findCardByNameBestEffort(store, name);
      if (!card) continue;
      if (/purchase/i.test(zone)) for (let i=0;i<qty;i++) addToDeck(store, "purchase", card);
      else for (let i=0;i<qty;i++) addToDeck(store, "starting", card);
    }
    return { ok: true };
  }

  const starting = getList(data, ["starting", "Deck"]) || [];
  const purchase = getList(data, ["purchase", "Purchase_Deck"]) || [];

  for (const it of starting) {
    const name = norm(it.name || it.Name);
    const qty = Number(it.qty || it.Qty || 1);
    const card = findCardByNameBestEffort(store, name);
    if (!card) continue;
    for (let i=0;i<qty;i++) addToDeck(store, "starting", card);
  }
  for (const it of purchase) {
    const name = norm(it.name || it.Name);
    const qty = Number(it.qty || it.Qty || 1);
    const card = findCardByNameBestEffort(store, name);
    if (!card) continue;
    for (let i=0;i<qty;i++) addToDeck(store, "purchase", card);
  }

  return { ok: true };
}

// ---------- localStorage ----------
const LS_KEY = "aewdbg_deckstate_v1";

export function saveToLocal(store) {
  const payload = {
    selectedPersonas: store.selectedPersonas,
    starting: [...store.deck.starting.entries()].map(([k, v]) => ({ key: k, name: v.card.name, set: v.card.set, qty: v.qty })),
    purchase: [...store.deck.purchase.entries()].map(([k, v]) => ({ key: k, name: v.card.name, set: v.card.set, qty: v.qty })),
    starter: store.starterCards.map(c => ({ name: c.name, set: c.set })),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
}

export function loadFromLocal(store) {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return { ok: false, reason: "No saved state." };

  const payload = JSON.parse(raw);
  if (payload.selectedPersonas) store.selectedPersonas = payload.selectedPersonas;

  // restore starterCards by best-effort match once cards exist
  // restore decks by name+set match once cards exist
  return { ok: true, payload };
}

export function applyLocalPayload(store, payload) {
  // assumes store.cards already loaded
  const findByNameSet = (name, set) =>
    store.cards.find(c => c.name === name && c.set === set) ||
    store.cards.find(c => c.name === name) || null;

  // personas
  if (payload.selectedPersonas) {
    store.selectedPersonas = payload.selectedPersonas;
    recomputeStarterCards(store);
  }

  // starters override if present
  if (Array.isArray(payload.starter) && payload.starter.length) {
    const uniq = new Map();
    for (const it of payload.starter) {
      const c = findByNameSet(it.name, it.set);
      if (c) uniq.set(`${c.name}||${c.set}`, c);
    }
    store.starterCards = [...uniq.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  clearDeck(store);

  const restoreZone = (arr, zone) => {
    if (!Array.isArray(arr)) return;
    for (const it of arr) {
      const c = findByNameSet(it.name, it.set);
      if (!c) continue;
      const qty = Number(it.qty || 0);
      for (let i = 0; i < qty; i++) addToDeck(store, zone, c);
    }
  };

  restoreZone(payload.starting, "starting");
  restoreZone(payload.purchase, "purchase");
}
