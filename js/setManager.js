// js/setManager.js
// Loads sets/setList.txt, then loads each TSV and merges into one card array.

import { loadTSVFromFile } from "./tsvLoader.js";

export async function loadAllSets(setListUrl = "sets/setList.txt") {
  const setPaths = await loadSetList(setListUrl);

  if (setPaths.length === 0) {
    throw new Error(
      `Set list "${setListUrl}" is empty. Add TSV paths (one per line).`
    );
  }

  const allCards = [];
  for (const path of setPaths) {
    const cards = await loadTSVFromFile(path);

    // Tag each card with which TSV it came from, for debugging/filtering/export.
    cards.forEach((c) => {
      c._set_file = path;
      // If the TSV has a "sets" column, keep it. If not, derive something friendly.
      if (!c.sets) c.sets = deriveSetNameFromPath(path);
    });

    allCards.push(...cards);
  }

  return {
    setPaths,
    cards: allCards,
  };
}

async function loadSetList(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch "${url}" (${res.status} ${res.statusText})`);
  }
  const text = await res.text();
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.startsWith("#")); // allow comments
}

function deriveSetNameFromPath(path) {
  const file = path.split("/").pop() || path;
  return file.replace(/\.(tsv|txt)$/i, "");
}
