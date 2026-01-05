// js/tsvLoader.js
// Loads TSV text and parses into objects using header row.
// Headers are normalized to lowercase keys.

export async function loadTSVFromFile(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch "${url}" (${res.status} ${res.statusText})`);
  }
  const text = await res.text();
  return parseTSV(text);
}

export function parseTSV(text) {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  const headersRaw = lines[0].split("\t");
  const headers = headersRaw.map((h) => normalizeHeader(h));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col_${c}`;
      obj[key] = (cols[c] ?? "").trim();
    }
    // Skip empty row (no name)
    if (!obj.name) continue;
    rows.push(obj);
  }
  return rows;
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w ]/g, "")
    .replace(/\s/g, "_");
}
