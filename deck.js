// deck.js
import { store } from './store.js';

export function addCardToDeck(cardTitle, targetDeck) {
    const cardTitleLower = cardTitle.toLowerCase();
    const card = store.get('cardTitleCache')[cardTitleLower];
    
    if (!card) {
        console.warn(`Card not found: ${cardTitle}`);
        return;
    }
    
    // Check if it's a kit card
    if (store.isKitCard(card)) {
        alert(`"${card.title}" is a Kit card and cannot be added to your deck during construction.`);
        return;
    }
    
    // Get current deck state
    const startingDeck = [...store.get('startingDeck')];
    const purchaseDeck = [...store.get('purchaseDeck')];
    
    // Count total copies
    const totalCount = startingDeck.filter(title => 
        title.toLowerCase() === cardTitleLower).length + 
        purchaseDeck.filter(title => 
        title.toLowerCase() === cardTitleLower).length;
    
    // Validate max 3 copies
    if (totalCount >= 3) {
        alert(`Rule Violation: Max 3 copies of "${card.title}" allowed in total.`);
        return;
    }
    
    if (targetDeck === 'starting') {
        // Starting deck validation
        if (card.cost !== 0 && card.cost !== '0') {
            alert(`Rule Violation: Only 0-cost cards allowed in Starting Deck.`);
            return;
        }
        
        if (startingDeck.length >= 24) {
            alert(`Rule Violation: Starting Deck is full (24 cards).`);
            return;
        }
        
        const startingCopies = startingDeck.filter(title => 
            title.toLowerCase() === cardTitleLower).length;
        
        if (startingCopies >= 2) {
            alert(`Rule Violation: Max 2 copies of "${card.title}" allowed in Starting Deck.`);
            return;
        }
        
        // Add to starting deck
        store.set('startingDeck', [...startingDeck, card.title]);
        
    } else if (targetDeck === 'purchase') {
        // Purchase deck - just add it
        store.set('purchaseDeck', [...purchaseDeck, card.title]);
    }
}

export function removeCardFromDeck(cardTitle, deckName) {
    const cardTitleLower = cardTitle.toLowerCase();
    const deck = deckName === 'starting' ? store.get('startingDeck') : store.get('purchaseDeck');
    
    // Find the last occurrence (case-insensitive)
    let indexToRemove = -1;
    for (let i = deck.length - 1; i >= 0; i--) {
        if (deck[i].toLowerCase() === cardTitleLower) {
            indexToRemove = i;
            break;
        }
    }
    
    if (indexToRemove > -1) {
        const newDeck = [...deck];
        newDeck.splice(indexToRemove, 1);
        
        if (deckName === 'starting') {
            store.set('startingDeck', newDeck);
        } else {
            store.set('purchaseDeck', newDeck);
        }
    }
}

export function clearDeck() {
    if (confirm('Are you sure you want to clear the entire deck?')) {
        store.set('startingDeck', []);
        store.set('purchaseDeck', []);
    }
}

// Get deck validation issues
export function getDeckValidation() {
    return store.validateDeck();
}

// Get deck statistics
export function getDeckStatistics() {
    const startingDeck = store.get('startingDeck');
    const purchaseDeck = store.get('purchaseDeck');
    const allCards = [...startingDeck, ...purchaseDeck].map(title => 
        store.get('cardTitleCache')[title.toLowerCase()]).filter(Boolean);
    
    const stats = {
        totalCards: allCards.length,
        startingCount: startingDeck.length,
        purchaseCount: purchaseDeck.length,
        uniqueCards: new Set(allCards.map(card => card.title)).size,
        costDistribution: {},
        typeDistribution: {},
        averageMomentum: 0,
        averageDamage: 0
    };
    
    // Cost distribution
    allCards.forEach(card => {
        const cost = card.cost !== null && card.cost !== undefined ? card.cost : 'N/A';
        stats.costDistribution[cost] = (stats.costDistribution[cost] || 0) + 1;
    });
    
    // Type distribution
    allCards.forEach(card => {
        const type = card.card_type || 'Unknown';
        stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
    });
    
    // Average momentum (non-persona cards)
    const cardsWithMomentum = allCards.filter(card => 
        card.momentum !== null && 
        card.momentum !== undefined && 
        !store.isPersonaCard(card));
    
    if (cardsWithMomentum.length > 0) {
        const totalMomentum = cardsWithMomentum.reduce((sum, card) => sum + (card.momentum || 0), 0);
        stats.averageMomentum = totalMomentum / cardsWithMomentum.length;
    }
    
    // Average damage (maneuvers only)
    const maneuvers = allCards.filter(card => 
        ['Strike', 'Grapple', 'Submission'].includes(card.card_type));
    
    if (maneuvers.length > 0) {
        const totalDamage = maneuvers.reduce((sum, card) => sum + (card.damage || 0), 0);
        stats.averageDamage = totalDamage / maneuvers.length;
    }
    
    return stats;
}
