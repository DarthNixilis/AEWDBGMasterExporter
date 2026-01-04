// js/deckExporter.js
export function exportDeckJSON(deckManager) {
  const deckCards = deckManager.getCards()
  const persona = deckCards.find(c => c.rules?.isPersona) || null
  const starting = deckCards.filter(c => c.rules?.isStartingCard)
  const others = deckCards.filter(
    c => !c.rules?.isPersona && !c.rules?.isStartingCard
  )

  const exportObj = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    persona: persona?.Name || "",
    startingCards: starting.map(c => c.Name),
    cards: others.map(c => c.Name),
  }

  return JSON.stringify(exportObj, null, 2)
}

export function exportDeckText(deckManager) {
  const deckCards = deckManager.getCards()
  const persona = deckCards.find(c => c.rules?.isPersona) || null
  const starting = deckCards.filter(c => c.rules?.isStartingCard)
  const others = deckCards.filter(
    c => !c.rules?.isPersona && !c.rules?.isStartingCard
  )

  const lines = [
    `# AEW TCG Deck Export`,
    `# Version: 1.0`,
    `# Exported: ${new Date().toLocaleString()}`,
    ``,
    `Persona: ${persona?.Name || "None"}`,
    ``,
    `# Starting Cards`,
    ...starting.map(c => `- ${c.Name}`),
    ``,
    `# Other Cards`,
    ...others.map(c => `- ${c.Name}`),
  ]

  return lines.join("\n")
}
