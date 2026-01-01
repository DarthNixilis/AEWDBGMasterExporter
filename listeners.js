// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

// Setup grid buttons
function setupGridButtons() {
    const gridButtons = document.querySelectorAll('#gridSizeControls button');
    gridButtons.forEach(btn => {
        // Remove existing listeners
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Re-select buttons after cloning
    const newGridButtons = document.querySelectorAll('#gridSizeControls button');
    newGridButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cols = parseInt(btn.getAttribute('data-columns'));
            if (cols) {
                store.set('numGridColumns', cols);
                // Visual feedback
                newGridButtons.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderColor = '#6c757d';
                    b.style.backgroundColor = 'transparent';
                    b.style.color = '#6c757d';
                });
                btn.classList.add('active');
                btn.style.borderColor = '#007bff';
                btn.style.backgroundColor = '#007bff';
                btn.style.color = 'white';
            }
        });
    });
}

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

    // 3. Grid Buttons
    setupGridButtons();

    // 4. Persona Selectors
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

    // Re-setup grid buttons after a short delay (in case DOM isn't fully ready)
    setTimeout(setupGridButtons, 500);
}

export const initializeListeners = initializeAllEventListeners;
