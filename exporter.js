// exporter.js
// Full-file replacement: adds LackeyCCG .dek export (downloads as .dek)

(function () {
  "use strict";

  /**
   * Best-effort XML escaping for Lackey .dek
   */
  function xmlEscape(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Normalize "card image id" like RookieMistake.jpg from a card name,
   * if your data doesn't provide a filename explicitly.
   */
  function nameToImageId(cardName, ext = "jpg") {
    const base = String(cardName ?? "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");
    return base.length ? `${base}.${ext}` : `Unknown.${ext}`;
  }

  /**
   * Detect numeric-ish cost from many possible card shapes.
   */
  function getCardCost(card) {
    const raw =
      card?.cost ??
      card?.Cost ??
      card?.C ??
      card?.c ??
      card?.purchaseCost ??
      card?.PurchaseCost ??
      card?.marketCost ??
      card?.MarketCost ??
      0;

    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Detect if a card is Persona (Wrestler/Manager) or Kit.
   * This is intentionally flexible because your data model has evolved.
   */
  function isPersona(card) {
    const type = String(card?.type ?? card?.Type ?? "").toLowerCase();
    const sub = String(card?.subtype ?? card?.Subtype ?? "").toLowerCase();
    const tags = String(card?.tags ?? card?.Tags ?? "").toLowerCase();

    // Common: "Wrestler", "Manager", "Persona"
    if (type.includes("wrestler")) return true;
    if (type.includes("manager")) return true;
    if (type.includes("persona")) return true;

    // Sometimes stored as subtype/tags
    if (sub.includes("wrestler") || sub.includes("manager") || sub.includes("persona")) return true;
    if (tags.includes("wrestler") || tags.includes("manager") || tags.includes("persona")) return true;

    return false;
  }

  function isKit(card) {
    // Support both old and new ways of representing kit-ness.
    const type = String(card?.type ?? card?.Type ?? "").toLowerCase();
    const sub = String(card?.subtype ?? card?.Subtype ?? "").toLowerCase();
    const tags = String(card?.tags ?? card?.Tags ?? "").toLowerCase();

    const isKitBool =
      card?.isKit === true ||
      card?.IsKit === true ||
      card?.kit === true ||
      card?.Kit === true;

    if (isKitBool) return true;

    if (type.includes("kit")) return true;
    if (sub.includes("kit")) return true;
    if (tags.includes("kit")) return true;

    // Some builds used "Signature" as the "kit marker" after the IsKit column died.
    // If you still want Signature to mean Kit, keep this on. If not, delete this block.
    const signature = String(card?.signature ?? card?.Signature ?? "").trim();
    if (signature.length > 0) return true;

    return false;
  }

  function isToken(card) {
    const type = String(card?.type ?? card?.Type ?? "").toLowerCase();
    const sub = String(card?.subtype ?? card?.Subtype ?? "").toLowerCase();
    const tags = String(card?.tags ?? card?.Tags ?? "").toLowerCase();
    const name = String(card?.name ?? card?.Name ?? "").toLowerCase();

    // multiple ways you might encode tokens
    if (card?.isToken === true || card?.IsToken === true) return true;
    if (type.includes("token") || sub.includes("token") || tags.includes("token")) return true;
    if (name.startsWith("token:")) return true;

    return false;
  }

  /**
   * Determine display name and set name.
   */
  function getCardName(card) {
    return String(card?.name ?? card?.Name ?? card?.title ?? card?.Title ?? "").trim() || "Unnamed Card";
  }

  function getCardSet(card) {
    return String(card?.set ?? card?.Set ?? card?.setName ?? card?.SetName ?? "AEW").trim() || "AEW";
  }

  function getCardImageId(card) {
    // If you have an explicit image filename in your DB, use it.
    const explicit =
      card?.imageId ??
      card?.ImageId ??
      card?.image ??
      card?.Image ??
      card?.img ??
      card?.Img ??
      card?.file ??
      card?.File ??
      card?.artFile ??
      card?.ArtFile ??
      "";

    const clean = String(explicit).trim();
    if (clean) return clean;

    // Fall back to NameWithoutSpaces.jpg like your sample
    return nameToImageId(getCardName(card), "jpg");
  }

  /**
   * Some deck builders store deck entries as:
   *   { card: {...}, quantity: 2 }
   * Others store:
   *   { ...cardFields, qty: 2 }
   * Others store duplicated cards in arrays.
   *
   * This normalizes into a flat list of { card, qty }.
   */
  function normalizeEntries(list) {
    const arr = Array.isArray(list) ? list : [];
    const out = [];

    for (const item of arr) {
      if (!item) continue;

      // shape: { card: {...}, quantity: n }
      const cardObj = item.card ?? item.Card ?? null;
      const qty =
        Number(item.quantity ?? item.qty ?? item.count ?? item.Count ?? 1);

      if (cardObj) {
        out.push({ card: cardObj, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 });
        continue;
      }

      // shape: card object itself with qty
      const hasName =
        item.name || item.Name || item.title || item.Title;
      if (hasName) {
        out.push({ card: item, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 });
        continue;
      }

      // unknown shape: skip
    }

    // If the deck is stored as duplicated card objects instead of qty,
    // callers can just pass that array and it'll produce qty=1 each.
    return out;
  }

  /**
   * If a zone is provided as duplicated cards (no qty),
   * this will compress to qty counts by card "key".
   */
  function compressByKey(entries) {
    const map = new Map();

    for (const e of entries) {
      const card = e.card;
      const key =
        String(getCardName(card)) + "||" +
        String(getCardSet(card)) + "||" +
        String(getCardImageId(card));

      const prev = map.get(key);
      if (prev) prev.qty += e.qty;
      else map.set(key, { card, qty: e.qty });
    }

    return Array.from(map.values());
  }

  /**
   * Produce Lackey's <card> lines repeated by quantity (as in your sample).
   */
  function renderCardLines(entries) {
    const lines = [];
    for (const { card, qty } of entries) {
      const cardName = xmlEscape(getCardName(card));
      const setName = xmlEscape(getCardSet(card));
      const imgId = xmlEscape(getCardImageId(card));

      for (let i = 0; i < qty; i++) {
        lines.push(`\t\t<card><name id="${imgId}">${cardName}</name><set>${setName}</set></card>`);
      }
    }
    return lines.join("\n");
  }

  /**
   * Try to locate the "current deck" from common globals used in small JS apps.
   * If you already call an exporter with a deck object, you can bypass this and pass it in.
   */
  function tryGetCurrentDeck() {
    // common patterns:
    // window.deck, window.currentDeck, window.app.deck, window.state.deck, etc.
    return (
      window.currentDeck ||
      window.deck ||
      window.app?.deck ||
      window.appState?.deck ||
      window.state?.deck ||
      window.DECK ||
      null
    );
  }

  /**
   * Build the 4 zones you requested from whatever the deck data provides.
   */
  function buildZonesFromDeck(deck) {
    // If your deck already stores zones explicitly, honor that first.
    const startingZoneRaw =
      deck?.Starting ||
      deck?.starting ||
      deck?.startingZone ||
      deck?.personaAndKit ||
      null;

    const tokensZoneRaw =
      deck?.Tokens ||
      deck?.tokens ||
      deck?.tokenZone ||
      null;

    const drawDeckRaw =
      deck?.Deck ||
      deck?.deck ||
      deck?.startingDrawDeck ||
      deck?.startingDeck ||
      deck?.drawDeck ||
      null;

    const purchaseDeckRaw =
      deck?.PurchaseDeck ||
      deck?.purchaseDeck ||
      deck?.marketDeck ||
      deck?.buyDeck ||
      null;

    // Normalize any explicit zones first
    const startingExplicit = startingZoneRaw ? compressByKey(normalizeEntries(startingZoneRaw)) : [];
    const tokensExplicit = tokensZoneRaw ? compressByKey(normalizeEntries(tokensZoneRaw)) : [];
    const deckExplicit = drawDeckRaw ? compressByKey(normalizeEntries(drawDeckRaw)) : [];
    const purchaseExplicit = purchaseDeckRaw ? compressByKey(normalizeEntries(purchaseDeckRaw)) : [];

    // If you have explicit zones and at least one of them is non-empty, use them.
    const hasAnyExplicit =
      startingExplicit.length ||
      tokensExplicit.length ||
      deckExplicit.length ||
      purchaseExplicit.length;

    if (hasAnyExplicit) {
      return {
        deck: deckExplicit,
        purchase: purchaseExplicit,
        starting: startingExplicit,
        tokens: tokensExplicit,
      };
    }

    // Otherwise: assume the deck is one big list of entries, and we split it by your rules.
    const allEntries = compressByKey(
      normalizeEntries(deck?.cards || deck?.Cards || deck?.list || deck?.List || deck || [])
    );

    const starting = [];
    const tokens = [];
    const deckZone = [];
    const purchase = [];

    for (const entry of allEntries) {
      const card = entry.card;
      const cost = getCardCost(card);

      if (isToken(card)) {
        tokens.push(entry);
        continue;
      }

      if (isPersona(card) || isKit(card)) {
        starting.push(entry);
        continue;
      }

      if (cost <= 0) {
        deckZone.push(entry);
      } else {
        purchase.push(entry);
      }
    }

    return {
      deck: deckZone,
      purchase,
      starting,
      tokens,
    };
  }

  function buildDekXml({ deckName, zones }) {
    const safeName = (deckName && String(deckName).trim()) ? String(deckName).trim() : "AEW Deck";

    const deckLines = renderCardLines(zones.deck);
    const purchaseLines = renderCardLines(zones.purchase);
    const startingLines = renderCardLines(zones.starting);
    const tokenLines = renderCardLines(zones.tokens);

    // Matches the structure in your sample file. 1
    return [
      `<deck version="0.8">`,
      `\t<meta>`,
      `\t\t<game>AEW</game>`,
      `\t\t<name>${xmlEscape(safeName)}</name>`,
      `\t</meta>`,
      `\t<superzone name="Deck">`,
      deckLines ? deckLines : `\t\t<!-- empty -->`,
      `\t</superzone>`,
      `\t<superzone name="Purchase Deck">`,
      purchaseLines ? purchaseLines : `\t\t<!-- empty -->`,
      `\t</superzone>`,
      `\t<superzone name="Starting">`,
      startingLines ? startingLines : `\t\t<!-- empty -->`,
      `\t</superzone>`,
      `\t<superzone name="Tokens">`,
      tokenLines ? tokenLines : `\t\t<!-- empty -->`,
      `\t</superzone>`,
      `</deck>`,
      ``,
    ].join("\n");
  }

  function downloadFile({ filename, content, mime }) {
    const blob = new Blob([content], { type: mime || "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // cleanup
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }

  /**
   * Public function you can call from anywhere:
   *   window.exportCurrentDeckAsDek("My Deck Name")
   */
  function exportCurrentDeckAsDek(deckName) {
    const deck = tryGetCurrentDeck();
    if (!deck) {
      alert("No deck found to export. (exporter.js couldn't locate a current deck object.)");
      return;
    }

    const zones = buildZonesFromDeck(deck);
    const xml = buildDekXml({ deckName, zones });

    const base = (deckName && String(deckName).trim()) ? String(deckName).trim() : "AEW Deck";
    const safeFile = base.replace(/[\\/:*?"<>|]/g, "_");

    downloadFile({
      filename: `${safeFile}.dek`,
      content: xml,
      mime: "application/octet-stream",
    });
  }

  /**
   * Optional: auto-wire a button if it exists (won't break anything if it doesn't).
   * If you add a button with id="exportDekBtn", it will work.
   */
  function autoWireExportButton() {
    const btn = document.getElementById("exportDekBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const nameInput =
        document.getElementById("deckName") ||
        document.getElementById("deckNameInput") ||
        null;

      const deckName = nameInput ? nameInput.value : "";
      exportCurrentDeckAsDek(deckName);
    });
  }

  // expose
  window.exportCurrentDeckAsDek = exportCurrentDeckAsDek;

  document.addEventListener("DOMContentLoaded", autoWireExportButton);
})();
