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

// CANVAS-BASED RENDERER with MUCH LARGER FONTS for small sizes
function renderCardToCanvas(card, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate scaling for different sizes
    const scale = width / 750;
    const isSmallSize = width === 214; // Digital size
    
    // Font size function - MUCH LARGER for small cards
    const fontSize = (baseSize) => {
        if (isSmallSize) {
            // For 214x308 cards, make fonts MUCH larger
            if (baseSize <= 16) return baseSize * 2.5; // Small text
            if (baseSize <= 24) return baseSize * 2.2; // Medium text
            return baseSize * 1.8; // Large text
        }
        return Math.max(baseSize * scale, 10);
    };
    
    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = isSmallSize ? 2 : 3 * scale;
    ctx.strokeRect(
        isSmallSize ? 2 : 5 * scale, 
        isSmallSize ? 2 : 5 * scale, 
        width - (isSmallSize ? 4 : 10 * scale), 
        height - (isSmallSize ? 4 : 10 * scale)
    );
    
    // Draw title - VERY LARGE FONT
    ctx.fillStyle = 'black';
    ctx.font = `bold ${fontSize(32)}px Arial`;
    ctx.textAlign = 'center';
    
    // Truncate long titles
    let title = card.title;
    let titleWidth = ctx.measureText(title).width;
    const maxTitleWidth = width - (isSmallSize ? 20 : 40 * scale);
    
    if (titleWidth > maxTitleWidth) {
        // Try to shorten title
        while (title.length > (isSmallSize ? 10 : 15) && titleWidth > maxTitleWidth) {
            title = title.substring(0, title.length - 1);
            titleWidth = ctx.measureText(title + '...').width;
        }
        title = title + '...';
    }
    
    ctx.fillText(title, width / 2, isSmallSize ? 30 : 50 * scale);
    
    // Draw stats - VERY LARGE FONT
    ctx.font = `bold ${fontSize(22)}px Arial`;
    ctx.textAlign = 'left';
    
    // Damage - position based on size
    const statsX = isSmallSize ? 15 : 25 * scale;
    let statsY = isSmallSize ? 60 : 90 * scale;
    const statsSpacing = isSmallSize ? 20 : 35 * scale;
    
    if (card.damage !== null && card.damage !== undefined) {
        ctx.fillText(`D: ${card.damage}`, statsX, statsY);
        statsY += statsSpacing;
    }
    
    // Momentum - EXTRA LARGE FOR VISIBILITY
    if (card.momentum !== null && card.momentum !== undefined) {
        // Make momentum even larger
        ctx.font = `bold ${fontSize(26)}px Arial`;
        ctx.fillText(`M: ${card.momentum}`, statsX, statsY);
        ctx.font = `bold ${fontSize(22)}px Arial`; // Reset font
        statsY += statsSpacing;
    }
    
    // Target
    const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;
    if (targetValue) {
        ctx.fillText(`T: ${targetValue}`, statsX, statsY);
    }
    
    // Cost - VERY LARGE AND BOLD
    ctx.textAlign = 'right';
    ctx.font = `bold ${isSmallSize ? fontSize(30) : fontSize(28)}px Arial`;
    if (card.cost !== null && card.cost !== undefined) {
        // Draw cost in a box
        const costText = `${card.cost}`;
        const costWidth = ctx.measureText(costText).width;
        const costX = width - (isSmallSize ? 15 : 25 * scale) - costWidth;
        const costY = isSmallSize ? 85 : 100 * scale;
        
        // Draw box around cost
        ctx.fillStyle = '#f0f0f0';
        const boxWidth = costWidth + (isSmallSize ? 15 : 20 * scale);
        const boxHeight = isSmallSize ? 30 : 35 * scale;
        ctx.fillRect(costX - (isSmallSize ? 8 : 10 * scale), costY - (isSmallSize ? 20 : 25 * scale), boxWidth, boxHeight);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = isSmallSize ? 1 : 2 * scale;
        ctx.strokeRect(costX - (isSmallSize ? 8 : 10 * scale), costY - (isSmallSize ? 20 : 25 * scale), boxWidth, boxHeight);
        
        // Draw cost text
        ctx.fillStyle = 'black';
        ctx.fillText(costText, width - (isSmallSize ? 15 : 25 * scale), costY);
    }
    
    // Draw type
    ctx.textAlign = 'center';
    ctx.fillStyle = getTypeColor(card.card_type);
    const typeBoxY = isSmallSize ? 120 : 170 * scale;
    const typeBoxHeight = isSmallSize ? 25 : 40 * scale;
    ctx.fillRect(
        isSmallSize ? 15 : 20 * scale, 
        typeBoxY, 
        width - (isSmallSize ? 30 : 40 * scale), 
        typeBoxHeight
    );
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize(20)}px Arial`;
    ctx.fillText(card.card_type, width / 2, typeBoxY + (isSmallSize ? 18 : 25 * scale));
    
    // Draw text box background - FULL CENTER JUSTIFIED
    const textBoxY = isSmallSize ? 150 : 220 * scale;
    const textBoxHeight = height - (isSmallSize ? 165 : 260 * scale);
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(
        isSmallSize ? 15 : 20 * scale, 
        textBoxY, 
        width - (isSmallSize ? 30 : 40 * scale), 
        textBoxHeight
    );
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = isSmallSize ? 1 : 2 * scale;
    ctx.strokeRect(
        isSmallSize ? 15 : 20 * scale, 
        textBoxY, 
        width - (isSmallSize ? 30 : 40 * scale), 
        textBoxHeight
    );
    
    // Draw card text - LARGER FONT, CENTER JUSTIFIED
    ctx.fillStyle = 'black';
    ctx.font = `${fontSize(18)}px Arial`;
    ctx.textAlign = 'center'; // CENTER JUSTIFIED
    
    const text = card.text_box?.raw_text || '';
    const maxTextWidth = width - (isSmallSize ? 40 : 60 * scale);
    
    // Wrap text for center alignment
    const lines = wrapTextForCenter(ctx, text, maxTextWidth, fontSize(18));
    
    let y = textBoxY + (isSmallSize ? 20 : 30 * scale);
    const lineHeight = fontSize(22);
    
    // Split text into paragraphs based on periods
    const paragraphs = text.split(/\.\s+/).filter(p => p.trim().length > 0);
    
    for (let p = 0; p < paragraphs.length; p++) {
        const paragraph = paragraphs[p] + (p < paragraphs.length - 1 ? '.' : '');
        const paraLines = wrapTextForCenter(ctx, paragraph, maxTextWidth, fontSize(18));
        
        for (const line of paraLines) {
            if (y < textBoxY + textBoxHeight - (isSmallSize ? 15 : 20 * scale)) {
                ctx.fillText(line, width / 2, y);
                y += lineHeight;
            } else {
                // Draw "..." if text is truncated
                if (p < paragraphs.length - 1 || paraLines.indexOf(line) < paraLines.length - 1) {
                    ctx.fillText('...', width / 2, y);
                }
                break;
            }
        }
        
        // Add extra space between paragraphs
        y += lineHeight * 0.3;
        
        // Break if we're out of space
        if (y >= textBoxY + textBoxHeight - (isSmallSize ? 15 : 20 * scale)) {
            break;
        }
    }
    
    // If it's a Wrestler or Manager, make it more obvious
    if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
        // Draw a special banner
        ctx.fillStyle = card.card_type === 'Wrestler' ? '#333333' : '#666666';
        ctx.fillRect(0, 0, width, isSmallSize ? 15 : 25 * scale);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${fontSize(16)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(`${card.card_type.toUpperCase()} CARD`, width / 2, isSmallSize ? 12 : 18 * scale);
    }
    
    return canvas;
}

// Wrap text function for CENTER justification
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
