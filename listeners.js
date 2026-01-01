// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const viewToggle = document.getElementById('viewModeToggle');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            // Simple search update
            ui.renderCardPool();
        });
    }

    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            store.set('currentViewMode', current === 'grid' ? 'list' : 'grid');
        });
    }
}

