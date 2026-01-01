// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI } from './ui.js';
import { initializeAllEventListeners } from './listeners.js';

async function initApp() {
    try {
        const dataLoaded = await loadGameData();
        if (!dataLoaded) throw new Error("Data fail");
        
        initializeUI();
        initializeAllEventListeners();
        
        store.set('initialized', true);
    } catch (e) {
        console.error(e);
        document.body.innerHTML = `<div style="padding:20px; color:red;">Error: ${e.message}</div>`;
    }
}

initApp();

