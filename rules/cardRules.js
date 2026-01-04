// cardRules.js
// This file defines how cards behave in deck construction.
// UI MUST defer to this logic.

export function classifyCard(card) {
  const type = (card.Type || "").toLowerCase()
  const traits = (card.Traits || "").toLowerCase()
  const name = (card.Name || "").toLowerCase()

  const isPersona =
    type === "wrestler" ||
    type === "manager" ||
    type === "call name" ||
    type === "faction"

  const isKit =
    traits.includes("kit") ||
    name.includes("create-a-wrestler")

  const isStartingCard = isPersona

  return {
    isPersona,
    isKit,
    isStartingCard,

    // Card Pool Rules
    inCardPool: !isPersona && !isKit,

    // Auto-inclusion Rules
    autoAddedWithPersona: isKit,

    // Visibility Rules
    selectableManually: !isPersona && !isKit,
  }
}
