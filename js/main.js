// js/main.js

import { loadCards } from "./data/loadCards.js"
import { getCardPool } from "./cardPool.js"
import { PersonaManager } from "./personaManager.js"
import { DeckManager } from "./deckManager.js"
import {
  renderCardPool,
  renderDeck,
  renderPersona,
  renderStartingCards
} from "./ui.js"
import { loadTSV } from "./tsvLoader.js"

async function init() {
  const rawCards = await loadTSV("data/cardDatabase.txt")
  const allCards = loadCards(rawCards)

  const deck = new DeckManager()
  const personaManager = new PersonaManager(allCards)

  const cardPool = getCardPool(allCards)

  renderCardPool(cardPool, onCardClicked)
  renderDeck([])

  function onCardClicked(card) {
    if (card.rules?.isPersona) {
      deck.clear()
      deck.addCard(card)

      const autoCards = personaManager.selectPersona(card)

      renderPersona(card)

      const startingCards = autoCards.filter(
        c => c.rules?.isStartingCard
      )

      startingCards.forEach(c => deck.addCard(c))

      renderStartingCards(startingCards)
      renderDeck(deck.getCards())
      return
    }

    deck.addCard(card)
    renderDeck(deck.getCards())
  }
}

init()
