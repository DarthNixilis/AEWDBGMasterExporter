// data-loader.js
import { store } from './store.js';

// Robust TSV parser
function parseTSV(tsvText) {
    const lines = tsvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Parse headers
    const headers = lines[0].split('\t').map(h => h.trim());
    
    // Parse data rows
    const cards = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        // Parse with quote handling
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === '\t' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Add the last value
        values.push(currentValue.trim());
        
        // Build card object
        const card = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // Remove surrounding quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            
            // Convert numeric values
            if (value === '' || value === 'null' || value === 'N/A' || value === 'N/a') {
                card[header] = null;
            } else if (!isNaN(value) && value !== '') {
                card[header] = Number(value);
            } else {
                card[header] = value;
            }
        });
        
        // Standardize card structure
        card.title = card['Card Name'] || '';
        card.card_type = card['Type'] || '';
        card.cost = card['Cost'] === 'N/a' ? null : card['Cost'];
        card.damage = card['Damage'] === 'N/a' ? null : card['Damage'];
        card.momentum = card['Momentum'] === 'N/a' ? null : card['Momentum'];
        
        // Parse text box
        card.text_box = { raw_text: card['Card Raw Game Text'] || '' };
        
        // Parse keywords
        if (card.Keywords) {
            card.text_box.keywords = card.Keywords.split(',')
                .map(name => ({ name: name.trim() }))
                .filter(k => k.name);
        } else {
            card.text_box.keywords = [];
        }
        
        // Parse traits
        if (card.Traits) {
            card.text_box.traits = card.Traits.split(',')
                .map(traitStr => {
                    const [name, value] = traitStr.split(':').map(s => s.trim());
                    return { 
                        name: name || '', 
                        value: value || undefined 
                    };
                })
                .filter(t => t.name);
        } else {
            card.text_box.traits = [];
        }
        
        cards.push(card);
    }
    
    return cards.filter(card => card.title);
}

// Robust keyword parser
function parseKeywords(keywordText) {
    const keywords = {};
    const lines = keywordText.trim().split(/\r?\n/);
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Handle both "Keyword: Definition" and "Keyword=Definition" formats
        const separator = line.includes(':') ? ':' : '=';
        const parts = line.split(separator);
        
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(separator).trim();
            keywords[key] = value;
        }
    }
    
    return keywords;
}

export async function loadGameData() {
    const searchResults = document.getElementById('searchResults');
    
    try {
        searchResults.innerHTML = '<p>Loading card data...</p>';
        
        // Get base path
        function getBasePath() {
            const path = window.location.pathname;
            const secondSlashIndex = path.indexOf('/', 1);
            if (secondSlashIndex !== -1) {
                return path.substring(0, secondSlashIndex + 1);
            }
            return '/';
        }
        
        const basePath = getBasePath();
        const cardDbUrl = `${basePath}cardDatabase.txt?v=${new Date().getTime()}`;
        const keywordsUrl = `${basePath}keywords.txt?v=${new Date().getTime()}`;
        
        // Load both files in parallel
        const [cardResponse, keywordResponse] = await Promise.all([
            fetch(cardDbUrl),
            fetch(keywordsUrl)
        ]);
        
        if (!cardResponse.ok) {
            throw new Error(`Could not load cardDatabase.txt (Status: ${cardResponse.status})`);
        }
        if (!keywordResponse.ok) {
            console.warn('Could not load keywords.txt, using default keywords');
        }
        
        const tsvData = await cardResponse.text();
        const parsedCards = parseTSV(tsvData);
        
        // Build card title cache
        const cardTitleCache = {};
        parsedCards.forEach(card => {
            if (card && card.title) {
                cardTitleCache[card.title.toLowerCase()] = card; // Case-insensitive lookup
            }
        });
        
        // Load keywords
        let parsedKeywords = {};
        try {
            const keywordText = await keywordResponse.text();
            parsedKeywords = parseKeywords(keywordText);
        } catch (error) {
            console.warn('Using default keywords:', error);
        }
        
        // Update store
        store.set('cardDatabase', parsedCards);
        store.set('keywordDatabase', parsedKeywords);
        store.set('cardTitleCache', cardTitleCache);
        
        // Restore personas from cache
        store.restorePersonas(cardTitleCache);
        
        return true;
        
    } catch (error) {
        console.error("Fatal Error during data load:", error);
        searchResults.innerHTML = `
            <div style="color: red; padding: 20px; text-align: center;">
                <strong>FATAL ERROR:</strong> ${error.message}<br><br>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        return false;
    }
}
