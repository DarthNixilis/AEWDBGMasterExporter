import { store } from "./store.js";

export function getStartingCards() {
  const { cards, selectedPersona } = store.getState();
  if (!selectedPersona) return [];

  const personaName = selectedPersona.trim();

  return cards.filter(card => {
    // Always include the persona card itself (once)
    if (card.Name === personaName) return true;

    // Only include cards with Starting For
    if (!card["Starting For"]) return false;

    const owners = card["Starting For"]
      .split(",")
      .map(s => s.trim());

    return owners.includes(personaName);
  });
}
