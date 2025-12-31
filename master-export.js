
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

// Wrap text function for better text handling
function wrapText(ctx, text, maxWidth, lineHeight, startY) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    
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
    lines.push(currentLine);
    
    return lines;
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

// UPDATED RENDERER with clean layout
function renderCardToCanvas(card, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Determine if this is the small digital size
    const isSmallSize = width === 214; // 214x308 for digital
    
    if (isSmallSize) {
        // =================================================================
        // CLEAN LAYOUT FOR 214x308 DIGITAL CARDS
        // =================================================================
        
        // 1. THICK BLACK BORDER
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        
        // 2. TOP BAR WITH TITLE AND COST
        const topBarHeight = 45;
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(3, 3, width - 6, topBarHeight - 3);
        
        // Draw separator line
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(3, topBarHeight);
        ctx.lineTo(width - 3, topBarHeight);
        ctx.stroke();
        
        // 3. TITLE - LEFT SIDE
        const titleX = 10;
        const titleY = 25;
        
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Fit title to available space
        let title = card.title;
        let titleFontSize = 16;
        let titleFits = false;
        
        while (!titleFits && titleFontSize >= 10) {
            ctx.font = `bold ${titleFontSize}px Arial`;
            const titleWidth = ctx.measureText(title).width;
            const maxTitleWidth = width - 70; // Leave room for cost
            
            if (titleWidth <= maxTitleWidth) {
                titleFits = true;
            } else if (titleFontSize === 10) {
                // Truncate if at minimum size
                while (ctx.measureText(title + '...').width > maxTitleWidth && title.length > 3) {
                    title = title.substring(0, title.length - 1);
                }
                title = title + '...';
                titleFits = true;
            } else {
                titleFontSize -= 1;
            }
        }
        
        ctx.fillText(title, titleX, titleY);
        
        // 4. COST - RIGHT SIDE (if applicable)
        if (card.cost !== null && card.cost !== undefined && card.cost !== 'N/a') {
            const costX = width - 20;
            const costY = 25;
            
            ctx.textAlign = 'right';
            ctx.font = `bold 18px Arial`;
            ctx.fillStyle = '#333';
            
            // Draw cost in circle
            const costRadius = 12;
            const costCircleX = costX - costRadius;
            const costCircleY = costY;
            
            ctx.fillStyle = '#e9ecef';
            ctx.beginPath();
            ctx.arc(costCircleX, costCircleY, costRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#6c757d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(costCircleX, costCircleY, costRadius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = 'black';
            ctx.font = `bold 12px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(card.cost.toString(), costCircleX, costCircleY);
        }
        
        // 5. TYPE LINE WITH COLOR CODING
        const typeY = topBarHeight + 15;
        const typeBoxHeight = 22;
        
        // Get type color
        const typeColor = getTypeColor(card.card_type);
        
        // Draw type background
        ctx.fillStyle = typeColor;
        ctx.fillRect(10, typeY, width - 20, typeBoxHeight);
        
        // Draw type text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.card_type.toUpperCase(), width / 2, typeY + typeBoxHeight / 2);
        
        // 6. STATS BAR (for maneuvers and some actions)
        let statsY = typeY + typeBoxHeight + 10;
        let hasStats = false;
        
        // Check if card has stats to display
        const hasDamage = card.damage !== null && card.damage !== undefined && card.damage !== '';
        const hasMomentum = card.momentum !== null && card.momentum !== undefined && card.momentum !== '';
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        const hasTarget = targetTrait && targetTrait.value;
        
        if (hasDamage || hasMomentum || hasTarget) {
            hasStats = true;
            
            // Stats bar background
            ctx.fillStyle = '#f1f3f4';
            ctx.fillRect(10, statsY, width - 20, 28);
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 1;
            ctx.strokeRect(10, statsY, width - 20, 28);
            
            // Display stats
            let statsText = '';
            if (hasDamage) statsText += `D:${card.damage} `;
            if (hasMomentum) statsText += `M:${card.momentum} `;
            if (hasTarget) statsText += `T:${targetTrait.value}`;
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(statsText.trim(), width / 2, statsY + 14);
            
            // Adjust text box position
            statsY += 35;
        } else {
            statsY += 5;
        }
        
        // 7. TEXT BOX AREA
        const textBoxY = statsY;
        const textBoxHeight = height - textBoxY - 15;
        
        // Text box background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(10, textBoxY, width - 20, textBoxHeight);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, textBoxY, width - 20, textBoxHeight);
        
        // 8. CARD TEXT
        const rawText = card.text_box?.raw_text || '';
        if (rawText) {
            ctx.fillStyle = 'black';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            // Define text area
            const textX = 15;
            const textY = textBoxY + 10;
            const maxTextWidth = width - 30;
            const maxTextHeight = textBoxHeight - 20;
            
            // Start with reasonable font size
            let fontSize = 12;
            let lines = [];
            let totalHeight = 0;
            
            // Adjust font size to fit
            while (fontSize >= 8) {
                ctx.font = `${fontSize}px Arial`;
                lines = wrapText(ctx, rawText, maxTextWidth);
                
                const lineHeight = fontSize * 1.3;
                totalHeight = lines.length * lineHeight;
                
                if (totalHeight <= maxTextHeight) {
                    break;
                }
                fontSize -= 0.5;
            }
            
            // If still doesn't fit, truncate
            if (totalHeight > maxTextHeight && fontSize === 8) {
                // Remove lines until it fits
                while (lines.length > 0 && (lines.length * fontSize * 1.3) > maxTextHeight) {
                    lines.pop();
                }
                if (lines.length > 0) {
                    lines[lines.length - 1] = lines[lines.length - 1].substring(0, Math.max(0, lines[lines.length - 1].length - 3)) + '...';
                }
            }
            
            // Render lines
            const lineHeight = fontSize * 1.3;
            for (let i = 0; i < lines.length; i++) {
                const yPos = textY + (i * lineHeight);
                if (yPos + lineHeight <= textBoxY + textBoxHeight - 5) {
                    // Style keywords in bold
                    const keywords = ['Ongoing', 'Enters', 'Finisher', 'Follow-Up', 'Power Attack', 'Focus Attack', 'Cycling', 'Resilient', 'Stun', 'Relentless', 'Sudden'];
                    let currentX = textX;
                    const words = lines[i].split(' ');
                    
                    for (let word of words) {
                        const cleanWord = word.replace(/[.,!?;:]$/g, '');
                        const isKeyword = keywords.some(kw => cleanWord === kw);
                        
                        if (isKeyword) {
                            ctx.font = `bold ${fontSize}px Arial`;
                            ctx.fillStyle = '#2c3e50';
                        } else {
                            ctx.font = `${fontSize}px Arial`;
                            ctx.fillStyle = '#333';
                        }
                        
                        const wordWidth = ctx.measureText(word + ' ').width;
                        ctx.fillText(word, currentX, yPos);
                        currentX += wordWidth;
                    }
                }
            }
        } else {
            // No text - show centered message
            ctx.fillStyle = '#999';
            ctx.font = 'italic 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No card text', width / 2, textBoxY + textBoxHeight / 2);
        }
        
        // 9. SPECIAL BANNERS FOR PERSONA CARDS
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
            // Top banner
            ctx.fillStyle = card.card_type === 'Wrestler' ? '#2c3e50' : '#7f8c8d';
            ctx.fillRect(0, 0, width, 18);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${card.card_type.toUpperCase()}`, width / 2, 9);
            
            // Bottom banner for kit indication
            if (card['Wrestler Kit'] && card['Wrestler Kit'].toUpperCase() === 'TRUE') {
                ctx.fillStyle = '#f39c12';
                ctx.fillRect(0, height - 15, width, 15);
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 9px Arial';
                ctx.fillText('KIT CARD', width / 2, height - 7.5);
            }
        }
        
        // 10. INJURY/BOON SPECIAL STYLING
        if (card.card_type === 'Injury') {
            // Red border for Injury
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 4, width - 8, height - 8);
            
            // Injury icon in corner
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('✖', 8, 8);
        } else if (card.card_type === 'Boon') {
            // Green border for Boon
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 4, width - 8, height - 8);
            
            // Boon icon in corner
            ctx.fillStyle = '#27ae60';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('✓', 8, 8);
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
        
        // Top bar with title
        const topBarHeight = 80 * scale;
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(5 * scale, 5 * scale, width - 10 * scale, topBarHeight);
        
        // Title
        ctx.fillStyle = 'black';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        let title = card.title;
        let titleFontSize = 32 * scale;
        let titleFits = false;
        
        while (!titleFits && titleFontSize >= 16 * scale) {
            ctx.font = `bold ${titleFontSize}px Arial`;
            const titleWidth = ctx.measureText(title).width;
            const maxTitleWidth = width - 100 * scale;
            
            if (titleWidth <= maxTitleWidth) {
                titleFits = true;
            } else if (titleFontSize === 16 * scale) {
                title = title.substring(0, 20) + '...';
                titleFits = true;
            } else {
                titleFontSize -= 2 * scale;
            }
        }
        
        ctx.fillText(title, 20 * scale, topBarHeight / 2);
        
        // Cost
        if (card.cost !== null && card.cost !== undefined && card.cost !== 'N/a') {
            ctx.textAlign = 'right';
            ctx.font = `bold ${28 * scale}px Arial`;
            ctx.fillStyle = '#333';
            ctx.fillText(`C: ${card.cost}`, width - 20 * scale, topBarHeight / 2);
        }
        
        // Type line
        const typeY = topBarHeight + 20 * scale;
        const typeBoxHeight = 50 * scale;
        const typeColor = getTypeColor(card.card_type);
        
        ctx.fillStyle = typeColor;
        ctx.fillRect(20 * scale, typeY, width - 40 * scale, typeBoxHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${24 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.card_type.toUpperCase(), width / 2, typeY + typeBoxHeight / 2);
        
        // Stats area
        let statsY = typeY + typeBoxHeight + 20 * scale;
        const hasDamage = card.damage !== null && card.damage !== undefined && card.damage !== '';
        const hasMomentum = card.momentum !== null && card.momentum !== undefined && card.momentum !== '';
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        const hasTarget = targetTrait && targetTrait.value;
        
        if (hasDamage || hasMomentum || hasTarget) {
            ctx.fillStyle = '#f1f3f4';
            ctx.fillRect(20 * scale, statsY, width - 40 * scale, 40 * scale);
            
            let statsText = '';
            if (hasDamage) statsText += `Damage: ${card.damage}  `;
            if (hasMomentum) statsText += `Momentum: ${card.momentum}  `;
            if (hasTarget) statsText += `Target: ${targetTrait.value}`;
            
            ctx.fillStyle = '#333';
            ctx.font = `bold ${18 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(statsText.trim(), width / 2, statsY + 20 * scale);
            
            statsY += 60 * scale;
        } else {
            statsY += 10 * scale;
        }
        
        // Text box
        const textBoxY = statsY;
        const textBoxHeight = height - textBoxY - 30 * scale;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(20 * scale, textBoxY, width - 40 * scale, textBoxHeight);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(20 * scale, textBoxY, width - 40 * scale, textBoxHeight);
        
        // Card text
        const rawText = card.text_box?.raw_text || '';
        if (rawText) {
            ctx.fillStyle = '#333';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            const textX = 30 * scale;
            const textY = textBoxY + 20 * scale;
            const maxTextWidth = width - 60 * scale;
            
            let fontSize = 20 * scale;
            let lines = [];
            
            while (fontSize >= 12 * scale) {
                ctx.font = `${fontSize}px Arial`;
                lines = wrapText(ctx, rawText, maxTextWidth);
                
                const lineHeight = fontSize * 1.4;
                const totalHeight = lines.length * lineHeight;
                
                if (totalHeight <= textBoxHeight - 40 * scale) {
                    break;
                }
                fontSize -= 1 * scale;
            }
            
            const lineHeight = fontSize * 1.4;
            for (let i = 0; i < lines.length; i++) {
                const yPos = textY + (i * lineHeight);
                if (yPos + lineHeight <= textBoxY + textBoxHeight - 10 * scale) {
                    ctx.fillText(lines[i], textX, yPos);
                }
            }
        }
        
        // Special banners for larger cards
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
            ctx.fillStyle = card.card_type === 'Wrestler' ? '#2c3e50' : '#7f8c8d';
            ctx.fillRect(0, 0, width, 30 * scale);
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${16 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${card.card_type.toUpperCase()} CARD`, width / 2, 15 * scale);
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
