// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI } from './ui.js';
import { initializeAllEventListeners } from './listeners.js';

async function initApp() {
    try {
        const dataLoaded = await loadGameData();
        if (!dataLoaded) throw new Error("Card database failed to load.");
        
        initializeUI();
        initializeAllEventListeners();
        
        store.set('initialized', true);
        console.log("AEW App Ready");
    } catch (e) {
        console.error("Init Error:", e);
        document.body.innerHTML = `<div style="color:red; padding:20px;">Startup Error: ${e.message}</div>`;
    }
}

initApp();

