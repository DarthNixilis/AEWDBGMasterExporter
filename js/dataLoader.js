// TSV parser intended for Google Sheets export.
// Handles: tabs, blank lines, Windows newlines, missing trailing columns.
export function parseTSV(text) {
  const raw = (text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  if (!lines.length) return [];

  const headers = lines[0].split("\t").map((h) => normalizeKey(h));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t");
    const row = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = (values[c] ?? "").trim();
    }
    // Skip empty rows
    if (!row.name || row.name.trim().length === 0) continue;
    rows.push(row);
  }

  return rows;
}

function normalizeKey(k) {
  return (k ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " "); // keep spaces for known keys, we’ll map later
}

export function mapRowToCard(row, setNameHint = "") {
  // Normalize into consistent object keys your app uses.
  // Your sheet headers (as you described) include:
  // Name, Sets, ImageFile, Cost, Damage, Momentum, Type, Target, Traits, Wrestler Logo, Game Text, Starting For
  const card = {
    name: row["name"] || "",
    sets: row["sets"] || setNameHint || "",
    imagefile: row["imagefile"] || "",
    cost: row["cost"] || "",
    damage: row["damage"] || "",
    momentum: row["momentum"] || "",
    type: row["type"] || "",
    target: row["target"] || "",
    traits: row["traits"] || "",
    wrestlerLogo: row["wrestler logo"] || "",
    gameText: row["game text"] || "",
    startingFor: row["starting for"] || "",
    // keep raw for debugging/export
    _raw: row,
  };

  card.displayName = stripBookkeepingSuffix(card.name);
  card.isKit = isKitCard(card);
  card.isStarter = isStarterCard(card);

  return card;
}

export function stripBookkeepingSuffix(name) {
  // You said you appended type words like "Wrestler" / "Manager" to Name for bookkeeping
  // Display should be just "Bobby Lashley".
  const s = (name ?? "").trim();
  const suffixes = [" Wrestler", " Manager", " Action", " Grapple", " Strike", " Submission", " Response", " Faction", " Call Name", " Injury", " Boon", " Maneuver"];
  for (const suf of suffixes) {
    if (s.endsWith(suf)) return s.slice(0, -suf.length).trim();
  }
  return s;
}

export function isStarterCard(card) {
  return (card.startingFor ?? "").trim().length > 0;
}

export function isKitCard(card) {
  // Strong rule: anything that is a starter AND is not the persona itself is “kit/starter” territory.
  // We also treat explicit Type=Kit if you ever add it.
  const t = (card.type ?? "").toLowerCase().trim();
  if (t === "kit") return true;

  // If Starting For is filled, it’s a starter (persona-specific). That should not be in Card Pool.
  // We’ll still display it in Starting grid.
  return isStarterCard(card);
}

export function toPascalCaseFilename(name, ext = "jpg") {
  const base = (name ?? "")
    .toString()
    .trim()
    .replace(/['’]/g, "") // kill apostrophes
    .replace(/[^a-zA-Z0-9]+/g, " ") // non-alnum to spaces
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  return `${base}.${ext}`;
}
