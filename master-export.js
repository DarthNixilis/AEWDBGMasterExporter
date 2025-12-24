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

export async function exportAllCardsAsImages() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found.");
        return;
    }
    
    // Modal with export type options
    const exportModal = document.createElement('div');
    exportModal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9998;display:flex;justify-content:center;align-items:center;';
    
    const exportModalContent = document.createElement('div');
    exportModalContent.style.cssText = 'background:white;padding:30px;border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,0.3);width:400px;max-width:90%;font-family:Arial,sans-serif;';
    
    exportModalContent.innerHTML = `
        <h3 style="margin-top:0;">Export Options</h3>
        
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
    `;
    
    exportModal.appendChild(exportModalContent);
    document.body.appendChild(exportModal);
    
    return new Promise((resolve) => {
        document.getElementById('exportCancelBtn').onclick = () => {
            document.body.removeChild(exportModal);
            resolve();
        };
        
        document.getElementById('exportConfirmBtn').onclick = async () => {
            const usePascalCase = document.getElementById('exportUsePascalCase').checked;
            const usePNG = document.getElementById('exportUsePNG').checked;
            const exportType = document.getElementById('exportTypeSelect').value;
            const exportSize = document.getElementById('exportSizeSelect').value;
            
            document.body.removeChild(exportModal);
            
            const exportOptions = {
                usePascalCase,
                usePNG,
                size: exportSize
            };
            
            if (exportType === 'all') {
                await exportSingleZip(allCards, 'AEW-Complete-Set.zip', exportOptions);
            } else if (exportType === 'bytype') {
                await exportByCategorySeparate(allCards, exportOptions);
            } else if (exportType === 'singletype') {
                await exportByCategorySingle(allCards, exportOptions);
            }
            
            resolve();
        };
    });
}

// CANVAS-BASED RENDERER
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
    const fontSize = (size) => Math.max(size * scale, 8);
    
    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(5 * scale, 5 * scale, width - 10 * scale, height - 10 * scale);
    
    // Draw title
    ctx.fillStyle = 'black';
    ctx.font = `bold ${fontSize(24)}px Arial`;
    ctx.textAlign = 'center';
    
    // Truncate long titles
    let title = card.title;
    let titleWidth = ctx.measureText(title).width;
    const maxTitleWidth = width - 40 * scale;
    
    if (titleWidth > maxTitleWidth) {
        // Try to shorten title
        while (title.length > 20 && titleWidth > maxTitleWidth) {
            title = title.substring(0, title.length - 1);
            titleWidth = ctx.measureText(title + '...').width;
        }
        title = title + '...';
    }
    
    ctx.fillText(title, width / 2, 40 * scale);
    
    // Draw stats
    ctx.font = `bold ${fontSize(18)}px Arial`;
    ctx.textAlign = 'left';
    
    // Damage
    if (card.damage !== null && card.damage !== undefined) {
        ctx.fillText(`D: ${card.damage}`, 20 * scale, 80 * scale);
    }
    
    // Momentum
    if (card.momentum !== null && card.momentum !== undefined) {
        ctx.fillText(`M: ${card.momentum}`, 20 * scale, 110 * scale);
    }
    
    // Target
    const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;
    if (targetValue) {
        ctx.fillText(`T: ${targetValue}`, 20 * scale, 140 * scale);
    }
    
    // Cost
    ctx.textAlign = 'right';
    if (card.cost !== null && card.cost !== undefined) {
        ctx.fillText(`C: ${card.cost}`, width - 20 * scale, 80 * scale);
    }
    
    // Draw type
    ctx.textAlign = 'center';
    ctx.fillStyle = getTypeColor(card.card_type);
    ctx.fillRect(20 * scale, 150 * scale, width - 40 * scale, 30 * scale);
    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize(16)}px Arial`;
    ctx.fillText(card.card_type, width / 2, 170 * scale);
    
    // Draw text box background
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(20 * scale, 190 * scale, width - 40 * scale, height - 230 * scale);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(20 * scale, 190 * scale, width - 40 * scale, height - 230 * scale);
    
    // Draw card text
    ctx.fillStyle = 'black';
    ctx.font = `${fontSize(14)}px Arial`;
    ctx.textAlign = 'left';
    
    const text = card.text_box?.raw_text || '';
    const lines = wrapText(ctx, text, width - 60 * scale, fontSize(14));
    
    let y = 210 * scale;
    const lineHeight = fontSize(18);
    
    for (const line of lines) {
        if (y < height - 40 * scale) {
            ctx.fillText(line, 30 * scale, y);
            y += lineHeight;
        } else {
            // Draw "..." if text is truncated
            if (lines.indexOf(line) < lines.length - 1) {
                ctx.fillText('...', 30 * scale, y);
            }
            break;
        }
    }
    
    return canvas;
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

function wrapText(ctx, text, maxWidth, fontSize) {
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

// Export a single selected card type
async function exportByCategorySingle(allCards, options) {
    const groups = groupCardsByType(allCards);
    const types = Object.keys(groups);
    
    if (types.length === 0) {
        alert('No cards found to export.');
        return;
    }
    
    // Build type selection list
    let typeList = 'Select card type to export:\n\n';
    types.forEach((type, index) => {
        typeList += `${index + 1}. ${type} (${groups[type].length} cards)\n`;
    });
    
    const selected = prompt(typeList + '\nEnter number or type name:');
    
    if (!selected) return;
    
    // Try to parse as number first
    let selectedType;
    const selectedNum = parseInt(selected);
    
    if (!isNaN(selectedNum) && selectedNum >= 1 && selectedNum <= types.length) {
        selectedType = types[selectedNum - 1];
    } else {
        // Try to match by name
        selectedType = types.find(type => 
            type.toLowerCase() === selected.toLowerCase() ||
            type.toLowerCase().includes(selected.toLowerCase())
        );
    }
    
    if (!selectedType || !groups[selectedType]) {
        alert(`Type "${selected}" not found. Available types: ${types.join(', ')}`);
        return;
    }
    
    const cards = groups[selectedType];
    const zipName = options.usePascalCase 
        ? `AEW${selectedType.replace(/\s+/g, '')}Cards.zip` 
        : `AEW ${selectedType} Cards.zip`;
    
    await exportSingleZip(cards, zipName, options);
}

// Fallback export
export async function exportAllCardsAsImagesFallback() {
    alert('Please use the main export function.');
}
