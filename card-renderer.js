// card-renderer.js
import { store as state } from './store.js';

// Helper function for filename generation
function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

/**
 * Generates the HTML for the card preview used in the UI list/grid.
 * Tries to load a local image first, falls back to a CSS placeholder.
 */
export function generateCardVisualHTML(card) {
    const imageName = toPascalCase(card.title);
    const imagePath = `./card-images/${imageName}.png`;
    const typeClass = `type-${(card.card_type || 'action').toLowerCase()}`;
    
    const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;

    const placeholderHTML = `
        <div class="placeholder-card">
            <div class="placeholder-header"><span>${card.title}</span></div>
            <div class="placeholder-stats-line">
                <div class="stats-left">
                    <span>D: ${card.damage ?? 'N/A'}</span>
                    <span>M: ${card.momentum ?? 'N/A'}</span>
                    ${targetValue ? `<span>T: ${targetValue}</span>` : ''}
                </div>
                <div class="cost-right"><span>C: ${card.cost ?? 'N/A'}</span></div>
            </div>
            <div class="placeholder-art-area"><span>Art Missing</span></div>
            <div class="placeholder-type-line ${typeClass}"><span>${card.card_type}</span></div>
            <div class="placeholder-text-box">
                <p>${card.text_box?.raw_text || ''}</p>
            </div>
        </div>`;

    return `
        <img src="${imagePath}" alt="${card.title}" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" 
             class="card-image-render">
        <div style="display:none;">${placeholderHTML}</div>
    `;
}

/**
 * Generates high-fidelity HTML designed for html2canvas to turn into a printable card.
 */
export async function generatePlaytestCardHTML(card, scale = 1) {
    const CARD_FONT = "Arial, sans-serif";
    const CARD_TITLE_FONT = "Impact, Arial, sans-serif";
    
    const width = 240 * scale;
    const height = 336 * scale;
    const innerPadding = 12 * scale;
    const statFontSize = 18 * scale;
    const textBoxFontSize = 11 * scale;
    
    const typeColors = {
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

    const cardColor = typeColors[card.card_type] || '#333';
    const title = card.title || "Unknown Card";
    
    // Auto-font sizing for long titles
    let titleFontSize = 18 * scale;
    if (title.length > 15) titleFontSize = 15 * scale;
    if (title.length > 22) titleFontSize = 12 * scale;

    const damage = (card.damage !== null && card.damage !== undefined) ? card.damage : '—';
    const momentum = (card.momentum !== null && card.momentum !== undefined) ? card.momentum : '—';
    const cost = (card.cost !== null && card.cost !== undefined) ? card.cost : '—';

    // Format text box (Keywords in bold)
    let formattedText = card.text_box?.raw_text || "";
    const keywordDb = state.get('keywordDatabase') || {};
    Object.keys(keywordDb).forEach(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        formattedText = formattedText.replace(regex, `<strong>${kw}</strong>`);
    });

    return `
        <div style="width: ${width}px; height: ${height}px; background: white; border: ${1 * scale}px solid #000; box-sizing: border-box; display: flex; flex-direction: column; padding: ${innerPadding}px; position: relative; font-family: ${CARD_FONT}; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${5 * scale}px;">
                <div style="display: flex; gap: ${5 * scale}px;">
                    <div style="background: #eee; border: 1px solid #000; padding: 2px 5px; font-weight: bold; font-size: ${statFontSize}px;">D:${damage}</div>
                    <div style="background: #eee; border: 1px solid #000; padding: 2px 5px; font-weight: bold; font-size: ${statFontSize}px;">M:${momentum}</div>
                </div>
                <div style="background: ${cardColor}; color: white; border: 1px solid #000; padding: 2px 8px; font-weight: bold; font-size: ${statFontSize}px;">C:${cost}</div>
            </div>

            <div style="font-family: ${CARD_TITLE_FONT}; font-size: ${titleFontSize}px; text-transform: uppercase; margin-bottom: ${5 * scale}px; border-bottom: ${2 * scale}px solid ${cardColor};">
                ${title}
            </div>

            <div style="flex-grow: 1; background: #fafafa; border: 1px dashed #ccc; margin-bottom: ${5 * scale}px; display: flex; align-items: center; justify-content: center; color: #ccc; font-style: italic;">
                [Art Placeholder]
            </div>

            <div style="background: ${cardColor}; color: white; font-weight: bold; font-size: ${10 * scale}px; padding: 2px 5px; margin-bottom: ${5 * scale}px; text-transform: uppercase;">
                ${card.card_type} ${card.set || ''}
            </div>

            <div style="border: 1px solid #000; padding: ${5 * scale}px; font-size: ${textBoxFontSize}px; line-height: 1.2; height: 100px; overflow: hidden; background: #fff;">
                ${formattedText}
            </div>
        </div>
    `;
}

