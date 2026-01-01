// filters.js
import { store } from './store.js';

export function getFilteredAndSortedCardPool() {
    const allCards = store.get('cardDatabase') || [];
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    
    const wrestler = store.get('selectedWrestler')?.title;
    const manager = store.get('selectedManager')?.title;
    const selectedPersonas = [wrestler, manager].filter(Boolean);

    return allCards.filter(card => {
        // Hide Persona cards from pool
        if (['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) return false;

        // Kit Card Logic: Only show if signature_for matches selected Wrestler/Manager
        if (card.wrestler_kit === 'TRUE') {
            if (!selectedPersonas.includes(card.signature_for)) return false;
        }

        const titleMatch = card.title.toLowerCase().includes(search);
        const textMatch = card.text_box?.raw_text?.toLowerCase().includes(search);
        
        return titleMatch || textMatch;
    }).sort((a, b) => a.title.localeCompare(b.title));
}

