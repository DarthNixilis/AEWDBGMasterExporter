// master-export.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';

// Helper function to create clean filename with Regular Case
function getCleanFileName(cardTitle) {
    // Remove special characters but keep spaces
    const cleanTitle = cardTitle.replace(/[^a-zA-Z0-9\s]/g, '');
    
    // Convert to title case (capitalize first letter of each word)
    return cleanTitle
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Load JSZip dynamically
async function loadJSZip() {
    if (window.JSZip) {
        return window.JSZip;
    }
    
    // Try to load JSZip from CDN
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
    
    const option = prompt(
        "Choose export option:\n" +
        "1. Single ZIP with all cards\n" +
        "2. Separate ZIPs by card type\n" +
        "3. Single ZIP by selected type\n" +
        "Enter 1, 2, or 3:"
    );
    
    if (!option) return;
    
    if (option === '1') {
        await exportSingleZip(allCards, 'AEW-Complete-Set.zip');
    } else if (option === '2') {
        await exportByCategorySeparate(allCards);
    } else if (option === '3') {
        await exportByCategorySingle(allCards);
    } else {
        alert("Invalid option selected.");
    }
}

async function exportSingleZip(cards, zipName) {
    if (!confirm(`This will generate a single ZIP file with ${cards.length} card images. This may take several minutes. Continue?`)) {
        return;
    }
    
    // Load JSZip
    const JSZip = await loadJSZip();
    
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '214px';  // Updated to match final card width
    tempContainer.style.height = '308px'; // Updated to match final card height
    document.body.appendChild(tempContainer);
    
    // NEW: Card dimensions for export (214x308 pixels)
    const CARD_WIDTH = 214;
    const CARD_HEIGHT = 308;
    
    // For html2canvas, we need to render at a higher resolution then scale down
    const RENDER_SCALE = 2; // Render at 2x then scale down for better quality
    const RENDER_WIDTH = CARD_WIDTH * RENDER_SCALE;
    const RENDER_HEIGHT = CARD_HEIGHT * RENDER_SCALE;
    
    try {
        // Create progress indicator
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
        progressDiv.style.minWidth = '350px';
        progressDiv.style.textAlign = 'center';
        progressDiv.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(progressDiv);
        
        // Create ZIP file
        const zip = new JSZip();
        console.log("JSZip initialized");
        
        let completed = 0;
        let failed = 0;
        
        // Update progress function
        const updateProgress = () => {
            progressDiv.innerHTML = `
                <h3 style="margin-top: 0;">Generating Card Images</h3>
                <p><strong>Progress:</strong> ${completed + failed} of ${cards.length}</p>
                <p><strong>Successful:</strong> ${completed}</p>
                <p><strong>Failed:</strong> ${failed}</p>
                <div style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; margin: 15px 0;">
                    <div style="width: ${((completed + failed) / cards.length) * 100}%; height: 100%; background: #007bff; border-radius: 10px; transition: width 0.3s;"></div>
                </div>
                <p style="font-size: 0.9em; color: #666; margin-top: 10px;">
                    Please wait, this may take several minutes...
                </p>
                <button id="cancelExport" style="margin-top: 15px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            `;
            
            // Add cancel button handler
            const cancelBtn = document.getElementById('cancelExport');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    document.body.removeChild(progressDiv);
                    document.body.removeChild(tempContainer);
                    throw new Error('Export cancelled by user');
                };
            }
        };
        
        updateProgress();
        
        // Process cards one by one (more reliable than batches)
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            
            try {
                console.log(`Processing card ${i + 1}: ${card.title}`);
                
                // Generate the card HTML at the final size
                const cardHTML = await generatePlaytestCardHTML(card, tempContainer);
                tempContainer.innerHTML = cardHTML;
                const cardElement = tempContainer.firstElementChild;
                
                if (!cardElement) {
                    throw new Error('Failed to create card element');
                }
                
                // Create canvas for final output
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = CARD_WIDTH;
                finalCanvas.height = CARD_HEIGHT;
                const finalCtx = finalCanvas.getContext('2d');
                
                // Create a temporary high-res canvas for rendering
                const renderCanvas = document.createElement('canvas');
                renderCanvas.width = RENDER_WIDTH;
                renderCanvas.height = RENDER_HEIGHT;
                
                // Render card to high-res canvas
                console.log(`Rendering ${card.title} to canvas...`);
                const cardCanvas = await html2canvas(cardElement, {
                    width: RENDER_WIDTH,
                    height: RENDER_HEIGHT,
                    scale: 1,
                    backgroundColor: null,
                    logging: false,
                    useCORS: true
                });
                
                // Draw high-res image to final canvas (scaling down for better quality)
                finalCtx.drawImage(cardCanvas, 0, 0, RENDER_WIDTH, RENDER_HEIGHT, 0, 0, CARD_WIDTH, CARD_HEIGHT);
                
                // Convert to blob
                const blob = await new Promise(resolve => {
                    finalCanvas.toBlob(resolve, 'image/jpeg', 0.95);
                });
                
                if (!blob) {
                    throw new Error('Failed to create image blob');
                }
                
                // Convert blob to array buffer for ZIP
                const arrayBuffer = await blob.arrayBuffer();
                
                // Create Regular Case filename
                const fileName = getCleanFileName(card.title) + '.jpg';
                
                // Add to ZIP
                zip.file(fileName, arrayBuffer);
                console.log(`Added ${fileName} to ZIP (${CARD_WIDTH}x${CARD_HEIGHT})`);
                
                completed++;
                
            } catch (error) {
                console.error(`Error rendering card "${card.title}":`, error);
                failed++;
            }
            
            updateProgress();
            
            // Small delay to prevent UI freezing
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (completed === 0) {
            throw new Error('Failed to generate any card images');
        }
        
        // Generate ZIP file
        console.log("Generating ZIP file...");
        progressDiv.innerHTML = `
            <h3 style="margin-top: 0;">Creating ZIP File</h3>
            <p>Compressing ${completed} images...</p>
            <div class="spinner" style="border: 4px solid #f3f3f0; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto;"></div>
            <p style="font-size: 0.9em; color: #666;">Almost done...</p>
        `;
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Generate ZIP blob
        console.log("Starting ZIP generation...");
        const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });
        console.log("ZIP generated successfully");
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipName;
        
        // Clean up
        document.body.removeChild(progressDiv);
        document.body.removeChild(tempContainer);
        document.head.removeChild(style);
        
        // Trigger download
        console.log("Triggering download...");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL
        setTimeout(() => {
            URL.revokeObjectURL(url);
            console.log("URL revoked");
        }, 10000);
        
        // Show completion message
        setTimeout(() => {
            alert(`Successfully generated ${zipName} with ${completed} card images (${CARD_WIDTH}x${CARD_HEIGHT})! ${failed > 0 ? `(${failed} failed to generate)` : ''}`);
        }, 500);
        
    } catch (error) {
        console.error("Error in exportSingleZip:", error);
        
        // Cleanup
        const progressDiv = document.getElementById('exportProgress');
        if (progressDiv && progressDiv.parentNode) {
            document.body.removeChild(progressDiv);
        }
        if (tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
        }
        
        if (error.message !== 'Export cancelled by user') {
            alert(`Error: ${error.message}\n\nCheck console for details.`);
        }
    }
}

async function exportByCategorySeparate(allCards) {
    const cardsByType = groupCardsByType(allCards);
    const types = Object.keys(cardsByType).filter(type => cardsByType[type].length > 0);
    const totalCards = Object.values(cardsByType).reduce((sum, cards) => sum + cards.length, 0);
    
    if (!confirm(`This will generate ${types.length} separate ZIP files (${totalCards} total cards). This may take a while. Continue?`)) {
        return;
    }
    
    for (const type of types) {
        const cards = cardsByType[type];
        if (cards.length > 0) {
            if (confirm(`Generate ZIP for ${type} (${cards.length} cards)?`)) {
                await exportSingleZip(cards, `AEW ${type} Cards.zip`);
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    alert('All category ZIP files have been generated!');
}

async function exportByCategorySingle(allCards) {
    const cardsByType = groupCardsByType(allCards);
    const types = Object.keys(cardsByType).filter(type => cardsByType[type].length > 0);
    
    let typeList = '';
    types.forEach((type, i) => {
        typeList += `${i + 1}. ${type} (${cardsByType[type].length} cards)\n`;
    });
    
    const selectedType = prompt(
        `Select card type to export:\n${typeList}\nEnter number or type name:`
    );
    
    if (!selectedType) return;
    
    let typeIndex = parseInt(selectedType) - 1;
    let selectedTypeName = types[typeIndex] || selectedType;
    
    if (cardsByType[selectedTypeName] && cardsByType[selectedTypeName].length > 0) {
        const cards = cardsByType[selectedTypeName];
        await exportSingleZip(cards, `AEW ${selectedTypeName} Cards.zip`);
    } else {
        alert(`No cards found for type: ${selectedTypeName}`);
    }
}

function groupCardsByType(cards) {
    return {
        Wrestler: cards.filter(c => c.card_type === 'Wrestler'),
        Manager: cards.filter(c => c.card_type === 'Manager'),
        Action: cards.filter(c => c.card_type === 'Action'),
        Grapple: cards.filter(c => c.card_type === 'Grapple'),
        Strike: cards.filter(c => c.card_type === 'Strike'),
        Submission: cards.filter(c => c.card_type === 'Submission'),
        Response: cards.filter(c => c.card_type === 'Response'),
        // Future types (when added):
        Boon: cards.filter(c => c.card_type === 'Boon'),
        Injury: cards.filter(c => c.card_type === 'Injury'),
        'Call Name': cards.filter(c => c.card_type === 'Call Name'),
        Faction: cards.filter(c => c.card_type === 'Faction')
    };
}

// Simple fallback version without ZIP (one-by-one download)
export async function exportAllCardsAsImagesFallback() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found in the database.");
        return;
    }
    
    if (!confirm(`This will download ${allCards.length} individual image files. You'll need to approve each download. Continue?`)) {
        return;
    }
    
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '214px';  // Updated
    tempContainer.style.height = '308px'; // Updated
    document.body.appendChild(tempContainer);
    
    // Card dimensions for export
    const CARD_WIDTH = 214;
    const CARD_HEIGHT = 308;
    
    // For html2canvas, we need to render at a higher resolution then scale down
    const RENDER_SCALE = 2;
    const RENDER_WIDTH = CARD_WIDTH * RENDER_SCALE;
    const RENDER_HEIGHT = CARD_HEIGHT * RENDER_SCALE;
    
    // Process cards one by one
    for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        
        try {
            const cardHTML = await generatePlaytestCardHTML(card, tempContainer);
            tempContainer.innerHTML = cardHTML;
            const cardElement = tempContainer.firstElementChild;
            
            // Create canvas for final output
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = CARD_WIDTH;
            finalCanvas.height = CARD_HEIGHT;
            const finalCtx = finalCanvas.getContext('2d');
            
            // Render card to high-res canvas
            const cardCanvas = await html2canvas(cardElement, {
                width: RENDER_WIDTH,
                height: RENDER_HEIGHT,
                scale: 1,
                backgroundColor: null,
                logging: false,
                useCORS: true
            });
            
            // Draw high-res image to final canvas (scaling down)
            finalCtx.drawImage(cardCanvas, 0, 0, RENDER_WIDTH, RENDER_HEIGHT, 0, 0, CARD_WIDTH, CARD_HEIGHT);
            
            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
            const a = document.createElement('a');
            a.href = dataUrl;
            
            // Use Regular Case for filenames
            const fileName = getCleanFileName(card.title) + '.jpg';
            a.download = fileName;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`Failed to generate ${card.title}:`, error);
        }
    }
    
    document.body.removeChild(tempContainer);
    alert(`Downloaded ${allCards.length} card images (${CARD_WIDTH}x${CARD_HEIGHT})!`);
}
