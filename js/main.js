// js/main.js

import { loadCards } from "./data/loadCards.js"
import { getCardPool } from "./cardPool.js"
import { PersonaManager } from "./personaManager.js"
import { DeckManager } from "./deckManager.js"
import { renderCardPool, renderDeck } from "./ui.js"
import { loadTSV } from "./tsvLoader.js"

async function init() {
  const rawCards = await loadTSV("data/cardDatabase.txt")
  const allCards = loadCards(rawCards)

  const deck = new DeckManager()
  const personaManager = new PersonaManager(allCards)

  const cardPool = getCardPool(allCards)

  renderCardPool(cardPool, onCardClicked)
  renderDeck(deck.getCards())

  function onCardClicked(card) {
    // Persona selection
    if (card.rules?.isPersona) {
      deck.clear()
      deck.addCard(card)

      const autoCards = personaManager.selectPersona(card)
      autoCards.forEach(c => deck.addCard(c))

      renderDeck(deck.getCards())
      return
    }

    // Normal add
    deck.addCard(card)
    renderDeck(deck.getCards())
  }
}

init()
