// FILE: data-loader.js

function norm(s) { return String(s ?? "").trim(); }

function truthyCell(v) {
  const t = norm(v).toLowerCase();
  return t !== "" && t !== "false" && t !== "0" && t !== "n/a" && t !== "na" && t !== "null" && t !== "undefined";
}

function splitNames(cell) {
  return norm(cell)
    .split(/[,/;]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

async function fetchTextOrThrow(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}\n${body.slice(0, 400)}`);
  }
  return await res.text();
}

function parseTSV(tsvText) {
  const lines = tsvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim() !== "");
  if (!lines.length) return [];

  const header = lines[0].split("\t").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = cols[c] ?? "";
    rows.push(obj);
  }
  return rows;
}

function getField(row, ...names) {
  for (const n of names) if (Object.prototype.hasOwnProperty.call(row, n)) return row[n];
  return "";
}

function cardName(row) {
  return norm(getField(row, "Card Name", "Name", "Title"));
}

function cardType(row) {
  return norm(getField(row, "Type"));
}

function isKit(row) {
  const v = getField(row, "Wrestler Kit", "Kit", "Is Kit");
  return truthyCell(v);
}

function startingForNames(row) {
  const cell = getField(row, "Starting For", "Signature For", "Starter For");
  return splitNames(cell);
}

export async function loadAllData() {
  const AEW = window.AEWDBG || {};
  const setStatus = AEW.setStatus ? AEW.setStatus : () => {};
  const showError = AEW.showError ? AEW.showError : () => {};

  try {
    // GitHub Pages safe: always relative, never "/sets/..."
    const setListPath = "./sets/setList.txt";

    setStatus("Status: Loading…  Sets: (loading)  Cards: (loading)");

    const setListText = await fetchTextOrThrow(setListPath);
    const setFiles = setListText
      .split(/\r?\n/g)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"));

    if (!setFiles.length) throw new Error(`setList.txt is empty.\nPath used: ${setListPath}`);

    setStatus(`Status: Loading…  Sets: ${setFiles.length} (loading)  Cards: (loading)`);

    const allRows = [];
    for (const file of setFiles) {
      const clean = file.replace(/^\.?\//, "");
      const url = clean.startsWith("sets/") ? `./${clean}` : `./sets/${clean}`;

      const tsv = await fetchTextOrThrow(url);
      const rows = parseTSV(tsv);

      for (const r of rows) r.__sourceFile = clean;
      allRows.push(...rows);
    }

    const personas = allRows
      .filter(r => {
        const t = cardType(r).toLowerCase();
        return t === "wrestler" || t === "manager";
      })
      .map(r => ({ name: cardName(r), type: cardType(r), row: r }))
      .filter(p => p.name);

    const startersByPersona = new Map();
    for (const row of allRows) {
      const nm = cardName(row);
      if (!nm) continue;

      const startersFor = startingForNames(row);
      if (!startersFor.length) continue;

      for (const p of startersFor) {
        if (!startersByPersona.has(p)) startersByPersona.set(p, []);
        startersByPersona.get(p).push(row);
      }
    }

    const pool = allRows.filter(row => {
      const t = cardType(row).toLowerCase();
      if (t === "wrestler" || t === "manager") return false;
      if (isKit(row)) return false;
      if (startingForNames(row).length) return false;
      return true;
    });

    const sets = Array.from(new Set(allRows.map(r => norm(getField(r, "Set"))).filter(Boolean)));

    setStatus(`Status: Loaded  Sets: ${sets.length}  Cards: ${allRows.length}`);

    return { sets, allRows, personas, pool, startersByPersona };
  } catch (err) {
    showError(
      "Data load failed (fetch/parse). This is usually a bad path or missing setList.txt / TSV.",
      err
    );
    throw err;
  }
}
