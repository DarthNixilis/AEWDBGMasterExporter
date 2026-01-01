// exporter.js
import { store as state } from './store.js';
import { generatePlaytestCardHTML } from './card-renderer.js';

function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

export function generatePlainTextDeck() {
    const activePersonaTitles = [];
    const wrestler = state.get('selectedWrestler');
    const manager = state.get('selectedManager');
    const startingDeck = state.get('startingDeck');
    const purchaseDeck = state.get('purchaseDeck');

    if (wrestler) activePersonaTitles.push(wrestler.title);
    if (manager) activePersonaTitles.push(manager.title);
    
    const kitCards = state.get('cardDatabase').filter(card => 
        state.isKitCard(card) && activePersonaTitles.includes(card['Signature For'])
    ).sort((a, b) => a.title.localeCompare(b.title));
    
    let text = `Wrestler: ${wrestler ? wrestler.title : 'None'}\n`;
    text += `Manager: ${manager ? manager.title : 'None'}\n`;
    kitCards.forEach((card, index) => { text += `Kit${index + 1}: ${card.title}\n`; });
    
    text += `\n--- Starting Deck (${startingDeck.length}/24) ---\n`;
    const startingCounts = startingDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { 
        text += `${count}x ${cardTitle}\n`; 
    });

    text += `\n--- Purchase Deck (${purchaseDeck.length}) ---\n`;
    const purchaseCounts = purchaseDeck.reduce((acc, cardTitle) => { acc[cardTitle] = (acc[cardTitle] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cardTitle, count]) => { 
        text += `${count}x ${cardTitle}\n`; 
    });

    return text;
}

export async function exportDeckAsImage() {
    const startingDeckTitles = state.get('startingDeck');
    const purchaseDeckTitles = state.get('purchaseDeck');
    const cardCache = state.get('cardTitleCache');

    const allCardsToPrint = [
        ...startingDeckTitles.map(title => cardCache[title.toLowerCase()]),
        ...purchaseDeckTitles.map(title => cardCache[title.toLowerCase()])
    ].filter(card => card !== undefined);

    if (allCardsToPrint.length === 0) {
        alert("Deck is empty!");
        return;
    }

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    document.body.appendChild(tempContainer);

    const DPI = 96;
    const CARD_RENDER_WIDTH_PX = Math.round(2.5 * DPI);
    const CARD_RENDER_HEIGHT_PX = Math.round(3.5 * DPI);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(8.5 * DPI);
    canvas.height = Math.round(11 * DPI);
    const ctx = canvas.getContext('2d');

    const cardsPerPage = 9;
    const totalPages = Math.ceil(allCardsToPrint.length / cardsPerPage);

    for (let page = 0; page < totalPages; page++) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const startIndex = page * cardsPerPage;
        const endIndex = Math.min(startIndex + cardsPerPage, allCardsToPrint.length);
        const cardsOnThisPage = allCardsToPrint.slice(startIndex, endIndex);

        for (let i = 0; i < cardsOnThisPage.length; i++) {
            const card = cardsOnThisPage[i];
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = (0.5 * DPI) + (col * CARD_RENDER_WIDTH_PX);
            const y = (0.5 * DPI) + (row * CARD_RENDER_HEIGHT_PX);
            
            const playtestHTML = await generatePlaytestCardHTML(card);
            tempContainer.innerHTML = playtestHTML;
            const playtestElement = tempContainer.firstElementChild;

            try {
                const cardCanvas = await html2canvas(playtestElement, { 
                    width: CARD_RENDER_WIDTH_PX, 
                    height: CARD_RENDER_HEIGHT_PX, 
                    scale: 2, 
                    logging: false,
                    useCORS: true
                });
                ctx.drawImage(cardCanvas, x, y, CARD_RENDER_WIDTH_PX, CARD_RENDER_HEIGHT_PX);
            } catch (error) {
                console.error(`Failed to render card "${card.title}":`, error);
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        const wrestlerName = wrestler ? toPascalCase(wrestler.title) : "Deck";
        a.download = `${wrestlerName}-Page-${page + 1}.png`;
        a.click();
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    document.body.removeChild(tempContainer);
}

export function generateLackeyCCGDeck() {
    // Basic implementation for Lackey format
    const wrestler = state.get('selectedWrestler');
    const startingDeck = state.get('startingDeck');
    const purchaseDeck = state.get('purchaseDeck');
    
    let text = "CardName\tCardNum\tQuantity\tSideboard\n";
    if (wrestler) text += `${wrestler.title}\t\t1\t\n`;
    
    const startingCounts = startingDeck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
    Object.entries(startingCounts).forEach(([title, count]) => {
        text += `${title}\t\t${count}\t\n`;
    });
    
    const purchaseCounts = purchaseDeck.reduce((acc, title) => { acc[title] = (acc[title] || 0) + 1; return acc; }, {});
    Object.entries(purchaseCounts).forEach(([title, count]) => {
        text += `${title}\t\t${count}\ty\n`;
    });
    
    return text;
}

