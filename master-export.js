// master-export.js
import * as state from './config.js';
import { toPascalCase } from './config.js';

// Helper function to create clean filename
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
        return usePascalCase ? cleanTitle + cardType : cleanTitle + ' ' + cardType;
    }
    
    return cleanTitle;
}

// Load JSZip
async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    
    try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);
        
        return new Promise((resolve, reject) => {
            script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('JSZip failed'));
            script.onerror = () => reject(new Error('Failed to load JSZip'));
        });
    } catch (error) {
        throw new Error('JSZip not available: ' + error.message);
    }
}

// Create a modal dialog
function createModal(title, contentHTML, width = '400px') {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9998;display:flex;justify-content:center;align-items:center;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background:white;padding:30px;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,0.3);width:${width};max-width:90%;font-family:Arial,sans-serif;`;
    
    modalContent.innerHTML = `
        <h3 style="margin-top:0;">${title}</h3>
        ${contentHTML}
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    return {
        modal,
        modalContent,
        remove: () => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }
    };
}

export async function exportAllCardsAsImages() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found.");
        return;
    }
    
    // Main export options modal
    const modal = createModal('Export Options', `
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:10px;font-weight:bold;">
                <input type="checkbox" id="exportUsePascalCase" checked style="margin-right:8px;">
                PascalCase filenames
            </label>
        </div>
        
        <div style="margin-bottom:20px;">
            <label style="display:block;margin-bottom:10px;font-weight:bold;">
                <input type="checkbox" id="exportUsePNG" style="margin-right:8px;">
                PNG format (higher quality)
            </label>
            <small style="color:#666;">Unchecked = JPG (recommended)</small>
        </div>
        
        <div style="margin-bottom:20px;">
            <strong style="display:block;margin-bottom:10px;">Export Type:</strong>
            <select id="exportTypeSelect" style="width:100%;padding:8px;font-size:16px;">
                <option value="all">All Cards</option>
                <option value="bytype">By Card Type</option>
                <option value="singletype">Single Card Type</option>
            </select>
        </div>
        
        <div style="margin-bottom:20px;">
            <strong style="display:block;margin-bottom:10px;">Card Size:</strong>
            <select id="exportSizeSelect" style="width:100%;padding:8px;font-size:16px;">
                <option value="lackey">LackeyCCG (750x1050)</option>
                <option value="digital">Digital (214x308)</option>
                <option value="highres">High Res (1500x2100)</option>
            </select>
        </div>
        
        <div style="display:flex;justify-content:space-between;margin-top:25px;">
            <button id="exportCancelBtn" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">
                Cancel
            </button>
            <button id="exportConfirmBtn" style="padding:10px 20px;background:#20c997;color:white;border:none;border-radius:4px;cursor:pointer;">
                Export
            </button>
        </div>
    `);
    
    return new Promise((resolve) => {
        document.getElementById('exportCancelBtn').onclick = () => {
            modal.remove();
            resolve();
        };
        
        document.getElementById('exportConfirmBtn').onclick = async () => {
            const usePascalCase = document.getElementById('exportUsePascalCase').checked;
            const usePNG = document.getElementById('exportUsePNG').checked;
            const exportType = document.getElementById('exportTypeSelect').value;
            const exportSize = document.getElementById('exportSizeSelect').value;
            
            modal.remove();
            
            const exportOptions = {
                usePascalCase,
                usePNG,
                size: exportSize
            };
            
            try {
                if (exportType === 'all') {
                    await exportSingleZip(allCards, 'AEW-Complete-Set.zip', exportOptions);
                } else if (exportType === 'bytype') {
                    await exportByCategorySeparate(allCards, exportOptions);
                } else if (exportType === 'singletype') {
                    await exportByCategorySingle(allCards, exportOptions);
                }
            } catch (error) {
                alert(`Export failed: ${error.message}`);
            }
            
            resolve();
        };
    });
}

// IMPROVED RENDERER with better font scaling
function renderCardToCanvas(card, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Determine if this is the small digital size
    const isSmallSize = width === 214; // 214x308 for digital/Lackey
    
    if (isSmallSize) {
        // =================================================================
        // IMPROVED LAYOUT FOR 214x308 CARDS with better text fitting
        // =================================================================
        
        // 1. BORDER - THICK
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        
        // 2. MOMENTUM - BIGGEST AND FIRST (MOST IMPORTANT ON TABLE)
        const momentumY = 55;
        
        // Momentum - ABSOLUTELY HUGE (most important stat)
        if (card.momentum !== null && card.momentum !== undefined) {
            ctx.font = 'bold 68px Arial'; // MASSIVE - 68px!
            ctx.textAlign = 'center';
            ctx.fillStyle = 'black';
            ctx.fillText(`${card.momentum}`, width / 2, momentumY);
        }
        
        // 3. DAMAGE - BELOW MOMENTUM, LARGE
        const damageY = momentumY + 50;
        
        if (card.damage !== null && card.damage !== undefined) {
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`D: ${card.damage}`, width / 2, damageY);
        }
        
        // 4. COST - BELOW DAMAGE
        const costY = damageY + 40;
        
        if (card.cost !== null && card.cost !== undefined) {
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`C: ${card.cost}`, width / 2, costY);
        }
        
        // 5. TITLE - BELOW STATS, ADJUSTS TO FIT
        const titleY = costY + 40;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        
        // Dynamic title font scaling
        let title = card.title;
        let titleFontSize = 24; // Start with 24px
        let fits = false;
        
        while (!fits && titleFontSize >= 14) {
            ctx.font = `bold ${titleFontSize}px Arial`;
            const titleWidth = ctx.measureText(title).width;
            
            if (titleWidth <= (width - 20)) {
                fits = true;
            } else {
                // Try truncating if font is already small
                if (titleFontSize <= 16) {
                    if (title.length > 15) {
                        title = title.substring(0, 12) + '...';
                    }
                }
                titleFontSize -= 2;
            }
        }
        
        if (!fits) {
            // Last resort - very small font
            ctx.font = 'bold 14px Arial';
            if (title.length > 15) {
                title = title.substring(0, 12) + '...';
            }
        }
        
        ctx.fillText(title, width / 2, titleY);
        
        // 6. TARGET - SMALL, BELOW TITLE
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        const targetValue = targetTrait ? targetTrait.value : null;
        if (targetValue) {
            const targetY = titleY + 20;
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Target: ${targetValue}`, width / 2, targetY);
        }
        
        // 7. TYPE LINE - COLORED BANNER
        const typeY = titleY + (targetValue ? 40 : 25);
        ctx.textAlign = 'center';
        ctx.fillStyle = getTypeColor(card.card_type);
        ctx.fillRect(10, typeY, width - 20, 22);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(card.card_type.toUpperCase(), width / 2, typeY + 16);
        
        // 8. TEXT BOX - DYNAMIC FONT SIZING
        const textBoxY = typeY + 30;
        const textBoxHeight = height - textBoxY - 10;
        
        // Text box background
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(10, textBoxY, width - 20, textBoxHeight);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, textBoxY, width - 20, textBoxHeight);
        
        // Card text - DYNAMIC FONT SIZING
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        
        const text = card.text_box?.raw_text || '';
        if (text) {
            // Start with largest font and reduce until it fits
            let fontSize = 16;
            let textFits = false;
            let wrappedLines = [];
            
            while (!textFits && fontSize >= 8) {
                ctx.font = `${fontSize}px Arial`;
                wrappedLines = wrapTextForCenter(ctx, text, width - 30, fontSize);
                
                // Calculate total height needed
                const lineHeight = fontSize * 1.2;
                const totalHeight = wrappedLines.length * lineHeight;
                
                if (totalHeight <= textBoxHeight - 20) {
                    textFits = true;
                } else {
                    fontSize -= 1;
                }
            }
            
            // If still doesn't fit at minimum font, truncate
            if (!textFits && fontSize === 8) {
                ctx.font = '8px Arial';
                wrappedLines = wrapTextForCenter(ctx, text, width - 30, 8);
                // Take only lines that fit
                const maxLines = Math.floor((textBoxHeight - 20) / (8 * 1.2));
                if (wrappedLines.length > maxLines) {
                    wrappedLines = wrappedLines.slice(0, maxLines);
                    if (wrappedLines[maxLines - 1]) {
                        wrappedLines[maxLines - 1] = wrappedLines[maxLines - 1].substring(0, Math.max(0, wrappedLines[maxLines - 1].length - 3)) + '...';
                    }
                }
            }
            
            // Render lines
            const lineHeight = fontSize * 1.2;
            const startY = textBoxY + fontSize + 5;
            
            for (let i = 0; i < wrappedLines.length; i++) {
                ctx.fillText(wrappedLines[i], width / 2, startY + (i * lineHeight));
            }
        }
        
        // 9. WRESTLER/MANAGER BANNER if applicable
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
            ctx.fillStyle = card.card_type === 'Wrestler' ? '#333' : '#666';
            ctx.fillRect(0, 0, width, 15);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(card.card_type.toUpperCase(), width / 2, 11);
        }
        
    } else {
        // =================================================================
        // STANDARD LAYOUT FOR LARGER SIZES (750x1050 or 1500x2100)
        // =================================================================
        const scale = width / 750;
        
        // Draw border
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3 * scale;
        ctx.strokeRect(5 * scale, 5 * scale, width - 10 * scale, height - 10 * scale);
        
        // MOMENTUM FIRST - HUGE
        ctx.font = `bold ${96 * scale}px Arial`; // Massive for larger sizes
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        
        if (card.momentum !== null && card.momentum !== undefined) {
            ctx.fillText(`${card.momentum}`, width / 2, 120 * scale);
        }
        
        // Damage - below momentum
        if (card.damage !== null && card.damage !== undefined) {
            ctx.font = `bold ${48 * scale}px Arial`;
            ctx.fillText(`D: ${card.damage}`, width / 2, 180 * scale);
        }
        
        // Cost - below damage
        if (card.cost !== null && card.cost !== undefined) {
            ctx.font = `bold ${44 * scale}px Arial`;
            ctx.fillText(`C: ${card.cost}`, width / 2, 230 * scale);
        }
        
        // Title - dynamic scaling
        const titleY = 280 * scale;
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        
        let title = card.title;
        let titleFontSize = 64 * scale;
        let fits = false;
        
        while (!fits && titleFontSize >= 24 * scale) {
            ctx.font = `bold ${titleFontSize}px Arial`;
            const titleWidth = ctx.measureText(title).width;
            
            if (titleWidth <= (width - 40 * scale)) {
                fits = true;
            } else {
                titleFontSize -= 4 * scale;
            }
        }
        
        if (!fits) {
            ctx.font = `bold ${24 * scale}px Arial`;
            if (title.length > 20) {
                title = title.substring(0, 17) + '...';
            }
        }
        
        ctx.fillText(title, width / 2, titleY);
        
        // Target
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        const targetValue = targetTrait ? targetTrait.value : null;
        if (targetValue) {
            const targetY = titleY + 40 * scale;
            ctx.font = `bold ${28 * scale}px Arial`;
            ctx.fillText(`Target: ${targetValue}`, width / 2, targetY);
        }
        
        // Type line
        ctx.textAlign = 'center';
        ctx.fillStyle = getTypeColor(card.card_type);
        const typeBoxHeight = 50 * scale;
        const typeBoxY = (targetValue ? titleY + 70 * scale : titleY + 50 * scale);
        ctx.fillRect(20 * scale, typeBoxY, width - 40 * scale, typeBoxHeight);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${32 * scale}px Arial`;
        ctx.fillText(card.card_type, width / 2, typeBoxY + 35 * scale);
        
        // Text box
        const textBoxY = typeBoxY + 70 * scale;
        const textBoxHeight = height - textBoxY - 20 * scale;
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(20 * scale, textBoxY, width - 40 * scale, textBoxHeight);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(20 * scale, textBoxY, width - 40 * scale, textBoxHeight);
        
        // Card text - dynamic scaling
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        
        const text = card.text_box?.raw_text || '';
        if (text) {
            let fontSize = 32 * scale;
            let textFits = false;
            let wrappedLines = [];
            
            while (!textFits && fontSize >= 12 * scale) {
                ctx.font = `${fontSize}px Arial`;
                wrappedLines = wrapTextForCenter(ctx, text, width - 60 * scale, fontSize);
                
                const lineHeight = fontSize * 1.3;
                const totalHeight = wrappedLines.length * lineHeight;
                
                if (totalHeight <= textBoxHeight - 40 * scale) {
                    textFits = true;
                } else {
                    fontSize -= 2 * scale;
                }
            }
            
            if (!textFits) {
                fontSize = 12 * scale;
                ctx.font = `${fontSize}px Arial`;
                wrappedLines = wrapTextForCenter(ctx, text, width - 60 * scale, fontSize);
            }
            
            const lineHeight = fontSize * 1.3;
            const startY = textBoxY + fontSize + 10 * scale;
            
            for (let i = 0; i < wrappedLines.length; i++) {
                if (startY + (i * lineHeight) < textBoxY + textBoxHeight - 10 * scale) {
                    ctx.fillText(wrappedLines[i], width / 2, startY + (i * lineHeight));
                } else {
                    break;
                }
            }
        }
        
        // Wrestler/Manager banner
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
            ctx.fillStyle = card.card_type === 'Wrestler' ? '#333' : '#666';
            ctx.fillRect(0, 0, width, 25 * scale);
            ctx.fillStyle = 'white';
            ctx.font = `bold ${18 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${card.card_type.toUpperCase()} CARD`, width / 2, 18 * scale);
        }
    }
    
    return canvas;
}

// Helper function for center text wrapping
function wrapTextForCenter(ctx, text, maxWidth, fontSize) {
    if (!text) return [];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';
    
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    
    if (currentLine) {
        lines.push(currentLine);
    }
    
    return lines;
}

function getTypeColor(type) {
    const colors = {
        'Action': '#9c5a9c',
        'Response': '#c84c4c',
        'Submission': '#5aa05a',
        'Strike': '#4c82c8',
        'Grapple': '#e68a00',
        'Wrestler': '#333333',
        'Manager': '#666666',
        'Boon': '#17a2b8',
        'Injury': '#6c757d',
        'Call Name': '#fd7e14',
        'Faction': '#20c997'
    };
    return colors[type] || '#6c757d';
}

async function exportSingleZip(cards, zipName, options) {
    const { usePascalCase, usePNG, size } = options;
    
    let width, height;
    if (size === 'lackey') {
        width = 750;
        height = 1050;
    } else if (size === 'highres') {
        width = 1500;
        height = 2100;
    } else {
        width = 214;
        height = 308;
    }
    
    if (!confirm(`Export ${cards.length} cards at ${width}x${height}?`)) {
        return;
    }
    
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    
    // Progress indicator
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border:3px solid #000;border-radius:10px;z-index:9999;box-shadow:0 0 30px rgba(0,0,0,0.5);min-width:300px;text-align:center;font-family:Arial,sans-serif;';
    document.body.appendChild(progressDiv);
    
    let processed = 0;
    let failed = 0;
    
    const updateProgress = () => {
        progressDiv.innerHTML = `
            <h3 style="margin-top:0;">Exporting Cards</h3>
            <p>${processed} of ${cards.length}</p>
            <div style="width:100%;height:20px;background:#f0f0f0;border-radius:10px;margin:15px 0;">
                <div style="width:${(processed / cards.length) * 100}%;height:100%;background:#007bff;border-radius:10px;"></div>
            </div>
            <p style="color:#666;font-size:0.9em;">
                ${failed > 0 ? `${failed} failed` : 'All good so far'}
            </p>
        `;
    };
    
    updateProgress();
    
    // Process in small batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const batch = cards.slice(i, Math.min(i + BATCH_SIZE, cards.length));
        
        for (const card of batch) {
            try {
                // Render card to canvas
                const canvas = renderCardToCanvas(card, width, height);
                
                // Convert to blob
                const blob = await new Promise(resolve => {
                    if (usePNG) {
                        canvas.toBlob(resolve, 'image/png');
                    } else {
                        canvas.toBlob(resolve, 'image/jpeg', 0.95);
                    }
                });
                
                if (blob) {
                    const arrayBuffer = await blob.arrayBuffer();
                    const ext = usePNG ? '.png' : '.jpg';
                    const fileName = getCleanFileName(card.title, card.card_type, usePascalCase) + ext;
                    zip.file(fileName, arrayBuffer);
                    processed++;
                } else {
                    failed++;
                }
                
            } catch (error) {
                console.error(`Failed to render ${card.title}:`, error);
                failed++;
            }
            
            updateProgress();
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (processed === 0) {
        document.body.removeChild(progressDiv);
        alert('No cards were successfully exported.');
        return;
    }
    
    // Create ZIP
    progressDiv.innerHTML = '<h3>Creating ZIP file...</h3><p>Please wait...</p>';
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    document.body.removeChild(progressDiv);
    
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    
    alert(`Exported ${processed} cards successfully!${failed > 0 ? ` (${failed} failed)` : ''}`);
}

// Group cards by type
function groupCardsByType(cards) {
    const groups = {
        Wrestler: [],
        Manager: [],
        Action: [],
        Grapple: [],
        Strike: [],
        Submission: [],
        Response: [],
        Boon: [],
        Injury: [],
        'Call Name': [],
        Faction: []
    };
    
    cards.forEach(card => {
        if (groups[card.card_type]) {
            groups[card.card_type].push(card);
        } else {
            // For any unexpected types, add to a catch-all category
            if (!groups['Other']) groups['Other'] = [];
            groups['Other'].push(card);
        }
    });
    
    // Remove empty groups
    Object.keys(groups).forEach(key => {
        if (groups[key].length === 0) {
            delete groups[key];
        }
    });
    
    return groups;
}

// Export separate ZIPs for each card type
async function exportByCategorySeparate(allCards, options) {
    const groups = groupCardsByType(allCards);
    const types = Object.keys(groups);
    
    if (types.length === 0) {
        alert('No cards found to export.');
        return;
    }
    
    let totalCards = 0;
    types.forEach(type => totalCards += groups[type].length);
    
    if (!confirm(`This will create ${types.length} separate ZIP files with ${totalCards} total cards. Continue?`)) {
        return;
    }
    
    for (const type of types) {
        const cards = groups[type];
        if (cards.length > 0) {
            const proceed = confirm(`Export ${type} cards (${cards.length} cards)?`);
            if (proceed) {
                const zipName = options.usePascalCase 
                    ? `AEW${type.replace(/\s+/g, '')}Cards.zip` 
                    : `AEW ${type} Cards.zip`;
                await exportSingleZip(cards, zipName, options);
                // Delay between downloads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    alert('All category exports completed!');
}

// Export a single selected card type - FIXED VERSION WITH MODAL
async function exportByCategorySingle(allCards, options) {
    const groups = groupCardsByType(allCards);
    const types = Object.keys(groups);
    
    if (types.length === 0) {
        alert('No cards found to export.');
        return;
    }
    
    // Create a modal for type selection instead of using prompt()
    const typeModal = createModal('Select Card Type to Export', `
        <div style="margin-bottom:20px;">
            <strong style="display:block;margin-bottom:10px;">Available Card Types:</strong>
            <select id="typeSelect" style="width:100%;padding:8px;font-size:16px;margin-bottom:20px;">
                ${types.map(type => `<option value="${type}">${type} (${groups[type].length} cards)</option>`).join('')}
            </select>
        </div>
        
        <div style="display:flex;justify-content:space-between;margin-top:25px;">
            <button id="typeCancelBtn" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">
                Cancel
            </button>
            <button id="typeConfirmBtn" style="padding:10px 20px;background:#20c997;color:white;border:none;border-radius:4px;cursor:pointer;">
                Export Selected Type
            </button>
        </div>
    `);
    
    return new Promise((resolve) => {
        document.getElementById('typeCancelBtn').onclick = () => {
            typeModal.remove();
            resolve();
        };
        
        document.getElementById('typeConfirmBtn').onclick = async () => {
            const selectedType = document.getElementById('typeSelect').value;
            typeModal.remove();
            
            const cards = groups[selectedType];
            const zipName = options.usePascalCase 
                ? `AEW${selectedType.replace(/\s+/g, '')}Cards.zip` 
                : `AEW ${selectedType} Cards.zip`;
            
            await exportSingleZip(cards, zipName, options);
            resolve();
        };
    });
}

// Fallback export
export async function exportAllCardsAsImagesFallback() {
    alert('Please use the main export function.');
} 
