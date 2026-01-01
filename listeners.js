// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    // View toggle
    const viewToggle = document.getElementById('viewModeToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            const next = current === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', next);
            viewToggle.textContent = next === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        });
    }

    // Grid buttons
    const gridButtons = document.querySelectorAll('#gridSizeControls button');
    gridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = parseInt(btn.getAttribute('data-columns'));
            if (cols) {
                store.set('numGridColumns', cols);
            }
        });
    });

    // Persona selectors
    const wSelect = document.getElementById('wrestlerSelect');
    const mSelect = document.getElementById('managerSelect');
    const cnSelect = document.getElementById('callNameSelect');
    const fSelect = document.getElementById('factionSelect');
    
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
    if (cnSelect) {
        cnSelect.addEventListener('change', (e) => {
            const val = e.target.value.toLowerCase();
            const card = store.get('cardTitleCache')[val];
            store.set('selectedCallName', card || null);
        });
    }
    if (fSelect) {
        fSelect.addEventListener('change', (e) => {
            const val = e.target.value.toLowerCase();
            const card = store.get('cardTitleCache')[val];
            store.set('selectedFaction', card || null);
        });
    }

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            ui.renderCardPool();
        });
    }
}

export const initializeListeners = initializeAllEventListeners;
