// FILE: data-loader.js
// Loads setList.txt from /sets/ then loads each TSV, parses rows, and returns all cards.
// Designed for GitHub Pages + mobile debugging: throws rich Errors with URL + HTTP status.

function norm(s) { return (s ?? "").toString().trim(); }

function tsvParse(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map(h => norm(h));
  const out = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split("\t");

    // If a row has extra tabs, merge everything beyond the last header into the last column.
    if (vals.length > headers.length) {
      const head = vals.slice(0, headers.length - 1);
      const tail = vals.slice(headers.length - 1).join("\t");
      vals.length = 0;
      vals.push(...head, tail);
    }

    while (vals.length < headers.length) vals.push("");

    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = vals[j];
    out.push(row);
  }

  return out;
}

async function fetchText(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const msg = `HTTP ${r.status} ${r.statusText} for ${url}`;
    const err = new Error(msg);
    err.httpStatus = r.status;
    err.url = url;
    throw err;
  }
  return await r.text();
}

async function tryFirstText(urls) {
  let lastErr = null;
  for (const u of urls) {
    try {
      const t = await fetchText(u);
      return { url: u, text: t };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No URLs provided");
}

export async function loadSetList() {
  // Support fallbacks because folder moves happen a lot during development.
  const candidates = [
    "./sets/setList.txt",
    "./sets/setlist.txt",
    "./setList.txt",
    "./setlist.txt",
    "./data/setList.txt",
    "./data/setlist.txt",
  ];

  const { url, text } = await tryFirstText(candidates);

  const files = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && !l.startsWith("//"));

  // If setList exists but is empty, fall back to sane defaults.
  if (files.length === 0) {
    return {
      sourceUrl: url,
      setFiles: ["Core.tsv", "Advanced.tsv"].map(f => `./sets/${f}`),
      rawLines: [],
    };
  }

  // If the list already contains paths, respect them. Otherwise assume /sets/
  const setFiles = files.map(f => (f.includes("/") ? f : `./sets/${f}`));

  return { sourceUrl: url, setFiles, rawLines: files };
}

export async function loadAllCardsFromSets(setFiles) {
  const all = [];

  for (const file of setFiles) {
    const text = await fetchText(file);
    const rows = tsvParse(text);

    // Annotate source set file for UI/debugging.
    const setName = file.split("/").pop()?.replace(/\.tsv$/i, "") || file;

    for (const r of rows) {
      if (!("Set" in r) || !norm(r.Set)) r.Set = setName;
      r.__sourceSetFile = setName;
      all.push(r);
    }
  }

  return all;
}
