// data-loader.js
import { store } from './store.js';

function parseTSV(tsvText) {
    const lines = tsvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Map the text file headers to the app's internal keys
    const headers = lines[0].split('\t').map(h => h.trim());
    const cards = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const values = line.split('\t');
        const card = {};
        
        headers.forEach((header, index) => {
            const val = values[index] ? values[index].trim() : '';
            // Translation Layer
            if (header === 'Name') card.title = val;
            else if (header === 'Type') card.card_type = val;
            else if (header === 'Game Text') card.text_box = { raw_text: val };
            else if (header === 'Cost') card.cost = val;
            else if (header === 'Damage') card.damage = val;
            else if (header === 'Momentum') card.momentum = val;
            else card[header.toLowerCase().replace(' ', '_')] = val;
        });
        
        cards.push(card);
    }
    return cards;
}

export async function loadGameData() {
    try {
        console.log("Loading cardDatabase.txt...");
        const response = await fetch('cardDatabase.txt');
        if (!response.ok) throw new Error("Could not find database file.");

        const text = await response.text();
        const parsedCards = parseTSV(text);

        const titleCache = {};
        parsedCards.forEach(c => {
            if (c.title) titleCache[c.title.toLowerCase()] = c;
        });

        store.set('cardDatabase', parsedCards);
        store.set('cardTitleCache', titleCache);
        
        console.log(`Successfully loaded ${parsedCards.length} cards.`);
        return true;
    } catch (error) {
        console.error("Data Load Error:", error);
        const results = document.getElementById('searchResults');
        if (results) results.innerHTML = `<div style="color:red;padding:20px;">Load Error: ${error.message}</div>`;
        return false;
    }
}

