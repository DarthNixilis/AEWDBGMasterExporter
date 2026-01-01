import { store } from './store.js';
import { getFilteredAndSortedCardPool } from './filters.js';
import { generateCardVisualHTML } from './card-renderer.js';

let searchResults, personaDisplay;

function getDOMRefs() {
    searchResults = document.getElementById('searchResults');
    personaDisplay = document.getElementById('personaDisplay');
}

export function renderCardPool() {
    if (!searchResults) getDOMRefs();
    if (!searchResults) return;

    const cards = getFilteredAndSortedCardPool();
    const viewMode = store.get('currentViewMode') || 'grid';
    const cols = store.get('numGridColumns') || 3;
    
    searchResults.innerHTML = '';
    searchResults.className = `card-list ${viewMode}-view`;
    
    if (viewMode === 'grid') {
        searchResults.style.display = 'grid';
        searchResults.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        searchResults.style.gap = '10px';
    }
    
    cards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card-item';
        div.innerHTML = generateCardVisualHTML(card);
        searchResults.appendChild(div);
    });
}

export function renderPersonaDisplay() {
    if (!personaDisplay) getDOMRefs();
    if (!personaDisplay) return;

    const w = store.get('selectedWrestler')?.title || 'None';
    const m = store.get('selectedManager')?.title || 'None';
    const cn = store.get('selectedCallName')?.title || 'None';
    const f = store.get('selectedFaction')?.title || 'None';
    
    personaDisplay.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #eee; padding: 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.85em;">
            <div><strong>Wrestler:</strong> ${w}</div>
            <div><strong>Manager:</strong> ${m}</div>
            <div><strong>Call Name:</strong> ${cn}</div>
            <div><strong>Faction:</strong> ${f}</div>
        </div>
    `;
}

export function populatePersonaSelectors() {
    const types = {
        wrestlerSelect: 'Wrestler',
        managerSelect: 'Manager',
        callNameSelect: 'Call Name',
        factionSelect: 'Faction'
    };

    const all = store.get('cardDatabase') || [];

    Object.entries(types).forEach(([id, type]) => {
        const el = document.getElementById(id);
        if (el) {
            const filtered = all.filter(c => c.card_type === type);
            el.innerHTML = `<option value="">-- Select ${type} --</option>` + 
                filtered.map(c => `<option value="${c.title}">${c.title}</option>`).join('');
        }
    });
}

export function initializeUI() {
    getDOMRefs();
    store.subscribe('cardDatabase', () => {
        populatePersonaSelectors();
        renderCardPool();
    });
    store.subscribe('numGridColumns', renderCardPool);
    store.subscribe('currentViewMode', renderCardPool);
    
    ['selectedWrestler', 'selectedManager', 'selectedCallName', 'selectedFaction'].forEach(key => {
        store.subscribe(key, renderPersonaDisplay);
    });

    renderCardPool();
    renderPersonaDisplay();
}

