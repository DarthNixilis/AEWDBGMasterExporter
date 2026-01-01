// ui.js
import { store } from './store.js';
import { getFilteredAndSortedCardPool } from './filters.js';

// Add 'export' to the beginning of this function
export function initializeUI() {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    // Set up subscribers
    store.subscribe('cardDatabase', () => renderCardPool());
    store.subscribe('activeFilters', () => renderCardPool());
    store.subscribe('currentViewMode', () => renderCardPool());

    renderCardPool();
}

export function renderCardPool() {
    const searchResults = document.getElementById('searchResults');
    const cards = getFilteredAndSortedCardPool();
    
    if (!searchResults) return;
    searchResults.innerHTML = '';
    
    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.textContent = card.title;
        searchResults.appendChild(div);
    });
}

