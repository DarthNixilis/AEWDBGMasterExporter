// FILE: data-loader.js

function norm(s) {
  return String(s ?? "").trim();
}

function truthyCell(v) {
  const t = norm(v).toLowerCase();
  return t !== "" && t !== "false" && t !== "0" && t !== "n/a" && t !== "na" && t !== "null" && t !== "undefined";
}

function splitNames(cell) {
  // Supports: "Name", "Name, Name2", "Name / Name2", "Name;Name2"
  return norm(cell)
    .split(/[,/;]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

async function fetchTextOrThrow(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}\n${body.slice(0, 300)}`);
  }
  return await res.text();
}

function parseTSV(tsvText) {
  const lines = tsvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  const header = lines[0].split("\t").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = cols[c] ?? "";
    }
    rows.push(obj);
  }
  return rows;
}

function getField(row, ...names) {
  for (const n of names) {
    if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  }
  return "";
}

function computeIsKit(row) {
  // Primary: "Wrestler Kit"
  const kit = getField(row, "Wrestler Kit", "Kit", "Is Kit");
  return truthyCell(kit);
}

function computeStartingForNames(row) {
  // Your spec says "Starting For". Some exports used "Signature For".
  const cell = getField(row, "Starting For", "Signature For", "Starter For");
  return splitNames(cell);
}

function computeCardName(row) {
  return norm(getField(row, "Card Name", "Name", "Title"));
}

function computeType(row) {
  return norm(getField(row, "Type"));
}

export async function loadAllData() {
  const { showError, setStatus } = window.AEWDBG || {};

  // IMPORTANT: relative paths so GitHub Pages project sites work
  const setListPath = "./sets/setList.txt";

  try {
    setStatus?.("Status: Loading… Sets: (loading) Cards: (loading)");

    const setListText = await fetchTextOrThrow(setListPath);
    const setFiles = setListText
      .split(/\r?\n/g)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"));

    if (setFiles.length === 0) {
      throw new Error(`setList.txt is empty or only comments.\nPath used: ${setListPath}`);
    }

    setStatus?.(`Status: Loading… Sets: ${setFiles.length} (loading) Cards: (loading)`);

    const allRows = [];
    for (const file of setFiles) {
      // Allow lines like "Core.tsv" or "sets/Core.tsv" (we normalize)
      const clean = file.replace(/^\.?\//, "");
      const url = clean.startsWith("sets/") ? `./${clean}` : `./sets/${clean}`;

      const tsv = await fetchTextOrThrow(url);
      const rows = parseTSV(tsv);

      // Tag the source file (useful for debugging)
      for (const r of rows) {
        r.__sourceFile = clean;
      }

      allRows.push(...rows);
    }

    // Personas are Type Wrestler/Manager, identity is NAME ONLY (no "Wrestler"/"Manager" appended)
    const personas = allRows
      .filter(r => {
        const t = computeType(r).toLowerCase();
        return t === "wrestler" || t === "manager";
      })
      .map(r => ({
        name: computeCardName(r),
        type: computeType(r),
        row: r
      }))
      .filter(p => p.name !== "");

    // Build starter mapping from "Starting For"/"Signature For"
    const startersByPersona = new Map();
    for (const row of allRows) {
      const cardName = computeCardName(row);
      if (!cardName) continue;

      const startingFor = computeStartingForNames(row);
      if (startingFor.length) {
        for (const pname of startingFor) {
          const key = pname;
          if (!startersByPersona.has(key)) startersByPersona.set(key, []);
          startersByPersona.get(key).push(row);
        }
      }
    }

    // General pool rules:
    // - Kits must NOT appear
    // - Anything with Starting For filled must NOT appear
    const pool = allRows.filter(row => {
      const type = computeType(row).toLowerCase();

      // Exclude personas themselves from pool
      if (type === "wrestler" || type === "manager") return false;

      // Exclude kits
      if (computeIsKit(row)) return false;

      // Exclude starters/kit/etc marked by Starting For/Signature For
      const startingFor = computeStartingForNames(row);
      if (startingFor.length) return false;

      return true;
    });

    // Sets list for UI
    const sets = Array.from(new Set(allRows.map(r => norm(getField(r, "Set"))).filter(Boolean)));

    setStatus?.(`Status: Loaded · Sets: ${sets.length} · Cards: ${allRows.length}`);

    return {
      sets,
      allRows,
      personas,
      pool,
      startersByPersona
    };
  } catch (err) {
    showError?.(
      "Data load failed (fetch/parse). This is usually a bad path like /sets/... on GitHub Pages.",
      err?.stack || String(err)
    );
    setStatus?.("Status: ERROR (see popup) · Sets: (failed) · Cards: (failed)");
    throw err;
  }
}
