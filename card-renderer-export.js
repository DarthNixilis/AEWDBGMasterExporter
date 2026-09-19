// card-renderer-export.js

import * as state from './config.js';

// Special renderer for exported cards.
// - LackeyCCG size uses the dedicated Lackey 214x308 template (special needs).
// - All other sizes use the SAME layout as the deck image export (generatePlaytestCardHTML look).
export function generateCardVisualHTMLForExport(card, options = {}) {
    const isLackeySize = options.size === 'lackey' || options.width === 214;

    // ---------------------------
    // LACKEY 214x308 TEMPLATE (unchanged - special needs)
    // ---------------------------
    if (isLackeySize) {
        const getCardColor = (type) => {
            switch (type) {
                case 'Action':      return '#9B59B6'; // purple
                case 'Wrestler':    return '#3E3E3E'; // dark gray
                case 'Manager':     return '#3E3E3E'; // persona vibe
                case 'Response':    return '#C05050'; // red
                case 'Submission':  return '#63A85C'; // green
                case 'Grapple':     return '#D79A1E'; // orange
                case 'Strike':      return '#4D82C6'; // blue
                case 'Boon':        return '#18A7B5'; // teal
                case 'Faction':     return '#28C2A1'; // mint/teal-green
                case 'Injury':      return '#FF7900'; // orange
                case 'Call Name':   return '#2E86C1'; // fallback
                default:            return '#777777';
            }
        };

        const formatTextPlainish = (text) => {
            if (!text) return '';
            let formatted = String(text).trim();

            formatted = formatted
                .replace(/\b(Enters|Ongoing|Trigger|Follow-Up|Finisher|Sudden|Permanent|Resilient|Relentless|Power Attack|Focus Attack|Cunning Attack|Combo Attack|Hidden|Set-up|Stealth Attack|High Risk|Sturdy|Aggressive|Risky|Illegal|Retaliate|Tie-Up|Ready|Recovery|Response|Reverse|Special|Cycling|Rope Break|Capitalize|Turned|Knockout|Pin|Submit|Passout)\b/gi, '<strong>$1</strong>')
                .replace(/\b(Scout|Attempt|Tuck|Cycle|Market|Commit|Uncommit|Stun|Discard|Draw|Gain|Lose|Pay|Play|Purchase|Reveal|Shuffle|Search|Look|Choose|Create|Put)\b/gi, '<strong>$1</strong>');

            // sentence breaks
            formatted = formatted.replace(/\.\s+/g, '.<br>');

            return formatted;
        };

        const typeBarColor = getCardColor(card.card_type);
        const costDisplay = (card.cost !== null && card.cost !== undefined) ? card.cost : '';
        const damageDisplay = (card.damage !== null && card.damage !== undefined) ? card.damage : '0';
        const momentumDisplay = (card.momentum !== null && card.momentum !== undefined) ? card.momentum : '0';

        let gameText = card.text_box?.raw_text ? formatTextPlainish(card.text_box.raw_text) : '';

        // Target (for maneuvers)
        let target = '';
        if (card.text_box && card.text_box.traits) {
            const targetTrait = card.text_box.traits.find(t => t && t.name && t.name.trim() === 'Target');
            if (targetTrait && targetTrait.value) {
                target = targetTrait.value;
            }
        }

        // Starting persona label (strip Wrestler/Manager from the end)
        let startingPersonaLabel = '';
        if (card && card['Starting'] && String(card['Starting']).trim() !== '') {
            startingPersonaLabel = String(card['Starting']).trim()
                .replace(/\s*(Wrestler|Manager)\s*$/i, '')
                .trim();
        }

        // Signature For kit (optional fallback only when NOT Starting)
        let signaturePersonaLabel = '';
        if (!startingPersonaLabel && card && card['Signature For'] && String(card['Signature For']).trim() !== '') {
            signaturePersonaLabel = String(card['Signature For']).trim()
                .replace(/\s*(Wrestler|Manager)\s*$/i, '')
                .trim();
        }

        const isManeuver = ['Strike', 'Grapple', 'Submission'].includes(card.card_type);
        const finalDamageDisplay = isManeuver && target ? `${damageDisplay} [T:${target}]` : damageDisplay;

        // Only prepend kit header into TEXT BOX when it's Signature For (not Starting)
        const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);
        const showSignatureHeaderInText = signaturePersonaLabel && !isPersonaCard;
        if (showSignatureHeaderInText) {
            gameText = `<div style="font-size: 14px; color: #666; margin-bottom: 8px; border-bottom: 1px dashed #ddd; padding-bottom: 5px;">${signaturePersonaLabel}</div>${gameText}`;
        }

        // Layout constants
        const titleTop = 6;
        const titleLeft = 6;
        const titleRight = 6;

        // Title is one line only
        const titleBandHeight = 24;

        // Move stats + cost up
        const statsTop = titleTop + titleBandHeight + 2;
        const costTop = statsTop;
        const costRight = 6;

        // Persona label under cost aligned with the M row
        const personaLabelTop = statsTop + 42 + 6;

        // Aggressive text sizing
        let estimatedFontSize = 20;
        let estimatedLineHeight = 1.05;

        if (gameText) {
            const textOnly = gameText.replace(/<[^>]*>/g, '');
            const textLength = textOnly.length;
            const lineCount = (gameText.match(/<br>/g) || []).length + 1;

            if (textLength > 400 || lineCount > 8) {
                estimatedFontSize = 10;
                estimatedLineHeight = 0.9;
            } else if (textLength > 300 || lineCount > 6) {
                estimatedFontSize = 12;
                estimatedLineHeight = 0.95;
            } else if (textLength > 200 || lineCount > 4) {
                estimatedFontSize = 14;
                estimatedLineHeight = 1.0;
            } else if (textLength > 100 || lineCount > 3) {
                estimatedFontSize = 16;
                estimatedLineHeight = 1.0;
            }

            console.log(`Card "${card.title}": ${textLength} chars, ${lineCount} lines -> font-size: ${estimatedFontSize}px`);
        }

        return `
            <div class="aew-lackey-card" style="
                width: ${options.width || 214}px;
                height: ${options.height || 308}px;
                background: #ffffff;
                border: 2px solid #000;
                border-radius: 0px;
                position: relative;
                overflow: hidden;
                font-family: Arial, sans-serif;
                box-sizing: border-box;
            ">
                <!-- Title (ONE LINE ONLY) -->
                <div class="aew-lackey-title" style="
                    position: absolute;
                    left: ${titleLeft}px;
                    right: ${titleRight}px;
                    top: ${titleTop}px;
                    font-weight: 900;
                    font-size: 20px;
                    line-height: 1.0;
                    height: ${titleBandHeight}px;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                ">${card.title || ''}</div>

                <!-- Stats left: D / M (moved up) -->
                <div class="aew-lackey-stats" style="
                    position: absolute;
                    left: 8px;
                    top: ${statsTop}px;
                    font-weight: 900;
                    font-size: 42px;
                    line-height: 0.95;
                ">
                    <div style="font-size: 42px;">D: ${finalDamageDisplay}</div>
                    <div style="font-size: 42px; margin-top: 6px;">M: ${momentumDisplay}</div>
                </div>

                <!-- Cost box (moved up) -->
                <div class="aew-lackey-costbox" style="
                    position: absolute;
                    top: ${costTop}px;
                    right: ${costRight}px;
                    width: 56px;
                    height: 56px;
                    border: 2px solid #000;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 46px;
                    box-sizing: border-box;
                ">${costDisplay}</div>

                <!-- Starting Persona label under cost on the M line -->
                ${startingPersonaLabel ? `
                    <div class="aew-lackey-startinglabel" style="
                        position: absolute;
                        top: ${personaLabelTop}px;
                        right: ${costRight}px;
                        width: 56px;
                        text-align: center;
                        font-weight: 900;
                        font-size: 9px;
                        line-height: 1.0;
                        color: #000;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    ">${startingPersonaLabel}</div>
                ` : ''}

                <!-- Type bar (small) -->
                <div class="aew-lackey-typebar" style="
                    position: absolute;
                    left: 10px;
                    right: 10px;
                    top: 132px;
                    height: 24px;
                    background: ${typeBarColor};
                    border: 2px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 900;
                    font-size: 18px;
                    letter-spacing: 0.8px;
                    color: #fff;
                    text-transform: uppercase;
                    box-sizing: border-box;
                ">${card.card_type || ''}</div>

                <!-- Text box with auto-sizing (no mid-word breaks) -->
                <div class="aew-lackey-textbox aew-export-textbox" style="
                    position: absolute;
                    left: 10px;
                    right: 10px;
                    top: 164px;
                    bottom: 10px;
                    background: #fff;
                    border: 2px solid #DDD;
                    box-sizing: border-box;
                    padding: 10px;
                    font-weight: 800;
                    font-size: ${estimatedFontSize}px;
                    line-height: ${estimatedLineHeight};
                    overflow: hidden;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <div class="text-content" style="
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <div style="
                            max-width: 100%;
                            max-height: 100%;
                            overflow: hidden;

                            /* IMPORTANT: avoid mid-word breaks */
                            white-space: normal;
                            word-break: normal;
                            overflow-wrap: break-word;

                            /* Optional: avoid weird auto hyphens */
                            hyphens: none;

                            font-size: inherit;
                            line-height: inherit;
                        ">${gameText}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ---------------------------
    // STANDARD EXPORT TEMPLATE
    // Matches the deck image export (generatePlaytestCardHTML) layout.
    // ---------------------------

    const CARD_FONT = 'Arial, Helvetica, sans-serif';
    const CARD_TITLE_FONT = 'Arial Black, Arial, sans-serif';

    const width = options.width || 750;
    const height = options.height || 1050;

    const isPersona = ['Wrestler', 'Manager'].includes(card.card_type);
    const isPersonaCard = ['Wrestler', 'Manager', 'Call Name', 'Faction'].includes(card.card_type);

    const keywords = card.text_box?.keywords || [];
    const traits = card.text_box?.traits || [];

    // Scale factor relative to the 750x1050 base
    const scale = width / 750;

    const titleFontSize = 64 * scale;
    const statFontSize = 50 * scale;
    const artHeight = 200 * scale;
    const typeLineFontSize = 52 * scale;
    const textBoxFontSizeBase = 42 * scale;
    const reminderFontSize = 38 * scale;
    const borderRadius = 35 * scale;
    const padding = 30 * scale;
    const borderWidth = 15 * scale;
    const innerPadding = 25 * scale;

    let keywordsText = keywords.map(kw => {
        const definition = state.keywordDatabase[kw.name.trim()] || 'Definition not found.';
        return `<strong style="font-family: ${CARD_FONT};">${kw.name.trim()}:</strong> <span style="font-size: ${reminderFontSize}px; font-style: italic; font-family: ${CARD_FONT};">${definition}</span>`;
    }).join('<br><br>');

    let traitsText = traits.map(tr => `<strong style="font-family: ${CARD_FONT};">${tr.name.trim()}</strong>`).join(', ');
    if (traitsText) {
        traitsText = `<p style="margin-bottom: ${25 * scale}px; font-family: ${CARD_FONT};"><span style="font-size: ${reminderFontSize}px; font-style: italic;">${traitsText}</span></p>`;
    }

    const reminderBlock = traitsText + keywordsText;

    const targetTrait = traits.find(t => t.name.trim() === 'Target');
    const targetValue = targetTrait ? targetTrait.value : null;

    const typeColors = {
        'Action': '#9c5a9c',
        'Response': '#c84c4c',
        'Submission': '#5aa05a',
        'Strike': '#4c82c8',
        'Grapple': '#e68a00',
        'Wrestler': '#333333',
        'Manager': '#666666'
    };
    const typeColor = typeColors[card.card_type] || '#6c757d';

    // Kit persona header (for non-persona cards with a Starting value)
    let kitPersona = '';
    if (card['Starting'] && String(card['Starting']).trim() !== '') {
        kitPersona = String(card['Starting']).trim()
            .replace(/\s*(Wrestler|Manager|Call Name|Faction)\s*$/i, '')
            .trim();
    }
    const showKitInfo = kitPersona && !isPersonaCard;

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

    // Format text with simple fonts
    const formattedText = finalLines.map(line => {
        abilityKeywords.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            line = line.replace(regex, `<strong style="font-family: ${CARD_FONT};">${kw}</strong>`);
        });
        const cardNameRegex = /'([^']+)'/g;
        line = line.replace(cardNameRegex, `<em style="font-family: ${CARD_FONT};">'$1'</em>`);
        return `<p style="margin: 0 0 ${8 * scale}px 0; font-family: ${CARD_FONT};">${line}</p>`;
    }).join('');

    // Prepend kit persona header if applicable
    const kitHeaderHTML = showKitInfo
        ? `<div style="font-size: ${reminderFontSize}px; font-style: italic; color: #666; margin-bottom: ${10 * scale}px; border-bottom: ${2 * scale}px dashed #ddd; padding-bottom: ${6 * scale}px; font-family: ${CARD_FONT};">${kitPersona}</div>`
        : '';

    const fullText = kitHeaderHTML + formattedText + reminderBlock;
    let textBoxFontSize = textBoxFontSizeBase;
    if (fullText.length > 250) {
        textBoxFontSize = 34 * scale;
    } else if (fullText.length > 180) {
        textBoxFontSize = 38 * scale;
    }

    // Simple title fitting
    const title = card.title;
    let fittedTitleFontSize = titleFontSize;
    if (title.length > 25) fittedTitleFontSize = titleFontSize * 0.8;
    if (title.length > 35) fittedTitleFontSize = titleFontSize * 0.7;
    if (title.length > 45) fittedTitleFontSize = titleFontSize * 0.6;

    const costBoxSize = 60 * scale;
    const costPadding = 15 * scale;
    const costHTML = !isPersona
        ? `<div style="font-size: ${costBoxSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; border: ${3 * scale}px solid black; padding: ${costPadding}px ${35 * scale}px; border-radius: ${15 * scale}px; flex-shrink: 0;">${card.cost ?? '–'}</div>`
        : `<div style="width: ${120 * scale}px; flex-shrink: 0;"></div>`;

    const typeLineHTML = !isPersona
        ? `<div style="padding: ${15 * scale}px; text-align: center; font-size: ${typeLineFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; border-radius: ${15 * scale}px; margin-bottom: ${15 * scale}px; color: white; background-color: ${typeColor};">${card.card_type}</div>`
        : `<div style="text-align: center; font-size: ${typeLineFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; color: #6c757d; margin-bottom: ${15 * scale}px;">${card.card_type}</div>`;

    const html = `
        <div style="position: relative; background-color: white; border: ${borderWidth}px solid black; border-radius: ${borderRadius}px; box-sizing: border-box; width: ${width}px; height: ${height}px; padding: ${padding}px; display: flex; flex-direction: column; color: black; overflow: hidden; font-family: ${CARD_FONT};">
            <!-- Header with stats, title, and cost -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: ${3 * scale}px solid black; padding-bottom: ${15 * scale}px; margin-bottom: ${15 * scale}px; gap: ${15 * scale}px;">
                <!-- Left: Damage, Momentum, Target -->
                <div style="font-size: ${statFontSize}px; font-weight: bold; font-family: ${CARD_TITLE_FONT}; line-height: 1.2; flex-shrink: 0; min-width: ${120 * scale}px;">
                    ${!isPersona ? `<div>D: ${card.damage ?? '–'}</div>` : ''}
                    <div>M: ${card.momentum ?? '–'}</div>
                    ${targetValue ? `<div>T: ${targetValue}</div>` : ''}
                </div>

                <!-- Center: Title -->
                <div style="flex-grow: 1; text-align: center; display: flex; align-items: center; justify-content: center; min-height: ${statFontSize * 1.5}px;">
                    <div style="font-size: ${fittedTitleFontSize}px; font-weight: 900; font-family: ${CARD_TITLE_FONT}; line-height: 1.1; max-width: 100%;">${title}</div>
                </div>

                <!-- Right: Cost -->
                ${costHTML}
            </div>

            <!-- Art Area -->
            <div style="height: ${artHeight}px; border: ${3 * scale}px solid #ccc; border-radius: ${20 * scale}px; margin-bottom: ${15 * scale}px; display: flex; align-items: center; justify-content: center; font-style: italic; font-size: ${40 * scale}px; color: #888; background-color: #f0f0f0; font-family: ${CARD_FONT};">
                Art Area
            </div>

            <!-- Type Line -->
            ${typeLineHTML}

            <!-- Text Box -->
            <div style="background-color: #f8f9fa; border: ${2 * scale}px solid #ccc; border-radius: ${20 * scale}px; padding: ${innerPadding}px; font-size: ${textBoxFontSize}px; line-height: 1.3; text-align: center; white-space: pre-wrap; flex-grow: 1; overflow-y: auto; font-family: ${CARD_FONT};">
                ${kitHeaderHTML}
                ${formattedText}
                ${reminderBlock ? `<hr style="border-top: ${2 * scale}px solid #ccc; margin: ${25 * scale}px 0;"><div style="margin-bottom: 0; font-family: ${CARD_FONT};">${reminderBlock}</div>` : ''}
            </div>
        </div>
    `;

    return html;
}

// Add this function to handle auto-sizing in master-export.js
export function applyLackeyTextAutoSizing(cardContainer) {
    if (!cardContainer) return;

    const textBox = cardContainer.querySelector('.aew-lackey-textbox');
    const textContent = textBox?.querySelector('.text-content > div');

    if (!textBox || !textContent) return;

    const textOnly = textContent.textContent || textContent.innerText;
    const textLength = textOnly.length;

    const textBoxWidth = textBox.offsetWidth - 20;
    const textBoxHeight = textBox.offsetHeight - 20;

    let fontSize = 20;
    let lineHeight = 1.05;

    if (textLength > 400) {
        fontSize = 10;
        lineHeight = 0.9;
    } else if (textLength > 300) {
        fontSize = 12;
        lineHeight = 0.95;
    } else if (textLength > 200) {
        fontSize = 14;
        lineHeight = 1.0;
    } else if (textLength > 100) {
        fontSize = 16;
        lineHeight = 1.0;
    }

    textContent.style.fontSize = fontSize + 'px';
    textContent.style.lineHeight = lineHeight;

    let attempts = 0;
    while ((textContent.scrollHeight > textBoxHeight || textContent.scrollWidth > textBoxWidth) &&
        fontSize > 8 && attempts < 20) {
        fontSize -= 0.5;
        lineHeight = Math.max(0.8, lineHeight - 0.01);
        textContent.style.fontSize = fontSize + 'px';
        textContent.style.lineHeight = lineHeight;
        attempts++;
    }

    if (textContent.scrollHeight > textBoxHeight || textContent.scrollWidth > textBoxWidth) {
        textBox.style.overflowY = 'auto';
        textBox.style.alignItems = 'flex-start';
        textBox.style.justifyContent = 'flex-start';
    }

    console.log(`Auto-sized "${textOnly.substring(0, 30)}...": ${fontSize}px font, ${lineHeight} line-height`);
}
