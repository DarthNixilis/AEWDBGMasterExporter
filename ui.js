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
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'grid-card-item';
            
            // Use the existing card visual HTML function
            const cardHTML = generateCardVisualHTML(card);
            cardEl.innerHTML = cardHTML;
            
            searchResults.appendChild(cardEl);
        });
    } else {
        // LIST VIEW
        searchResults.style.display = 'block';
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-item';
            cardEl.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #eee;
            `;
            
            cardEl.innerHTML = `
                <span class="card-title" style="flex-grow:1;font-weight:bold;">${card.title}</span>
                <div class="card-buttons" style="display:flex;gap:5px;">
                    <button data-deck-target="starting" style="padding:5px 10px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">+ Starting</button>
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
    
    // Find kit cards
    const allCards = store.get('cardDatabase') || [];
    const kitCards = [];
    const activePersonaTitles = [];
    
    if (wrestler) activePersonaTitles.push(wrestler.title);
    if (manager) activePersonaTitles.push(manager.title);
    if (callName) activePersonaTitles.push(callName.title);
    if (faction) activePersonaTitles.push(faction.title);
    
    // Simple kit card detection
    allCards.forEach(card => {
        const wrestlerKit = card['Wrestler Kit'];
        const signatureFor = card['Signature For'];
        
        // Check if it's a kit card
        if ((wrestlerKit === true || 
             (typeof wrestlerKit === 'string' && wrestlerKit.toUpperCase() === 'TRUE')) &&
            signatureFor && 
            activePersonaTitles.includes(signatureFor)) {
            kitCards.push(card);
        }
    });
    
    personaDisplay.style.display = 'block';
    
    let html = `
        <div class="persona-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #eee; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ccc;">
            <div><strong>Wrestler:</strong> ${wrestler ? wrestler.title : 'None Selected'}</div>
            <div><strong>Manager:</strong> ${manager ? manager.title : 'None'}</div>
            <div><strong>Call Name:</strong> ${callName ? callName.title : 'None'}</div>
            <div><strong>Faction:</strong> ${faction ? faction.title : 'None'}</div>
        </div>
    `;
    
    if (kitCards.length > 0) {
        html += `
            <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #ddd;">
                <h3 style="margin-top: 0; margin-bottom: 10px; color: #333; font-size: 1.1em;">Kit Cards</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        `;
        
        kitCards.forEach(card => {
            html += `
                <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd; min-width: 150px;">
                    <div style="font-weight: bold; color: #333;">${card.title}</div>
                    <div style="font-size: 0.85em; color: #666;">${card.card_type}</div>
                    <div style="font-size: 0.8em; color: #888; margin-top: 5px;">For: ${card['Signature For']}</div>
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
    
    const allCards = store.get('cardDatabase') || [];
    const wrestlers = allCards.filter(c => c.card_type === 'Wrestler');
    const managers = allCards.filter(c => c.card_type === 'Manager');
    const callNames = allCards.filter(c => c.card_type === 'Call Name');
    const factions = allCards.filter(c => c.card_type === 'Faction');

    wSelect.innerHTML = '<option value="">-- Select Wrestler --</option>' + 
        wrestlers.map(w => `<option value="${w.title}">${w.title}</option>`).join('');
    
    mSelect.innerHTML = '<option value="">-- Select Manager --</option>' + 
        managers.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    
    cnSelect.innerHTML = '<option value="">-- Select Call Name --</option>' + 
        callNames.map(cn => `<option value="${cn.title}">${cn.title}</option>`).join('');
    
    fSelect.innerHTML = '<option value="">-- Select Faction --</option>' + 
        factions.map(f => `<option value="${f.title}">${f.title}</option>`).join('');
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
    
    // Basic subscriptions
    store.subscribe('selectedWrestler', renderPersonaDisplay);
    store.subscribe('selectedManager', renderPersonaDisplay);
    store.subscribe('selectedCallName', renderPersonaDisplay);
    store.subscribe('selectedFaction', renderPersonaDisplay);
    store.subscribe('numGridColumns', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    
    // Initial render
    renderPersonaDisplay();
    renderCardPool();
    renderDecks();
    populatePersonaSelectors();
}
