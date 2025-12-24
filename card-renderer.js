// card-renderer.js
import * as state from './config.js';
import { toPascalCase } from './config.js';

// Better font stack for card text
const CARD_FONT_FAMILY = '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif';
const CARD_TITLE_FONT_FAMILY = '"Impact", "Arial Black", "Franklin Gothic Heavy", sans-serif';

function getFittedTitleHTML(title, container, fontSizeMultiplier = 1) {
    let fontSize = 64 * fontSizeMultiplier;
    const MAX_WIDTH = 400 * fontSizeMultiplier;
    const MIN_FONT_SIZE = 32 * fontSizeMultiplier;
    const ruler = document.createElement('span');
    ruler.style.visibility = 'hidden';
    ruler.style.position = 'absolute';
    ruler.style.whiteSpace = 'nowrap';
    ruler.style.fontWeight = '900';
    ruler.style.fontFamily = CARD_TITLE_FONT_FAMILY;
    ruler.textContent = title;
    container.appendChild(ruler);
    while (fontSize > MIN_FONT_SIZE) {
        ruler.style.fontSize = `${fontSize}px`;
        if (ruler.offsetWidth <= MAX_WIDTH) break;
        fontSize -= 2;
    }
    container.removeChild(ruler);
    return `<div style="font-size: ${fontSize}px; font-weight: 900; font-family: ${CARD_TITLE_FONT_FAMILY}; text-align: center; flex-grow: 1; letter-spacing: -0.5px;">${title}</div>`;
}

export function generateCardVisualHTML(card) {
    const imageName = toPascalCase(card.title);
    const imagePath = `./card-images/${imageName}.png`;
    const typeClass = `type-${card.card_type.toLowerCase()}`;
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
    return `<img src="${imagePath}" alt="${card.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div style="display: none;">${placeholderHTML}</div>`;
}

export async function generatePlaytestCardHTML(card, tempContainer, width = 750, height = 1050) {
    const isPersona = card.card_type === 'Wrestler' || card.card_type === 'Manager';
    const keywords = card.text_box?.keywords || [];
    const traits = card.text_box?.traits || [];
    
    // Calculate scale factor
    const scale = width / 750;
    
    // Scale all dimensions proportionally
    const titleFontSize = 64 * scale;
    const statFontSize = 50 * scale;
    const artHeight = 200 * scale;
    const typeLineFontSize = 52 * scale;
    const textBoxFontSizeBase = 42 * scale;
    const reminderFontSize = Math.max(0.75 * scale, 0.6); // Minimum 0.6em
    const borderRadius = 35 * scale;
    const padding = 30 * scale;
    const borderWidth = 15 * scale;
    const innerPadding = 25 * scale;
    const lineHeight = 1.3; // Better line spacing for readability

    let keywordsText = keywords.map(kw => {
        const definition = state.keywordDatabase[kw.name.trim()] || 'Definition not found.';
        return `<strong style="font-family: ${CARD_FONT_FAMILY};">${kw.name.trim()}:</strong> <span style="font-size: ${reminderFontSize}em; font-style: italic; font-family: ${CARD_FONT_FAMILY};">${definition}</span>`;
    }).join('<br><br>');

    let traitsText = traits.map(tr => `<strong style="font-family: ${CARD_FONT_FAMILY};">${tr.name.trim()}</strong>`).join(', ');
    if (traitsText) {
        traitsText = `<p style="margin-bottom: ${25 * scale}px; font-family: ${CARD_FONT_FAMILY};"><span style="font-size: ${reminderFontSize}em; font-style: italic;">${traitsText}</span></p>`;
    }

    const reminderBlock = traitsText + keywordsText;
    const targetTrait = traits.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;
    const typeColors = { 'Action': '#9c5a9c', 'Response': '#c84c4c', 'Submission': '#5aa05a', 'Strike': '#4c82c8', 'Grapple': '#e68a00' };
    const typeColor = typeColors[card.card_type] || '#6c757d';

    let rawText = card.text_box?.raw_text || '';
    const abilityKeywords = ['Ongoing', 'Enters', 'Finisher', 'Tie-Up Action', 'Recovery Action', 'Tie-Up Enters', 'Ready Enters'];
    const personaExceptions = ['Chris Jericho']; 
    const delimiter = '|||';
    let tempText = rawText;
    abilityKeywords.forEach(kw => {
        const regex = new RegExp(`(^|\\s)(${kw})`, 'g');
        tempText = tempText.replace(regex, `$1${delimiter}$2`);
    });
    let lines = tempText.split(delimiter).map(line => line.trim()).filter(line => line);
    const finalLines = [];
    if (lines.length > 0) {
        finalLines.push(lines[0]);
        for (let i = 1; i < lines.length; i++) {
            const previousLine = finalLines[finalLines.length - 1];
            const currentLine = lines[i];
            const endsWithPersona = personaExceptions.some(persona => previousLine.endsWith(persona));
            const isGainQuote = previousLine.includes("gains '");
            if (endsWithPersona || isGainQuote) {
                finalLines[finalLines.length - 1] += ` ${currentLine}`;
            } else {
                finalLines.push(currentLine);
            }
        }
    }
    
    // Format text with better typography
    const formattedText = finalLines.map(line => {
        // Make keywords bold
        abilityKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            line = line.replace(regex, `<strong style="font-family: ${CARD_FONT_FAMILY};">${kw}</strong>`);
        });
        // Make card names italic
        const cardNameRegex = /'([^']+)'/g;
        line = line.replace(cardNameRegex, `<em style="font-family: ${CARD_FONT_FAMILY};">'$1'</em>`);
        return `<p style="margin: 0 0 ${8 * scale}px 0; font-family: ${CARD_FONT_FAMILY};">${line}</p>`;
    }).join('');

    const fullText = formattedText + reminderBlock;
    let textBoxFontSize = textBoxFontSizeBase;
    if (fullText.length > 250) { 
        textBoxFontSize = 34 * scale;
    } else if (fullText.length > 180) { 
        textBoxFontSize = 38 * scale;
    }

    const titleHTML = getFittedTitleHTML(card.title, tempContainer, scale);
    const costBoxSize = 60 * scale;
    const costPadding = 15 * scale;
    const costHTML = !isPersona ? `<div style="font-size: ${costBoxSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT_FAMILY}; border: ${3 * scale}px solid black; padding: ${costPadding}px ${35 * scale}px; border-radius: ${15 * scale}px; flex-shrink: 0;">${card.cost ?? '–'}</div>` : `<div style="width: ${120 * scale}px; flex-shrink: 0;"></div>`;
    const typeLineHTML = !isPersona ? `<div style="padding: ${15 * scale}px; text-align: center; font-size: ${typeLineFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT_FAMILY}; border-radius: ${15 * scale}px; margin-bottom: ${15 * scale}px; color: white; background-color: ${typeColor};">${card.card_type}</div>` : `<div style="text-align: center; font-size: ${typeLineFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT_FAMILY}; color: #6c757d; margin-bottom: ${15 * scale}px;">${card.card_type}</div>`;

    return `
        <div style="background-color: white; border: ${borderWidth}px solid black; border-radius: ${borderRadius}px; box-sizing: border-box; width: ${width}px; height: ${height}px; padding: ${padding}px; display: flex; flex-direction: column; color: black; font-family: ${CARD_FONT_FAMILY};">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: ${3 * scale}px solid black; padding-bottom: ${15 * scale}px; margin-bottom: ${15 * scale}px; gap: ${15 * scale}px;">
                <div style="font-size: ${statFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT_FAMILY}; line-height: 1.2; flex-shrink: 0; min-width: ${120 * scale}px;">
                    ${!isPersona ? `<span>D: ${card.damage ?? '–'}</span><br>` : ''}
                    <span>M: ${card.momentum ?? '–'}</span>
                    ${targetValue ? `<br><span>T: ${targetValue}</span>` : ''}
                </div>
                ${titleHTML}
                ${costHTML}
            </div>
            <div style="height: ${artHeight}px; border: ${3 * scale}px solid #ccc; border-radius: ${20 * scale}px; margin-bottom: ${15 * scale}px; display: flex; align-items: center; justify-content: center; font-style: italic; font-size: ${40 * scale}px; color: #888; font-family: ${CARD_FONT_FAMILY};">Art Area</div>
            ${typeLineHTML}
            <div style="background-color: #f8f9fa; border: ${2 * scale}px solid #ccc; border-radius: ${20 * scale}px; padding: ${innerPadding}px; font-size: ${textBoxFontSize}px; line-height: ${lineHeight}; text-align: center; white-space: pre-wrap; flex-grow: 1; overflow-y: auto; font-family: ${CARD_FONT_FAMILY};">
                ${formattedText}
                ${reminderBlock ? `<hr style="border-top: ${2 * scale}px solid #ccc; margin: ${25 * scale}px 0;"><div style="margin-bottom: 0; font-family: ${CARD_FONT_FAMILY};">${reminderBlock}</div>` : ''}
            </div>
        </div>
    `;
}
