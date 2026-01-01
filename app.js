// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI, populatePersonaSelectors, renderPersonaDisplay } from './ui.js';
import { initializeAllEventListeners } from './listeners.js';
import { generatePlainTextDeck, generateLackeyCCGDeck } from './exporter.js';
import { exportAllCardsAsImages } from './master-export.js';

// --- GLOBAL DECK FUNCTIONS ---
window.addCardToDeck = (title, type) => {
    const key = type === 'starting' ? 'startingDeck' : 'purchaseDeck';
    const currentList = [...store.get(key)];
    currentList.push(title);
    store.set(key, currentList);
};

window.removeCard = (index, type) => {
    const key = type === 'starting' ? 'startingDeck' : 'purchaseDeck';
    const currentList = [...store.get(key)];
    currentList.splice(index, 1);
    store.set(key, currentList);
};

window.moveCard = (index, fromType, toType) => {
    const fromKey = fromType === 'starting' ? 'startingDeck' : 'purchaseDeck';
    const toKey = toType === 'starting' ? 'startingDeck' : 'purchaseDeck';
    
    const fromList = [...store.get(fromKey)];
    const toList = [...store.get(toKey)];
    
    const [cardTitle] = fromList.splice(index, 1);
    toList.push(cardTitle);
    
    store.set(fromKey, fromList);
    store.set(toKey, toList);
};

// --- GLOBAL EXPORT FUNCTIONS ---
window.exportTxtDeck = () => {
    const content = generatePlainTextDeck();
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AEW_Deck.txt';
    a.click();
};

window.exportLackeyDeck = () => {
    const content = generateLackeyCCGDeck();
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AEW_Lackey_Deck.txt';
    a.click();
};

async function initApp() {
    try {
        initializeUI();
        initializeAllEventListeners();

        // Bind Export Buttons in HTML
        document.getElementById('exportAllCards')?.addEventListener('click', exportAllCardsAsImages);
        
        const dataLoaded = await loadGameData();
        if (dataLoaded) {
            populatePersonaSelectors();
            renderPersonaDisplay();
            console.log("App Ready with Exports and Deckbuilding.");
        }
    } catch (e) {
        console.error("Init Error:", e);
    }
}

initApp();

