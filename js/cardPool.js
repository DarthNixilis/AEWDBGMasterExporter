// js/cardPool.js
export function getCardPool(cards) {
  return cards.filter(card => {
    if (!card.rules) {
      console.warn("Card missing rules:", card.Name)
      return false
    }

    return card.rules.inCardPool === true
  })
}
