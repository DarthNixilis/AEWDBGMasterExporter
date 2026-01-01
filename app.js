// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI, populatePersonaSelectors, renderPersonaDisplay } from './ui.js';
import { initializeAllEventListeners } from './listeners.js';

async function initApp() {
    try {
        // 1. Initialize UI shell first
        initializeUI();
        initializeAllEventListeners();

        // 2. Load the data
        const dataLoaded = await loadGameData();
        if (!dataLoaded) throw new Error("Database failed to load.");
        
        // 3. Force updates now that data is present
        populatePersonaSelectors();
        renderPersonaDisplay();
        
        store.set('initialized', true);
        console.log("App Fully Loaded");
    } catch (e) {
        console.error("Init Error:", e);
        document.body.innerHTML = `<div style="color:red; padding:20px;">Error: ${e.message}</div>`;
    }
}

initApp();
