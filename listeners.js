// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { parseAndLoadDeck } from './importer.js';
import { generatePlainTextDeck, exportDeckAsImage, generateLackeyCCGDeck } from './exporter.js';
import { exportAllCardsAsImages } from './master-export.js';

export function initializeAllEventListeners() {
    // POOL LISTENERS
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const gridSizeControls = document.getElementById('gridSizeControls');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const searchResults = document.getElementById('searchResults');

    // State change listeners
    store.subscribe('currentSort', () => ui.renderCardPool());
    store.subscribe('currentViewMode', () => ui.renderCardPool());
    store.subscribe('numGridColumns', () => ui.renderCardPool());
    store.subscribe('showZeroCost', () => ui.renderCardPool());
    store.subscribe('showNonZeroCost', () => ui.renderCardPool());
    store.subscribe('activeFilters', () => ui.renderCardPool());

    // Search input
    searchInput.addEventListener('input', store.debounce(() => {
        ui.renderCardPool();
    }, 300));

    // Sort select
    sortSelect.addEventListener('change', (e) => {
        store.set('currentSort', e.target.value);
    });

    // Cost filters
    showZeroCostCheckbox.addEventListener('change', (e) => {
        store.set('showZeroCost', e.target.checked);
    });

    showNonZeroCostCheckbox.addEventListener('change', (e) => {
        store.set('showNonZeroCost', e.target.checked);
    });

    // Grid size controls
    gridSizeControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.columns) {
            store.set('numGridColumns', parseInt(e.target.dataset.columns));
            
            // Update active button styling
            gridSizeControls.querySelectorAll('button').forEach(btn => 
                btn.classList.remove('active'));
            e.target.classList.add('active');
        }
    });

    // View mode toggle
    viewModeToggle.addEventListener('click', () => {
        const newMode = store.get('currentViewMode') === 'list' ? 'grid' : 'list';
        store.set('currentViewMode', newMode);
        viewModeToggle.textContent = newMode === 'list' ? 'Switch to Grid View' : 'Switch to List View';
    });

    // Card pool click handler
    searchResults.addEventListener('click', (e) => {
        const target = e.target;
        const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
        
        if (!cardTitle) return;
        
        // Find card with case-insensitive lookup
        const card = store.get('cardTitleCache')[cardTitle.toLowerCase()];
        if (!card) return;
        
        if (target.tagName === 'BUTTON') {
            deck.addCardToDeck(card.title, target.dataset.deckTarget);
        } else {
            ui.showCardModal(card.title);
        }
    });

    // DECK LISTENERS
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');
    const startingDeckList = document.getElementById('startingDeckList');
    const purchaseDeckList = document.getElementById('purchaseDeckList');
    const personaDisplay = document.getElementById('personaDisplay');
    const clearDeckBtn = document.getElementById('clearDeck');
    const exportDeckBtn = document.getElementById('exportDeck');
    const exportAsImageBtn = document.getElementById('exportAsImageBtn');
    const exportAllCardsBtn = document.getElementById('exportAllCards');

    // Persona selection
    wrestlerSelect.addEventListener('change', (e) => {
        const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
        store.set('selectedWrestler', card || null);
        ui.renderPersonaDisplay();
    });

    managerSelect.addEventListener('change', (e) => {
        const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
        store.set('selectedManager', card || null);
        ui.renderPersonaDisplay();
    });

    callNameSelect.addEventListener('change', (e) => {
        const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
        store.set('selectedCallName', card || null);
        ui.renderPersonaDisplay();
    });

    factionSelect.addEventListener('change', (e) => {
        const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
        store.set('selectedFaction', card || null);
        ui.renderPersonaDisplay();
    });

    // Deck list click handlers
    startingDeckList.addEventListener('click', (e) => {
        handleDeckListClick(e, 'starting');
    });

    purchaseDeckList.addEventListener('click', (e) => {
        handleDeckListClick(e, 'purchase');
    });

    personaDisplay.addEventListener('click', (e) => {
        const target = e.target;
        const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
        
        if (cardTitle) {
            const card = store.get('cardTitleCache')[cardTitle.toLowerCase()];
            if (card) {
                ui.showCardModal(card.title);
            }
        }
    });

    // Deck actions
    clearDeckBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire deck?')) {
            store.set('startingDeck', []);
            store.set('purchaseDeck', []);
            ui.renderDecks();
        }
    });

    exportDeckBtn.addEventListener('click', () => {
        const text = generatePlainTextDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        
        const wrestlerName = store.get('selectedWrestler') ? 
            store.toPascalCase(store.get('selectedWrestler').title) : "Deck";
        a.download = `${wrestlerName}.txt`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    // LackeyCCG Export button (dynamically created if not exists)
    let exportLackeyBtn = document.getElementById('exportLackeyBtn');
    if (!exportLackeyBtn) {
        exportLackeyBtn = document.createElement('button');
        exportLackeyBtn.id = 'exportLackeyBtn';
        exportLackeyBtn.textContent = 'Export for LackeyCCG';
        exportLackeyBtn.className = 'export-lackey-btn';
        
        const deckActions = document.querySelector('.deck-actions');
        if (deckActions) {
            deckActions.insertBefore(exportLackeyBtn, exportAsImageBtn);
        }
    }

    exportLackeyBtn.addEventListener('click', () => {
        const text = generateLackeyCCGDeck();
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        
        const wrestlerName = store.get('selectedWrestler') ? 
            store.toPascalCase(store.get('selectedWrestler').title) : "Deck";
        a.download = `${wrestlerName}-Lackey.txt`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    exportAsImageBtn.addEventListener('click', exportDeckAsImage);
    
    exportAllCardsBtn.addEventListener('click', async () => {
        try {
            await exportAllCardsAsImages();
        } catch (error) {
            console.error("Export failed:", error);
            if (confirm("ZIP export failed. Would you like to try downloading images individually instead?")) {
                // You might want to implement a fallback here
                alert("Individual export not implemented. Please check the console for errors.");
            }
        }
    });

    // MODAL LISTENERS
    const importDeckBtn = document.getElementById('importDeck');
    const importModal = document.getElementById('importModal');
    const importModalCloseBtn = importModal.querySelector('.modal-close-button');
    const deckFileInput = document.getElementById('deckFileInput');
    const deckTextInput = document.getElementById('deckTextInput');
    const processImportBtn = document.getElementById('processImportBtn');
    const cardModal = document.getElementById('cardModal');
    const modalCloseButton = cardModal.querySelector('.modal-close-button');

    importDeckBtn.addEventListener('click', () => {
        importModal.style.display = 'flex';
        document.getElementById('importStatus').textContent = '';
        deckTextInput.value = '';
        deckFileInput.value = '';
    });

    importModalCloseBtn.addEventListener('click', () => {
        importModal.style.display = 'none';
    });

    processImportBtn.addEventListener('click', () => {
        if (deckTextInput.value.trim()) {
            parseAndLoadDeck(deckTextInput.value);
        }
    });

    deckFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                parseAndLoadDeck(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    modalCloseButton.addEventListener('click', () => {
        cardModal.style.display = 'none';
    });

    cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) {
            cardModal.style.display = 'none';
        }
    });

    importModal.addEventListener('click', (e) => {
        if (e.target === importModal) {
            importModal.style.display = 'none';
        }
    });

    // Global keyboard listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cardModal.style.display = 'none';
            importModal.style.display = 'none';
            
            const lastFocused = store.get('lastFocusedElement');
            if (lastFocused) {
                lastFocused.focus();
            }
        }
    });

    // Initialize UI state
    initializeUIState();
}

// Helper function for deck list clicks
function handleDeckListClick(event, deckType) {
    const target = event.target;
    const cardTitle = target.dataset.title || target.closest('[data-title]')?.dataset.title;
    
    if (!cardTitle) return;
    
    const card = store.get('cardTitleCache')[cardTitle.toLowerCase()];
    if (!card) return;
    
    if (target.tagName === 'BUTTON' && target.dataset.deck) {
        deck.removeCardFromDeck(card.title, target.dataset.deck);
    } else {
        ui.showCardModal(card.title);
    }
}

// Initialize UI state based on store
function initializeUIState() {
    // Set initial values
    const sortSelect = document.getElementById('sortSelect');
    const showZeroCostCheckbox = document.getElementById('showZeroCost');
    const showNonZeroCostCheckbox = document.getElementById('showNonZeroCost');
    const viewModeToggle = document.getElementById('viewModeToggle');
    const gridSizeControls = document.getElementById('gridSizeControls');
    
    if (sortSelect) sortSelect.value = store.get('currentSort');
    if (showZeroCostCheckbox) showZeroCostCheckbox.checked = store.get('showZeroCost');
    if (showNonZeroCostCheckbox) showNonZeroCostCheckbox.checked = store.get('showNonZeroCost');
    
    // View mode toggle text
    if (viewModeToggle) {
        viewModeToggle.textContent = store.get('currentViewMode') === 'list' ? 
            'Switch to Grid View' : 'Switch to List View';
    }
    
    // Grid size active button
    if (gridSizeControls) {
        const activeBtn = gridSizeControls.querySelector(`[data-columns="${store.get('numGridColumns')}"]`);
        if (activeBtn) {
            gridSizeControls.querySelectorAll('button').forEach(btn => 
                btn.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    }
}
