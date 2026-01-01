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
        searchResults.style.gap = '15px';
    }

    cards.forEach(card => {
        const container = document.createElement('div');
        container.className = 'card-container';
        
        // 1. Generate the Visual Card
        const visualHTML = generateCardVisualHTML(card);
        
        // 2. Generate the Deckbuilding Buttons
        const isZeroCost = String(card.cost) === '0';
        const buttonHTML = `
            <div class="card-controls">
                ${isZeroCost ? `<button onclick="window.addCardToDeck('${card.title.replace(/'/g, "\\'")}', 'starting')">Add to Draw</button>` : ''}
                <button onclick="window.addCardToDeck('${card.title.replace(/'/g, "\\'")}', 'purchase')">Add to Purchase</button>
            </div>
        `;
        
        container.innerHTML = visualHTML + buttonHTML;
        searchResults.appendChild(container);
    });
}

export function renderDecks() {
    if (!startingDeckList) getDOMReferences();
    
    const starting = store.get('startingDeck') || [];
    const purchase = store.get('purchaseDeck') || [];

    // Render Starting Draw Deck (0 Cost only)
    startingDeckList.innerHTML = starting.map((title, index) => `
        <div class="deck-item">
            <span>${title}</span>
            <div class="deck-item-controls">
                <button onclick="window.moveCard(${index}, 'starting', 'purchase')">Move to Purchase</button>
                <button onclick="window.removeCard(${index}, 'starting')">×</button>
            </div>
        </div>
    `).join('');

    // Render Purchase Deck
    purchaseDeckList.innerHTML = purchase.map((title, index) => {
        const cardData = store.get('cardTitleCache')[title.toLowerCase()];
        const canMoveToDraw = cardData && String(cardData.cost) === '0';
        return `
            <div class="deck-item">
                <span>${title}</span>
                <div class="deck-item-controls">
                    ${canMoveToDraw ? `<button onclick="window.moveCard(${index}, 'purchase', 'starting')">Move to Draw</button>` : ''}
                    <button onclick="window.removeCard(${index}, 'purchase')">×</button>
                </div>
            </div>
        `;
    }).join('');

    // Update Headers
    document.getElementById('startingDeckHeader').textContent = `Starting Draw Deck (${starting.length}/24)`;
    document.getElementById('purchaseDeckHeader').textContent = `Purchase Deck (${purchase.length})`;
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMReferences();
    const w = store.get('selectedWrestler')?.title || 'None';
    const m = store.get('selectedManager')?.title || 'None';
    const cn = store.get('selectedCallName')?.title || 'None';
    const f = store.get('selectedFaction')?.title || 'None';
    
    personaDisplay.innerHTML = `
        <div class="persona-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #eee; padding: 15px; border-radius: 8px;">
            <div><strong>Wrestler:</strong> ${w}</div>
            <div><strong>Manager:</strong> ${m}</div>
            <div><strong>Call Name:</strong> ${cn}</div>
            <div><strong>Faction:</strong> ${f}</div>
        </div>
    `;
}

export function populatePersonaSelectors() {
    const all = store.get('cardDatabase') || [];
    const config = { wrestlerSelect: 'Wrestler', managerSelect: 'Manager', callNameSelect: 'Call Name', factionSelect: 'Faction' };

    Object.entries(config).forEach(([id, type]) => {
        const el = document.getElementById(id);
        if (el) {
            const filtered = all.filter(c => c.card_type === type);
            el.innerHTML = `<option value="">-- Select ${type} --</option>` + 
                filtered.map(c => `<option value="${c.title}">${c.title}</option>`).join('');
        }
    });
}

export function initializeUI() {
    getDOMReferences();
    store.subscribe('cardDatabase', () => { populatePersonaSelectors(); renderCardPool(); });
    store.subscribe('startingDeck', renderDecks);
    store.subscribe('purchaseDeck', renderDecks);
    store.subscribe('numGridColumns', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    
    ['selectedWrestler', 'selectedManager', 'selectedCallName', 'selectedFaction'].forEach(key => {
        store.subscribe(key, () => {
            renderPersonaDisplay();
            renderCardPool(); // Kit cards rely on persona selection
        });
    });

    renderCardPool();
    renderPersonaDisplay();
    renderDecks();
}

