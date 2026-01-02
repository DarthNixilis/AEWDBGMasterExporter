// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI, populatePersonaSelectors, renderPersonaDisplay, renderDecks, renderCardPool } from './ui.js';
import { initializeAllEventListeners } from './listeners.js';
import { generatePlainTextDeck, generateLackeyCCGDeck } from './exporter.js';

// Global Actions for Buttons
window.addCard = (title, type) => {
    const counts = store.getCardCounts(title);
    if (counts.total >= 3) return;
    if (type === 'starting' && counts.draw >= 2) return;

    const deckKey = type === 'starting' ? 'startingDeck' : 'purchaseDeck';
    store.set(deckKey, [...store.get(deckKey), title]);
};

window.removeCard = (title, type) => {
    const deckKey = type === 'starting' ? 'startingDeck' : 'purchaseDeck';
    const deck = [...store.get(deckKey)];
    const index = deck.indexOf(title);
    if (index > -1) {
        deck.splice(index, 1);
        store.set(deckKey, deck);
    }
};

window.exportTxtDeck = () => {
    const text = generatePlainTextDeck();
    downloadFile(text, 'decklist.txt');
};

window.exportLackeyDeck = () => {
    const text = generateLackeyCCGDeck();
    downloadFile(text, 'lackey_deck.txt');
};

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
}

async function initApp() {
    initializeUI();
    initializeAllEventListeners();
    const loaded = await loadGameData();
    if (loaded) {
        populatePersonaSelectors();
        renderPersonaDisplay();
        renderDecks();
        renderCardPool();
    }
}

initApp();

