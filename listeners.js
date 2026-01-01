// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    // 1. Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => ui.renderCardPool());
    }

    // 2. View Mode Toggle
    const viewToggle = document.getElementById('viewModeToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            store.set('currentViewMode', current === 'grid' ? 'list' : 'grid');
        });
    }

    // 3. Grid Column Buttons
    const gridButtons = document.querySelectorAll('#gridSizeControls button');
    gridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = parseInt(btn.dataset.columns);
            store.set('numGridColumns', cols);
            gridButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // 4. Persona Selectors
    const wSelect = document.getElementById('wrestlerSelect');
    const mSelect = document.getElementById('managerSelect');
    
    if (wSelect) {
        wSelect.addEventListener('change', (e) => {
            const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
            store.set('selectedWrestler', card || null);
        });
    }
    if (mSelect) {
        mSelect.addEventListener('change', (e) => {
            const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
            store.set('selectedManager', card || null);
        });
    }

    console.log("EventListeners attached.");
}

export const initializeListeners = initializeAllEventListeners;

