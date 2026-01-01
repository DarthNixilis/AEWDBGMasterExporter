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
    const callName = store.get('selectedCallName');
    const faction = store.get('selectedFaction');
    
    personaDisplay.innerHTML = `
        <div class="persona-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ccc;">
            <div><strong>Wrestler:</strong> ${wrestler ? wrestler.title : 'None Selected'}</div>
            <div><strong>Manager:</strong> ${manager ? manager.title : 'None'}</div>
            <div><strong>Call Name:</strong> ${callName ? callName.title : 'None'}</div>
            <div><strong>Faction:</strong> ${faction ? faction.title : 'None'}</div>
        </div>
    `;
}

export function populatePersonaSelectors() {
    const wSelect = document.getElementById('wrestlerSelect');
    const mSelect = document.getElementById('managerSelect');
    if (!wSelect) return;

    const allCards = store.get('cardDatabase') || [];
    const wrestlers = allCards.filter(c => c.card_type === 'Wrestler');
    const managers = allCards.filter(c => c.card_type === 'Manager');

    wSelect.innerHTML = '<option value="">Select Wrestler</option>' + 
        wrestlers.map(w => `<option value="${w.title}">${w.title}</option>`).join('');
    
    mSelect.innerHTML = '<option value="">Select Manager</option>' + 
        managers.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
}

export function renderDecks() {
    if (!startingDeckList || !purchaseDeckList) getDOMReferences();
    const starting = store.get('startingDeck') || [];
    const purchase = store.get('purchaseDeck') || [];

    if (startingDeckList) startingDeckList.innerHTML = starting.map(t => `<div class="deck-item">${t}</div>`).join('');
    if (purchaseDeckList) purchaseDeckList.innerHTML = purchase.map(t => `<div class="deck-item">${t}</div>`).join('');
}

export function initializeUI() {
    getDOMReferences();
    
    // Subscribe to every possible state change
    store.subscribe('selectedWrestler', renderPersonaDisplay);
    store.subscribe('selectedManager', renderPersonaDisplay);
    store.subscribe('selectedCallName', renderPersonaDisplay);
    store.subscribe('selectedFaction', renderPersonaDisplay);
    store.subscribe('numGridColumns', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    store.subscribe('activeFilters', renderCardPool);
    store.subscribe('cardDatabase', () => {
        populatePersonaSelectors();
        renderPersonaDisplay();
        renderCardPool();
    });

    renderPersonaDisplay();
    renderCardPool();
    renderDecks();
}

