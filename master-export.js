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
    exportModalContent.style.width = '500px';
    exportModalContent.style.maxWidth = '90%';
    exportModalContent.style.maxHeight = '90vh';
    exportModalContent.style.overflowY = 'auto';
    
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
        
        <div style="margin-bottom: 20px;">
            <strong style="display: block; margin-bottom: 10px;">Card Size:</strong>
            <select id="exportSizeSelect" style="width: 100%; padding: 8px; font-size: 16px;">
                <option value="lackey">LackeyCCG/Tabletop Size (428x616 px) - High Quality</option>
                <option value="digital">Digital Size (214x308 px) - Standard</option>
                <option value="highres">High Resolution (750x1050 px) - For printing</option>
                <option value="printsingle">Print Sheets - Individual cards for cutting</option>
                <option value="printmulti">Print Sheets - 9 cards per page</option>
            </select>
            <small style="color: #666; display: block; margin-top: 5px;">
                <strong>LackeyCCG:</strong> High quality 428x616 (2x scale for readability)<br>
                <strong>Digital:</strong> Standard 214x308 for virtual tabletops<br>
                <strong>High Res:</strong> Best quality for printing<br>
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
                <option value="2">High Quality (Render at 2x then scale down)</option>
                <option value="1">Standard (Render at native size)</option>
                <option value="3">Ultra Quality (Render at 3x then scale down)</option>
            </select>
            <small style="color: #666; display: block; margin-top: 5px;">
                Higher quality = better text readability but longer processing time
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

async function exportSingleZip(cards, zipName, options = {}) {
    const defaultOptions = {
        usePascalCase: false,
        size: 'digital',
        renderQuality: 2,
        includeCutGuides: false,
        includeBleed: false,
        includeBacks: false
    };
    options = { ...defaultOptions, ...options };
    
    if (!confirm(`This will generate a single ZIP file with ${cards.length} card images. This may take several minutes. Continue?`)) {
        return;
    }
    
    // Load JSZip
    const JSZip = await loadJSZip();
    
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${750 * options.renderQuality}px`; // Scale container for high quality
    tempContainer.style.height = `${1050 * options.renderQuality}px`;
    document.body.appendChild(tempContainer);
    
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
                    ${options.renderQuality > 1 ? `<br><small>Rendering at ${options.renderQuality}x quality for better readability</small>` : ''}
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
        
        // Process based on size option
        if (options.size === 'printsingle') {
            await exportPrintSheetsSingle(zip, cards, tempContainer, options, updateProgress);
            completed = cards.length;
        } else if (options.size === 'printmulti') {
            await exportPrintSheetsMulti(zip, cards, tempContainer, options, updateProgress);
            completed = cards.length;
        } else {
            // Process individual cards
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                
                try {
                    console.log(`Processing card ${i + 1}: ${card.title} at ${options.renderQuality}x quality`);
                    
                    const result = await processSingleCard(card, tempContainer, options);
                    
                    if (result) {
                        const fileName = getCleanFileName(card.title, options.usePascalCase) + '.jpg';
                        zip.file(fileName, result.arrayBuffer);
                        console.log(`Added ${fileName} to ZIP (${result.width}x${result.height})`);
                        completed++;
                    }
                    
                } catch (error) {
                    console.error(`Error rendering card "${card.title}":`, error);
                    failed++;
                }
                
                updateProgress();
                await new Promise(resolve => setTimeout(resolve, 100));
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
            let sizeInfo = '';
            if (options.size === 'lackey') sizeInfo = ' (428x616 px) - High Quality for LackeyCCG';
            else if (options.size === 'digital') sizeInfo = ' (214x308 px)';
            else if (options.size === 'highres') sizeInfo = ' (750x1050 px)';
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
        if (tempContainer.parentNode) {
            document.body.removeChild(tempContainer);
        }
        
        if (error.message !== 'Export cancelled by user') {
            alert(`Error: ${error.message}\n\nCheck console for details.`);
        }
    }
}

async function processSingleCard(card, tempContainer, options) {
    // Determine output dimensions
    let outputWidth, outputHeight;
    if (options.size === 'lackey') {
        outputWidth = 428;   // 2x digital size for better readability
        outputHeight = 616;  // 2x digital size for better readability
    } else if (options.size === 'highres') {
        outputWidth = 750;
        outputHeight = 1050;
    } else { // digital
        outputWidth = 214;
        outputHeight = 308;
    }
    
    // Render scale - for Lackey we render at even higher resolution then scale down
    let renderScale = options.renderQuality;
    
    // If output is for Lackey, we might want even higher quality
    if (options.size === 'lackey' && renderScale < 3) {
        renderScale = 3; // Minimum 3x for Lackey for best quality
    }
    
    const renderWidth = 750 * renderScale;
    const renderHeight = 1050 * renderScale;
    
    console.log(`Rendering ${card.title} at ${renderWidth}x${renderHeight} (${renderScale}x), scaling to ${outputWidth}x${outputHeight}`);
    
    // Generate the card HTML at high resolution
    const cardHTML = await generatePlaytestCardHTML(card, tempContainer);
    tempContainer.innerHTML = cardHTML;
    const cardElement = tempContainer.firstElementChild;
    
    if (!cardElement) {
        throw new Error('Failed to create card element');
    }
    
    // Create canvas for final output
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = outputWidth;
    finalCanvas.height = outputHeight;
    const finalCtx = finalCanvas.getContext('2d');
    
    // Set white background with anti-aliasing
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // Create a temporary canvas at high resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = renderWidth;
    tempCanvas.height = renderHeight;
    
    // Configure html2canvas for high quality rendering
    const html2canvasOptions = {
        canvas: tempCanvas,
        width: renderWidth,
        height: renderHeight,
        scale: 1,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true,
        // Quality settings
        imageTimeout: 0,
        removeContainer: true,
        // Anti-aliasing
        onclone: (clonedDoc) => {
            // Improve text rendering in cloned document
            const style = clonedDoc.createElement('style');
            style.textContent = `
                * {
                    text-rendering: optimizeLegibility !important;
                    -webkit-font-smoothing: antialiased !important;
                    -moz-osx-font-smoothing: grayscale !important;
                }
            `;
            clonedDoc.head.appendChild(style);
        }
    };
    
    // Render card to temporary canvas at high resolution
    await html2canvas(cardElement, html2canvasOptions);
    
    // High-quality scaling using image smoothing
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    
    // Draw with high-quality scaling
    finalCtx.drawImage(
        tempCanvas, 
        0, 0, tempCanvas.width, tempCanvas.height, // Source: full high-res
        0, 0, outputWidth, outputHeight // Destination: scaled to final size
    );
    
    // For Lackey size, we can add a slight sharpening effect
    if (options.size === 'lackey' && renderScale >= 3) {
        // Apply a subtle sharpen filter
        const imageData = finalCtx.getImageData(0, 0, outputWidth, outputHeight);
        sharpenFilter(imageData, 0.5);
        finalCtx.putImageData(imageData, 0, 0);
    }
    
    // Convert to blob with high quality
    const blob = await new Promise(resolve => {
        finalCanvas.toBlob(resolve, 'image/jpeg', 0.97); // Higher quality JPG
    });
    
    if (!blob) {
        throw new Error('Failed to create image blob');
    }
    
    // Convert blob to array buffer for ZIP
    const arrayBuffer = await blob.arrayBuffer();
    
    return {
        arrayBuffer,
        width: outputWidth,
        height: outputHeight
    };
}

// Simple sharpen filter for better text clarity
function sharpenFilter(imageData, strength = 0.5) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    
    // Simple convolution kernel for sharpening
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) { // RGB channels only
                let sum = 0;
                let kIndex = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += tempData[pixelIndex] * kernel[kIndex];
                        kIndex++;
                    }
                }
                
                const pixelIndex = (y * width + x) * 4 + c;
                const original = tempData[pixelIndex];
                const sharpened = original + (sum - original) * strength;
                data[pixelIndex] = Math.max(0, Math.min(255, sharpened));
            }
        }
    }
    
    return imageData;
}

async function exportPrintSheetsSingle(zip, cards, tempContainer, options, updateProgress) {
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
                const result = await processSingleCard(card, tempContainer, { ...options, size: 'highres' });
                
                // Create temporary canvas for the card
                const cardCanvas = document.createElement('canvas');
                cardCanvas.width = result.width;
                cardCanvas.height = result.height;
                const cardCtx = cardCanvas.getContext('2d');
                
                // Draw the card image
                const img = new Image();
                const blob = new Blob([result.arrayBuffer], { type: 'image/jpeg' });
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
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const pageNum = page + 1;
            zip.file(`Print Sheet ${pageNum}.jpg`, arrayBuffer);
        }
    }
}

async function exportPrintSheetsMulti(zip, cards, tempContainer, options, updateProgress) {
    const CARDS_PER_PAGE = 9; // 3x3 grid
    const CARDS_PER_ROW = 3;
    const BLEED_MM = options.includeBleed ? 3 : 0;
    const CUT_GUIDE_WIDTH = 2;
    const GUTTER_MM = 5; // Space between cards
    
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
    
    // Calculate layout
    const GUTTER_PX = Math.round(GUTTER_MM * DPI / 25.4);
    const totalWidthNeeded = CARDS_PER_ROW * CARD_WIDTH_PX + (CARDS_PER_ROW - 1) * GUTTER_PX;
    const startX = Math.round((PAPER_WIDTH_PX - totalWidthNeeded) / 2);
    
    // Calculate rows (3 rows for 9 cards)
    const rows = Math.ceil(CARDS_PER_PAGE / CARDS_PER_ROW);
    const totalHeightNeeded = rows * CARD_HEIGHT_PX + (rows - 1) * GUTTER_PX;
    const startY = Math.round((PAPER_HEIGHT_PX - totalHeightNeeded) / 2);
    
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
                // Calculate position in grid
                const row = Math.floor(i / CARDS_PER_ROW);
                const col = i % CARDS_PER_ROW;
                
                const x = startX + col * (CARD_WIDTH_PX + GUTTER_PX);
                const y = startY + row * (CARD_HEIGHT_PX + GUTTER_PX);
                
                // Generate card at high resolution
                const result = await processSingleCard(card, tempContainer, { ...options, size: 'highres' });
                
                // Create temporary canvas for the card
                const cardCanvas = document.createElement('canvas');
                cardCanvas.width = result.width;
                cardCanvas.height = result.height;
                const cardCtx = cardCanvas.getContext('2d');
                
                // Draw the card image
                const img = new Image();
                const blob = new Blob([result.arrayBuffer], { type: 'image/jpeg' });
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
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
        
        if (blob) {
            const arrayBuffer = await blob.arrayBuffer();
            const pageNum = page + 1;
            zip.file(`Print Sheet ${pageNum} (${cardsOnThisPage.length} cards).jpg`, arrayBuffer);
        }
    }
}

async function exportByCategorySeparate(allCards, options = {}) {
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
        size: 'digital',
        renderQuality: 2
    };
    options = { ...defaultOptions, ...options };
    
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
    tempContainer.style.width = `${750 * options.renderQuality}px`;
    tempContainer.style.height = `${1050 * options.renderQuality}px`;
    document.body.appendChild(tempContainer);
    
    // Card dimensions for export
    let CARD_WIDTH, CARD_HEIGHT;
    if (options.size === 'lackey') {
        CARD_WIDTH = 428;
        CARD_HEIGHT = 616;
    } else if (options.size === 'highres') {
        CARD_WIDTH = 750;
        CARD_HEIGHT = 1050;
    } else {
        CARD_WIDTH = 214;
        CARD_HEIGHT = 308;
    }
    
    // Process cards one by one
    for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        
        try {
            const result = await processSingleCard(card, tempContainer, options);
            
            // Create download link
            const blob = new Blob([result.arrayBuffer], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Use selected filename format
            const fileName = getCleanFileName(card.title, options.usePascalCase) + '.jpg';
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
    
    document.body.removeChild(tempContainer);
    alert(`Downloaded ${allCards.length} card images (${CARD_WIDTH}x${CARD_HEIGHT})!`);
}
