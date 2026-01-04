// js/personaManager.js

export class PersonaManager {
  constructor(allCards) {
    this.allCards = allCards
    this.selectedPersona = null
  }

  selectPersona(personaCard) {
    if (!personaCard.rules?.isPersona) {
      console.warn("Tried to select non-persona:", personaCard)
      return []
    }

    this.selectedPersona = personaCard

    return this.getAutoCards()
  }

  clearPersona() {
    this.selectedPersona = null
    return []
  }

  getAutoCards() {
    if (!this.selectedPersona) return []

    return this
