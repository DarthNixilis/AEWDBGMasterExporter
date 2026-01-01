// ui.js
import { store } from './store.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { generateCardVisualHTML } from './card-renderer.js';

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
    const numColumns = store.get('numGridColumns') || 3;
    
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${viewMode}-view`;
    
    if (viewMode === 'grid') {
        searchResults.style.display = 'grid';
        searchResults.style.gridTemplateColumns = `repeat(${numColumns}, 1fr)`;
        searchResults.style.gap = '10px';
    } else {
        searchResults.style.display = 'block';
    }
    
    cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-item';
        cardEl.innerHTML = generateCardVisualHTML(card);
        searchResults.appendChild(cardEl);
    });
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMReferences();
    if (!personaDisplay) return;

    const wrestler = store.get('selectedWrestler');
    const manager = store.get('selectedManager');
    const callName = store.get('selectedCallName'); // Part 3
    const faction = store.get('selectedFaction');   // Part 4
    
    personaDisplay.innerHTML = `
        <div class="persona-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #eee; padding: 15px; border-radius: 8px;">
            <div><strong>Wrestler:</strong> ${wrestler ? wrestler.title : 'None'}</div>
            <div><strong>Manager:</strong> ${manager ? manager.title : 'None'}</div>
            <div><strong>Call Name:</strong> ${callName ? callName.title : 'None'}</div>
            <div><strong>Faction:</strong> ${faction ? faction.title : 'None'}</div>
        </div>
    `;
}

export function renderDecks() {
    if (!startingDeckList || !purchaseDeckList) getDOMReferences();
    
    const starting = store.get('startingDeck') || [];
    const purchase = store.get('purchaseDeck') || [];

    if (startingDeckList) {
        startingDeckList.innerHTML = starting.map(t => `<div class="deck-item">${t}</div>`).join('');
    }
    if (purchaseDeckList) {
        purchaseDeckList.innerHTML = purchase.map(t => `<div class="deck-item">${t}</div>`).join('');
    }
}

export function initializeUI() {
    getDOMReferences();
    
    // Subscribe all persona parts to the renderer
    store.subscribe('selectedWrestler', renderPersonaDisplay);
    store.subscribe('selectedManager', renderPersonaDisplay);
    store.subscribe('selectedCallName', renderPersonaDisplay);
    store.subscribe('selectedFaction', renderPersonaDisplay);
    
    store.subscribe('activeFilters', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    store.subscribe('numGridColumns', renderCardPool);

    renderPersonaDisplay();
    renderCardPool();
    renderDecks();
}

