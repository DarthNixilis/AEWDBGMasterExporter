// ui.js
import { store } from './store.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { getDeckStatistics } from './deck.js';
import { generateCardVisualHTML } from './card-renderer.js';

// DOM references
let searchResults, startingDeckList, purchaseDeckList, personaDisplay;

function getDOMReferences() {
    searchResults = document.getElementById('searchResults');
    startingDeckList = document.getElementById('startingDeckList');
    purchaseDeckList = document.getElementById('purchaseDeckList');
    personaDisplay = document.getElementById('personaDisplay');
}

export function renderCardPool() {
    if (!searchResults) getDOMReferences();
    if (!searchResults) return;

    const cards = getFilteredAndSortedCardPool();
    const viewMode = store.get('currentViewMode') || 'grid';
    
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${viewMode}-view`;
    
    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-item';
        cardEl.setAttribute('data-title', card.title);
        
        // Use the visual HTML from card-renderer.js
        cardEl.innerHTML = generateCardVisualHTML(card);
        
        searchResults.appendChild(cardEl);
    });
}

export function renderDecks() {
    if (!startingDeckList) getDOMReferences();
    const startingDeck = store.get('startingDeck') || [];
    const purchaseDeck = store.get('purchaseDeck') || [];

    if (startingDeckList) {
        startingDeckList.innerHTML = startingDeck.map(title => 
            `<div class="deck-card">${title} <button data-title="${title}" data-deck="starting">×</button></div>`
        ).join('');
    }

    if (purchaseDeckList) {
        purchaseDeckList.innerHTML = purchaseDeck.map(title => 
            `<div class="deck-card">${title} <button data-title="${title}" data-deck="purchase">×</button></div>`
        ).join('');
    }
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMReferences();
    const wrestler = store.get('selectedWrestler');
    const manager = store.get('selectedManager');
    
    if (personaDisplay) {
        personaDisplay.innerHTML = `
            <div class="persona-info">
                <strong>Wrestler:</strong> ${wrestler ? wrestler.title : 'None Selected'}<br>
                <strong>Manager:</strong> ${manager ? manager.title : 'None'}
            </div>
        `;
    }
}

export function showCardModal(title) {
    const modal = document.getElementById('cardModal');
    const content = document.getElementById('modalCardContent');
    const card = store.get('cardTitleCache')[title.toLowerCase()];

    if (modal && content && card) {
        content.innerHTML = `
            <h3>${card.title}</h3>
            <p>${card.text_box?.raw_text || ''}</p>
            <button onclick="import('./deck.js').then(m => m.addCardToDeck('${card.title.replace(/'/g, "\\'")}', 'starting'))">Add to Starting</button>
            <button onclick="import('./deck.js').then(m => m.addCardToDeck('${card.title.replace(/'/g, "\\'")}', 'purchase'))">Add to Purchase</button>
        `;
        modal.style.display = 'flex';
    }
}

export function initializeUI() {
    getDOMReferences();
    
    // Subscribe to changes
    store.subscribe('activeFilters', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    store.subscribe('startingDeck', renderDecks);
    store.subscribe('purchaseDeck', renderDecks);
    store.subscribe('selectedWrestler', renderPersonaDisplay);

    renderCardPool();
    renderDecks();
    renderPersonaDisplay();
    console.log("UI Initialized");
}

