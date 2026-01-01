import { store } from './store.js';
import * as ui from './ui.js';

export function initializeAllEventListeners() {
    // Grid Size Buttons
    document.querySelectorAll('#gridSizeControls button').forEach(btn => {
        btn.onclick = () => {
            const cols = parseInt(btn.getAttribute('data-columns'));
            if (cols) store.set('numGridColumns', cols);
        };
    });

    // View Toggle
    const vt = document.getElementById('viewModeToggle');
    if (vt) {
        vt.onclick = () => {
            const mode = store.get('currentViewMode') === 'grid' ? 'list' : 'grid';
            store.set('currentViewMode', mode);
            vt.textContent = mode === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
        };
    }

    // Persona Dropdowns
    ['wrestlerSelect', 'managerSelect', 'callNameSelect', 'factionSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.onchange = (e) => {
                const key = 'selected' + id.replace('Select', '').charAt(0).toUpperCase() + id.replace('Select', '').slice(1);
                const card = store.get('cardTitleCache')[e.target.value.toLowerCase()];
                store.set(key, card || null);
            };
        }
    });

    // Search
    const search = document.getElementById('searchInput');
    if (search) {
        search.oninput = () => ui.renderCardPool();
    }
}

export const initializeListeners = initializeAllEventListeners;

