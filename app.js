// app.js
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI } from './ui.js';
import { initializeListeners } from './listeners.js';

export async function startApp() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    // Load data
    const dataLoaded = await loadGameData();
    if (!dataLoaded) return;
    
    // Initialize UI
    initializeUI();
    
    // Initialize event listeners
    initializeListeners();
    
    // Initial render
    store.trigger('*', 'initial');
    
    console.log('AEW Deck Constructor initialized');
}

// Start the app
startApp();