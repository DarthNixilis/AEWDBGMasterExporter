// ui.js
import { store } from './store.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { generateCardVisualHTML } from './card-renderer.js';

export function renderCardPool() {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    const cards = getFilteredAndSortedCardPool();
    const viewMode = store.get('currentViewMode');
    const numColumns = store.get('numGridColumns');
    
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${viewMode}-view`;
    
    if (viewMode === 'grid') {
        searchResults.style.display = 'grid';
        searchResults.style.gridTemplateColumns = `repeat(${numColumns}, 1fr)`;
    } else {
        searchResults.style.display = 'block';
    }

    cards.forEach(card => {
        const counts = store.getCardCounts(card.title);
        const container = document.createElement('div');
        container.className = 'card-container';
        
        // Rules: 3 total across both. Only 0 cost in Draw, max 2 in Draw.
        const canAddDraw = String(card.cost) === '0' && counts.draw < 2 && counts.total < 3;
        const canAddPurchase = counts.total < 3;

        container.innerHTML = `
            ${generateCardVisualHTML(card)}
            <div class="card-controls">
                <button ${!canAddDraw ? 'disabled' : ''} onclick="window.addCard('${card.title.replace(/'/g, "\\'")}', 'starting')">
                    + Draw (${counts.draw}/2)
                </button>
                <button ${!canAddPurchase ? 'disabled' : ''} onclick="window.addCard('${card.title.replace(/'/g, "\\'")}', 'purchase')">
                    + Purchase (${counts.total}/3)
                </button>
            </div>
        `;
        searchResults.appendChild(container);
    });
}

export function renderDecks() {
    const drawList = document.getElementById('startingDeckList');
    const purchaseList = document.getElementById('purchaseDeckList');
    const drawDeck = store.get('startingDeck');
    const purchaseDeck = store.get('purchaseDeck');

    const group = (arr) => arr.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});

    const renderRows = (deck, type) => {
        const grouped = group(deck);
        return Object.entries(grouped).sort().map(([title, count]) => `
            <div class="deck-item">
                <span><strong>${count}x</strong> ${title}</span>
                <div class="deck-item-controls">
                    <button class="danger" onclick="window.removeCard('${title.replace(/'/g, "\\'")}', '${type}')">-</button>
                    <button onclick="window.addCard('${title.replace(/'/g, "\\'")}', '${type}')">+</button>
                </div>
            </div>
        `).join('');
    };

    drawList.innerHTML = renderRows(drawDeck, 'starting');
    purchaseList.innerHTML = renderRows(purchaseDeck, 'purchase');

    const drawHeader = document.getElementById('startingDeckHeader');
    const purchaseHeader = document.getElementById('purchaseDeckHeader');

    drawHeader.textContent = `Starting Draw Deck (${drawDeck.length}/24)`;
    drawHeader.style.color = drawDeck.length === 24 ? '#28a745' : '#dc3545';

    purchaseHeader.textContent = `Purchase Deck (${purchaseDeck.length})`;
    purchaseHeader.style.color = purchaseDeck.length >= 36 ? '#28a745' : '#dc3545';
}

export function renderPersonaDisplay() {
    const display = document.getElementById('personaDisplay');
    const w = store.get('selectedWrestler');
    const m = store.get('selectedManager');
    const cn = store.get('selectedCallName');
    const f = store.get('selectedFaction');

    display.innerHTML = `
        <div class="persona-info">
            <p><strong>Wrestler:</strong> ${w ? w.title : 'None'}</p>
            <p><strong>Manager:</strong> ${m ? m.title : 'None'}</p>
            <p><strong>Call Name:</strong> ${cn ? cn.title : 'None'}</p>
            <p><strong>Faction:</strong> ${f ? f.title : 'None'}</p>
        </div>
    `;
    renderCardPool(); // Re-filter pool when persona changes
}

export function populatePersonaSelectors() {
    const db = store.get('cardDatabase');
    const wSelect = document.getElementById('wrestlerSelect');
    const mSelect = document.getElementById('managerSelect');
    const cnSelect = document.getElementById('callNameSelect');
    const fSelect = document.getElementById('factionSelect');

    const populate = (el, type) => {
        const options = db.filter(c => c.card_type === type).sort((a,b) => a.title.localeCompare(b.title));
        el.innerHTML = `<option value="">-- Select ${type} --</option>` + 
            options.map(o => `<option value="${o.title}">${o.title}</option>`).join('');
    };

    populate(wSelect, 'Wrestler');
    populate(mSelect, 'Manager');
    populate(cnSelect, 'Call Name');
    populate(fSelect, 'Faction');
}

export function initializeUI() {
    store.subscribe('numGridColumns', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    store.subscribe('startingDeck', renderDecks);
    store.subscribe('purchaseDeck', renderDecks);
}

