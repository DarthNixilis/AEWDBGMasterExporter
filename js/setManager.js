import { ui } from "./ui.js";
import { parseTSV, mapRowToCard } from "./dataLoader.js";

async function fetchText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path} (HTTP ${res.status})`);
  return await res.text();
}

function normalizeSetFilename(line) {
  return (line ?? "").trim().replace(/^\/+/, "");
}

async function loadAllSets() {
  // Reads /sets/setList.txt, loads each TSV, merges into one card list.
  const listText = await fetchText("./sets/setList.txt");
  const setFiles = listText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map(normalizeSetFilename);

  if (!setFiles.length) {
    ui.toast("Sets missing", "No sets found in /sets/setList.txt", "err", true);
    return { cards: [], setsLoaded: [] };
  }

  const cards = [];
  const setsLoaded = [];

  for (const file of setFiles) {
    const tsvPath = `./sets/${file}`;
    try {
      const text = await fetchText(tsvPath);
      const rows = parseTSV(text);
      // Set hint is filename without extension
      const hint = file.replace(/\.tsv$/i, "");
      const mapped = rows.map((r) => mapRowToCard(r, hint));
      cards.push(...mapped);
      setsLoaded.push(hint);
    } catch (err) {
      ui.toast("Set failed to load", `${file}: ${err?.message || String(err)}`, "err", true);
    }
  }

  if (!cards.length) {
    ui.toast("No cards loaded", "All sets loaded but parsed zero cards. Check TSV headers + tabs.", "err", true);
  }

  return { cards, setsLoaded };
}

export const setManager = { loadAllSets };
