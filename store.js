// store.js
export const store = {
    state: {
        cardDatabase: [],
        cardTitleCache: {},
        startingDeck: [], // Draw Deck
        purchaseDeck: [],
        selectedWrestler: null,
        selectedManager: null,
        selectedCallName: null,
        selectedFaction: null,
        currentViewMode: 'grid',
        numGridColumns: 3,
        deckViewModes: { starting: 'list', purchase: 'list' }
    },
    listeners: {},
    subscribe(key, fn) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(fn);
    },
    get(key) { return this.state[key]; },
    set(key, val) {
        this.state[key] = val;
        if (this.listeners[key]) this.listeners[key].forEach(fn => fn(val));
    },
    // Validation Helper
    getCardCounts(title) {
        const drawCount = this.state.startingDeck.filter(t => t === title).length;
        const purchaseCount = this.state.purchaseDeck.filter(t => t === title).length;
        return { 
            draw: drawCount, 
            purchase: purchaseCount, 
            total: drawCount + purchaseCount 
        };
    },
    isKitCard(card) {
        return card['Wrestler Kit'] === 'TRUE' || card.wrestler_kit === 'TRUE';
    }
};

