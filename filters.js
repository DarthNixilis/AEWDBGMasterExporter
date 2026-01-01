// filters.js
import { store } from './store.js';

export function getFilteredAndSortedCardPool() {
    const allCards = store.get('cardDatabase') || [];
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    
    const wrestler = store.get('selectedWrestler')?.title;
    const manager = store.get('selectedManager')?.title;
    const personaTitles = [wrestler, manager].filter(Boolean);

    return allCards.filter(card => {
        // 1. Filter out Persona cards (Wrestler/Manager/etc) from the main pool
        if (['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type)) return false;

        // 2. Kit Card Logic: If it's a kit card, only show if signature matches persona
        if (card.wrestler_kit === 'TRUE') {
            const sig = card.signature_for || '';
            if (!personaTitles.includes(sig)) return false;
        }

        // 3. Search text
        const titleMatch = card.title.toLowerCase().includes(search);
        const textMatch = card.text_box?.raw_text?.toLowerCase().includes(search);
        
        return titleMatch || textMatch;
    }).sort((a, b) => a.title.localeCompare(b.title));
}

