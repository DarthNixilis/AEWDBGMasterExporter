// js/deckManager.js

export class DeckManager {
  constructor() {
    this.cards = []
  }

  clear() {
    this.cards = []
  }

  addCard(card) {
    if (!card) return

    // Prevent duplicates of persona
    if (card.rules?.isPersona) {
      const hasPersona = this.cards.some(c => c.rules?.isPersona)
      if (hasPersona) {
        console.warn("Persona already in deck")
        return
      }
    }

    this.cards.push(card)
  }

  removeCard(cardName) {
    const index = this.cards.findIndex(c => c.Name === cardName)
    if (index !== -1) {
      this.cards.splice(index, 1)
    }
  }

  getCards() {
    return [...this.cards]
  }
}
