// master-export.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

// Helper function to create clean filename with Regular Case
function getCleanFileName(cardTitle, cardType, usePascalCase = false) {
    let cleanTitle;
    
    if (usePascalCase) {
        cleanTitle = toPascalCase(cardTitle);
    } else {
        cleanTitle = cardTitle.replace(/[^a-zA-Z0-9\s]/g, '');
        cleanTitle = cleanTitle
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    if (cardType === 'Wrestler' || cardType === 'Manager') {
        if (usePascalCase) {
            return cleanTitle + cardType;
        } else {
            return cleanTitle + ' ' + cardType;
        }
    }
    
    return cleanTitle;
}

// Load JSZip dynamically
async function loadJSZip() {
    if (window.JSZip) {
        return window.JSZip;
    }
    
    try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);
        
        return new Promise((resolve, reject) => {
            script.onload = () => {
                if (window.JSZip) {
                    resolve(window.JSZip);
                } else {
                    reject(new Error('JSZip failed to load'));
                }
            };
            script.onerror = () => reject(new Error('Failed to load JSZip'));
        });
    } catch (error) {
        throw new Error('JSZip not available: ' + error.message);
    }
}

export async function exportAllCardsAsImages() {
    console.log("Export All Cards function called");
    
    const allCards = [...state.cardDatabase];
    console.log(`Found ${allCards.length} cards`);
    
    if (allCards.length === 0) {
        alert("No cards found in the database.");
        return;
    }
    
    // SIMPLIFIED export modal - just basic options
    const exportModal = document.createElement('div');
    exportModal.style.position = 'fixed';
    exportModal.style.top = '0';
    exportModal.style.left = '0';
    exportModal.style.width = '100%';
    exportModal.style.height = '100%';
    exportModal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    exportModal.style.zIndex = '9998';
    exportModal.style.display = 'flex';
    exportModal.style.justifyContent = 'center';
    exportModal.style.alignItems = 'center';
    
    const exportModalContent = document.createElement('div');
    exportModalContent.style.backgroundColor = 'white';
    exportModalContent.style.padding = '30px';
    exportModalContent.style.borderRadius = '10px';
    exportModalContent.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
    exportModalContent.style.width = '400px';
    exportModalContent.style.maxWidth = '90%';
    
    exportModalContent.innerHTML = `
        <h3 style="margin-top: 0; font-family: Arial, sans-serif;">Export Options</h3>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold; font-family: Arial, sans-serif;">
                <input type="checkbox" id="exportUsePascalCase" checked style="margin-right: 8px;">
                Use PascalCase filenames
            </label>
        </div>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold; font-family: Arial, sans-serif;">
                <input type="checkbox" id="exportUsePNG" style="margin-right: 8px;">
                Export as PNG (higher quality)
            </label>
            <small style="color: #666; display: block; margin-top: 5px; font-family: Arial, sans-serif;">
                Unchecked = JPG (smaller files, recommended)
            </small>
        </div>
        
        <div style="margin-bottom: 20px;">
            <strong style="display: block; margin-bottom: 10px; font-family: Arial, sans-serif;">Card Size:</strong>
            <select id="exportSizeSelect" style="width: 100%; padding: 8px; font-size: 16px; font-family: Arial, sans-serif;">
                <option value="lackey">LackeyCCG (750x1050 px)</option>
                <option value="digital">Digital (214x308 px)</option>
                <option value="highres">High Res (1500x2100 px)</option>
            </select>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 25px;">
            <button id="exportCancelBtn" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">
                Cancel
            </button>
            <button id="exportConfirmBtn" style="padding: 10px 20px; background: #20c997; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Arial, sans-serif;">
                Start Export
            </button>
        </div>
    `;
    
    exportModal.appendChild(exportModalContent);
    document.body.appendChild(exportModal);
    
    return new Promise((resolve) => {
        const cancelBtn = document.getElementById('exportCancelBtn');
        const confirmBtn = document.getElementById('exportConfirmBtn');
        
        cancelBtn.onclick = () => {
            document.body.removeChild(exportModal);
            resolve();
        };
        
        confirmBtn.onclick = async () => {
            const usePascalCase = document.getElementById('exportUsePascalCase').checked;
            const usePNG = document.getElementById('exportUsePNG').checked;
            const exportSize = document.getElementById('exportSizeSelect').value;
            
            document.body.removeChild(exportModal);
            
            const exportOptions = {
                usePascalCase,
                usePNG,
                size: exportSize
            };
            
            await exportSingleZip(allCards, 'AEW-Complete-Set.zip', exportOptions);
            resolve();
        };
    });
}

// SIMPLIFIED processSingleCard - FIXED VERSION
async function processSingleCard(card, options) {
    console.log(`Processing card: ${card.title}, size: ${options.size}`);
    
    // Determine output dimensions
    let outputWidth, outputHeight;
    if (options.size === 'lackey') {
        outputWidth = 750;
        outputHeight = 1050;
    } else if (options.size === 'highres') {
        outputWidth = 1500;
        outputHeight = 2100;
    } else { // digital
        outputWidth = 214;
        outputHeight = 308;
    }
    
    // Create a temporary div for the card
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = `${outputWidth}px`;
    tempDiv.style.height = `${outputHeight}px`;
    tempDiv.style.overflow = 'visible';
    
    // Generate card HTML with VERY simple styling
    const cardHTML = `
        <div style="
            width: ${outputWidth}px;
            height: ${outputHeight}px;
            background-color: white;
            border: 2px solid black;
            border-radius: 10px;
            padding: 15px;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            color: black;
            position: relative;
        ">
            <!-- Title -->
            <div style="
                font-size: ${outputWidth <= 300 ? '14px' : '32px'};
                font-weight: bold;
                text-align: center;
                margin-bottom: 10px;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
            ">
                ${card.title}
            </div>
            
            <!-- Stats -->
            <div style="
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: ${outputWidth <= 300 ? '12px' : '24px'};
            ">
                <div>
                    <div>D: ${card.damage ?? '–'}</div>
                    <div>M: ${card.momentum ?? '–'}</div>
                </div>
                <div>C: ${card.cost ?? '–'}</div>
            </div>
            
            <!-- Art area -->
            <div style="
                height: ${outputHeight * 0.3}px;
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 10px;
                font-style: italic;
                color: #666;
                font-size: ${outputWidth <= 300 ? '12px' : '20px'};
            ">
                ${card.card_type}
            </div>
            
            <!-- Text box -->
            <div style="
                background-color: #f8f8f8;
                border: 1px solid #ccc;
                border-radius: 5px;
                padding: 10px;
                height: ${outputHeight * 0.4}px;
                overflow-y: auto;
                font-size: ${outputWidth <= 300 ? '10px' : '18px'};
                line-height: 1.3;
            ">
                ${card.text_box?.raw_text || ''}
            </div>
        </div>
    `;
    
    tempDiv.innerHTML = cardHTML;
    document.body.appendChild(tempDiv);
    
    try {
        // VERY SIMPLE html2canvas options
        const canvas = await html2canvas(tempDiv.firstElementChild, {
            width: outputWidth,
            height: outputHeight,
            scale: 1,
            backgroundColor: 'white',
            logging: true, // Enable logging to see errors
            useCORS: false,
            allowTaint: false,
            foreignObjectRendering: false,
            imageTimeout: 10000,
            removeContainer: false
        });
        
        console.log(`Canvas created: ${canvas.width}x${canvas.height}`);
        
        // Convert to blob
        const blob = await new Promise((resolve) => {
            if (options.usePNG) {
                canvas.toBlob(resolve, 'image/png', 1.0);
            } else {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            }
        });
        
        if (!blob) {
            throw new Error('Failed to create image blob');
        }
        
        const arrayBuffer = await blob.arrayBuffer();
        document.body.removeChild(tempDiv);
        
        return {
            arrayBuffer,
            width: outputWidth,
            height: outputHeight,
            format: options.usePNG ? 'png' : 'jpg'
        };
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (tempDiv.parentNode) document.body.removeChild(tempDiv);
        throw error;
    }
}

async function exportSingleZip(cards, zipName, options = {}) {
    const defaultOptions = {
        usePascalCase: false,
        usePNG: false,
        size: 'lackey'
    };
    options = { ...defaultOptions, ...options };
    
    const sizeNames = {
        'lackey': '750x1050',
        'digital': '214x308',
        'highres': '1500x2100'
    };
    
    const sizeDescription = sizeNames[options.size] || options.size;
    const formatDescription = options.usePNG ? 'PNG' : 'JPG';
    
    if (!confirm(`Export ${cards.length} cards at ${sizeDescription} in ${formatDescription} format? This may take a few minutes.`)) {
        return;
    }
    
    const JSZip = await loadJSZip();
    
    try {
        // Progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.id = 'exportProgress';
        progressDiv.style.position = 'fixed';
        progressDiv.style.top = '50%';
        progressDiv.style.left = '50%';
        progressDiv.style.transform = 'translate(-50%, -50%)';
        progressDiv.style.backgroundColor = 'white';
        progressDiv.style.padding = '30px';
        progressDiv.style.border = '3px solid #000';
        progressDiv.style.borderRadius = '10px';
        progressDiv.style.zIndex = '9999';
        progressDiv.style.boxShadow = '0 0 30px rgba(0,0,0,0.5)';
        progressDiv.style.minWidth = '300px';
        progressDiv.style.textAlign = 'center';
        progressDiv.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(progressDiv);
        
        const zip = new JSZip();
        let completed = 0;
        let failed = 0;
        
        const updateProgress = () => {
            progressDiv.innerHTML = `
                <h3 style="margin-top: 0;">Exporting Cards</h3>
                <p>${completed + failed} of ${cards.length}</p>
                <div style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; margin: 15px 0;">
                    <div style="width: ${((completed + failed) / cards.length) * 100}%; height: 100%; background: #007bff; border-radius: 10px;"></div>
                </div>
                <p style="font-size: 0.9em; color: #666;">
                    ${completed} successful, ${failed} failed
                </p>
                <button id="cancelExport" style="margin-top: 15px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            `;
            
            document.getElementById('cancelExport').onclick = () => {
                document.body.removeChild(progressDiv);
                throw new Error('Export cancelled');
            };
        };
        
        updateProgress();
        
        // Process cards in batches to avoid memory issues
        const BATCH_SIZE = 5;
        for (let i = 0; i < cards.length; i += BATCH_SIZE) {
            const batch = cards.slice(i, i + BATCH_SIZE);
            const promises = batch.map(card => 
                processSingleCard(card, options).catch(error => {
                    console.error(`Failed ${card.title}:`, error);
                    failed++;
                    return null;
                })
            );
            
            const results = await Promise.all(promises);
            
            for (const result of results) {
                if (result) {
                    const fileExtension = options.usePNG ? '.png' : '.jpg';
                    const fileName = getCleanFileName(result.card?.title || 'Card', result.card?.card_type, options.usePascalCase) + fileExtension;
                    zip.file(fileName, result.arrayBuffer);
                    completed++;
                }
            }
            
            updateProgress();
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay between batches
        }
        
        if (completed === 0) {
            throw new Error('No cards were successfully generated');
        }
        
        progressDiv.innerHTML = `
            <h3 style="margin-top: 0;">Creating ZIP File</h3>
            <p>Compressing ${completed} images...</p>
            <div class="spinner" style="border: 4px solid #f3f3f0; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
        
        const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE'
        });
        
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        
        document.body.removeChild(progressDiv);
        document.head.removeChild(style);
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        
        alert(`Exported ${completed} cards successfully! ${failed > 0 ? `(${failed} failed)` : ''}`);
        
    } catch (error) {
        const progressDiv = document.getElementById('exportProgress');
        if (progressDiv && progressDiv.parentNode) {
            document.body.removeChild(progressDiv);
        }
        
        if (error.message !== 'Export cancelled') {
            alert(`Export failed: ${error.message}`);
        }
    }
}

// Keep other functions but they won't be used in this simplified version
export async function exportAllCardsAsImagesFallback(options = {}) {
    alert("Fallback export not available in simplified version. Use the main export function.");
}
