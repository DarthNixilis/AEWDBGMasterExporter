// ui.js
import { store } from './store.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { generateCardVisualHTML } from './card-renderer.js';

let searchResults, startingDeckList, purchaseDeckList, personaDisplay;

function getDOMRefs() {
    searchResults = document.getElementById('searchResults');
    startingDeckList = document.getElementById('startingDeckList');
    purchaseDeckList = document.getElementById('purchaseDeckList');
    personaDisplay = document.getElementById('personaDisplay');
}

export function renderCardPool() {
    if (!searchResults) getDOMRefs();
    if (!searchResults) return;

    const cards = getFilteredAndSortedCardPool();
    const viewMode = store.get('currentViewMode') || 'grid';
    const cols = store.get('numGridColumns') || 3;
    
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${viewMode}-view`;
    
    if (viewMode === 'grid') {
        searchResults.style.display = 'grid';
        searchResults.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        searchResults.style.gap = '15px';
    }

    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card-item-container';
        
        // Visual Card
        const cardVisual = generateCardVisualHTML(card);
        
        // Add Buttons Logic
        const isZeroCost = String(card.cost) === '0';
        const buttonsHTML = `
            <div class="card-action-overlay">
                ${isZeroCost ? `<button class="btn-add-starting" onclick="window.addCard('${card.title.replace(/'/g, "\\'")}', 'starting')">Add to Draw</button>` : ''}
                <button class="btn-add-purchase" onclick="window.addCard('${card.title.replace(/'/g, "\\'")}', 'purchase')">Add to Purchase</button>
            </div>
        `;
        
        div.innerHTML = cardVisual + buttonsHTML;
        searchResults.appendChild(div);
    });
}

export function renderDecks() {
    if (!startingDeckList) getDOMRefs();
    const starting = store.get('startingDeck') || [];
    const purchase = store.get('purchaseDeck') || [];

    startingDeckList.innerHTML = starting.map((t, i) => `
        <div class="deck-row">
            <span>${t}</span>
            <div class="deck-row-btns">
                <button onclick="window.moveCard(${i}, 'starting', 'purchase')">Move to Purchase</button>
                <button onclick="window.removeCard(${i}, 'starting')">×</button>
            </div>
        </div>
    `).join('');

    purchaseDeckList.innerHTML = purchase.map((t, i) => {
        const card = store.get('cardTitleCache')[t.toLowerCase()];
        const isZero = card && String(card.cost) === '0';
        return `
            <div class="deck-row">
                <span>${t}</span>
                <div class="deck-row-btns">
                    ${isZero ? `<button onclick="window.moveCard(${i}, 'purchase', 'starting')">Move to Draw</button>` : ''}
                    <button onclick="window.removeCard(${i}, 'purchase')">×</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Update Counters
    document.getElementById('startingDeckHeader').textContent = `Starting Draw Deck (${starting.length}/24)`;
    document.getElementById('purchaseDeckHeader').textContent = `Purchase Deck (${purchase.length})`;
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMRefs();
    if (!personaDisplay) return;

    const w = store.get('selectedWrestler')?.title || 'None';
    const m = store.get('selectedManager')?.title || 'None';
    const cn = store.get('selectedCallName')?.title || 'None';
    const f = store.get('selectedFaction')?.title || 'None';
    
    personaDisplay.innerHTML = `
        <div class="persona-info-box">
            <div><strong>Wrestler:</strong> ${w}</div>
            <div><strong>Manager:</strong> ${m}</div>
            <div><strong>Call Name:</strong> ${cn}</div>
            <div><strong>Faction:</strong> ${f}</div>
        </div>
    `;
}

export function populatePersonaSelectors() {
    const types = { wrestlerSelect: 'Wrestler', managerSelect: 'Manager', callNameSelect: 'Call Name', factionSelect: 'Faction' };
    const all = store.get('cardDatabase') || [];

    Object.entries(types).forEach(([id, type]) => {
        const el = document.getElementById(id);
        if (el) {
            const filtered = all.filter(c => c.card_type === type);
            el.innerHTML = `<option value="">-- Select ${type} --</option>` + 
                filtered.map(c => `<option value="${c.title}">${c.title}</option>`).join('');
        }
    });
}

export function initializeUI() {
    getDOMRefs();
    store.subscribe('cardDatabase', () => { populatePersonaSelectors(); renderCardPool(); });
    store.subscribe('numGridColumns', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    store.subscribe('startingDeck', renderDecks);
    store.subscribe('purchaseDeck', renderDecks);
    
    ['selectedWrestler', 'selectedManager', 'selectedCallName', 'selectedFaction'].forEach(key => {
        store.subscribe(key, () => {
            renderPersonaDisplay();
            renderCardPool(); // Re-render pool to show/hide Kit cards
        });
    });

    renderCardPool();
    renderPersonaDisplay();
    renderDecks();
}

