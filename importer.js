// importer.js
import * as state from './config.js';
import { renderDecks, renderPersonaDisplay } from './ui.js';

// Helper function to find a card by name with flexible matching
function findCardByName(cardName) {
    // Direct match first
    if (state.cardTitleCache[cardName]) {
        return state.cardTitleCache[cardName];
    }
    
    // Try with "Wrestler" suffix
    if (!cardName.endsWith('Wrestler')) {
        const withWrestler = cardName + ' Wrestler';
        if (state.cardTitleCache[withWrestler]) {
            return state.cardTitleCache[withWrestler];
        }
    }
    
    // Try with "Manager" suffix
    if (!cardName.endsWith('Manager')) {
        const withManager = cardName + ' Manager';
        if (state.cardTitleCache[withManager]) {
            return state.cardTitleCache[withManager];
        }
    }
    
    // Try removing "Wrestler" suffix
    if (cardName.endsWith('Wrestler')) {
        const withoutWrestler = cardName.replace(/\s*Wrestler$/, '');
        if (state.cardTitleCache[withoutWrestler]) {
            return state.cardTitleCache[withoutWrestler];
        }
    }
    
    // Try removing "Manager" suffix
    if (cardName.endsWith('Manager')) {
        const withoutManager = cardName.replace(/\s*Manager$/, '');
        if (state.cardTitleCache[withoutManager]) {
            return state.cardTitleCache[withoutManager];
        }
    }
    
    // Search through all cards for partial match
    const allCards = state.cardDatabase;
    for (const card of allCards) {
        if (!card || !card.title) continue;
        
        // Check if card title contains the name or vice versa
        if (card.title.includes(cardName) || cardName.includes(card.title)) {
            return card;
        }
        
        // Remove "Wrestler"/"Manager" and compare
        const cleanCardTitle = card.title.replace(/\s*(Wrestler|Manager)$/, '');
        const cleanCardName = cardName.replace(/\s*(Wrestler|Manager)$/, '');
        
        if (cleanCardTitle === cleanCardName) {
            return card;
        }
    }
    
    return null;
}

// Helper function to parse LackeyCCG .dek format
function parseLackeyDekFormat(text) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        
        // Check for parsing errors
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            return null; // Not valid XML
        }
        
        const deckZone = xmlDoc.querySelector('superzone[name="Deck"]');
        const purchaseZone = xmlDoc.querySelector('superzone[name="Purchase_Deck"]');
        const startingZone = xmlDoc.querySelector('superzone[name="Starting"]');
        
        if (!deckZone && !purchaseZone && !startingZone) {
            return null; // Not a Lackey deck file
        }
        
        const result = {
            wrestler: null,
            manager: null,
            callName: null,
            faction: null,
            championship: null,
            startingDeck: [],
            purchaseDeck: []
        };
        
        // Parse personas from Starting zone
        if (startingZone) {
            const personaCards = startingZone.querySelectorAll('card name');
            personaCards.forEach(nameElement => {
                const cardName = nameElement.textContent.trim();
                const card = findCardByName(cardName);
                
                if (card) {
                    switch(card.card_type) {
                        case 'Wrestler': result.wrestler = card; break;
                        case 'Manager': result.manager = card; break;
                        case 'Call Name': result.callName = card; break;
                        case 'Faction': result.faction = card; break;
                        case 'Championship': result.championship = card; break;
                        default:
                            if (cardName.includes('Wrestler') || card.card_type === 'Wrestler') {
                                result.wrestler = card;
                            } else if (cardName.includes('Manager') || card.card_type === 'Manager') {
                                result.manager = card;
                            } else if (card.card_type === 'Call Name') {
                                result.callName = card;
                            } else if (card.card_type === 'Faction') {
                                result.faction = card;
                            } else if (card.card_type === 'Championship') {
                                result.championship = card;
                            }
                    }
                } else {
                    console.warn(`Persona card not found: "${cardName}"`);
                }
            });
        }
        
        // Parse deck cards
        const parseZoneCards = (zone) => {
            const cards = [];
            if (zone) {
                const cardElements = zone.querySelectorAll('card');
                cardElements.forEach(cardElement => {
                    const nameElement = cardElement.querySelector('name');
                    if (nameElement) {
                        const cardName = nameElement.textContent.trim();
                        cards.push(cardName);
                    }
                });
            }
            return cards;
        };
        
        if (deckZone) {
            result.startingDeck = parseZoneCards(deckZone);
        }
        
        if (purchaseZone) {
            result.purchaseDeck = parseZoneCards(purchaseZone);
        }
        
        // Also check for starting deck in "Starting" zone (non-persona cards)
        if (startingZone) {
            const startingCards = parseZoneCards(startingZone);
            startingCards.forEach(cardName => {
                const card = findCardByName(cardName);
                if (card && !['Wrestler', 'Manager', 'Call Name', 'Faction', 'Championship'].includes(card.card_type)) {
                    result.startingDeck.push(cardName);
                }
            });
        }
        
        return result;
    } catch (error) {
        console.error('Error parsing Lackey deck:', error);
        return null;
    }
}

// Helper function to parse plain text format (including LackeyCCG .txt format)
function parsePlainTextFormat(text) {
    const lines = text.trim().split(/\r?\n/);
    let newWrestler = null, newManager = null, newCallName = null, newFaction = null, newChampionship = null;
    let newStartingDeck = [], newPurchaseDeck = [], currentSection = 'starting';
    
    const kitCardsFromHeaders = new Set();
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;
        
        if (trimmedLine.toLowerCase() === 'purchase_deck:') {
            currentSection = 'purchase';
            return;
        }
        else if (trimmedLine.toLowerCase() === 'starting:') {
            currentSection = 'startingPersonas';
            return;
        }
        else if (trimmedLine.toLowerCase() === 'tokens:' || trimmedLine.toLowerCase().startsWith('tokens:')) {
            currentSection = 'tokens';
            return;
        }
        
        // Parse Kit headers
        if (trimmedLine.toLowerCase().startsWith('kit')) {
            const match = trimmedLine.match(/Kit\d+:\s*(.+?)\s*\(/);
            if (match) {
                const cardName = match[1].trim();
                kitCardsFromHeaders.add(cardName);
            }
            return;
        }
        
        // Parse persona headers
        if (trimmedLine.toLowerCase().startsWith('wrestler:')) {
            const wrestlerName = trimmedLine.substring(9).trim();
            const wrestler = findCardByName(wrestlerName);
            if (wrestler && wrestler.card_type === 'Wrestler') newWrestler = wrestler;
            return;
        } 
        else if (trimmedLine.toLowerCase().startsWith('manager:')) {
            const managerName = trimmedLine.substring(8).trim();
            if (managerName.toLowerCase() !== 'none') {
                const manager = findCardByName(managerName);
                if (manager && manager.card_type === 'Manager') newManager = manager;
            }
            return;
        }
        else if (trimmedLine.toLowerCase().startsWith('call name:') || trimmedLine.toLowerCase().startsWith('callname:')) {
            const callNameStr = trimmedLine.toLowerCase();
            const callNameStart = callNameStr.includes('call name:') ? 'call name:' : 'callname:';
            const callNameName = trimmedLine.substring(callNameStart.length).trim();
            if (callNameName.toLowerCase() !== 'none') {
                const callName = findCardByName(callNameName);
                if (callName && callName.card_type === 'Call Name') newCallName = callName;
            }
            return;
        }
        else if (trimmedLine.toLowerCase().startsWith('faction:')) {
            const factionName = trimmedLine.substring(8).trim();
            if (factionName.toLowerCase() !== 'none') {
                const faction = findCardByName(factionName);
                if (faction && faction.card_type === 'Faction') newFaction = faction;
            }
            return;
        }
        else if (trimmedLine.toLowerCase().startsWith('championship:')) {
            const champName = trimmedLine.substring('championship:'.length).trim();
            if (champName.toLowerCase() !== 'none') {
                const champ = findCardByName(champName);
                if (champ && champ.card_type === 'Championship') newChampionship = champ;
            }
            return;
        }
        // Parse deck sections
        else if (trimmedLine.startsWith('--- Starting Deck') || trimmedLine.toLowerCase().includes('starting deck')) { 
            currentSection = 'starting'; 
            return;
        }
        else if (trimmedLine.startsWith('--- Purchase Deck') || trimmedLine.toLowerCase().includes('purchase deck')) { 
            currentSection = 'purchase'; 
            return;
        }
        else if (trimmedLine.startsWith('=== DECK ANALYSIS ===')) {
            currentSection = 'analysis';
            return;
        }
        
        // Parse card lines
        let match;
        
        const tabParts = trimmedLine.split('\t');
        if (tabParts.length >= 2) {
            const countStr = tabParts[0].trim();
            const cardName = tabParts.slice(1).join('\t').trim();
            match = { count: parseInt(countStr, 10), name: cardName };
        }
        else {
            const spaceMatch = trimmedLine.match(/^(\d+)\s+(.+)/);
            if (spaceMatch) {
                match = { count: parseInt(spaceMatch[1], 10), name: spaceMatch[2].trim() };
            }
            else {
                const xMatch = trimmedLine.match(/^(\d+)x\s+(.+)/);
                if (xMatch) {
                    match = { count: parseInt(xMatch[1], 10), name: xMatch[2].trim() };
                }
            }
        }
        
        if (match && currentSection !== 'analysis' && currentSection !== 'tokens') {
            const count = match.count;
            let cardName = match.name;
            
            // Remove kit persona suffix if present
            const bracketMatch = cardName.match(/^(.+?)\s*\[.*\]$/);
            if (bracketMatch) {
                cardName = bracketMatch[1].trim();
            }
            
            const card = findCardByName(cardName);
            
            if (!card) {
                console.warn(`Card not found: "${cardName}"`);
                return;
            }
            
            if (currentSection === 'startingPersonas') {
                if (['Wrestler', 'Manager', 'Call Name', 'Faction', 'Championship'].includes(card.card_type)) {
                    for (let i = 0; i < count; i++) {
                        switch(card.card_type) {
                            case 'Wrestler': newWrestler = card; break;
                            case 'Manager': newManager = card; break;
                            case 'Call Name': newCallName = card; break;
                            case 'Faction': newFaction = card; break;
                            case 'Championship': newChampionship = card; break;
                        }
                    }
                } else {
                    for (let i = 0; i < count; i++) {
                        newStartingDeck.push(cardName);
                    }
                }
            }
            else if (currentSection === 'purchase') {
                for (let i = 0; i < count; i++) {
                    newPurchaseDeck.push(cardName);
                }
            }
            else if (currentSection === 'starting') {
                for (let i = 0; i < count; i++) {
                    newStartingDeck.push(cardName);
                }
            }
        }
    });
    
    // Remove any persona cards that might have accidentally ended up in starting deck
    const filteredStartingDeck = [];
    newStartingDeck.forEach(cardName => {
        const card = findCardByName(cardName);
        if (card && !['Wrestler', 'Manager', 'Call Name', 'Faction', 'Championship'].includes(card.card_type)) {
            filteredStartingDeck.push(cardName);
        }
    });
    
    const finalStartingDeck = filteredStartingDeck.filter(cardName => !kitCardsFromHeaders.has(cardName));
    const finalPurchaseDeck = newPurchaseDeck.filter(cardName => !kitCardsFromHeaders.has(cardName));
    
    return {
        wrestler: newWrestler,
        manager: newManager,
        callName: newCallName,
        faction: newFaction,
        championship: newChampionship,
        startingDeck: finalStartingDeck,
        purchaseDeck: finalPurchaseDeck
    };
}

export function parseAndLoadDeck(text) {
    const importStatus = document.getElementById('importStatus');
    const importModal = document.getElementById('importModal');
    const wrestlerSelect = document.getElementById('wrestlerSelect');
    const managerSelect = document.getElementById('managerSelect');
    const callNameSelect = document.getElementById('callNameSelect');
    const factionSelect = document.getElementById('factionSelect');
    const championshipSelect = document.getElementById('championshipSelect');
    
    try {
        let parsedDeck;
        
        if (text.trim().startsWith('<?xml') || text.includes('<superzone')) {
            parsedDeck = parseLackeyDekFormat(text);
        }
        
        if (!parsedDeck) {
            parsedDeck = parsePlainTextFormat(text);
        }
        
        if (!parsedDeck) {
            throw new Error('Could not parse deck file. Please check the format.');
        }
        
        console.log('Parsed deck:', parsedDeck);
        
        state.setSelectedWrestler(parsedDeck.wrestler);
        state.setSelectedManager(parsedDeck.manager);
        state.setSelectedCallName(parsedDeck.callName);
        state.setSelectedFaction(parsedDeck.faction);
        state.setSelectedChampionship(parsedDeck.championship);
        
        if (parsedDeck.wrestler) {
            wrestlerSelect.value = parsedDeck.wrestler.title;
        }
        if (parsedDeck.manager) {
            managerSelect.value = parsedDeck.manager.title;
        }
        if (callNameSelect && parsedDeck.callName) {
            callNameSelect.value = parsedDeck.callName.title;
        }
        if (factionSelect && parsedDeck.faction) {
            factionSelect.value = parsedDeck.faction.title;
        }
        if (championshipSelect && parsedDeck.championship) {
            championshipSelect.value = parsedDeck.championship.title;
        }
        
        state.setStartingDeck(parsedDeck.startingDeck);
        state.setPurchaseDeck(parsedDeck.purchaseDeck);
        
        renderDecks();
        renderPersonaDisplay();
        document.dispatchEvent(new Event('filtersChanged'));
        importStatus.textContent = 'Deck imported successfully!';
        importStatus.style.color = 'green';
        setTimeout(() => { importModal.style.display = 'none'; }, 1500);
    } catch (error) {
        console.error('Error parsing decklist:', error);
        importStatus.textContent = `Error: ${error.message}`;
        importStatus.style.color = 'red';
    }
}
