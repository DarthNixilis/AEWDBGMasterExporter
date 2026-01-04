import { classifyCard } from "../rules/cardRules.js"

// NOTE: This is the ONLY place card rules are attached.
// UI, validation, and export MUST consume this output.
export function normalizeCard(raw) {
  const rules = classifyCard(raw)

  return {
    ...raw,
    rules,
  }
}

export function loadCards(rawCards) {
  return rawCards
    .filter(card => card.Name && card.Name.trim() !== "")
    .map(normalizeCard)
}
