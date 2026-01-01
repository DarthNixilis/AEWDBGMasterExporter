// data-loader.js
import { store } from './store.js';

function parseDatabase(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // This regex splits by Tab OR multiple spaces to prevent "stuck" loading
    const headers = lines[0].split(/\t/).map(h => h.trim());
    const cards = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = line.split(/\t/);
        const card = {};

        headers.forEach((header, index) => {
            const val = values[index] ? values[index].trim() : '';
            
            // Map your specific TXT headers to the App's internal requirements
            if (header === 'Name') card.title = val;
            else if (header === 'Type') card.card_type = val;
            else if (header === 'Game Text') card.text_box = { raw_text: val };
            else if (header === 'Cost') card.cost = val;
            else if (header === 'Damage') card.damage = val;
            else if (header === 'Momentum') card.momentum = val;
            else {
                // Handle any other headers (Set, Target, Traits, etc.)
                const cleanKey = header.toLowerCase().replace(/\s+/g, '_');
                card[cleanKey] = val;
            }
        });

        if (card.title) cards.push(card);
    }
    return cards;
}

export async function loadGameData() {
    try {
        console.log("Fetching cardDatabase.txt...");
        const response = await fetch('cardDatabase.txt');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}. Make sure cardDatabase.txt is in the folder.`);
        }

        const text = await response.text();
        const parsedCards = parseDatabase(text);

        if (parsedCards.length === 0) {
            throw new Error("No cards found. Check if the file uses Tabs between columns.");
        }

        // Create the search cache
        const titleCache = {};
        parsedCards.forEach(c => {
            titleCache[c.title.toLowerCase()] = c;
        });

        // Save to central store
        store.set('cardDatabase', parsedCards);
        store.set('cardTitleCache', titleCache);
        
        console.log(`Loaded ${parsedCards.length} cards successfully.`);
        return true;
    } catch (error) {
        console.error("Data Load Failure:", error);
        const results = document.getElementById('searchResults');
        if (results) {
            results.innerHTML = `<div style="color:red; padding:20px; background:white; border:2px solid red;">
                <strong>Database Error:</strong> ${error.message}<br><br>
                1. Ensure <b>cardDatabase.txt</b> is in the same folder.<br>
                2. If on mobile, ensure you are using a web server app or GitHub Pages.
            </div>`;
        }
        return false;
    }
}

