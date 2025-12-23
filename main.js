// main.js
import { loadGameData } from './data-loader.js';
import { initializeApp } from './app-init.js';

// Add debug logging
console.log("JSZip available:", typeof JSZip !== 'undefined');
console.log("html2canvas available:", typeof html2canvas !== 'undefined');

async function startApp() {
    const dataLoaded = await loadGameData();
    if (dataLoaded) {
        initializeApp();
        // Test that exports are available
        window.testExport = async () => {
            console.log("Test export button clicked");
            const { exportAllCardsAsImages } = await import('./master-export.js');
            await exportAllCardsAsImages();
        };
    }
}

startApp();