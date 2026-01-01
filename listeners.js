// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    // 1. Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => ui.renderCardPool());
    }

    // 2. View Toggle
    const viewToggle = document.getElementById('viewModeToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            const next = current === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', next);
            viewToggle.textContent = next === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        });
    }

    // 3. Grid Buttons (2, 3, 4)
    const gridButtons = document.querySelectorAll('#gridSizeControls button');
    gridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = parseInt(btn.getAttribute('data-columns'));
            if (cols) {
                store.set('numGridColumns', cols);
                // Visual feedback for mobile
                gridButtons.forEach(b => b.style.borderColor = '#6c757d');
                btn.style.borderColor = '#007bff';
            }
        });
    });

    // 4. Persona Selectors
    const wSelect = document.getElementById('wrestlerSelect');
    const mSelect = document.getElementById('managerSelect');
    
    if (wSelect) {
        wSelect.addEventListener('change', (e) => {
            const val = e.target.value.toLowerCase();
            const card = store.get('cardTitleCache')[val];
            store.set('selectedWrestler', card || null);
        });
    }
    if (mSelect) {
        mSelect.addEventListener('change', (e) => {
            const val = e.target.value.toLowerCase();
            const card = store.get('cardTitleCache')[val];
            store.set('selectedManager', card || null);
        });
    }
}

export const initializeListeners = initializeAllEventListeners;

