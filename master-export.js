// master-export.js (enhanced with category options)
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

// Helper function to generate ZIP from cards
async function generateCardZip(cards, zipName) {
    if (cards.length === 0) {
        return null;
    }
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '750px';
    tempContainer.style.height = '1050px';
    document.body.appendChild(tempContainer);
    
    const CARD_WIDTH = 750;
    const CARD_HEIGHT = 1050;
    const DPI = 300;
    const PRINT_WIDTH = 2.5 * DPI;
    const PRINT_HEIGHT = 3.5 * DPI;
    
    const zip = new JSZip();
    const folder = zip.folder(zipName.replace('.zip', ''));
    
    let completed = 0;
    let failed = 0;
    
    // Process in batches
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
        const batch = cards.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (card) => {
            try {
                const cardHTML = await generatePlaytestCardHTML(card, tempContainer);
                tempContainer.innerHTML = cardHTML;
                const cardElement = tempContainer.firstElementChild;
                
                const canvas = document.createElement('canvas');
                canvas.width = PRINT_WIDTH;
                canvas.height = PRINT_HEIGHT;
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                const cardCanvas = await html2canvas(cardElement, {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    scale: 1,
                    backgroundColor: null,
                    logging: false,
                    useCORS: true
                });
                
                ctx.drawImage(cardCanvas, 0, 0, PRINT_WIDTH, PRINT_HEIGHT);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                const base64Data = dataUrl.replace(/^data:image\/(jpeg|jpg);base64,/, '');
                
                const cleanTitle = card.title.replace(/[^a-zA-Z0-9\s]/g, '');
                const fileName = toPascalCase(cleanTitle) + '.jpg';
                
                folder.file(fileName, base64Data, { base64: true });
                
                completed++;
                
            } catch (error) {
                console.error(`Error rendering card "${card.title}":`, error);
                failed++;
            }
        });
        
        await Promise.all(batchPromises);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    document.body.removeChild(tempContainer);
    
    if (completed === 0) {
        return null;
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return { blob: zipBlob, name: zipName, count: completed, failed: failed };
}

export async function exportAllCardsAsImages() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found in the database.");
        return;
    }
    
    const option = prompt(
        "Choose export option:\n" +
        "1. Single ZIP with all cards\n" +
        "2. Separate ZIPs by card type\n" +
        "3. Single ZIP by selected type\n" +
        "Enter 1, 2, or 3:"
    );
    
    if (!option) return;
    
    if (option === '1') {
        // Single ZIP with all cards
        if (!confirm(`This will generate a single ZIP file with ${allCards.length} card images. This may take several minutes. Continue?`)) {
            return;
        }
        
        const result = await generateCardZip(allCards, 'AEW-Complete-Set.zip');
        if (result) {
            downloadZip(result.blob, result.name);
            alert(`Generated ${result.name} with ${result.count} card images! ${result.failed > 0 ? `(${result.failed} failed)` : ''}`);
        }
        
    } else if (option === '2') {
        // Separate ZIPs by card type
        const cardsByType = groupCardsByType(allCards);
        const totalCards = Object.values(cardsByType).reduce((sum, cards) => sum + cards.length, 0);
        
        if (!confirm(`This will generate ${Object.keys(cardsByType).length} ZIP files (${totalCards} total cards). This may take a while. Continue?`)) {
            return;
        }
        
        // Show progress
        const progressDiv = createProgressDiv('Generating category ZIP files...');
        
        for (const [type, cards] of Object.entries(cardsByType)) {
            if (cards.length > 0) {
                progressDiv.innerHTML = `<div style="text-align: center;"><h3>Processing ${type} cards...</h3><p>(${cards.length} cards)</p></div>`;
                
                const result = await generateCardZip(cards, `AEW-${type}-Cards.zip`);
                if (result) {
                    downloadZip(result.blob, result.name);
                }
                
                // Small delay between downloads
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        document.body.removeChild(progressDiv);
        alert('All category ZIP files have been generated!');
        
    } else if (option === '3') {
        // Single ZIP by selected type
        const cardsByType = groupCardsByType(allCards);
        const types = Object.keys(cardsByType).filter(type => cardsByType[type].length > 0);
        
        const selectedType = prompt(
            `Select card type to export:\n${types.map((type, i) => `${i + 1}. ${type} (${cardsByType[type].length} cards)`).join('\n')}\nEnter number or type name:`
        );
        
        if (selectedType) {
            let typeIndex = parseInt(selectedType) - 1;
            let selectedTypeName = types[typeIndex] || selectedType;
            
            if (cardsByType[selectedTypeName] && cardsByType[selectedTypeName].length > 0) {
                const cards = cardsByType[selectedTypeName];
                if (confirm(`Generate ZIP file for ${selectedTypeName} (${cards.length} cards)?`)) {
                    const result = await generateCardZip(cards, `AEW-${selectedTypeName}-Cards.zip`);
                    if (result) {
                        downloadZip(result.blob, result.name);
                        alert(`Generated ${result.name} with ${result.count} ${selectedTypeName} card images!`);
                    }
                }
            } else {
                alert(`No cards found for type: ${selectedTypeName}`);
            }
        }
    }
}

// Helper functions
function groupCardsByType(cards) {
    return {
        Wrestler: cards.filter(c => c.card_type === 'Wrestler'),
        Manager: cards.filter(c => c.card_type === 'Manager'),
        Action: cards.filter(c => c.card_type === 'Action'),
        Grapple: cards.filter(c => c.card_type === 'Grapple'),
        Strike: cards.filter(c => c.card_type === 'Strike'),
        Submission: cards.filter(c => c.card_type === 'Submission'),
        Response: cards.filter(c => c.card_type === 'Response'),
        Boon: cards.filter(c => c.card_type === 'Boon'),
        Injury: cards.filter(c => c.card_type === 'Injury'),
        'Call-Name': cards.filter(c => c.card_type === 'Call Name'),
        Faction: cards.filter(c => c.card_type === 'Faction')
    };
}

function createProgressDiv(message) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.backgroundColor = 'white';
    div.style.padding = '20px';
    div.style.border = '2px solid #000';
    div.style.borderRadius = '8px';
    div.style.zIndex = '9999';
    div.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
    div.style.minWidth = '300px';
    div.style.textAlign = 'center';
    div.innerHTML = `<div style="text-align: center;"><h3>${message}</h3><div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto;"></div></div>`;
    
    const style = document.createElement('style');
    style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    
    document.body.appendChild(div);
    return div;
}

function downloadZip(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000); // Keep URL alive for 1 minute
}
