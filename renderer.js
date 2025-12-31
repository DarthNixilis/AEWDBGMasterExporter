// renderer.js
import { store } from './store.js';

// Constants
const CARD_THEMES = {
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

const SPECIAL_BORDERS = {
    'Injury': '#e74c3c',
    'Boon': '#27ae60',
    'Faction': '#8e44ad',
    'Call Name': '#e67e22'
};

const KEYWORDS = [];

// Initialize keywords from store (will be populated when data loads)
store.subscribe('keywordDatabase', (keywords) => {
    KEYWORDS.length = 0;
    KEYWORDS.push(...Object.keys(keywords));
    // Add common game terms that might not be in the database
    ['Enters', 'Ongoing', 'Finisher', 'Follow-Up', 'Power Attack', 'Focus Attack', 
     'Cycling', 'Resilient', 'Stun', 'Relentless', 'Sudden', 'Flip'].forEach(term => {
        if (!KEYWORDS.includes(term)) KEYWORDS.push(term);
    });
});

// Utility functions
function getTypeColor(type) {
    return CARD_THEMES[type] || '#6c757d';
}

function cleanCardText(text) {
    if (!text) return '';
    return text.replace(/--/g, '—').replace(/\s+/g, ' ').trim();
}

function wrapText(ctx, text, maxWidth) {
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

function binarySearchFontSize(ctx, text, maxWidth, maxHeight, minSize, maxSize, lineHeight = 1.3) {
    let low = minSize;
    let high = maxSize;
    let bestSize = minSize;
    
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        ctx.font = `${mid}px Arial`;
        
        // Quick width check
        const singleLineWidth = ctx.measureText(text).width;
        if (singleLineWidth > maxWidth * 3) {
            high = mid - 1;
            continue;
        }
        
        // Wrap text and measure
        const lines = wrapText(ctx, text, maxWidth);
        const totalHeight = lines.length * mid * lineHeight;
        
        if (totalHeight <= maxHeight) {
            bestSize = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    
    return bestSize;
}

function renderFormattedLine(ctx, line, x, y, fontSize) {
    let currentX = x;
    
    // Handle bold markers (for Faction "Flip" text)
    if (line.includes('**')) {
        const parts = line.split('**');
        parts.forEach((part, i) => {
            if (!part) return;
            ctx.font = i % 2 === 1 ? `bold ${fontSize}px Arial` : `${fontSize}px Arial`;
            ctx.fillStyle = i % 2 === 1 ? '#2c3e50' : '#333';
            ctx.fillText(part, currentX, y);
            currentX += ctx.measureText(part).width;
        });
        return;
    }
    
    // Handle keyword highlighting
    const words = line.split(' ');
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const cleanWord = word.replace(/[.,!?;:]$/g, '');
        const isKeyword = KEYWORDS.includes(cleanWord);
        
        ctx.font = isKeyword ? `bold ${fontSize}px Arial` : `${fontSize}px Arial`;
        ctx.fillStyle = isKeyword ? '#2c3e50' : '#333';
        
        const addSpace = i < words.length - 1 ? ' ' : '';
        ctx.fillText(word + addSpace, currentX, y);
        currentX += ctx.measureText(word + addSpace).width;
    }
}

// Main render function - unified for both UI and exports
export function renderCardToCanvas(card, width, height, options = {}) {
    const {
        scale = width / 750,
        isStatless = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type),
        showFullArt = false
    } = options;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return canvas;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Draw border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3 * scale;
    ctx.strokeRect(5 * scale, 5 * scale, width - 10 * scale, height - 10 * scale);
    
    // Special border for certain card types
    const specialBorder = SPECIAL_BORDERS[card.card_type];
    if (specialBorder) {
        ctx.strokeStyle = specialBorder;
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(4 * scale, 4 * scale, width - 8 * scale, height - 8 * scale);
    }
    
    // Title area
    const titleAreaHeight = 80 * scale;
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(5 * scale, 5 * scale, width - 10 * scale, titleAreaHeight);
    
    // Title text
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let title = card.title;
    let titleFontSize = 32 * scale;
    let titleFits = false;
    
    // Fit title to width
    while (!titleFits && titleFontSize >= 16 * scale) {
        ctx.font = `bold ${titleFontSize}px Arial`;
        const titleWidth = ctx.measureText(title).width;
        const maxTitleWidth = width - 40 * scale;
        
        if (titleWidth <= maxTitleWidth) {
            titleFits = true;
        } else if (titleFontSize === 16 * scale) {
            title = title.substring(0, 20) + '...';
            titleFits = true;
        } else {
            titleFontSize -= 1 * scale;
        }
    }
    
    ctx.fillText(title, width / 2, titleAreaHeight / 2);
    
    // Type line
    const typeY = titleAreaHeight + 20 * scale;
    const typeBoxHeight = 50 * scale;
    const typeColor = getTypeColor(card.card_type);
    
    ctx.fillStyle = typeColor;
    ctx.fillRect(20 * scale, typeY, width - 40 * scale, typeBoxHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${24 * scale}px Arial`;
    ctx.fillText(card.card_type.toUpperCase(), width / 2, typeY + typeBoxHeight / 2);
    
    // Stats area (if not statless)
    let textBoxY = typeY + typeBoxHeight + 30 * scale;
    
    const hasStats = !isStatless && (
        (card.cost != null && card.cost !== '' && !['N/A', 'N/a'].includes(String(card.cost))) ||
        (card.damage != null && card.damage !== '') ||
        (card.momentum != null && card.momentum !== '')
    );
    
    if (hasStats) {
        const statsY = typeY + typeBoxHeight + 20 * scale;
        const statsHeight = 50 * scale;
        
        ctx.fillStyle = '#f1f3f4';
        ctx.fillRect(20 * scale, statsY, width - 40 * scale, statsHeight);
        
        // Build stats string
        let statsText = '';
        if (card.cost != null && card.cost !== '' && !['N/A', 'N/a'].includes(String(card.cost))) {
            statsText += `Cost: ${card.cost}   `;
        }
        if (card.damage != null && card.damage !== '') {
            statsText += `Damage: ${card.damage}   `;
        }
        if (card.momentum != null && card.momentum !== '') {
            statsText += `Momentum: ${card.momentum}   `;
        }
        
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        if (targetTrait && targetTrait.value) {
            statsText += `Target: ${targetTrait.value}`;
        }
        
        // Display stats
        ctx.fillStyle = '#333';
        ctx.font = `bold ${18 * scale}px Arial`;
        ctx.fillText(statsText.trim(), width / 2, statsY + statsHeight / 2);
        
        textBoxY = statsY + statsHeight + 20 * scale;
    }
    
    // Text box
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
        
        const textBounds = {
            x: 30 * scale,
            y: textBoxY + 20 * scale,
            maxWidth: width - 60 * scale,
            maxHeight: textBoxHeight - 40 * scale
        };
        
        // Find optimal font size using binary search
        const cleanText = cleanCardText(rawText);
        const minFontSize = 12 * scale;
        const maxFontSize = 20 * scale;
        const fontSize = binarySearchFontSize(ctx, cleanText, textBounds.maxWidth, 
            textBounds.maxHeight, minFontSize, maxFontSize, 1.4);
        
        // Wrap text at optimal font size
        ctx.font = `${fontSize}px Arial`;
        let lines = wrapText(ctx, cleanText, textBounds.maxWidth);
        
        // Special handling for Faction cards
        if (card.card_type === 'Faction') {
            lines = lines.map(line => {
                if (line.startsWith('Flip')) {
                    return `**Flip**${line.substring(4)}`;
                }
                return line;
            });
        }
        
        // Truncate if still doesn't fit
        const lineHeight = fontSize * 1.4;
        if (lines.length * lineHeight > textBounds.maxHeight) {
            const maxLines = Math.floor(textBounds.maxHeight / lineHeight);
            if (maxLines > 0) {
                lines = lines.slice(0, maxLines);
                lines[maxLines - 1] = lines[maxLines - 1].substring(0, 
                    Math.max(0, lines[maxLines - 1].length - 3)) + '...';
            }
        }
        
        // Render lines
        for (let i = 0; i < lines.length; i++) {
            const yPos = textBounds.y + (i * lineHeight);
            if (yPos + lineHeight <= textBoxY + textBoxHeight - 10 * scale) {
                renderFormattedLine(ctx, lines[i], textBounds.x, yPos, fontSize);
            }
        }
    } else if (isStatless) {
        // For statless cards with no text
        ctx.fillStyle = '#999';
        ctx.font = `italic ${14 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${card.card_type} Card`, width / 2, textBoxY + textBoxHeight / 2);
    }
    
    // Special banners for persona cards
    if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
        ctx.fillStyle = card.card_type === 'Wrestler' ? '#2c3e50' : '#7f8c8d';
        ctx.fillRect(0, 0, width, 30 * scale);
        
        ctx.fillStyle = 'white';
        ctx.font = `bold ${16 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${card.card_type.toUpperCase()} CARD`, width / 2, 15 * scale);
        
        // Kit card indicator
        if (store.isKitCard(card)) {
            ctx.fillStyle = '#f39c12';
            ctx.fillRect(0, height - 15 * scale, width, 15 * scale);
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${12 * scale}px Arial`;
            ctx.fillText('KIT CARD', width / 2, height - 7.5 * scale);
        }
    }
    
    return canvas;
}

// Generate HTML for UI display (uses canvas for consistency)
export function generateCardHTML(card) {
    const canvas = renderCardToCanvas(card, 214, 308); // Digital size for UI
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    return `
        <div class="card-visual" data-title="${card.title}">
            <img src="${dataUrl}" alt="${card.title}" style="width:100%;height:auto;border-radius:8px;">
        </div>
    `;
}

// Generate high-res version for printing
export function generatePrintCardHTML(card) {
    const canvas = renderCardToCanvas(card, 750, 1050); // High-res size
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    return `
        <div style="width:100%;height:auto;">
            <img src="${dataUrl}" alt="${card.title}" style="width:100%;height:auto;">
        </div>
    `;
}