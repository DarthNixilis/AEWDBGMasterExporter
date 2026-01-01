// listeners.js
import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    // 1. Grid Size Buttons
    const gridButtons = document.querySelectorAll('#gridSizeControls button');
    gridButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = parseInt(btn.getAttribute('data-columns'));
            if (cols) {
                store.set('numGridColumns', cols);
                gridButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // 2. View Mode Toggle
    const viewToggle = document.getElementById('viewModeToggle');
    if (viewToggle) {
        viewToggle.addEventListener('click', () => {
            const current = store.get('currentViewMode');
            const next = current === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', next);
            viewToggle.textContent = next === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        });
    }

    // 3. Persona Dropdowns
    ['wrestlerSelect', 'managerSelect', 'callNameSelect', 'factionSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                const key = 'selected' + id.replace('Select', '').charAt(0).toUpperCase() + id.replace('Select', '').slice(1);
                const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
                store.set(key, card || null);
            });
        }
    });

    // 4. Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => ui.renderCardPool());
    }
}

export const initializeListeners = initializeAllEventListeners;

