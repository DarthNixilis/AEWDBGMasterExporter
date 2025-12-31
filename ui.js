// ui.js
import { store } from './store.js';
import { renderCardToCanvas } from './renderer.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { getDeckStatistics } from './deck.js';

// DOM references
let searchResults, startingDeckList, purchaseDeckList, personaDisplay;
let startingDeckCount, purchaseDeckCount, startingDeckHeader, purchaseDeckHeader;

// Initialize DOM references
function getDOMReferences() {
    searchResults = document.getElementById('searchResults');
    startingDeckList = document.getElementById('startingDeckList');
    purchaseDeckList = document.getElementById('purchaseDeckList');
    personaDisplay = document.getElementById('personaDisplay');
    startingDeckCount = document.getElementById('startingDeckCount');
    purchaseDeckCount = document.getElementById('purchaseDeckCount');
    startingDeckHeader = document.getElementById('startingDeckHeader');
    purchaseDeckHeader = document.getElementById('purchaseDeckHeader');
}

// Render the card pool
export function renderCardPool() {
    if (!searchResults) getDOMReferences();
    
    const cards = getFilteredAndSortedCardPool();
    const viewMode = store.get('currentViewMode');
    const numColumns = store.get('numGridColumns');
    
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${viewMode}-view`;
    
    if (viewMode === 'grid') {
        searchResults.setAttribute('data-columns', numColumns);
    } else {
        searchResults.removeAttribute('data-columns');
    }
    
    if (cards.length === 0) {
        searchResults.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">No cards match the current filters.</p>';
        return;
    }
    
    // Create a temporary container for canvas rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = viewMode === 'list' ? 'card-item' : 'grid-card-item';
        
        // Highlight signature cards
        if (store.isSignatureFor(card)) {
            cardElement.classList.add('signature-highlight');
        }
        
        cardElement.dataset.title = card.title;
        
        if (viewMode === 'list') {
            // List view
            const cost = card.cost !== null ? card.cost : 'N/A';
            const damage = card.damage !== null ? card.damage : 'N/A';
            const momentum = card.momentum !== null ? card.momentum : 'N/A';
            
            cardElement.innerHTML = `
                <span data-title="${card.title}">${card.title} (C:${cost}, D:${damage}, M:${momentum})</span>
            `;
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';
            
            if (card.cost === 0 || card.cost === '0') {
                buttonsDiv.innerHTML = `
                    <button data-title="${card.title}" data-deck-target="starting">Starting</button>
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            } else {
                buttonsDiv.innerHTML = `
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            }
            
            cardElement.appendChild(buttonsDiv);
        } else {
            // Grid view - render card image
            const canvas = renderCardToCanvas(card, 214, 308);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            cardElement.innerHTML = `
                <div class="card-visual" data-title="${card.title}">
                    <img src="${dataUrl}" alt="${card.title}" style="width:100%;height:auto;border-radius:8px;">
                </div>
            `;
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'card-buttons';
            
            if (card.cost === 0 || card.cost === '0') {
                buttonsDiv.innerHTML = `
                    <button data-title="${card.title}" data-deck-target="starting">Starting</button>
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            } else {
                buttonsDiv.innerHTML = `
                    <button class="btn-purchase" data-title="${card.title}" data-deck-target="purchase">Purchase</button>
                `;
            }
            
            cardElement.appendChild(buttonsDiv);
        }
        
        searchResults.appendChild(cardElement);
    });
    
    // Clean up temporary container
    document.body.removeChild(tempContainer);
}

// Render persona display
export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMReferences();
    
    const activePersonas = store.getActivePersonas();
    
    if (activePersonas.length === 0) {
        personaDisplay.style.display = 'none';
        return;
    }
    
    personaDisplay.style.display = 'block';
    personaDisplay.innerHTML = '<h3>Active Personas & Kit Cards</h3><div class="persona-card-list"></div>';
    
    const list = personaDisplay.querySelector('.persona-card-list');
    list.innerHTML = '';
    
    const cardsToShow = new Set();
    const activePersonaTitles = store.getActivePersonaTitles();
    
    // Add active personas
    activePersonas.forEach(p => cardsToShow.add(p));
    
    // Add kit cards
    const kitCards = store.get('cardDatabase').filter(card => 
        store.isKitCard(card) && activePersonaTitles.includes(card['Signature For']));
    kitCards.forEach(card => cardsToShow.add(card));
    
    // Sort cards
    const sortedCards = Array.from(cardsToShow).sort((a, b) => {
        const aIsPersona = store.isPersonaCard(a);
        const bIsPersona = store.isPersonaCard(b);
        
        if (aIsPersona && !bIsPersona) return -1;
        if (!aIsPersona && bIsPersona) return 1;
        
        // Within personas, sort by type order
        if (aIsPersona && bIsPersona) {
            const typeOrder = { 'Wrestler': 1, 'Manager': 2, 'Call Name': 3, 'Faction': 4 };
            const aOrder = typeOrder[a.card_type] || 5;
            const bOrder = typeOrder[b.card_type] || 5;
            
            if (aOrder !== bOrder) return aOrder - bOrder;
        }
        
        // Then alphabetically
        return a.title.localeCompare(b.title);
    });
    
    // Render cards
    sortedCards.forEach(card => {
        const item = document.createElement('div');
        item.className = 'persona-card-item';
        item.dataset.title = card.title;
        
        if (store.isPersonaCard(card)) {
            // Persona card with type badge
            const typeColors = {
                'Wrestler': '#dc3545',
                'Manager': '#007bff',
                'Call Name': '#fd7e14',
                'Faction': '#20c997'
            };
            const color = typeColors[card.card_type] || '#6c757d';
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background-color: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold;">
                        ${card.card_type.charAt(0)}
                    </span>
                    <span>${card.title}</span>
                </div>
            `;
        } else {
            // Kit card
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #f39c12; font-weight: bold;">★</span>
                    <span>${card.title}</span>
                </div>
            `;
        }
        
        list.appendChild(item);
    });
}

// Render deck lists
export function renderDecks() {
    if (!startingDeckList || !purchaseDeckList) getDOMReferences();
    
    renderDeckList(startingDeckList, store.get('startingDeck'));
    renderDeckList(purchaseDeckList, store.get('purchaseDeck'));
    updateDeckCounts();
}

function renderDeckList(element, deck) {
    element.innerHTML = '';
    
    const cardCounts = deck.reduce((acc, cardTitle) => {
        const key = cardTitle.toLowerCase();
        acc[key] = {
            title: cardTitle,
            count: (acc[key]?.count || 0) + 1
        };
        return acc;
    }, {});
    
    Object.values(cardCounts).forEach(({ title, count }) => {
        const card = store.get('cardTitleCache')[title.toLowerCase()];
        if (!card) return;
        
        const cardElement = document.createElement('div');
        cardElement.className = 'card-item';
        const deckName = element === startingDeckList ? 'starting' : 'purchase';
        
        cardElement.innerHTML = `
            <span data-title="${card.title}">${count}x ${card.title}</span>
            <button data-title="${card.title}" data-deck="${deckName}">Remove</button>
        `;
        
        element.appendChild(cardElement);
    });
}

function updateDeckCounts() {
    const startingCount = store.get('startingDeck').length;
    const purchaseCount = store.get('purchaseDeck').length;
    
    if (startingDeckCount) startingDeckCount.textContent = startingCount;
    if (purchaseDeckCount) purchaseDeckCount.textContent = purchaseCount;
    
    // Color code based on limits
    if (startingDeckHeader) {
        startingDeckHeader.style.color = startingCount === 24 ? 'green' : startingCount > 24 ? 'red' : 'inherit';
    }
    if (purchaseDeckHeader) {
        purchaseDeckHeader.style.color = purchaseCount >= 36 ? 'green' : 'inherit';
    }
    
    // Show validation status
    const validation = store.validateDeck();
    if (validation.errors.length > 0) {
        console.warn('Deck validation errors:', validation.errors);
    }
}

// Show card modal
export function showCardModal(cardTitle) {
    const modalBackdrop = document.getElementById('cardModal');
    const modalContent = document.getElementById('modalCardContent');
    const modalCloseButton = modalBackdrop.querySelector('.modal-close-button');
    
    if (!modalBackdrop || !modalContent) return;
    
    const card = store.get('cardTitleCache')[cardTitle.toLowerCase()];
    if (!card) return;
    
    // Store last focused element
    store.set('lastFocusedElement', document.activeElement);
    
    // Render card at high resolution for modal
    const canvas = renderCardToCanvas(card, 500, 700);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    modalContent.innerHTML = `
        <img src="${dataUrl}" alt="${card.title}" style="width:100%;height:auto;border-radius:10px;">
    `;
    
    modalBackdrop.style.display = 'flex';
    modalBackdrop.setAttribute('role', 'dialog');
    modalBackdrop.setAttribute('aria-modal', 'true');
    
    if (modalCloseButton) {
        modalCloseButton.focus();
    }
}

// Filter deck list
export function filterDeckList(deckListElement, query) {
    const items = deckListElement.querySelectorAll('.card-item');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(lowerQuery) ? '' : 'none';
    });
}

// Populate persona selectors
export function populatePersonaSelectors() {
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');
    
    if (!wrestlerSelect || !managerSelect || !callNameSelect || !factionSelect) return;
    
    // Clear existing options (keep first option)
    [wrestlerSelect, managerSelect, callNameSelect, factionSelect].forEach(select => {
        select.length = 1;
    });
    
    const cardDatabase = store.get('cardDatabase');
    if (!cardDatabase.length) return;
    
    // Get all personas
    const wrestlers = cardDatabase.filter(c => c.card_type === 'Wrestler').sort((a, b) => a.title.localeCompare(b.title));
    const managers = cardDatabase.filter(c => c.card_type === 'Manager').sort((a, b) => a.title.localeCompare(b.title));
    const callNames = cardDatabase.filter(c => c.card_type === 'Call Name').sort((a, b) => a.title.localeCompare(b.title));
    const factions = cardDatabase.filter(c => c.card_type === 'Faction').sort((a, b) => a.title.localeCompare(b.title));
    
    // Populate dropdowns
    wrestlers.forEach(w => wrestlerSelect.add(new Option(w.title, w.title)));
    managers.forEach(m => managerSelect.add(new Option(m.title, m.title)));
    callNames.forEach(cn => callNameSelect.add(new Option(cn.title, cn.title)));
    factions.forEach(f => factionSelect.add(new Option(f.title, f.title)));
    
    // Set current values
    const selectedWrestler = store.get('selectedWrestler');
    const selectedManager = store.get('selectedManager');
    const selectedCallName = store.get('selectedCallName');
    const selectedFaction = store.get('selectedFaction');
    
    if (selectedWrestler) wrestlerSelect.value = selectedWrestler.title;
    if (selectedManager) managerSelect.value = selectedManager.title;
    if (selectedCallName) callNameSelect.value = selectedCallName.title;
    if (selectedFaction) factionSelect.value = selectedFaction.title;
}

// Initialize UI
export function initializeUI() {
    getDOMReferences();
    
    // Set up deck search functionality
    addDeckSearchFunctionality();
    
    // Set initial view mode button text
    const viewModeToggle = document.getElementById('viewModeToggle');
    if (viewModeToggle) {
        viewModeToggle.textContent = store.get('currentViewMode') === 'list' ? 
            'Switch to Grid View' : 'Switch to List View';
    }
    
    // Set active grid size button
    const gridSizeControls = document.getElementById('gridSizeControls');
    if (gridSizeControls) {
        const numColumns = store.get('numGridColumns');
        const activeButton = gridSizeControls.querySelector(`[data-columns="${numColumns}"]`);
        if (activeButton) activeButton.classList.add('active');
    }
    
    // Subscribe to state changes
    store.subscribe('currentViewMode', () => renderCardPool());
    store.subscribe('numGridColumns', () => renderCardPool());
    store.subscribe('startingDeck', () => {
        renderDecks();
        renderPersonaDisplay();
    });
    store.subscribe('purchaseDeck', () => {
        renderDecks();
        renderPersonaDisplay();
    });
    store.subscribe('selectedWrestler', () => {
        renderPersonaDisplay();
        renderCardPool();
    });
    store.subscribe('selectedManager', () => {
        renderPersonaDisplay();
        renderCardPool();
    });
    store.subscribe('selectedCallName', () => {
        renderPersonaDisplay();
        renderCardPool();
    });
    store.subscribe('selectedFaction', () => {
        renderPersonaDisplay();
        renderCardPool();
    });
    store.subscribe('cardDatabase', () => {
        populatePersonaSelectors();
        renderPersonaDisplay();
        renderCardPool();
    });
    
    // Initial renders
    populatePersonaSelectors();
    renderPersonaDisplay();
    renderDecks();
}

// Add deck search inputs
function addDeckSearchFunctionality() {
    if (!startingDeckList || !purchaseDeckList) return;
    
    const startingDeckSearch = document.createElement('input');
    startingDeckSearch.type = 'text';
    startingDeckSearch.placeholder = 'Search starting deck...';
    startingDeckSearch.className = 'deck-search-input';
    startingDeckSearch.addEventListener('input', store.debounce(() => 
        filterDeckList(startingDeckList, startingDeckSearch.value), 300));
    
    const purchaseDeckSearch = document.createElement('input');
    purchaseDeckSearch.type = 'text';
    purchaseDeckSearch.placeholder = 'Search purchase deck...';
    purchaseDeckSearch.className = 'deck-search-input';
    purchaseDeckSearch.addEventListener('input', store.debounce(() => 
        filterDeckList(purchaseDeckList, purchaseDeckSearch.value), 300));
    
    startingDeckList.parentNode.insertBefore(startingDeckSearch, startingDeckList);
    purchaseDeckList.parentNode.insertBefore(purchaseDeckSearch, purchaseDeckList);
}
