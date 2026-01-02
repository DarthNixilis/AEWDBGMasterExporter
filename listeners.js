// listeners.js
import { store } from './store.js';
import { renderPersonaDisplay, renderCardPool } from './ui.js';

export function initializeAllEventListeners() {
    // Search
    document.getElementById('searchInput')?.addEventListener('input', renderCardPool);

    // View Toggles
    document.getElementById('viewModeToggle')?.addEventListener('click', (e) => {
        const current = store.get('currentViewMode');
        const next = current === 'grid' ? 'list' : 'grid';
        store.set('currentViewMode', next);
        e.target.textContent = next === 'grid' ? 'Switch to List View' : 'Switch to Grid View';
    });

    // Grid Size
    document.querySelectorAll('#gridSizeControls button').forEach(btn => {
        btn.addEventListener('click', () => {
            const cols = parseInt(btn.dataset.columns);
            store.set('numGridColumns', cols);
            document.querySelectorAll('#gridSizeControls button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Persona Selectors
    const setupSelector = (id, storeKey) => {
        document.getElementById(id)?.addEventListener('change', (e) => {
            const title = e.target.value;
            const card = store.get('cardDatabase').find(c => c.title === title);
            store.set(storeKey, card || null);
            renderPersonaDisplay();
        });
    };

    setupSelector('wrestlerSelect', 'selectedWrestler');
    setupSelector('managerSelect', 'selectedManager');
    setupSelector('callNameSelect', 'selectedCallName');
    setupSelector('factionSelect', 'selectedFaction');

    document.getElementById('clearDeck')?.addEventListener('click', () => {
        if(confirm("Clear current deck?")) {
            store.set('startingDeck', []);
            store.set('purchaseDeck', []);
        }
    });
}

