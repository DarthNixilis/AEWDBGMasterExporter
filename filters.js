// filters.js
import { store } from './store.js';

// Filter functions by category
const filterFunctions = {
    'Card Type': (card, value) => {
        if (value === 'Maneuver') {
            return ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        }
        return card.card_type === value;
    },
    'Keyword': (card, value) => {
        return card.text_box?.keywords?.some(k => 
            k.name.trim().toLowerCase() === value.toLowerCase());
    },
    'Trait': (card, value) => {
        return card.text_box?.traits?.some(t => 
            t.name.trim().toLowerCase() === value.toLowerCase());
    },
};

// Get available filter options based on current card pool
function getAvailableFilterOptions() {
    const cards = store.get('cardDatabase');
    const options = {
        'Card Type': new Set(),
        'Keyword': new Set(),
        'Trait': new Set()
    };
    
    cards.forEach(card => {
        if (card && card.card_type) {
            options['Card Type'].add(card.card_type);
        }
        if (card && card.text_box?.keywords) {
            card.text_box.keywords.forEach(k => {
                if (k.name) options['Keyword'].add(k.name.trim());
            });
        }
        if (card && card.text_box?.traits) {
            card.text_box.traits.forEach(t => {
                if (t.name) options['Trait'].add(t.name.trim());
            });
        }
    });
    
    // Sort and add special categories
    const sortedTypes = Array.from(options['Card Type']).sort();
    if (sortedTypes.some(type => ['Strike', 'Grapple', 'Submission'].includes(type))) {
        sortedTypes.unshift('Maneuver');
    }
    
    return {
        'Card Type': sortedTypes,
        'Keyword': Array.from(options['Keyword']).sort(),
        'Trait': Array.from(options['Trait']).sort()
    };
}

// Render the cascading filter dropdowns
export function renderCascadingFilters() {
    const cascadingFiltersContainer = document.getElementById('cascadingFiltersContainer');
    if (!cascadingFiltersContainer) return;
    
    cascadingFiltersContainer.innerHTML = '';
    const availableOptions = getAvailableFilterOptions();
    const activeFilters = store.get('activeFilters');
    
    ['Card Type', 'Keyword', 'Trait'].forEach((category, index) => {
        const select = document.createElement('select');
        select.className = 'filter-select';
        select.innerHTML = `<option value="">-- Select ${category} --</option>`;
        
        availableOptions[category].forEach(opt => {
            select.add(new Option(opt, opt));
        });
        
        select.value = activeFilters[index]?.value || '';
        
        select.onchange = (e) => {
            const newFilters = [...activeFilters];
            newFilters[index] = { category: category, value: e.target.value };
            
            // Clear subsequent filters
            for (let j = index + 1; j < 3; j++) {
                newFilters[j] = {};
            }
            
            store.set('activeFilters', newFilters);
        };
        
        cascadingFiltersContainer.appendChild(select);
    });
}

// Apply all active filters to cards
function applyAllFilters(cards) {
    let filtered = [...cards];
    const activeFilters = store.get('activeFilters');
    
    activeFilters.forEach(filter => {
        if (filter && filter.value) {
            const filterFunc = filterFunctions[filter.category];
            if (filterFunc) {
                filtered = filtered.filter(card => filterFunc(card, filter.value));
            }
        }
    });
    
    return filtered;
}

// Apply sorting to cards
function applySort(cards) {
    const currentSort = store.get('currentSort');
    const [sortBy, direction] = currentSort.split('-');
    
    return [...cards].sort((a, b) => {
        let valA, valB;
        
        switch (sortBy) {
            case 'alpha':
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();
                break;
            case 'cost':
                valA = a.cost ?? -1;
                valB = b.cost ?? -1;
                break;
            case 'damage':
                valA = a.damage ?? -1;
                valB = b.damage ?? -1;
                break;
            case 'momentum':
                valA = a.momentum ?? -1;
                valB = b.momentum ?? -1;
                break;
            default:
                return 0;
        }
        
        if (direction === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });
}

// Main function to get filtered and sorted card pool
export function getFilteredAndSortedCardPool() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    
    let cards = store.get('cardDatabase').filter(card => {
        if (!card || !card.title) return false;
        
        // Exclude persona cards
        if (store.isPersonaCard(card)) return false;
        
        // Exclude kit cards
        if (store.isKitCard(card)) return false;
        
        // Apply cost filters
        const showZeroCost = store.get('showZeroCost');
        const showNonZeroCost = store.get('showNonZeroCost');
        
        if (!showZeroCost && (card.cost === 0 || card.cost === '0')) return false;
        if (!showNonZeroCost && card.cost > 0) return false;
        
        // Apply search query
        if (query === '') return true;
        
        const titleMatch = card.title.toLowerCase().includes(query);
        const textMatch = card.text_box?.raw_text?.toLowerCase().includes(query) || false;
        
        return titleMatch || textMatch;
    });
    
    // Apply active filters
    const filtered = applyAllFilters(cards);
    
    // Apply sorting
    return applySort(filtered);
}

// Update filters when state changes
export function initializeFilters() {
    // Re-render filters when card database loads
    store.subscribe('cardDatabase', () => {
        renderCascadingFilters();
    });
    
    // Update filter options when active filters change
    store.subscribe('activeFilters', () => {
        renderCascadingFilters();
    });
}
