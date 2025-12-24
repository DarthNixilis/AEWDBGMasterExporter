// master-export.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

// Helper function to create clean filename with Regular Case
function getCleanFileName(cardTitle, usePascalCase = false) {
    if (usePascalCase) {
        return toPascalCase(cardTitle);
    }
    
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
    
    // Create modal for export options
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
    
    // Build modal content
    exportModalContent.innerHTML = `
        <h3 style="margin-top: 0;">Export Options</h3>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                <input type="checkbox" id="exportUsePascalCase" style="margin-right: 8px;">
                Use PascalCase filenames (e.g., "AmazingDisplayOfPower.jpg")
            </label>
            <small style="color: #666; display: block; margin-top: 5px;">
                Unchecked: Regular Case with spaces (e.g., "Amazing Display Of Power.jpg")
            </small>
        </div>
        
        <div style="margin-bottom: 20px;">
            <strong style="display: block; margin-bottom: 10px;">Export Type:</strong>
            <select id="exportTypeSelect" style="width: 100%; padding: 8px; font-size: 16px;">
                <option value="1">Single ZIP with all cards</option>
                <option value="2">Separate ZIPs by card type</option>
                <option value="3">Single ZIP by selected type</option>
            </select>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 25px;">
            <button id="exportCancelBtn" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Cancel
            </button>
            <button id="exportConfirmBtn" style="padding: 10px 20px; background: #20c997; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Start Export
            </button>
        </div>
    `;
    
    exportModal.appendChild(exportModalContent);
    document.body.appendChild(exportModal);
    
    // Wait for user selection
    return new Promise((resolve) => {
        const cancelBtn = document.getElementById('exportCancelBtn');
        const confirmBtn = document.getElementById('exportConfirmBtn');
        
        cancelBtn.onclick = () => {
            document.body.removeChild(exportModal);
            resolve();
        };
        
        confirmBtn.onclick = async () => {
            const usePascalCase = document.getElementById('exportUsePascalCase').checked;
            const exportType = document.getElementById('exportTypeSelect').value;
            document.body.removeChild(exportModal);
            
            if (exportType === '1') {
                await exportSingleZip(allCards, 'AEW-Complete-Set.zip', usePascalCase);
            } else if (exportType === '2') {
                await exportByCategorySeparate(allCards, usePascalCase);
            } else if (exportType === '3') {
                await exportByCategorySingle(allCards, usePascalCase);
            }
            resolve();
        };
    });
}

async function exportSingleZip(cards, zipName, usePascalCase = false) {
    if (!confirm(`This will generate a single ZIP file with ${cards.length} card images. This may take several minutes. Continue?`)) {
        return;
    }
    
    // Load JSZip
    const JSZip = await loadJSZip();
    
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '750px';
    tempContainer.style.height = '1050px';
    document.body.appendChild(tempContainer);
    
    // Card dimensions for export (214x308 pixels)
    const CARD_WIDTH = 214;
    const CARD_HEIGHT = 308;
    
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
                
                // Generate the card HTML at original size (750x1050)
                const cardHTML = await generatePlaytestCardHTML(card, tempContainer);
                tempContainer.innerHTML = cardHTML;
                const cardElement = tempContainer.firstElementChild;
                
                if (!cardElement) {
                    throw new Error('Failed to create card element');
                }
                
                // Create canvas for final output (214x308)
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = CARD_WIDTH;
                finalCanvas.height = CARD_HEIGHT;
                const finalCtx = finalCanvas.getContext('2d');
                
                // Set white background
                finalCtx.fillStyle = 'white';
                finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                
                // Create a temporary canvas at original size
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 750;
                tempCanvas.height = 1050;
                
                // Render card to temporary canvas at original size
                console.log(`Rendering ${card.title} to canvas...`);
                await html2canvas(cardElement, {
                    canvas: tempCanvas,
                    width: 750,
                    height: 1050,
                    scale: 1,
                    backgroundColor: null,
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                });
                
                // DEBUG: Check dimensions
                console.log(`Source canvas: ${tempCanvas.width}x${tempCanvas.height}`);
                console.log(`Target canvas: ${finalCanvas.width}x${finalCanvas.height}`);
                
                // Save the current context state
                finalCtx.save();
                
                // Scale the context to fit the entire image
                finalCtx.scale(CARD_WIDTH / 750, CARD_HEIGHT / 1050);
                
                // Draw the entire canvas scaled down
                finalCtx.drawImage(tempCanvas, 0, 0);
                
                // Restore the context state
                finalCtx.restore();
                
                // Convert to blob
                const blob = await new Promise(resolve => {
                    finalCanvas.toBlob(resolve, 'image/jpeg', 0.95);
                });
                
                if (!blob) {
                    throw new Error('Failed to create image blob');
                }
                
                // Convert blob to array buffer for ZIP
                const arrayBuffer = await blob.arrayBuffer();
                
                // Create filename based on selected format
                const fileName = getCleanFileName(card.title, usePascalCase) + '.jpg';
                
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

async function exportByCategorySeparate(allCards, usePascalCase = false) {
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
                await exportSingleZip(cards, `AEW ${type} Cards.zip`, usePascalCase);
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    alert('All category ZIP files have been generated!');
}

async function exportByCategorySingle(allCards, usePascalCase = false) {
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
        const zipName = usePascalCase ? 
            `AEW${selectedTypeName.replace(/\s+/g, '')}Cards.zip` : 
            `AEW ${selectedTypeName} Cards.zip`;
        await exportSingleZip(cards, zipName, usePascalCase);
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
export async function exportAllCardsAsImagesFallback(usePascalCase = false) {
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
    tempContainer.style.width = '750px';
    tempContainer.style.height = '1050px';
    document.body.appendChild(tempContainer);
    
    // Card dimensions for export
    const CARD_WIDTH = 214;
    const CARD_HEIGHT = 308;
    
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
            
            // Set white background
            finalCtx.fillStyle = 'white';
            finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            // Create a temporary canvas at original size
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 750;
            tempCanvas.height = 1050;
            
            // Render card to temporary canvas
            await html2canvas(cardElement, {
                canvas: tempCanvas,
                width: 750,
                height: 1050,
                scale: 1,
                backgroundColor: null,
                logging: false,
                useCORS: true,
                allowTaint: true
            });
            
            // Scale the entire image down
            finalCtx.save();
            finalCtx.scale(CARD_WIDTH / 750, CARD_HEIGHT / 1050);
            finalCtx.drawImage(tempCanvas, 0, 0);
            finalCtx.restore();
            
            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
            const a = document.createElement('a');
            a.href = dataUrl;
            
            // Use selected filename format
            const fileName = getCleanFileName(card.title, usePascalCase) + '.jpg';
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
