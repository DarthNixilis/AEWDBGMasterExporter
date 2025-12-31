// components.js
import { store } from './store.js';

// Modal component
export class Modal {
    constructor(title, contentHTML, options = {}) {
        this.options = {
            width: '500px',
            onClose: null,
            ...options
        };
        
        this.createOverlay();
        this.createContent(title, contentHTML);
        this.setupEvents();
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9998;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;
    }
    
    createContent(title, contentHTML) {
        this.content = document.createElement('div');
        this.content.className = 'modal-content';
        this.content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
            width: ${this.options.width};
            max-width: 90%;
            box-sizing: border-box;
            position: relative;
        `;
        
        this.content.innerHTML = `
            <h3 style="margin-top:0;margin-bottom:20px;color:#333;">${title}</h3>
            <button class="modal-close" style="
                position:absolute;
                top:10px;
                right:15px;
                background:none;
                border:none;
                font-size:1.5rem;
                cursor:pointer;
                color:#666;
            ">&times;</button>
            ${contentHTML}
        `;
        
        this.overlay.appendChild(this.content);
    }
    
    setupEvents() {
        this.closeBtn = this.content.querySelector('.modal-close');
        this.closeBtn.onclick = () => this.close();
        
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        };
        
        document.addEventListener('keydown', this.handleEscape);
    }
    
    handleEscape = (e) => {
        if (e.key === 'Escape') {
            this.close();
        }
    };
    
    show() {
        document.body.appendChild(this.overlay);
        store.set('lastFocusedElement', document.activeElement);
        this.closeBtn.focus();
    }
    
    close() {
        if (this.overlay.parentNode) {
            document.body.removeChild(this.overlay);
        }
        document.removeEventListener('keydown', this.handleEscape);
        
        if (this.options.onClose) {
            this.options.onClose();
        }
        
        const lastFocused = store.get('lastFocusedElement');
        if (lastFocused) {
            lastFocused.focus();
        }
    }
}

// Progress indicator component
export class ProgressIndicator {
    constructor(total, options = {}) {
        this.total = total;
        this.processed = 0;
        this.failed = 0;
        this.options = {
            title: 'Exporting Cards',
            showCancel: false,
            onCancel: null,
            ...options
        };
        
        this.createProgress();
    }
    
    createProgress() {
        this.element = document.createElement('div');
        this.element.className = 'progress-indicator';
        this.element.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border: 3px solid #000;
            border-radius: 10px;
            z-index: 9999;
            box-shadow: 0 0 30px rgba(0,0,0,0.5);
            min-width: 300px;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        
        this.element.innerHTML = `
            <h3 style="margin-top:0;margin-bottom:10px;color:#333;">${this.options.title}</h3>
            <p style="margin:0 0 15px 0;color:#666;">0 of ${this.total}</p>
            <div style="width:100%;height:20px;background:#f0f0f0;border-radius:10px;margin:15px 0;">
                <div class="progress-fill" style="width:0%;height:100%;background:#007bff;border-radius:10px;transition:width 0.3s ease;"></div>
            </div>
            <p class="progress-status" style="color:#666;font-size:0.9em;margin:0;">All good so far</p>
            ${this.options.showCancel ? 
                '<button class="cancel-btn" style="margin-top:15px;padding:8px 16px;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">Cancel</button>' 
                : ''}
        `;
        
        document.body.appendChild(this.element);
        
        if (this.options.showCancel) {
            this.cancelBtn = this.element.querySelector('.cancel-btn');
            this.cancelBtn.onclick = () => {
                if (this.options.onCancel) {
                    this.options.onCancel();
                }
                this.remove();
            };
        }
    }
    
    update(processed, failed) {
        this.processed = processed;
        this.failed = failed;
        
        const progressFill = this.element.querySelector('.progress-fill');
        const progressCount = this.element.querySelector('p');
        const progressStatus = this.element.querySelector('.progress-status');
        
        if (progressFill) {
            progressFill.style.width = `${(processed / this.total) * 100}%`;
        }
        if (progressCount) {
            progressCount.textContent = `${processed} of ${this.total}`;
        }
        if (progressStatus) {
            progressStatus.textContent = failed > 0 ? `${failed} failed` : 'All good so far';
        }
    }
    
    remove() {
        if (this.element.parentNode) {
            document.body.removeChild(this.element);
        }
    }
}

// Export modal component
export class ExportModal {
    constructor(onConfirm) {
        this.onConfirm = onConfirm;
        this.modal = null;
    }
    
    show() {
        this.modal = new Modal('Export Options', this.getContent(), {
            width: '500px',
            onClose: () => this.modal = null
        });
        
        this.modal.show();
        this.setupConfirmHandler();
    }
    
    getContent() {
        return `
            <div style="margin-bottom:20px;">
                <label style="display:block;margin-bottom:10px;font-weight:bold;">
                    <input type="checkbox" id="exportUsePascalCase" checked style="margin-right:8px;">
                    PascalCase filenames
                </label>
            </div>
            
            <div style="margin-bottom:20px;">
                <label style="display:block;margin-bottom:10px;font-weight:bold;">
                    <input type="checkbox" id="exportUsePNG" style="margin-right:8px;">
                    PNG format (higher quality)
                </label>
                <small style="color:#666;">Unchecked = JPG (recommended)</small>
            </div>
            
            <div style="margin-bottom:20px;">
                <strong style="display:block;margin-bottom:10px;">Export Type:</strong>
                <select id="exportTypeSelect" style="width:100%;padding:8px;font-size:16px;border:1px solid #ddd;border-radius:4px;">
                    <option value="all">All Cards</option>
                    <option value="bytype">By Card Type</option>
                    <option value="singletype">Single Card Type</option>
                </select>
            </div>
            
            <div style="margin-bottom:20px;">
                <strong style="display:block;margin-bottom:10px;">Card Size:</strong>
                <select id="exportSizeSelect" style="width:100%;padding:8px;font-size:16px;border:1px solid #ddd;border-radius:4px;">
                    <option value="lackey">LackeyCCG (750x1050)</option>
                    <option value="digital">Digital (214x308)</option>
                    <option value="highres">High Res (1500x2100)</option>
                </select>
            </div>
            
            <div style="display:flex;justify-content:space-between;margin-top:25px;">
                <button id="exportCancelBtn" style="padding:10px 20px;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">
                    Cancel
                </button>
                <button id="exportConfirmBtn" style="padding:10px 20px;background:#20c997;color:white;border:none;border-radius:4px;cursor:pointer;">
                    Export
                </button>
            </div>
        `;
    }
    
    setupConfirmHandler() {
        const confirmBtn = document.getElementById('exportConfirmBtn');
        const cancelBtn = document.getElementById('exportCancelBtn');
        
        confirmBtn.onclick = () => {
            const usePascalCase = document.getElementById('exportUsePascalCase').checked;
            const usePNG = document.getElementById('exportUsePNG').checked;
            const exportType = document.getElementById('exportTypeSelect').value;
            const exportSize = document.getElementById('exportSizeSelect').value;
            
            this.modal.close();
            
            if (this.onConfirm) {
                this.onConfirm({
                    usePascalCase,
                    usePNG,
                    exportType,
                    size: exportSize
                });
            }
        };
        
        cancelBtn.onclick = () => this.modal.close();
    }
}