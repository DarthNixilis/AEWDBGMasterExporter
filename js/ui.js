// js/ui.js

const cardPoolEl = document.getElementById("card-pool")
const deckEl = document.getElementById("deck")
const personaEl = document.getElementById("persona-area")
const startingEl = document.getElementById("starting-cards")

/* ---------- GENERIC CARD RENDER ---------- */

function renderCard(card, onClick) {
  const div = document.createElement("div")
  div.className = "card"
  div.innerHTML = `
    <strong>${card.Name}</strong><br>
    <em>${card.Type || ""}</em>
  `
  if (onClick) {
    div.addEventListener("click", () => onClick(card))
  }
  return div
}

/* ---------- CARD POOL ---------- */

export function renderCardPool(cards, onCardClicked) {
  cardPoolEl.innerHTML = ""
  cards.forEach(card => {
    cardPoolEl.appendChild(renderCard(card, onCardClicked))
  })
}

/* ---------- DECK ---------- */

export function renderDeck(cards) {
  deckEl.innerHTML = ""
  cards.forEach(card => {
    deckEl.appendChild(renderCard(card))
  })
}

/* ---------- PERSONA DISPLAY ---------- */

export function renderPersona(personaCard) {
  personaEl.innerHTML = ""
  if (!personaCard) return

  personaEl.appendChild(renderCard(personaCard))
}

/* ---------- STARTING CARDS GRID ---------- */

export function renderStartingCards(cards) {
  startingEl.innerHTML = ""
  cards.forEach(card => {
    startingEl.appendChild(renderCard(card))
  })
}
