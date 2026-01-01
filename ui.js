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
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'grid-card-item';
            cardEl.innerHTML = generateCardVisualHTML(card);
            searchResults.appendChild(cardEl);
        });
    } else {
        searchResults.style.display = 'block';
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-item';
            cardEl.innerHTML = `
                <span class="card-title" style="flex-grow:1;cursor:pointer;">${card.title}</span>
                <div class="card-buttons">
                    <button data-deck-target="starting" style="padding:5px 10px;margin-right:5px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">+ Starting</button>
                    <button class="btn-purchase" data-deck-target="purchase" style="padding:5px 10px;background:#6f42c1;color:white;border:none;border-radius:4px;cursor:pointer;">+ Purchase</button>
                </div>
            `;
            searchResults.appendChild(cardEl);
        });
    }
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMReferences();
    if (!personaDisplay) return;

    const wrestler = store.get('selectedWrestler');
    const manager = store.get('selectedManager');
    const callName = store.get('selectedCallName');
    const faction = store.get('selectedFaction');
    
    // Find kit cards for selected personas
    const allCards = store.get('cardDatabase') || [];
    const kitCards = [];
    const activePersonaTitles = [];
    
    if (wrestler) activePersonaTitles.push(wrestler.title);
    if (manager) activePersonaTitles.push(manager.title);
    if (callName) activePersonaTitles.push(callName.title);
    if (faction) activePersonaTitles.push(faction.title);
    
    // Find all kit cards
    allCards.forEach(card => {
        const wrestlerKit = card['Wrestler Kit'];
        const signatureFor = card['Signature For'];
        
        // Check if it's a kit card
        const isKitCard = wrestlerKit === true || 
                         (typeof wrestlerKit === 'string' && wrestlerKit.toUpperCase() === 'TRUE') ||
                         wrestlerKit === 1;
        
        if (isKitCard && signatureFor && activePersonaTitles.includes(signatureFor)) {
            kitCards.push(card);
        }
    });
    
    // Always show the persona display if we have any personas selected
    personaDisplay.style.display = 'block';
    
    let html = `
        <div class="persona-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ccc;">
            <div><strong>Wrestler:</strong> ${wrestler ? wrestler.title : 'None Selected'}</div>
            <div><strong>Manager:</strong> ${manager ? manager.title : 'None'}</div>
            <div><strong>Call Name:</strong> ${callName ? callName.title : 'None'}</div>
            <div><strong>Faction:</strong> ${faction ? faction.title : 'None'}</div>
        </div>
    `;
    
    // Add kit cards section if we have any
    if (kitCards.length > 0) {
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top: 0; margin-bottom: 10px; color: #333; font-size: 1.1em;">Kit Cards (${kitCards.length})</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
        `;
        
        kitCards.forEach(card => {
            const typeColors = {
                'Action': '#9c5a9c',
                'Response': '#c84c4c',
                'Submission': '#5aa05a',
                'Strike': '#4c82c8',
                'Grapple': '#e68a00',
                'Wrestler': '#333333',
                'Manager': '#666666',
                'Boon': '#17a2b8',
                'Injury': '#6c757d',
                'Call Name': '#fd7e14',
                'Faction': '#20c997'
            };
            const typeColor = typeColors[card.card_type] || '#6c757d';
            
            html += `
                <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${typeColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-weight: bold; color: #333; margin-bottom: 5px; font-size: 0.95em;">${card.title}</div>
                    <div style="font-size: 0.8em; color: #666; margin-bottom: 3px;">
                        <span style="color: ${typeColor}; font-weight: bold;">${card.card_type}</span>
                        ${card.cost !== null && card.cost !== undefined ? ` • C:${card.cost}` : ''}
                        ${card.damage !== null && card.damage !== undefined ? ` • D:${card.damage}` : ''}
                        ${card.momentum !== null && card.momentum !== undefined ? ` • M:${card.momentum}` : ''}
                    </div>
                    <div style="font-size: 0.75em; color: #888; margin-top: 5px; font-style: italic;">
                        For: <strong>${card['Signature For'] || 'Unknown'}</strong>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    personaDisplay.innerHTML = html;
}

export function populatePersonaSelectors() {
    const wSelect = document.getElementById('wrestlerSelect');
    const mSelect = document.getElementById('managerSelect');
    const cnSelect = document.getElementById('callNameSelect');
    const fSelect = document.getElementById('factionSelect');
    
    if (!wSelect) return;

    const allCards = store.get('cardDatabase') || [];
    const wrestlers = allCards.filter(c => c.card_type === 'Wrestler');
    const managers = allCards.filter(c => c.card_type === 'Manager');
    const callNames = allCards.filter(c => c.card_type === 'Call Name');
    const factions = allCards.filter(c => c.card_type === 'Faction');

    wSelect.innerHTML = '<option value="">-- Select Wrestler --</option>' + 
        wrestlers.map(w => `<option value="${w.title}">${w.title}</option>`).join('');
    
    mSelect.innerHTML = '<option value="">-- Select Manager --</option>' + 
        managers.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    
    if (cnSelect) {
        cnSelect.innerHTML = '<option value="">-- Select Call Name --</option>' + 
            callNames.map(cn => `<option value="${cn.title}">${cn.title}</option>`).join('');
    }
    
    if (fSelect) {
        fSelect.innerHTML = '<option value="">-- Select Faction --</option>' + 
            factions.map(f => `<option value="${f.title}">${f.title}</option>`).join('');
    }
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
    
    // Subscribe to state changes
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
    store.subscribe('startingDeck', renderDecks);
    store.subscribe('purchaseDeck', renderDecks);

    renderPersonaDisplay();
    renderCardPool();
    renderDecks();
}
