// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    // 1. Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => ui.renderCardPool());
    }

    // 2. View Mode Toggle (Grid vs List)
    const viewToggle = document.getElementById('viewModeToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            const next = current === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', next);
            viewToggle.textContent = next === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        });
    }

    // 3. Grid Column Buttons (2, 3, 4)
    const gridButtons = document.querySelectorAll('#gridSizeControls button');
    gridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = parseInt(btn.getAttribute('data-columns'));
            if (cols) {
                store.set('numGridColumns', cols);
                // Highlight active button
                gridButtons.forEach(b => b.style.background = '');
                btn.style.background = '#007bff';
                btn.style.color = 'white';
            }
        });
    });

    // 4. Wrestler/Manager Selection
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

    console.log("Event Listeners Wired Up");
}

export const initializeListeners = initializeAllEventListeners;

