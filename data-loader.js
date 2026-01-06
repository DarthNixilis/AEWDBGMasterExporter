// FILE: data-loader.js
// Robust fetch + TSV parsing (quotes + embedded newlines). All errors are thrown with context.

export async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${url}\nHTTP ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

export async function loadSetList() {
  const txt = await fetchText("./sets/setList.txt");
  return txt
    .split(/\r?\n/g)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith("#"));
}

export async function loadAllCardsFromSets(setFiles) {
  const all = [];
  for (const file of setFiles) {
    const tsv = await fetchText(`./sets/${file}`);
    const rows = parseTSV(tsv);
    for (const r of rows) {
      r.__sourceSetFile = file;
      all.push(r);
    }
  }
  return all;
}

// TSV parser that respects quotes and embedded newlines inside quoted fields.
export function parseTSV(input) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = input[i + 1];
        if (next === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === "\t") { pushField(); continue; }
    if (ch === "\n") { pushField(); pushRow(); continue; }
    if (ch === "\r") { continue; }

    field += ch;
  }

  // tail
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) pushRow();

  if (rows.length === 0) return [];

  const header = rows[0].map(h => (h || "").trim());
  const out = [];

  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    const cells = rows[r];
    let empty = true;
    for (let c = 0; c < header.length; c++) {
      const key = header[c] || `col${c}`;
      const val = (cells[c] ?? "").trim();
      if (val) empty = false;
      obj[key] = val;
    }
    if (!empty) out.push(obj);
  }

  return out;
}
