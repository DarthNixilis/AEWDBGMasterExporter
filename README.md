AEW TCG Deck Constructor

A comprehensive web-based deck building tool for the AEW (All Elite Wrestling) Trading Card Game. This application allows players to construct, analyze, import/export, and print decks for playtesting and organized play.

Features

🃏 Card Database & Search

· Complete AEW TCG card database with all Core and Advanced sets
· Advanced search functionality by card name, text, type, keywords, and traits
· Grid and list view modes with adjustable columns
· Real-time filtering and sorting options

👥 Persona System

· Select Wrestlers and Managers with unique kit cards
· Automatic kit card highlighting
· Persona-specific deck validation

🏗️ Deck Construction

· Build Starting Decks (0-cost cards, max 24 cards)
· Build Purchase Decks (all cards, min 36 cards)
· Real-time deck validation with rule enforcement
· Copy limits and deck size restrictions
· Deck statistics and analysis

🔄 Import/Export

· Plain Text Export: Standard decklist format
· LackeyCCG Export: Compatible with LackeyCCG platform
· Image Export: Generate printable card sheets
· Bulk Export: Export all cards as images in multiple sizes
· Import: Load decks from text files or pasted lists

🖨️ Printing & Playtesting

· Generate high-quality card images in three sizes:
  · Digital (214x308 px) - For digital playtesting
  · LackeyCCG (750x1050 px) - Platform-optimized
  · High Resolution (1500x2100 px) - Professional printing
· Batch export with ZIP file creation
· Organized by card type or complete sets

📊 Deck Analysis

· Cost distribution analysis
· Card type breakdown
· Momentum and damage statistics
· Keyword and trait distribution
· Persona synergy analysis
· Deck statistics and duplicates tracking

Quick Start

1. Open the application in your web browser
2. Select a Wrestler from the dropdown menu
3. Select a Manager (optional)
4. Search for cards using filters or text search
5. Add cards to your Starting or Purchase deck
6. Export your deck in your preferred format

Export Options

Digital Playtesting (214x308 px)

· Compact size perfect for online playtesting
· Clean, readable layout
· Color-coded by card type

LackeyCCG Format (750x1050 px)

· Optimized for LackeyCCG platform
· Standard playing card proportions
· Compatible with virtual tabletop play

High Resolution (1500x2100 px)

· Professional printing quality
· 300 DPI resolution
· Bleed edges for physical card printing

Keyboard Shortcuts

· Escape: Close modals
· Enter: Quick add to deck (in list view)
· Arrow keys: Navigate search results

Technical Details

Architecture

· Frontend: Vanilla JavaScript (ES6 Modules)
· Styling: CSS3 with CSS Variables for theming
· Rendering: HTML5 Canvas for image generation
· Storage: LocalStorage for deck persistence

Dependencies

· JSZip: ZIP file creation for bulk exports
· html2canvas: HTML to canvas rendering
· No other external dependencies required

Browser Compatibility

· Chrome 80+ (recommended)
· Firefox 75+
· Safari 13+
· Edge 80+

File Structure

```
/
├── index.html              # Main application HTML
├── style.css              # Application styles
├── main.js               # Application entry point
├── app-init.js           # Application initialization
├── config.js             # State management and utilities
├── data-loader.js        # Card database loading
├── ui.js                 # UI rendering functions
├── card-renderer.js      # Card HTML generation
├── deck.js               # Deck management logic
├── filters.js            # Filtering and sorting
├── listeners.js          # Event listener setup
├── importer.js           # Deck import functionality
├── exporter.js           # Deck export functionality
├── master-export.js      # Bulk image export system
├── cardDatabase.txt      # Card database (TSV format)
├── keywords.txt          # Keyword definitions
└── README.md            # This file
```

Card Database Format

The application uses a tab-separated values (TSV) format for the card database:

```tsv
Card Name    Type    Set    Cost    Damage    Momentum    Target    Traits    Wrestler Kit    Signature For    Card Raw Game Text
```

Fields:

· Card Name: Name of the card
· Type: Card type (Action, Grapple, Strike, Submission, Response, Wrestler, Manager, etc.)
· Set: Core or Advanced
· Cost: Card cost (0-20+, or "N/a" for personas)
· Damage: Damage value for maneuvers
· Momentum: Momentum value
· Target: Target body part (H, A, T, L)
· Traits: Comma-separated traits
· Wrestler Kit: "TRUE" if part of a wrestler's kit
· Signature For: Which persona the card belongs to
· Card Raw Game Text: Full card text with abilities

Development

Local Setup

1. Clone the repository
2. Serve files using a local HTTP server:
   ```bash
   python -m http.server 8000
   ```
   or
   ```bash
   npx http-server
   ```
3. Open http://localhost:8000 in your browser

Adding New Cards

1. Add cards to cardDatabase.txt using the TSV format
2. Add keyword definitions to keywords.txt
3. The application will automatically load new data on refresh

Customization

· Modify style.css for visual changes
· Update getTypeColor() in master-export.js for card type colors
· Adjust export dimensions in export functions

Known Issues & Limitations

1. Large Export Performance: Exporting all cards (300+) may take several minutes
2. Memory Usage: Large canvas operations may use significant memory
3. Browser Compatibility: Some advanced canvas features may not work in older browsers
4. Mobile Performance: Image generation may be slower on mobile devices

Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

License

This project is provided for personal and educational use. The AEW TCG and associated card data are property of their respective owners.

Support

For issues, questions, or suggestions:

1. Check the Issues page
2. Submit detailed bug reports with browser and OS information
3. Include steps to reproduce issues

Acknowledgments

· AEW TCG design team for creating an amazing game
· LackeyCCG community for platform inspiration
· Open source contributors for JSZip and html2canvas libraries

---

Happy Deck Building! 🎲🤼‍♂️ 
