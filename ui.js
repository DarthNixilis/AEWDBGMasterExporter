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
    
    if (viewMode === 'grid') {
        // GRID VIEW - cards with images
        searchResults.className = 'card-list grid-view';
        searchResults.style.display = 'grid';
        searchResults.style.gridTemplateColumns = `repeat(${numColumns}, 1fr)`;
        searchResults.style.gap = '15px';
        searchResults.style.overflowY = 'auto';
        searchResults.removeAttribute('data-columns');
        searchResults.setAttribute('data-columns', numColumns);
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'grid-card-item';
            cardEl.innerHTML = generateCardVisualHTML(card);
            searchResults.appendChild(cardEl);
        });
    } else {
        // LIST VIEW - simple text list
        searchResults.className = 'card-list list-view';
        searchResults.style.display = 'block';
        searchResults.style.gridTemplateColumns = 'none';
        searchResults.style.overflowY = 'auto';
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-item';
            cardEl.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 8px;
                border-bottom: 1px solid #e0e0e0;
                cursor: pointer;
                transition: background-color 0.2s;
            `;
            
            // Card info with type and cost
            const typeColor = getTypeColor(card.card_type);
            cardEl.innerHTML = `
                <div style="flex-grow: 1;">
                    <div style="font-weight: bold; color: #333; margin-bottom: 3px;">${card.title}</div>
                    <div style="font-size: 0.85em; color: #666;">
                        <span style="color: ${typeColor}; font-weight: bold;">${card.card_type}</span>
                        ${card.cost !== null && card.cost !== undefined ? ` • Cost: ${card.cost}` : ''}
                        ${card.damage !== null && card.damage !== undefined ? ` • Damage: ${card.damage}` : ''}
                    </div>
                </div>
                <div class="card-buttons" style="display:flex;gap:8px;flex-shrink:0;">
                    <button data-deck-target="starting" style="padding:6px 12px;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.9em;">+ Starting</button>
                    <button class="btn-purchase" data-deck-target="purchase" style="padding:6px 12px;background:#6f42c1;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.9em;">+ Purchase</button>
                </div>
            `;
            
            // Add click handlers for buttons
            cardEl.querySelector('button[data-deck-target="starting"]').addEventListener('click', (e) => {
                e.stopPropagation();
                addCardToDeck(card.title, 'starting');
            });
            
            cardEl.querySelector('button.btn-purchase').addEventListener('click', (e) => {
                e.stopPropagation();
                addCardToDeck(card.title, 'purchase');
            });
            
            // Click on card title to show modal
            cardEl.querySelector('div:first-child').addEventListener('click', () => {
                showCardModal(card);
            });
            
            searchResults.appendChild(cardEl);
        });
    }
}

// Helper function to get card type color
function getTypeColor(type) {
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
    return typeColors[type] || '#6c757d';
}

// Helper function to show card modal
function showCardModal(card) {
    // This should show a modal with card details
    console.log('Show card modal for:', card.title);
    // You can implement your modal logic here
}

// Helper function to add card to deck
function addCardToDeck(cardTitle, deckType) {
    console.log('Add to deck:', cardTitle, deckType);
    // You can implement your deck logic here
}

// Get kit cards for selected personas
function getKitCards() {
    const activePersonaTitles = [];
    const wrestler = store.get('selectedWrestler');
    const manager = store.get('selectedManager');
    const callName = store.get('selectedCallName');
    const faction = store.get('selectedFaction');
    
    if (wrestler) activePersonaTitles.push(wrestler.title);
    if (manager) activePersonaTitles.push(manager.title);
    if (callName) activePersonaTitles.push(callName.title);
    if (faction) activePersonaTitles.push(faction.title);
    
    const allCards = store.get('cardDatabase') || [];
    const kitCards = allCards.filter(card => {
        // Check if it's a kit card (has "Wrestler Kit" = TRUE and "Signature For" matches a selected persona)
        const isKitCard = card['Wrestler Kit'] === true || 
                         (typeof card['Wrestler Kit'] === 'string' && 
                          card['Wrestler Kit'].toUpperCase() === 'TRUE');
        
        const signatureFor = card['Signature For'];
        
        return isKitCard && signatureFor && activePersonaTitles.includes(signatureFor);
    });
    
    return kitCards;
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMReferences();
    if (!personaDisplay) return;

    const wrestler = store.get('selectedWrestler');
    const manager = store.get('selectedManager');
    const callName = store.get('selectedCallName');
    const faction = store.get('selectedFaction');
    
    // Get kit cards for selected personas
    const kitCards = getKitCards();
    
    // Show the container only if we have at least one persona or kit cards
    const hasPersona = wrestler || manager || callName || faction || kitCards.length > 0;
    personaDisplay.style.display = hasPersona ? 'block' : 'none';
    
    if (hasPersona) {
        let html = `
            <div class="persona-info" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #e0e0e0;">
                <div style="font-weight: bold; color: #333;">Wrestler:</div>
                <div style="color: #007bff; font-weight: bold;">${wrestler ? wrestler.title : 'None Selected'}</div>
                <div style="font-weight: bold; color: #333;">Manager:</div>
                <div style="color: #6c757d;">${manager ? manager.title : 'None'}</div>
                <div style="font-weight: bold; color: #333;">Call Name:</div>
                <div style="color: #fd7e14;">${callName ? callName.title : 'None'}</div>
                <div style="font-weight: bold; color: #333;">Faction:</div>
                <div style="color: #20c997;">${faction ? faction.title : 'None'}</div>
            </div>
        `;
        
        // Add kit cards section if we have any
        if (kitCards.length > 0) {
            html += `
                <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #ddd;">
                    <h3 style="margin-top: 0; margin-bottom: 10px; color: #333; font-size: 1.1em;">Kit Cards</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            `;
            
            kitCards.forEach(card => {
                const typeColor = getTypeColor(card.card_type);
                html += `
                    <div style="flex: 1; min-width: 150px; max-width: 200px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid ${typeColor};">
                        <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${card.title}</div>
                        <div style="font-size: 0.85em; color: #666;">
                            <span style="color: ${typeColor}; font-weight: bold;">${card.card_type}</span>
                            ${card.cost !== null && card.cost !== undefined ? ` • Cost: ${card.cost}` : ''}
                            ${card.damage !== null && card.damage !== undefined ? ` • Damage: ${card.damage}` : ''}
                        </div>
                        <div style="font-size: 0.8em; color: #888; margin-top: 5px; font-style: italic;">
                            For: ${card['Signature For'] || 'Unknown'}
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

    // Populate Wrestlers
    wSelect.innerHTML = '<option value="">-- Select Wrestler --</option>' + 
        wrestlers.sort((a, b) => a.title.localeCompare(b.title))
            .map(w => `<option value="${w.title}">${w.title}</option>`).join('');
    
    // Populate Managers
    mSelect.innerHTML = '<option value="">-- Select Manager --</option>' + 
        managers.sort((a, b) => a.title.localeCompare(b.title))
            .map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    
    // Populate Call Names
    if (cnSelect) {
        cnSelect.innerHTML = '<option value="">-- Select Call Name --</option>' + 
            callNames.sort((a, b) => a.title.localeCompare(b.title))
                .map(cn => `<option value="${cn.title}">${cn.title}</option>`).join('');
    }
    
    // Populate Factions
    if (fSelect) {
        fSelect.innerHTML = '<option value="">-- Select Faction --</option>' + 
            factions.sort((a, b) => a.title.localeCompare(b.title))
                .map(f => `<option value="${f.title}">${f.title}</option>`).join('');
    }
}

export function renderDecks() {
    if (!startingDeckList || !purchaseDeckList) getDOMReferences();
    const starting = store.get('startingDeck') || [];
    const purchase = store.get('purchaseDeck') || [];

    if (startingDeckList) {
        startingDeckList.innerHTML = starting.length > 0 
            ? starting.map(t => `<div class="deck-item" style="padding:5px;border-bottom:1px solid #eee;font-size:0.9em;">${t}</div>`).join('')
            : '<div style="color:#999;font-style:italic;padding:10px;text-align:center;">No cards in starting deck</div>';
    }
    
    if (purchaseDeckList) {
        purchaseDeckList.innerHTML = purchase.length > 0 
            ? purchase.map(t => `<div class="deck-item" style="padding:5px;border-bottom:1px solid #eee;font-size:0.9em;">${t}</div>`).join('')
            : '<div style="color:#999;font-style:italic;padding:10px;text-align:center;">No cards in purchase deck</div>';
    }
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
