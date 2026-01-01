
// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { parseAndLoadDeck } from './importer.js';
import { generatePlainTextDeck, exportDeckAsImage } from './exporter.js';
import { exportAllCardsAsImages } from './master-export.js';

// This is the specific function name app.js is looking for
export function initializeAllEventListeners() {
    console.log("Initializing Event Listeners...");

    // 1. SEARCH & FILTERS
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // We use a simple wrap here to ensure ui.renderCardPool exists
            if (ui.renderCardPool) ui.renderCardPool();
        });
    }

    // 2. VIEW MODE TOGGLE
    const viewModeToggle = document.getElementById('viewModeToggle');
    if (viewModeToggle) {
        viewModeToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            const newMode = current === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', newMode);
            viewModeToggle.textContent = newMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        });
    }

    // 3. DECK CLEARING
    const clearBtn = document.getElementById('clearDeck');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm("Clear entire deck?")) {
                store.set('startingDeck', []);
                store.set('purchaseDeck', []);
            }
        });
    }

    // 4. EXPORT ALL
    const exportAllBtn = document.getElementById('exportAllCards');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => {
            exportAllCardsAsImages();
        });
    }

    // 5. IMPORT LOGIC
    const processImportBtn = document.getElementById('processImportBtn');
    const deckTextInput = document.getElementById('deckTextInput');
    if (processImportBtn && deckTextInput) {
        processImportBtn.addEventListener('click', () => {
            parseAndLoadDeck(deckTextInput.value);
        });
    }

    console.log("Event Listeners attached successfully.");
}

// Map the old name to the new name just in case app.js uses the old one
export const initializeListeners = initializeAllEventListeners;
 
