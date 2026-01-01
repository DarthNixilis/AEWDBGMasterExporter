// app.js - Main entry point
import { store } from './store.js';
import { loadGameData } from './data-loader.js';
import { initializeUI } from './ui.js';
import { initializeListeners } from './listeners.js';

// Simple, direct initialization
async function initApp() {
    console.log('AEW Deck Constructor starting...');
    
    // Check if DOM is already loaded
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    try {
        // Load game data first
        const dataLoaded = await loadGameData();
        
        if (!dataLoaded) {
            throw new Error('Failed to load game data');
        }
        
        console.log('Data loaded successfully');
        
        // Initialize UI
        initializeUI();
        console.log('UI initialized');
        
        // Initialize event listeners
        initializeListeners();
        console.log('Listeners initialized');
        
        // Initial render
        store.set('initialized', true);
        
        // Show success message
        console.log('AEW Deck Constructor initialized successfully!');
        
    } catch (error) {
        console.error('Fatal error during initialization:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #dc3545;
            color: white;
            padding: 20px;
            text-align: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <h3>Error Loading Application</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
                padding: 10px 20px;
                background: white;
                color: #dc3545;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">Retry</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
}

// Start the app
initApp();