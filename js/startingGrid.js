import { cardRules } from "../rules/cardRules.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeKey(s) {
  return String(s ?? "").trim().toLowerCase();
}

function displayName(card) {
  const name = String(card?.name ?? "");
  const t = String(card?.typeNormalized ?? "").toLowerCase();

  const suffixMap = {
    wrestler: " Wrestler",
    manager: " Manager",
    call_name: " Call Name",
    faction: " Faction",
  };

  const suffix = suffixMap[t];
  if (suffix && name.endsWith(suffix)) return name.slice(0, -suffix.length).trim();
  return name.trim();
}

function findSelectedPersona(allCards, selectedPersonaId) {
  if (!selectedPersonaId) return null;
  return (allCards ?? []).find((c) => String(c.id) === String(selectedPersonaId)) || null;
}

function getStartingCardsForPersona(allCards, personaCard) {
  if (!personaCard) return [];

  const personaName = displayName(personaCard);
  const personaKey = normalizeKey(personaName);

  // Starting grid should include:
  // - the persona card itself
  // - any cards whose Starting For matches the persona display name (case-insensitive)
  const kits = (allCards ?? []).filter((c) => normalizeKey(c.startingFor) === personaKey);

  return [personaCard, ...kits];
}

function renderStartingCard(card) {
  const title = escapeHtml(displayName(card));
  const meta = escapeHtml(cardRules.cardLine(card));
  const text = escapeHtml(card.gameText || "");

  return `
    <div class="card card--grid">
      <div class="card__title">${title}</div>
      <div class="card__meta">${meta}</div>
      ${text ? `<div class="card__text">${text}</div>` : ""}
    </div>
  `;
}

function renderStartingTab(state, allCards) {
  const persona = findSelectedPersona(allCards, state?.selectedPersonaId ?? "");
  if (!persona) {
    return `
      <div class="panel">
        <div class="hint">No persona selected. Go to the Persona tab first.</div>
      </div>
    `;
  }

  const startingCards = getStartingCardsForPersona(allCards, persona);
  const grid = startingCards.map(renderStartingCard).join("");

  return `
    <div class="panel">
      <div class="hint">Showing Starting cards for: <b>${escapeHtml(displayName(persona))}</b></div>
      <div class="spacer"></div>
      <div class="grid">
        ${grid}
      </div>
    </div>
  `;
}

function bindStartingTab(store, allCards, rerenderAll) {
  // No inputs yet, nothing to bind.
}

export const startingGrid = {
  renderStartingTab,
  bindStartingTab,
};
