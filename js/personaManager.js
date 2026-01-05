import { store } from "./store.js";

export function getPersonaOptions(cards) {
  // Persona-eligible cards only
  return cards.filter(
    c => c.Type === "Wrestler" || c.Type === "Manager"
  );
}

export function selectPersona(card) {
  if (!card || !card.Name) return;

  store.setState({
    selectedPersona: card.Name
  });
}

export function clearPersona() {
  store.setState({
    selectedPersona: null
  });
}
