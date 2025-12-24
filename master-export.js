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
        // Remove special characters but keep spaces
        cleanTitle = cardTitle.replace(/[^a-zA-Z0-9\s]/g, '');
        
        // Convert to title case (capitalize first letter of each word)
        cleanTitle = cleanTitle
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    
    // Add card type to filename for Wrestler and Manager cards
    if (cardType === 'Wrestler' || cardType === 'Manager') {
        if (usePascalCase) {
            return cleanTitle + cardType; // e.g., "AngeloParkerWrestler"
        } else {
            return cleanTitle + ' ' + cardType; // e.g., "Angelo Parker Wrestler"
        }
    }
    
    return cleanTitle;
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
    exportModalContent.style.width = '500px';
    exportModalContent.style.maxWidth = '90%';
    exportModalContent.style.maxHeight = '90vh';
    exportModalContent.style.overflowY = 'auto';
    
    // Build modal content - PascalCase checked by default
    exportModalContent.innerHTML = `
        <h3 style="margin-top: 0;">Export Options</h3>
        
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 10px; font-weight: bold;">
                <input type="checkbox" id="exportUsePascalCase" checked style="margin-right: 8px;">
                Use PascalCase filenames (e.g., "AmazingDisplayOfPower.jpg")
            </label>
            <small style="color: #666; display: block; margin-top: 5px;">
                Unchecked: Regular Case with spaces (e.g., "Amazing Display Of Power.jpg")<br>
                <strong>Note:</strong> Wrestler and Manager cards will have type appended (e.g., "Angelo Parker Wrestler.jpg")
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
        
        <div style="margin-bottom: 20px;">
            <strong style="display: block; margin-bottom: 10px;">Card Size:</strong>
            <select id="exportSizeSelect" style="width: 100%; padding: 8px; font-size: 16px;">
                <option value="lackey">LackeyCCG Size (750x1050 px) - Native size for best readability</option>
                <option value="lackey-hq">LackeyCCG High Quality (1125x1575 px) - 1.5x scale</option>
                <option value="digital">Digital Size (214x308 px) - Small for web</option>
                <option value="highres">High Resolution (1500x2100 px) - For printing</option>
                <option value="printsingle">Print Sheets - Individual cards for cutting</option>
                <option value="printmulti">Print Sheets - 9 cards per page</option>
            </select>
            <small style="color: #666; display: block; margin-top: 5px;">
                <strong>LackeyCCG:</strong> 750x1050 - Perfect for LackeyCCG tabletop<br>
                <strong>LackeyCCG HQ:</strong> 1125x1575 - Extra sharp for zooming<br>
                <strong>Digital:</strong> 214x308 - Small file size for web<br>
                <strong>High Res:</strong> 1500x2100 - Best quality for printing<br>
                <strong>Print Sheets:</strong> Optimized for physical print-and-play
            </small>
        </div>
        
        <div id="printOptions" style="margin-bottom: 20px; display: none;">
            <strong style="display: block; margin-bottom: 10px;">Print Options:</strong>
            <label style="display: block; margin-bottom: 8px;">
                <input type="checkbox" id="printCutGuides" checked style="margin-right: 8px;">
                Include cut guides (dotted lines)
            </label>
            <label style="display: block; margin-bottom: 8px;">
                <input type="checkbox" id="printBleed" style="margin-right: 8px;">
                Include bleed area (3mm extra for cutting)
            </label>
            <label style="display: block; margin-bottom: 8px;">
                <input type="checkbox" id="printBacks" style="margin-right: 8px;">
                Include card backs on separate pages
            </label>
        </div>
        
        <div style="margin-bottom: 20px;">
            <strong style="display: block; margin-bottom: 10px;">Render Quality:</strong>
            <select id="renderQuality" style="width: 100%; padding: 8px; font-size: 16px;">
                <option value="1">Standard Quality</option>
                <option value="2" selected>High Quality</option>
                <option value="3">Ultra Quality</option>
            </select>
            <small style="color: #666; display: block; margin-top: 5px;">
                Higher quality = better text readability but longer processing time<br>
                <strong>Recommended:</strong> High Quality (2x) for best results
            </small>
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
    
    // Show/hide print options based on size selection
    const sizeSelect = document.getElementById('exportSizeSelect');
    const printOptions = document.getElementById('printOptions');
    
    sizeSelect.addEventListener('change', function() {
        if (this.value === 'printsingle' || this.value === 'printmulti') {
            printOptions.style.display = 'block';
        } else {
            printOptions.style.display = 'none';
        }
    });
    
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
            const exportSize = document.getElementById('exportSizeSelect').value;
            const renderQuality = parseInt(document.getElementById('renderQuality').value);
            const includeCutGuides = document.getElementById('printCutGuides')?.checked || false;
            const includeBleed = document.getElementById('printBleed')?.checked || false;
            const includeBacks = document.getElementById('printBacks')?.checked || false;
            
            document.body.removeChild(exportModal);
            
            const exportOptions = {
                usePascalCase,
                size: exportSize,
                renderQuality,
                includeCutGuides,
                includeBleed,
                includeBacks
            };
            
            if (exportType === '1') {
                await exportSingleZip(allCards, 'AEW-Complete-Set.zip', exportOptions);
            } else if (exportType === '2') {
                await exportByCategorySeparate(allCards, exportOptions);
            } else if (exportType === '3') {
                await exportByCategorySingle(allCards, exportOptions);
            }
            resolve();
        };
    });
}

// FIXED VERSION - This should solve the black images issue
async function processSingleCard(card, tempContainer, options) {
    console.log(`Processing card: ${card.title}`);
    
    // Determine output dimensions
    let outputWidth, outputHeight;
    if (options.size === 'lackey') {
        outputWidth = 750;   // Native LackeyCCG size
        outputHeight = 1050; // Native LackeyCCG size
    } else if (options.size === 'lackey-hq') {
        outputWidth = 1125;   // 1.5x for extra quality
        outputHeight = 1575;  // 1.5x for extra quality
    } else if (options.size === 'highres') {
        outputWidth = 1500;   // 2x for printing
        outputHeight = 2100;  // 2x for printing
    } else { // digital
        outputWidth = 214;
        outputHeight = 308;
    }
    
    // Generate the card HTML
    const cardHTML = generatePlaytestCardHTML(card, tempContainer, outputWidth, outputHeight);
    
    // Create a temporary container for rendering
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.top = '0';
    renderContainer.style.left = '0';
    renderContainer.style.width = `${outputWidth}px`;
    renderContainer.style.height = `${outputHeight}px`;
    renderContainer.style.backgroundColor = 'white'; // CRITICAL: Set background color
    renderContainer.style.zIndex = '10000';
    renderContainer.style.visibility = 'hidden'; // Hide but still renderable
    renderContainer.innerHTML = cardHTML;
    document.body.appendChild(renderContainer);
    
    try {
        // Use html2canvas with FIXED options
        const canvas = await html2canvas(renderContainer.firstElementChild, {
            width: outputWidth,
            height: outputHeight,
            scale: 1,
            backgroundColor: 'white', // CRITICAL: Set background color
            logging: true, // Enable logging to see what's happening
            useCORS: true,
            allowTaint: true,
            removeContainer: false, // Don't remove container during processing
            // Force canvas creation with proper settings
            foreignObjectRendering: false,
            // Improve text rendering
            onclone: function(clonedDoc, element) {
                // Ensure white background on the element itself
                element.style.backgroundColor = 'white';
                element.style.color = 'black';
            }
        });
        
        console.log(`Canvas created for ${card.title}: ${canvas.width}x${canvas.height}`);
        
        // Check if canvas has content
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, 1, 1).data;
        console.log(`Pixel color at (0,0): R=${imageData[0]}, G=${imageData[1]}, B=${imageData[2]}, A=${imageData[3]}`);
        
        // Convert to blob
        const blob = await new Promise((resolve) => {
            if (options.size === 'lackey' || options.size === 'lackey-hq' || options.size === 'highres') {
                canvas.toBlob(resolve, 'image/png', 1.0);
            } else {
                canvas.toBlob(resolve, 'image/jpeg', 0.95);
            }
        });
        
        if (!blob) {
            throw new Error('Failed to create image blob');
        }
        
        // Convert blob to array buffer for ZIP
        const arrayBuffer = await blob.arrayBuffer();
        
        // Clean up
        document.body.removeChild(renderContainer);
        
        return {
            arrayBuffer,
            width: outputWidth,
            height: outputHeight
        };
        
    } catch (error) {
        console.error(`Error processing card "${card.title}":`, error);
        // Clean up on error
        if (renderContainer.parentNode) {
            document.body.removeChild(renderContainer);
        }
        throw error;
    }
}

async function exportSingleZip(cards, zipName, options = {}) {
    const defaultOptions = {
        usePascalCase: false,
        size: 'lackey',
        renderQuality: 2,
        includeCutGuides: false,
        includeBleed: false,
        includeBacks: false
    };
    options = { ...defaultOptions, ...options };
    
    const sizeNames = {
        'lackey': '750x1050',
        'lackey-hq': '1125x1575',
        'digital': '214x308',
        'highres': '1500x2100'
    };
    
    const sizeDescription = sizeNames[options.size] || options.size;
    
    if (!confirm(`This will generate a single ZIP file with ${cards.length} card images at ${sizeDescription} pixels. This may take several minutes. Continue?`)) {
        return;
    }
    
    // Load JSZip
    const JSZip = await loadJSZip();
    
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
        progressDiv.style.minWidth = '400px';
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
                    <br><small>Rendering at ${options.size} (${sizeDescription})</small>
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
                    throw new Error('Export cancelled by user');
                };
            }
        };
        
        updateProgress();
        
        // Process based on size option
        if (options.size === 'printsingle') {
            await exportPrintSheetsSingle(zip, cards, options, updateProgress);
            completed = cards.length;
        } else if (options.size === 'printmulti') {
            await exportPrintSheetsMulti(zip, cards, options, updateProgress);
            completed = cards.length;
        } else {
            // Process individual cards
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                
                try {
                    console.log(`Processing card ${i + 1}: ${card.title}`);
                    
                    const result = await processSingleCard(card, document.body, options);
                    
                    if (result) {
                        // Use the updated getCleanFileName function with card type
                        const fileName = getCleanFileName(card.title, card.card_type, options.usePascalCase) + 
                            ((options.size === 'lackey' || options.size === 'lackey-hq' || options.size === 'highres') ? '.png' : '.jpg');
                        zip.file(fileName, result.arrayBuffer);
                        console.log(`Added ${fileName} to ZIP (${result.width}x${result.height})`);
                        completed++;
                    }
                    
                } catch (error) {
                    console.error(`Error rendering card "${card.title}":`, error);
                    failed++;
                }
                
                updateProgress();
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between cards
            }
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
            let sizeInfo = '';
            if (options.size === 'lackey') sizeInfo = ' (750x1050 px) - Perfect for LackeyCCG';
            else if (options.size === 'lackey-hq') sizeInfo = ' (1125x1575 px) - High Quality for LackeyCCG';
            else if (options.size === 'digital') sizeInfo = ' (214x308 px)';
            else if (options.size === 'highres') sizeInfo = ' (1500x2100 px)';
            else if (options.size === 'printsingle') sizeInfo = ' - Print Sheets';
            else if (options.size === 'printmulti') sizeInfo = ' - Multi-card Sheets';
            
            alert(`Successfully generated ${zipName} with ${completed} card images${sizeInfo}! ${failed > 0 ? `(${failed} failed to generate)` : ''}`);
        }, 500);
        
    } catch (error) {
        console.error("Error in exportSingleZip:", error);
        
        // Cleanup
        const progressDiv = document.getElementById('exportProgress');
        if (progressDiv && progressDiv.parentNode) {
            document.body.removeChild(progressDiv);
        }
        
        if (error.message !== 'Export cancelled by user') {
            alert(`Error: ${error.message}\n\nCheck console for details.`);
        }
    }
}

async function exportPrintSheetsSingle(zip, cards, options, updateProgress) {
    const CARDS_PER_PAGE = 1;
    const BLEED_MM = options.includeBleed ? 3 : 0;
    const CUT_GUIDE_WIDTH = 2;
    
    // A4 paper size at 300 DPI
    const DPI = 300;
    const PAPER_WIDTH_MM = 210;
    const PAPER_HEIGHT_MM = 297;
    const PAPER_WIDTH_PX = Math.round(PAPER_WIDTH_MM * DPI / 25.4);
    const PAPER_HEIGHT_PX = Math.round(PAPER_HEIGHT_MM * DPI / 25.4);
    
    // Standard card size in mm (63x88)
    const CARD_WIDTH_MM = 63;
    const CARD_HEIGHT_MM = 88;
    const CARD_WIDTH_PX = Math.round((CARD_WIDTH_MM + BLEED_MM * 2) * DPI / 25.4);
    const CARD_HEIGHT_PX = Math.round((CARD_HEIGHT_MM + BLEED_MM * 2) * DPI / 25.4);
    
    // Center card on page
    const CARD_X = Math.round((PAPER_WIDTH_PX - CARD_WIDTH_PX) / 2);
    const CARD_Y = Math.round((PAPER_HEIGHT_PX - CARD_HEIGHT_PX) / 2);
    
    for (let page = 0; page < Math.ceil(cards.length / CARDS_PER_PAGE); page++) {
        const startIndex = page * CARDS_PER_PAGE;
        const endIndex = Math.min(startIndex + CARDS_PER_PAGE, cards.length);
        const cardsOnThisPage = cards.slice(startIndex, endIndex);
        
        const canvas = document.createElement('canvas');
        canvas.width = PAPER_WIDTH_PX;
        canvas.height = PAPER_HEIGHT_PX;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            
            try {
                // Generate card at high resolution
                const result = await processSingleCard(card, document.body, { ...options, size: 'highres' });
                
                // Create temporary canvas for the card
                const cardCanvas = document.createElement('canvas');
                cardCanvas.width = result.width;
                cardCanvas.height = result.height;
                const cardCtx = cardCanvas.getContext('2d');
                
                // Draw the card image
                const img = new Image();
                const blob = new Blob([result.arrayBuffer], { type: 'image/png' });
                const url = URL.createObjectURL(blob);
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        cardCtx.drawImage(img, 0, 0);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.src = url;
                });
                
                // Enable high-quality scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw card onto sheet
                ctx.drawImage(cardCanvas, CARD_X, CARD_Y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
                
                // Add cut guides if requested
                if (options.includeCutGuides) {
                    ctx.strokeStyle = '#0000FF';
                    ctx.setLineDash([5, 5]);
                    ctx.lineWidth = CUT_GUIDE_WIDTH;
                    
                    // Outer cut line (with bleed)
                    ctx.strokeRect(
                        CARD_X - BLEED_MM * DPI / 25.4,
                        CARD_Y - BLEED_MM * DPI / 25.4,
                        CARD_WIDTH_PX + BLEED_MM * 2 * DPI / 25.4,
                        CARD_HEIGHT_PX + BLEED_MM * 2 * DPI / 25.4
                    );
                    
                    // Inner safe area (without bleed)
                    ctx.strokeStyle = '#FF0000';
                    ctx.strokeRect(CARD_X, CARD_Y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
                    
                    ctx.setLineDash([]);
                }
                
                updateProgress();
                
            } catch (error) {
                console.error(`Error rendering card "${card.title}":`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const pageNum = page + 1;
            const card = cardsOnThisPage[0];
            const fileName = getCleanFileName(card.title, card.card_type, options.usePascalCase) + ' Sheet.jpg';
            zip.file(fileName, arrayBuffer);
        }
    }
}

async function exportPrintSheetsMulti(zip, cards, options, updateProgress) {
    // Implementation similar to exportPrintSheetsSingle but with 9 cards per page
    const CARDS_PER_PAGE = 9;
    const BLEED_MM = options.includeBleed ? 3 : 0;
    const CUT_GUIDE_WIDTH = 2;
    
    // A4 paper size at 300 DPI
    const DPI = 300;
    const PAPER_WIDTH_MM = 210;
    const PAPER_HEIGHT_MM = 297;
    const PAPER_WIDTH_PX = Math.round(PAPER_WIDTH_MM * DPI / 25.4);
    const PAPER_HEIGHT_PX = Math.round(PAPER_HEIGHT_MM * DPI / 25.4);
    
    // Standard card size in mm (63x88)
    const CARD_WIDTH_MM = 63;
    const CARD_HEIGHT_MM = 88;
    const CARD_WIDTH_PX = Math.round((CARD_WIDTH_MM + BLEED_MM * 2) * DPI / 25.4);
    const CARD_HEIGHT_PX = Math.round((CARD_HEIGHT_MM + BLEED_MM * 2) * DPI / 25.4);
    
    // 3x3 grid layout
    const GRID_COLS = 3;
    const GRID_ROWS = 3;
    const HORIZONTAL_GAP = Math.round((PAPER_WIDTH_PX - (CARD_WIDTH_PX * GRID_COLS)) / (GRID_COLS + 1));
    const VERTICAL_GAP = Math.round((PAPER_HEIGHT_PX - (CARD_HEIGHT_PX * GRID_ROWS)) / (GRID_ROWS + 1));
    
    for (let page = 0; page < Math.ceil(cards.length / CARDS_PER_PAGE); page++) {
        const startIndex = page * CARDS_PER_PAGE;
        const endIndex = Math.min(startIndex + CARDS_PER_PAGE, cards.length);
        const cardsOnThisPage = cards.slice(startIndex, endIndex);
        
        const canvas = document.createElement('canvas');
        canvas.width = PAPER_WIDTH_PX;
        canvas.height = PAPER_HEIGHT_PX;
        const ctx = canvas.getContext('2d');
        
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            
            try {
                // Generate card at high resolution
                const result = await processSingleCard(card, document.body, { ...options, size: 'highres' });
                
                // Create temporary canvas for the card
                const cardCanvas = document.createElement('canvas');
                cardCanvas.width = result.width;
                cardCanvas.height = result.height;
                const cardCtx = cardCanvas.getContext('2d');
                
                // Draw the card image
                const img = new Image();
                const blob = new Blob([result.arrayBuffer], { type: 'image/png' });
                const url = URL.createObjectURL(blob);
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        cardCtx.drawImage(img, 0, 0);
                        URL.revokeObjectURL(url);
                        resolve();
                    };
                    img.src = url;
                });
                
                // Calculate position in grid
                const row = Math.floor(i / GRID_COLS);
                const col = i % GRID_COLS;
                const x = HORIZONTAL_GAP + col * (CARD_WIDTH_PX + HORIZONTAL_GAP);
                const y = VERTICAL_GAP + row * (CARD_HEIGHT_PX + VERTICAL_GAP);
                
                // Enable high-quality scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw card onto sheet
                ctx.drawImage(cardCanvas, x, y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
                
                // Add cut guides if requested
                if (options.includeCutGuides) {
                    ctx.strokeStyle = '#0000FF';
                    ctx.setLineDash([5, 5]);
                    ctx.lineWidth = CUT_GUIDE_WIDTH;
                    
                    // Outer cut line (with bleed)
                    ctx.strokeRect(
                        x - BLEED_MM * DPI / 25.4,
                        y - BLEED_MM * DPI / 25.4,
                        CARD_WIDTH_PX + BLEED_MM * 2 * DPI / 25.4,
                        CARD_HEIGHT_PX + BLEED_MM * 2 * DPI / 25.4
                    );
                    
                    // Inner safe area (without bleed)
                    ctx.strokeStyle = '#FF0000';
                    ctx.strokeRect(x, y, CARD_WIDTH_PX, CARD_HEIGHT_PX);
                    
                    ctx.setLineDash([]);
                }
                
                updateProgress();
                
            } catch (error) {
                console.error(`Error rendering card "${card.title}":`, error);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const pageNum = page + 1;
            const fileName = `Print Sheet ${pageNum}.jpg`;
            zip.file(fileName, arrayBuffer);
        }
    }
}

async function exportByCategorySeparate(allCards, options = {}) {
    const cardsByType = groupCardsByType(allCards);
    const types = Object.keys(cardsByType).filter(type => cardsByType[type].length > 0);
    const totalCards = Object.values(cardsByType).reduce((sum, cards) => sum + cards.length, 0);
    
    const sizeNames = {
        'lackey': '750x1050',
        'lackey-hq': '1125x1575',
        'digital': '214x308',
        'highres': '1500x2100'
    };
    
    const sizeDescription = sizeNames[options.size] || options.size;
    
    if (!confirm(`This will generate ${types.length} separate ZIP files (${totalCards} total cards at ${sizeDescription} pixels). This may take a while. Continue?`)) {
        return;
    }
    
    for (const type of types) {
        const cards = cardsByType[type];
        if (cards.length > 0) {
            if (confirm(`Generate ZIP for ${type} (${cards.length} cards at ${sizeDescription} pixels)?`)) {
                const zipName = options.usePascalCase ? 
                    `AEW${type.replace(/\s+/g, '')}Cards.zip` : 
                    `AEW ${type} Cards.zip`;
                await exportSingleZip(cards, zipName, options);
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    alert('All category ZIP files have been generated!');
}

async function exportByCategorySingle(allCards, options = {}) {
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
        const zipName = options.usePascalCase ? 
            `AEW${selectedTypeName.replace(/\s+/g, '')}Cards.zip` : 
            `AEW ${selectedTypeName} Cards.zip`;
        await exportSingleZip(cards, zipName, options);
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
export async function exportAllCardsAsImagesFallback(options = {}) {
    const defaultOptions = {
        usePascalCase: false,
        size: 'lackey',
        renderQuality: 2
    };
    options = { ...defaultOptions, ...options };
    
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found in the database.");
        return;
    }
    
    const sizeNames = {
        'lackey': '750x1050',
        'lackey-hq': '1125x1575',
        'digital': '214x308',
        'highres': '1500x2100'
    };
    
    const sizeDescription = sizeNames[options.size] || options.size;
    
    if (!confirm(`This will download ${allCards.length} individual image files at ${sizeDescription} pixels. You'll need to approve each download. Continue?`)) {
        return;
    }
    
    // Card dimensions for export
    let CARD_WIDTH, CARD_HEIGHT;
    if (options.size === 'lackey') {
        CARD_WIDTH = 750;
        CARD_HEIGHT = 1050;
    } else if (options.size === 'lackey-hq') {
        CARD_WIDTH = 1125;
        CARD_HEIGHT = 1575;
    } else if (options.size === 'highres') {
        CARD_WIDTH = 1500;
        CARD_HEIGHT = 2100;
    } else {
        CARD_WIDTH = 214;
        CARD_HEIGHT = 308;
    }
    
    // Process cards one by one
    for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        
        try {
            const result = await processSingleCard(card, document.body, options);
            
            // Create download link
            const blob = new Blob([result.arrayBuffer], { 
                type: (options.size === 'lackey' || options.size === 'lackey-hq' || options.size === 'highres') 
                    ? 'image/png' 
                    : 'image/jpeg' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Use selected filename format with card type
            const fileName = getCleanFileName(card.title, card.card_type, options.usePascalCase) + 
                ((options.size === 'lackey' || options.size === 'lackey-hq' || options.size === 'highres') ? '.png' : '.jpg');
            a.download = fileName;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            // Delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`Failed to generate ${card.title}:`, error);
        }
    }
    
    alert(`Downloaded ${allCards.length} card images (${CARD_WIDTH}x${CARD_HEIGHT})!`);
}
