// master-export.js
import { store as state } from './store.js';

// Helper function to create PascalCase strings (e.g., "John Silver" -> "JohnSilver")
function toPascalCase(str) {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

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

// Helper to check if a value is actually valid
function isValidStat(value) {
    return value !== null && value !== undefined && value !== '' && value !== 'N/A' && value !== 'N/a';
}

// Load JSZip dynamically if not present
async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);
        return new Promise((resolve) => {
            script.onload = () => resolve(window.JSZip);
        });
    } catch (e) {
        console.error("Failed to load JSZip", e);
        return null;
    }
}

async function exportSingleZip(cards, zipName, options) {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const folder = zip.folder("cards");
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    const { generatePlaytestCardHTML } = await import('./card-renderer.js');

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const fileName = getCleanFileName(card.title, card.card_type, options.usePascalCase);
        
        try {
            const html = await generatePlaytestCardHTML(card);
            tempContainer.innerHTML = html;
            const element = tempContainer.firstElementChild;
            
            const canvas = await html2canvas(element, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: null
            });
            
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            folder.file(`${fileName}.png`, blob);
            console.log(`Processed ${i + 1}/${cards.length}: ${card.title}`);
        } catch (err) {
            console.error(`Error rendering ${card.title}:`, err);
        }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = zipName;
    link.click();
    
    document.body.removeChild(tempContainer);
}

export async function exportAllCardsAsImages() {
    const database = state.get('cardDatabase');
    if (!database || database.length === 0) {
        alert("Card database not loaded!");
        return;
    }

    // Group cards by type for the user to choose
    const groups = database.reduce((acc, card) => {
        const type = card.card_type || 'Unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(card);
        return acc;
    }, {});

    const options = { usePascalCase: true };
    
    // Create a simple selection modal
    const typeModal = document.createElement('div');
    typeModal.className = 'modal-backdrop';
    typeModal.style.display = 'flex';
    typeModal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <h3>Bulk Export</h3>
            <p>Select a card type to export as a ZIP of images:</p>
            <select id="typeSelect" style="width: 100%; padding: 10px; margin: 10px 0;">
                ${Object.keys(groups).sort().map(type => 
                    `<option value="${type}">${type} (${groups[type].length} cards)</option>`
                ).join('')}
            </select>
            <div style="display:flex; justify-content:space-between; margin-top:20px;">
                <button id="typeCancelBtn" class="secondary">Cancel</button>
                <button id="typeConfirmBtn">Export ZIP</button>
            </div>
        </div>
    `;
    document.body.appendChild(typeModal);

    return new Promise((resolve) => {
        document.getElementById('typeCancelBtn').onclick = () => {
            typeModal.remove();
            resolve();
        };

        document.getElementById('typeConfirmBtn').onclick = async () => {
            const selectedType = document.getElementById('typeSelect').value;
            typeModal.remove();
            
            const cards = groups[selectedType];
            const zipName = `AEW_${selectedType.replace(/\s+/g, '_')}_Cards.zip`;
            
            await exportSingleZip(cards, zipName, options);
            resolve();
        };
    });
}

