// master-export.js
import * as state from './config.js';
import { generatePlaytestCardHTML } from './card-renderer.js';
import { toPascalCase } from './config.js';

export async function exportAllCardsAsImages() {
    const allCards = [...state.cardDatabase];
    
    if (allCards.length === 0) {
        alert("No cards found in the database.");
        return;
    }
    
    if (!confirm(`This will generate ${allCards.length} individual card images. This may take a while. Continue?`)) {
        return;
    }
    
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '750px';
    tempContainer.style.height = '1050px';
    document.body.appendChild(tempContainer);
    
    // Card dimensions (matching playtest cards)
    const CARD_WIDTH = 750;
    const CARD_HEIGHT = 1050;
    
    // DPI for good quality
    const DPI = 300;
    const PRINT_WIDTH = 2.5 * DPI; // 750px at 300 DPI = 2.5 inches
    const PRINT_HEIGHT = 3.5 * DPI; // 1050px at 300 DPI = 3.5 inches
    
    try {
        // Create progress indicator
        const progressDiv = document.createElement('div');
        progressDiv.style.position = 'fixed';
        progressDiv.style.top = '50%';
        progressDiv.style.left = '50%';
        progressDiv.style.transform = 'translate(-50%, -50%)';
        progressDiv.style.backgroundColor = 'white';
        progressDiv.style.padding = '20px';
        progressDiv.style.border = '2px solid #000';
        progressDiv.style.borderRadius = '8px';
        progressDiv.style.zIndex = '9999';
        progressDiv.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
        document.body.appendChild(progressDiv);
        
        // Process cards
        for (let i = 0; i < allCards.length; i++) {
            const card = allCards[i];
            
            // Update progress
            progressDiv.innerHTML = `
                <div style="text-align: center; font-family: Arial, sans-serif;">
                    <h3>Generating Card Images...</h3>
                    <p>${i + 1} of ${allCards.length}</p>
                    <p><strong>${card.title}</strong></p>
                    <p>(${card.card_type})</p>
                    <div style="width: 300px; height: 20px; background: #f0f0f0; border-radius: 10px; margin: 10px auto;">
                        <div style="width: ${((i + 1) / allCards.length) * 100}%; height: 100%; background: #007bff; border-radius: 10px;"></div>
                    </div>
                </div>
            `;
            
            // Generate the card HTML
            const cardHTML = await generatePlaytestCardHTML(card, tempContainer);
            tempContainer.innerHTML = cardHTML;
            const cardElement = tempContainer.firstElementChild;
            
            // Create canvas for this card
            const canvas = document.createElement('canvas');
            canvas.width = PRINT_WIDTH;
            canvas.height = PRINT_HEIGHT;
            const ctx = canvas.getContext('2d');
            
            // Set white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            try {
                // Render card to canvas
                const cardCanvas = await html2canvas(cardElement, {
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    scale: 1,
                    backgroundColor: null,
                    logging: false,
                    useCORS: true
                });
                
                // Draw to main canvas
                ctx.drawImage(cardCanvas, 0, 0, PRINT_WIDTH, PRINT_HEIGHT);
                
                // Convert to data URL
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                
                // Create download link
                const a = document.createElement('a');
                a.href = dataUrl;
                
                // Clean filename: remove special characters, convert to PascalCase
                const cleanTitle = card.title.replace(/[^a-zA-Z0-9\s]/g, '');
                const fileName = toPascalCase(cleanTitle);
                a.download = `${fileName}.jpg`;
                
                // Trigger download
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Small delay to prevent overwhelming the browser
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Error rendering card "${card.title}":`, error);
                // Continue with next card instead of stopping
                continue;
            }
        }
        
        // Cleanup
        document.body.removeChild(progressDiv);
        document.body.removeChild(tempContainer);
        
        alert(`Successfully generated ${allCards.length} card images!`);
        
    } catch (error) {
        console.error("Error in exportAllCardsAsImages:", error);
        alert("An error occurred while generating card images. Check console for details.");
        
        // Cleanup on error
        if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
        }
        const progressDiv = document.querySelector('div[style*="fixed"]');
        if (progressDiv) {
            document.body.removeChild(progressDiv);
        }
    }
}

// Optional: Export by category
export async function exportCardsByCategory() {
    const allCards = [...state.cardDatabase];
    
    // Group cards by type
    const cardsByType = {
        Wrestler: allCards.filter(c => c.card_type === 'Wrestler'),
        Manager: allCards.filter(c => c.card_type === 'Manager'),
        Action: allCards.filter(c => c.card_type === 'Action'),
        Grapple: allCards.filter(c => c.card_type === 'Grapple'),
        Strike: allCards.filter(c => c.card_type === 'Strike'),
        Submission: allCards.filter(c => c.card_type === 'Submission'),
        Response: allCards.filter(c => c.card_type === 'Response'),
        // Future types (when added):
        Boon: allCards.filter(c => c.card_type === 'Boon'),
        Injury: allCards.filter(c => c.card_type === 'Injury'),
        'Call Name': allCards.filter(c => c.card_type === 'Call Name'),
        Faction: allCards.filter(c => c.card_type === 'Faction')
    };
    
    let totalCards = 0;
    Object.values(cardsByType).forEach(cards => totalCards += cards.length);
    
    if (!confirm(`This will generate ${totalCards} individual card images grouped by type. Continue?`)) {
        return;
    }
    
    // Similar implementation to exportAllCardsAsImages but organized by type
    // You can modify the above function to accept a filter parameter
}