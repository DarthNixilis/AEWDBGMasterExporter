// COMPLETELY REWRITTEN RENDERER with MASSIVE FONTS
function renderCardToCanvas(card, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    
    // Determine if this is the small digital size
    const isSmallSize = width === 214; // 214x308 for digital/Lackey
    
    // BASIC LAYOUT - SIMPLIFIED FOR MAXIMUM READABILITY
    if (isSmallSize) {
        // =================================================================
        // ULTRA SIMPLE LAYOUT FOR 214x308 CARDS - MOMENTUM FIRST
        // =================================================================
        
        // 1. BORDER - THICK
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, width - 4, height - 4);
        
        // 2. TITLE - MASSIVE AT TOP (MOST IMPORTANT AFTER MOMENTUM)
        ctx.fillStyle = 'black';
        ctx.font = 'bold 26px Arial';
        ctx.textAlign = 'center';
        
        // Truncate for small space but keep readable
        let title = card.title;
        let maxTitleWidth = width - 40;
        let titleWidth = ctx.measureText(title).width;
        
        if (titleWidth > maxTitleWidth) {
            // Try to find best truncation
            for (let i = title.length - 1; i > 8; i--) {
                const testTitle = title.substring(0, i) + '...';
                if (ctx.measureText(testTitle).width <= maxTitleWidth) {
                    title = testTitle;
                    break;
                }
            }
            // If still too long, force truncate
            if (ctx.measureText(title).width > maxTitleWidth) {
                title = title.substring(0, 10) + '...';
            }
        }
        ctx.fillText(title, width / 2, 28);
        
        // 3. MOMENTUM - BIGGEST AND FIRST (MOST IMPORTANT ON TABLE)
        const momentumY = 65; // Moved down a bit to make room for title
        
        // Momentum - ABSOLUTELY HUGE (most important stat)
        if (card.momentum !== null && card.momentum !== undefined) {
            ctx.font = 'bold 60px Arial'; // MASSIVE - 60px!
            ctx.textAlign = 'center';
            ctx.fillText(`M: ${card.momentum}`, width / 2, momentumY);
        }
        
        // 4. DAMAGE - BELOW MOMENTUM, STILL LARGE
        const damageY = momentumY + 45;
        
        if (card.damage !== null && card.damage !== undefined) {
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`D: ${card.damage}`, width / 2, damageY);
        }
        
        // 5. COST - BELOW DAMAGE, IN A BOX
        const costY = damageY + 35;
        
        if (card.cost !== null && card.cost !== undefined) {
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            const costText = `C: ${card.cost}`;
            const costWidth = ctx.measureText(costText).width;
            
            // Draw cost box
            const boxX = (width - costWidth - 30) / 2;
            const boxY = costY - 30;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(boxX, boxY, costWidth + 30, 40);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, costWidth + 30, 40);
            
            // Draw cost text
            ctx.fillStyle = 'black';
            ctx.fillText(costText, width / 2, costY);
        }
        
        // 6. TARGET - SMALLER, BELOW COST IF SPACE
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        const targetValue = targetTrait ? targetTrait.value : null;
        if (targetValue) {
            const targetY = costY + 30;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`T: ${targetValue}`, width / 2, targetY);
        }
        
        // 7. TYPE LINE - BELOW STATS
        const typeY = 170;
        ctx.textAlign = 'center';
        ctx.fillStyle = getTypeColor(card.card_type);
        ctx.fillRect(10, typeY, width - 20, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(card.card_type.toUpperCase(), width / 2, typeY + 18);
        
        // 8. TEXT BOX - REST OF CARD
        const textBoxY = 205;
        const textBoxHeight = 95;
        
        // Text box background
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(10, textBoxY, width - 20, textBoxHeight);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, textBoxY, width - 20, textBoxHeight);
        
        // Card text - CENTERED, LARGEST POSSIBLE
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        
        const text = card.text_box?.raw_text || '';
        
        // SUPER SIMPLE TEXT RENDERING - JUST FIRST 3-4 LINES
        const words = text.split(' ');
        let lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth > (width - 30) && currentLine) {
                lines.push(currentLine);
                currentLine = word;
                if (lines.length >= 4) { // Limit to 4 lines max
                    if (lines[3].length > 15) {
                        lines[3] = lines[3].substring(0, 12) + '...';
                    }
                    break;
                }
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine && lines.length < 4) {
            lines.push(currentLine);
        }
        
        // Render lines centered
        const lineHeight = 16;
        const startY = textBoxY + 20;
        
        for (let i = 0; i < Math.min(lines.length, 4); i++) {
            ctx.fillText(lines[i], width / 2, startY + (i * lineHeight));
        }
        
        // 9. WRESTLER/MANAGER BANNER if applicable
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
            ctx.fillStyle = card.card_type === 'Wrestler' ? '#333' : '#666';
            ctx.fillRect(0, 0, width, 15);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(card.card_type.toUpperCase(), width / 2, 11);
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
        
        // Draw title
        ctx.fillStyle = 'black';
        ctx.font = `bold ${64 * scale}px Arial`;
        ctx.textAlign = 'center';
        
        let title = card.title;
        let titleWidth = ctx.measureText(title).width;
        const maxTitleWidth = width - 40 * scale;
        
        if (titleWidth > maxTitleWidth) {
            while (title.length > 15 && titleWidth > maxTitleWidth) {
                title = title.substring(0, title.length - 1);
                titleWidth = ctx.measureText(title + '...').width;
            }
            title = title + '...';
        }
        
        ctx.fillText(title, width / 2, 50 * scale);
        
        // MOMENTUM FIRST - HUGE
        ctx.font = `bold ${72 * scale}px Arial`; // Even bigger for larger sizes
        ctx.textAlign = 'center';
        
        if (card.momentum !== null && card.momentum !== undefined) {
            ctx.fillText(`M: ${card.momentum}`, width / 2, 140 * scale);
        }
        
        // Damage - below momentum
        if (card.damage !== null && card.damage !== undefined) {
            ctx.font = `bold ${48 * scale}px Arial`;
            ctx.fillText(`D: ${card.damage}`, width / 2, 190 * scale);
        }
        
        // Cost - below damage, in box
        if (card.cost !== null && card.cost !== undefined) {
            ctx.font = `bold ${52 * scale}px Arial`;
            const costText = `C: ${card.cost}`;
            const costWidth = ctx.measureText(costText).width;
            const costY = 240 * scale;
            
            // Cost box
            const boxX = (width - costWidth - 40 * scale) / 2;
            const boxY = costY - 35 * scale;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(boxX, boxY, costWidth + 40 * scale, 55 * scale);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(boxX, boxY, costWidth + 40 * scale, 55 * scale);
            
            // Cost text
            ctx.fillStyle = 'black';
            ctx.fillText(costText, width / 2, costY);
        }
        
        // Target
        const targetTrait = card.text_box?.traits?.find(t => t.name.trim() === 'Target');
        const targetValue = targetTrait ? targetTrait.value : null;
        if (targetValue) {
            const targetY = 290 * scale;
            ctx.font = `bold ${36 * scale}px Arial`;
            ctx.fillText(`T: ${targetValue}`, width / 2, targetY);
        }
        
        // Type line
        ctx.textAlign = 'center';
        ctx.fillStyle = getTypeColor(card.card_type);
        const typeBoxHeight = 50 * scale;
        const typeBoxY = 320 * scale;
        ctx.fillRect(20 * scale, typeBoxY, width - 40 * scale, typeBoxHeight);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${32 * scale}px Arial`;
        ctx.fillText(card.card_type, width / 2, typeBoxY + 35 * scale);
        
        // Text box
        const textBoxY = 380 * scale;
        const textBoxHeight = height - 420 * scale;
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(20 * scale, textBoxY, width - 40 * scale, textBoxHeight);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(20 * scale, textBoxY, width - 40 * scale, textBoxHeight);
        
        // Card text - centered
        ctx.fillStyle = 'black';
        ctx.font = `${28 * scale}px Arial`;
        ctx.textAlign = 'center';
        
        const text = card.text_box?.raw_text || '';
        const maxTextWidth = width - 60 * scale;
        
        // Wrap text
        const lines = wrapTextForCenter(ctx, text, maxTextWidth, 28 * scale);
        
        const lineHeight = 35 * scale;
        let y = textBoxY + 40 * scale;
        
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
            if (y < textBoxY + textBoxHeight - 20 * scale) {
                ctx.fillText(lines[i], width / 2, y);
                y += lineHeight;
            } else {
                break;
            }
        }
        
        // Wrestler/Manager banner
        if (card.card_type === 'Wrestler' || card.card_type === 'Manager') {
            ctx.fillStyle = card.card_type === 'Wrestler' ? '#333' : '#666';
            ctx.fillRect(0, 0, width, 25 * scale);
            ctx.fillStyle = 'white';
            ctx.font = `bold ${18 * scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(`${card.card_type.toUpperCase()} CARD`, width / 2, 18 * scale);
        }
    }
    
    return canvas;
}
