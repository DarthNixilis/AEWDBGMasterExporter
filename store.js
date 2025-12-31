// store.js
export class Store {
    constructor() {
        this._state = {
            cardDatabase: [],
            keywordDatabase: {},
            cardTitleCache: {},
            startingDeck: [],
            purchaseDeck: [],
            selectedWrestler: null,
            selectedManager: null,
            selectedCallName: null,
            selectedFaction: null,
            activeFilters: [{}, {}, {}],
            currentViewMode: 'grid',
            currentSort: 'alpha-asc',
            showZeroCost: true,
            showNonZeroCost: true,
            numGridColumns: 2,
            lastFocusedElement: null
        };
        
        this.listeners = new Map();
    }
    
    // Get state value
    get(key) {
        return this._state[key];
    }
    
    // Set state value and notify listeners
    set(key, value) {
        const oldValue = this._state[key];
        this._state[key] = value;
        
        // Auto-save to localStorage for important state
        if (['startingDeck', 'purchaseDeck', 'selectedWrestler', 'selectedManager', 
             'selectedCallName', 'selectedFaction'].includes(key)) {
            this.saveToCache();
        }
        
        // Notify listeners
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => callback(value, oldValue));
        }
        
        // Also notify any wildcard listeners
        if (this.listeners.has('*')) {
            this.listeners.get('*').forEach(callback => callback(key, value, oldValue));
        }
    }
    
    // Subscribe to state changes
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            if (this.listeners.has(key)) {
                this.listeners.get(key).delete(callback);
            }
        };
    }
    
    // Utility functions
    toPascalCase(str) {
        if (!str) return '';
        return str.replace(/[^a-zA-Z0-9\s]+/g, '').split(/\s+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Card helpers
    isKitCard(card) {
        return card && typeof card['Wrestler Kit'] === 'string' && 
               card['Wrestler Kit'].toUpperCase() === 'TRUE';
    }
    
    isPersonaCard(card) {
        return card && ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
    }
    
    getActivePersonas() {
        const personas = [];
        if (this._state.selectedWrestler) personas.push(this._state.selectedWrestler);
        if (this._state.selectedManager) personas.push(this._state.selectedManager);
        if (this._state.selectedCallName) personas.push(this._state.selectedCallName);
        if (this._state.selectedFaction) personas.push(this._state.selectedFaction);
        return personas;
    }
    
    getActivePersonaTitles() {
        const titles = [];
        if (this._state.selectedWrestler) titles.push(this._state.selectedWrestler.title);
        if (this._state.selectedManager) titles.push(this._state.selectedManager.title);
        if (this._state.selectedCallName) titles.push(this._state.selectedCallName.title);
        if (this._state.selectedFaction) titles.push(this._state.selectedFaction.title);
        return titles;
    }
    
    isSignatureFor(card) {
        if (!card || !card['Signature For']) return false;
        return this.getActivePersonaTitles().includes(card['Signature For']);
    }
    
    // Cache management
    saveToCache() {
        const CACHE_KEY = 'aewDeckBuilderCache';
        const state = {
            wrestler: this._state.selectedWrestler ? this._state.selectedWrestler.title : null,
            manager: this._state.selectedManager ? this._state.selectedManager.title : null,
            callName: this._state.selectedCallName ? this._state.selectedCallName.title : null,
            faction: this._state.selectedFaction ? this._state.selectedFaction.title : null,
            startingDeck: this._state.startingDeck,
            purchaseDeck: this._state.purchaseDeck
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    }
    
    loadFromCache() {
        const CACHE_KEY = 'aewDeckBuilderCache';
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return false;
        
        try {
            const parsed = JSON.parse(cached);
            
            // Restore deck lists
            this.set('startingDeck', parsed.startingDeck || []);
            this.set('purchaseDeck', parsed.purchaseDeck || []);
            
            // Restore personas (will be set properly when database loads)
            this._pendingPersonas = parsed;
            
            return true;
        } catch (error) {
            console.error('Failed to load cache:', error);
            localStorage.removeItem(CACHE_KEY);
            return false;
        }
    }
    
    restorePersonas(cardTitleCache) {
        if (!this._pendingPersonas) return;
        
        if (this._pendingPersonas.wrestler && cardTitleCache[this._pendingPersonas.wrestler]) {
            this.set('selectedWrestler', cardTitleCache[this._pendingPersonas.wrestler]);
        }
        if (this._pendingPersonas.manager && cardTitleCache[this._pendingPersonas.manager]) {
            this.set('selectedManager', cardTitleCache[this._pendingPersonas.manager]);
        }
        if (this._pendingPersonas.callName && cardTitleCache[this._pendingPersonas.callName]) {
            this.set('selectedCallName', cardTitleCache[this._pendingPersonas.callName]);
        }
        if (this._pendingPersonas.faction && cardTitleCache[this._pendingPersonas.faction]) {
            this.set('selectedFaction', cardTitleCache[this._pendingPersonas.faction]);
        }
        
        delete this._pendingPersonas;
    }
    
    // Deck validation
    validateDeck() {
        const errors = [];
        const warnings = [];
        
        // Starting deck size
        if (this._state.startingDeck.length > 24) {
            errors.push(`Starting deck has ${this._state.startingDeck.length} cards (max 24)`);
        }
        
        // Purchase deck minimum
        if (this._state.purchaseDeck.length < 36) {
            warnings.push(`Purchase deck has ${this._state.purchaseDeck.length} cards (minimum 36 recommended)`);
        }
        
        // Check for 0-cost cards in starting deck
        const startingCards = this._state.startingDeck.map(title => this._state.cardTitleCache[title]);
        const nonZeroCostCards = startingCards.filter(card => card && card.cost > 0);
        if (nonZeroCostCards.length > 0) {
            errors.push(`Starting deck contains non-0-cost cards: ${nonZeroCostCards.map(c => c.title).join(', ')}`);
        }
        
        // Check card copies
        const allCards = [...this._state.startingDeck, ...this._state.purchaseDeck];
        const cardCounts = {};
        allCards.forEach(title => {
            cardCounts[title] = (cardCounts[title] || 0) + 1;
        });
        
        Object.entries(cardCounts).forEach(([title, count]) => {
            if (count > 3) {
                errors.push(`Too many copies of ${title} (${count} > max 3)`);
            }
            if (count > 2 && this._state.startingDeck.filter(t => t === title).length > 0) {
                warnings.push(`Starting deck has multiple copies of ${title} (max 2 recommended)`);
            }
        });
        
        return { errors, warnings, isValid: errors.length === 0 };
    }
}

// Create singleton instance
export const store = new Store();
