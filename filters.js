// filters.js
import { store } from './store.js';

export function getFilteredAndSortedCardPool() {
    const allCards = store.get('cardDatabase') || [];
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    
    const wrestler = store.get('selectedWrestler');
    const manager = store.get('selectedManager');
    
    // Kit Logic: We want cards where 'Signature For' matches current persona
    const activeLogos = [
        wrestler ? wrestler.title.toLowerCase() : null,
        manager ? manager.title.toLowerCase() : null
    ].filter(Boolean);

    return allCards.filter(card => {
        // 1. Hide Persona cards from the pool
        const type = card.card_type;
        if (['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(type)) return false;

        // 2. Kit Check
        if (store.isKitCard(card)) {
            const sigFor = (card['Signature For'] || '').toLowerCase();
            // Match "Jon Moxley" or "Jon Moxley Wrestler"
            const match = activeLogos.some(logo => sigFor.includes(logo));
            if (!match) return false;
        }

        // 3. Search text
        const title = (card.title || '').toLowerCase();
        const text = (card.game_text || '').toLowerCase();
        return title.includes(search) || text.includes(search);
    }).sort((a, b) => a.title.localeCompare(b.title));
}

