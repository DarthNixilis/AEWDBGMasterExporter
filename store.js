// FILE: store.js
// State + rules + export/import + localStorage persistence.
// IMPORTANT: Starting deck is NOT hard-capped at 24 during building.
// Legality is warned on export only.

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
      starting: [],
      purchase: [],
    }
  };
}

export function classifyCard(row) {
  const rawName = norm(row.Name || row.Card || row["Card Name"]);
  const type = norm(row.Type || row["Card Type"] || row["Type / Kind"]);
  const cardType = norm(row["Card Type"] || row.Type || "");
  const startingFor = norm(
    row.Starting || row["Starting"] || row["Starting For"] || row.StartingFor || row["StartingFor"]
  );
  const signature = norm(row.Signature || row["Signature"]);
  const traits = norm(row.Traits || row.Trait || row["Trait(s)"] || row["Traits"]);
  const cost = norm(row.Cost || row["Cost"]);
  const momentum = norm(row.Momentum || row["Momentum"]);
  const damage = norm(row.Damage || row["Damage"] || row.DMG || row["DMG"]);
  const gameText = norm(row["Game Text"] || row.GameText || row.Text || row["Rules Text"]);
  const set = norm(row.Set || row.__sourceSetFile || "");
  const imageId = norm(row.Image || row["Image File"] || row.ImageFile || row["ImageFile"]);

  const personaKind = ["Wrestler", "Manager", "Call Name", "Faction"].includes(type) ? type : "";
  const isPersona = personaKind !== "" || /persona/i.test(cardType);

  // NEW MODEL:
  // If Signature is filled AND the card is NOT one of the 4 Persona types, it's a Kit card.
  // Keep legacy detection too (old exports).
  const isKit = (!!signature && !isPersona) || /kit/i.test(cardType) || /kit/i.test(type);

  // Persona identity is Name only.
  // If persona names were exported as "Name Type" (e.g., "Bobby Lashley Wrestler"), strip the suffix.
  let name = rawName;
  if (isPersona) {
    for (const suf of ["Wrestler", "Manager", "Call Name", "Faction"]) {
      if (name.endsWith(" " + suf)) {
        name = name.slice(0, -(" " + suf).length).trim();
        break;
      }
    }
  }

  return {
    raw: row,
    name,
    type,
    cardType,
    personaKind,
    startingFor,
    signature,
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
  store.selectedPersonas[kind] = norm(name);
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
    // Prefer explicit Starting/Starting For list (newer exports)
    const sf = splitList(c.startingFor);
    if (sf.length > 0) {
      if (picked.some(p => sf.includes(p))) starters.push(c);
      continue;
    }

    // Fallback for current simplified model:
    // - Kit cards are determined by Signature filled (and not being a Persona)
    // - That Signature value is the persona name it belongs to
    if (c.isKit) {
      const sig = norm(c.signature);
      if (sig && picked.includes(sig)) starters.push(c);
    }
  }

  const personaCards = store.cards.filter(c => picked.includes(c.name) && c.isPersona);

  const uniq = new Map();
  for (const c of [...personaCards, ...starters]) uniq.set(c.name + "||" + c.set, c);
  store.starterCards = [...uniq.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function deckCounts(store) {
  const countZone = (zone) => store.deck[zone].reduce((n, it) => n + it.qty, 0);
  return { starting: countZone("starting"), purchase: countZone("purchase") };
}

export function isFinisher(card) {
  const t = (card.type || card.cardType || "").toLowerCase();
  return t.includes("finisher");
}

export function cardCostIsZero(card) {
  const c = Number(card.cost || 0);
  return Number.isFinite(c) && c === 0;
}

function totalCopies(store, card) {
  const key = `${card.name}||${card.set}`;
  const inZone = (zone) => {
    const it = store.deck[zone].find(x => x.key === key);
    return it ? it.qty : 0;
  };
  return inZone("starting") + inZone("purchase");
}

export function canAddToDeck(store, zone, card) {
  if (card.isPersona) return { ok: false, reason: "Personas are not deck cards." };
  if (card.isKit) return { ok: false, reason: "Kit cards are not in the general pool." };
  if (card.startingFor) return { ok: false, reason: "Starter/Starting-linked cards are not in the general pool." };

  const maxCopies = isFinisher(card) ? 1 : 3;
  const have = totalCopies(store, card);
  if (have >= maxCopies) return { ok: false, reason: `Max copies reached (${maxCopies}).` };

  if (zone === "starting" && !cardCostIsZero(card)) {
    return { ok: false, reason: "Starting deck is Cost 0 only." };
  }

  return { ok: true };
}

export function addToDeck(store, zone, card) {
  const chk = canAddToDeck(store, zone, card);
  if (!chk.ok) return chk;

  const key = `${card.name}||${card.set}`;
  const arr = store.deck[zone];
  const found = arr.find(x => x.key === key);
  if (found) found.qty += 1;
  else arr.push({ key, name: card.name, set: card.set, qty: 1 });

  return { ok: true };
}

export function removeFromDeck(store, zone, card) {
  const key = `${card.name}||${card.set}`;
  const arr = store.deck[zone];
  const found = arr.find(x => x.key === key);
  if (!found) return { ok: false, reason: "Not in deck." };
  found.qty -= 1;
  if (found.qty <= 0) {
    const idx = arr.indexOf(found);
    if (idx >= 0) arr.splice(idx, 1);
  }
  return { ok: true };
}

export function clearDeck(store) {
  store.deck.starting = [];
  store.deck.purchase = [];
}

export function getDeckWarnings(store) {
  const counts = deckCounts(store);
  const warnings = [];

  // Starting deck "goal" is 24, but we do not hard-cap during building.
  if (counts.starting !== 24) warnings.push(`Starting Draw Deck should be exactly 24 cards (currently ${counts.starting}).`);

  if (counts.purchase < 36) warnings.push(`Purchase Deck should be at least 36 cards (currently ${counts.purchase}).`);

  // Finisher rule: only 1 total across both decks
  let finisherCount = 0;
  const addFinisherCount = (zone) => {
    for (const it of store.deck[zone]) {
      // We don't have card object here; infer by name match in store.cards
      const c = store.cards.find(x => x.name === it.name && x.set === it.set);
      if (c && isFinisher(c)) finisherCount += it.qty;
    }
  };
  addFinisherCount("starting");
  addFinisherCount("purchase");
  if (finisherCount > 1) warnings.push(`Only 1 Finisher total is allowed (currently ${finisherCount}).`);

  return warnings;
}

function zoneToExpandedLines(store, zone) {
  const lines = [];
  for (const it of store.deck[zone]) {
    lines.push({ qty: it.qty, name: it.name, set: it.set });
  }
  lines.sort((a, b) => a.name.localeCompare(b.name));
  return lines;
}

export function exportDeckAsText(store) {
  const w = getDeckWarnings(store);
  const out = [];
  if (w.length) out.push("WARNINGS:\n- " + w.join("\n- ") + "\n");

  out.push("STARTING DRAW DECK");
  for (const it of zoneToExpandedLines(store, "starting")) out.push(`${it.qty}x ${it.name} (${it.set})`);

  out.push("");
  out.push("PURCHASE DECK");
  for (const it of zoneToExpandedLines(store, "purchase")) out.push(`${it.qty}x ${it.name} (${it.set})`);

  out.push("");
  out.push("PERSONAS");
  for (const [k, v] of Object.entries(store.selectedPersonas)) {
    if (v) out.push(`${k}: ${v}`);
  }

  return out.join("\n");
}

export function exportDeckAsLackeyDek(store) {
  const w = getDeckWarnings(store);
  const out = [];
  if (w.length) out.push("// WARNINGS: " + w.join(" | "));

  // Simple Lackey-ish format: "qty name"
  // (If your Lackey plugin needs a different exact syntax, we can tune it.)
  out.push("// Starting Draw Deck");
  for (const it of zoneToExpandedLines(store, "starting")) out.push(`${it.qty}\t${it.name}`);

  out.push("");
  out.push("// Purchase Deck");
  for (const it of zoneToExpandedLines(store, "purchase")) out.push(`${it.qty}\t${it.name}`);

  return out.join("\n");
}

export function importDeckFromAny(store, text) {
  const t = norm(text);
  if (!t) return { ok: false, reason: "Empty file." };

  // JSON import
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const payload = JSON.parse(t);
      applyLocalPayload(store, payload);
      return { ok: true };
    } catch (e) {
      // continue to text formats
    }
  }

  // Parse lines like:
  // "2x Card Name (Set)" OR "2 Card Name" OR "2\tCard Name"
  const lines = t.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const picked = { Wrestler: "", Manager: "", "Call Name": "", Faction: "" };
  const starting = [];
  const purchase = [];
  let mode = "unknown";

  for (const line of lines) {
    const low = line.toLowerCase();
    if (low.includes("starting")) { mode = "starting"; continue; }
    if (low.includes("purchase")) { mode = "purchase"; continue; }
    if (low.startsWith("wrestler:")) { picked.Wrestler = norm(line.split(":").slice(1).join(":")); continue; }
    if (low.startsWith("manager:")) { picked.Manager = norm(line.split(":").slice(1).join(":")); continue; }
    if (low.startsWith("call name:")) { picked["Call Name"] = norm(line.split(":").slice(1).join(":")); continue; }
    if (low.startsWith("faction:")) { picked.Faction = norm(line.split(":").slice(1).join(":")); continue; }

    const m = line.match(/^(\d+)\s*x?\s*(.+?)(?:\s*\((.+?)\))?$/i);
    if (!m) continue;
    const qty = Number(m[1] || 0);
    const name = norm(m[2]);
    const set = norm(m[3]);

    const target = (mode === "purchase") ? purchase : starting;
    target.push({ qty, name, set });
  }

  // Apply
  clearDeck(store);
  store.selectedPersonas = picked;
  recomputeStarterCards(store);

  const findByNameSet = (name, set) => {
    if (set) return store.cards.find(c => c.name === name && c.set === set);
    return store.cards.find(c => c.name === name);
  };

  const restoreZone = (arr, zone) => {
    for (const it of arr) {
      const c = findByNameSet(it.name, it.set);
      if (!c) continue;
      for (let i = 0; i < it.qty; i++) addToDeck(store, zone, c);
    }
  };

  restoreZone(starting, "starting");
  restoreZone(purchase, "purchase");

  return { ok: true };
}

export function saveToLocal(store) {
  const payload = {
    selectedPersonas: store.selectedPersonas,
    starting: store.deck.starting,
    purchase: store.deck.purchase,
  };
  localStorage.setItem("aewdbg_deck", JSON.stringify(payload));
}

export function loadFromLocal() {
  try {
    const raw = localStorage.getItem("aewdbg_deck");
    if (!raw) return { ok: false, reason: "No local save." };
    return { ok: true, payload: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}

export function applyLocalPayload(store, payload) {
  if (!payload || typeof payload !== "object") return;

  if (payload.selectedPersonas) {
    store.selectedPersonas = {
      Wrestler: norm(payload.selectedPersonas.Wrestler),
      Manager: norm(payload.selectedPersonas.Manager),
      "Call Name": norm(payload.selectedPersonas["Call Name"]),
      Faction: norm(payload.selectedPersonas.Faction),
    };
    recomputeStarterCards(store);
  }

  clearDeck(store);

  const findByNameSet = (name, set) => {
    if (set) return store.cards.find(c => c.name === name && c.set === set);
    return store.cards.find(c => c.name === name);
  };

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
