
// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';
import * as deck from './deck.js';
import { parseAndLoadDeck } from './importer.js';
import { exportAllCardsAsImages } from './master-export.js';

export function initializeAllEventListeners() {
    console.log("Initializing Event Listeners...");

    // 1. POOL INTERACTION (Clicking cards in the search result)
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
        searchResults.addEventListener('click', (e) => {
            const cardItem = e.target.closest('.card-item');
            if (!cardItem) return;
            
            const title = cardItem.dataset.title || cardItem.querySelector('strong')?.textContent;
            if (title && ui.showCardModal) {
                ui.showCardModal(title);
            }
        });
    }

    // 2. SEARCH INPUT
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (ui.renderCardPool) ui.renderCardPool();
        });
    }

    // 3. VIEW MODE TOGGLE
    const viewModeToggle = document.getElementById('viewModeToggle');
    if (viewModeToggle) {
        viewModeToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            const nextMode = current === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', nextMode);
            viewModeToggle.textContent = nextMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        });
    }

    // 4. DECK LIST CLICKS (Removing cards)
    // We use delegation so we don't need to find the specific list elements immediately
    document.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('button[data-deck]');
        if (removeBtn) {
            const title = removeBtn.dataset.title;
            const targetDeck = removeBtn.dataset.deck;
            if (title && deck.removeCardFromDeck) {
                deck.removeCardFromDeck(title, targetDeck);
            }
        }
    });

    // 5. BULK EXPORT
    const exportAllBtn = document.getElementById('exportAllCards');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', () => {
            exportAllCardsAsImages();
        });
    }

    // 6. MODAL CLOSING
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close-button') || e.target.classList.contains('modal-backdrop')) {
            const modals = document.querySelectorAll('.modal-backdrop');
            modals.forEach(m => m.style.display = 'none');
        }
    });

    console.log("Event Listeners initialized.");
}

// Ensure both names work to prevent 'undefined' errors in app.js
export const initializeListeners = initializeAllEventListeners;
 
