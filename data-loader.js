/* data-loader.js
 *
 * Multi-set loader built from the original working beta logic.
 * Key guarantees:
 * - Uses ONLY relative paths
 * - Works regardless of repo name
 * - Works locally and on GitHub Pages
 * - No leading slashes, ever
 */

/**
 * Load all card data from TSV files listed in sets/setlist.txt
 */
export async function loadAllCardsFromSets() {
  console.log("Loading card sets…");

  // 1) Load set list (relative path, same rule as beta)
  const setlistResponse = await fetch("sets/setlist.txt");
  if (!setlistResponse.ok) {
    throw new Error("Failed to load sets/setlist.txt");
  }

  const setlistText = await setlistResponse.text();

  const setFiles = setlistText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (setFiles.length === 0) {
    throw new Error("Set list is empty.");
  }

  console.log("Sets found:", setFiles);

  // 2) Load each TSV exactly like the beta did (just in a loop)
  let allCards = [];

  for (const fileName of setFiles) {
    const path = `sets/${fileName}`;
    console.log(`Loading set: ${path}`);

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load set file: ${path}`);
    }

    const tsvText = await response.text();
    const cards = parseTSV(tsvText, fileName);

    console.log(`Loaded ${cards.length} cards from ${fileName}`);
    allCards.push(...cards);
  }

  console.log(`Total cards loaded: ${allCards.length}`);
  return allCards;
}

/**
 * Parse TSV text into card objects
 * (Direct descendant of beta parser)
 */
function parseTSV(tsvText, sourceFile) {
  const lines = tsvText
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    console.warn(`No data rows found in ${sourceFile}`);
    return [];
  }

  const headers = lines[0].split("\t").map(h => h.trim());
  const cards = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t");
    const card = {};

    headers.forEach((header, index) => {
      card[header] = values[index]?.trim() ?? "";
    });

    // Optional but useful for debugging provenance
    card.__set = sourceFile;

    cards.push(card);
  }

  return cards;
}
