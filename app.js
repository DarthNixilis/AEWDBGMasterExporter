// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI, populatePersonaSelectors, renderPersonaDisplay } from './ui.js';
import { initializeAllEventListeners } from './listeners.js';
import { exportAllCardsAsImages } from './master-export.js';
import { generatePlainTextDeck, generateLackeyCCGDeck } from './exporter.js';

// Global helpers for HTML buttons
window.addCard = (title, type) => {
    const list = [...store.get(type === 'starting' ? 'startingDeck' : 'purchaseDeck')];
    list.push(title);
    store.set(type === 'starting' ? 'startingDeck' : 'purchaseDeck', list);
};

window.removeCard = (index, type) => {
    const list = [...store.get(type === 'starting' ? 'startingDeck' : 'purchaseDeck')];
    list.splice(index, 1);
    store.set(type === 'starting' ? 'startingDeck' : 'purchaseDeck', list);
};

window.moveCard = (index, fromType, toType) => {
    const fromList = [...store.get(fromType === 'starting' ? 'startingDeck' : 'purchaseDeck')];
    const toList = [...store.get(toType === 'starting' ? 'startingDeck' : 'purchaseDeck')];
    const [card] = fromList.splice(index, 1);
    toList.push(card);
    store.set(fromType === 'starting' ? 'startingDeck' : 'purchaseDeck', fromList);
    store.set(toType === 'starting' ? 'startingDeck' : 'purchaseDeck', toList);
};

async function initApp() {
    try {
        initializeUI();
        initializeAllEventListeners();

        // Bind Export Buttons
        document.getElementById('exportAllCards')?.addEventListener('click', exportAllCardsAsImages);
        document.getElementById('exportAsImageBtn')?.addEventListener('click', () => {
             // Logic for single image export via exporter.js
        });
        
        // Add Txt/Lackey Buttons to Action Panel in index.html, then bind:
        document.getElementById('exportTxtBtn')?.addEventListener('click', () => {
            const blob = new Blob([generatePlainTextDeck()], {type: 'text/plain'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='deck.txt'; a.click();
        });

        const dataLoaded = await loadGameData();
        if (dataLoaded) {
            populatePersonaSelectors();
            renderPersonaDisplay();
        }
    } catch (e) {
        console.error("Init Error:", e);
    }
}

initApp();

