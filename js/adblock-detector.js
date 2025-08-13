class AdBlockDetector {
    constructor(options = {}) {
        this.options = {
            warningMessage: options.warningMessage || 'Please disable your ad blocker to continue',
            warningTitle: options.warningTitle || '🛡️ Ad Blocker Detected',
            blur: options.blur ?? true,
            blurAmount: options.blurAmount ?? 5,
            opacity: options.opacity ?? 0.95,
            watermark: options.watermark ?? true,
            watermarkText: options.watermarkText ?? 'Protected by FreeNetly',
            watermarkStyle: options.watermarkStyle ?? 'light'
        };

        this.detected = false;
        this.warningElement = null;
        this.adNetworks = [
            'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
            'https://doubleclick.net/instream/ad_status.js'
        ];

        this.adClassNames = [
            'ad', 'ads', 'advertisement', 'banner-ad', 'google-ad'
        ];
    }

    async init() {
        // Wait for page to load
        if (document.readyState !== 'complete') {
            await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
        }
        
        // Simple check after page loads
        setTimeout(() => this.checkAdBlocker(), 1000);
    }

    async checkAdBlocker() {
        try {
            // Method 1: Check if ad scripts load
            const scriptBlocked = await this.checkAdScript();
            
            // Method 2: Check if ad elements are hidden
            const elementsHidden = this.checkAdElements();
            
            // Simple logic: if either method detects blocking, show warning
            const isBlocked = scriptBlocked || elementsHidden;
            
            if (isBlocked && !this.detected) {
                this.detected = true;
                this.showWarning();
            } else if (!isBlocked && this.detected) {
                this.detected = false;
                this.hideWarning();
            }
        } catch (error) {
            console.log('Ad blocker check failed:', error);
        }
    }

    async checkAdScript() {
        return new Promise((resolve) => {
            const testScript = document.createElement('script');
            testScript.src = this.adNetworks[0]; // Google AdSense script
            testScript.async = true;
            
            testScript.onload = () => {
                testScript.remove();
                resolve(false); // Script loaded = no ad blocker
            };
            
            testScript.onerror = () => {
                testScript.remove();
                resolve(true); // Script blocked = ad blocker detected
            };
            
            document.head.appendChild(testScript);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                if (testScript.parentNode) {
                    testScript.remove();
                    resolve(true); // Assume blocked if timeout
                }
            }, 3000);
        });
    }

    checkAdElements() {
        // Create a test ad element
        const testAd = document.createElement('div');
        testAd.className = 'ad advertisement';
        testAd.style.cssText = `
            position: absolute !important;
            top: -1000px !important;
            left: -1000px !important;
            width: 300px !important;
            height: 250px !important;
        `;
        testAd.innerHTML = '<div class="banner">Ad Content</div>';
        
        document.body.appendChild(testAd);
        
        // Check if element is hidden by ad blocker
        setTimeout(() => {
            const style = window.getComputedStyle(testAd);
            const isHidden = style.display === 'none' || 
                           style.visibility === 'hidden' || 
                           testAd.offsetHeight === 0;
            
            testAd.remove();
            return isHidden;
        }, 100);
        
        // Return false for now, the setTimeout will handle the actual check
        return false;
    }

    showWarning() {
        if (this.warningElement) return;

        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(255, 255, 255, ${this.options.opacity}) !important;
            backdrop-filter: ${this.options.blur ? `blur(${this.options.blurAmount}px)` : 'none'} !important;
            z-index: 2147483647 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: -apple-system, system-ui, sans-serif !important;
        `;

        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            background: white !important;
            padding: 2rem !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            text-align: center !important;
            max-width: 500px !important;
            position: relative !important;
        `;

        messageBox.innerHTML = `
            <h2 style="color: #e74c3c !important; margin-bottom: 1rem !important; font-size: 1.5rem !important;">${this.options.warningTitle}</h2>
            <p style="color: #2c3e50 !important; line-height: 1.5 !important; margin-bottom: 1.5rem !important;">${this.options.warningMessage}</p>
            ${this.getWatermarkHTML()}
        `;

        warning.appendChild(messageBox);
        document.body.appendChild(warning);
        this.warningElement = warning;
        
        console.log('Ad blocker detected - showing warning');
    }

    getWatermarkHTML() {
        if (!this.options.watermark) return '';

        const style = this.options.watermarkStyle === 'dark' ? 
            'color: #1a202c !important; background: rgba(255, 255, 255, 0.9) !important;' :
            'color: #718096 !important; background: transparent !important;';

        return `
            <div style="
                ${style}
                font-size: 0.75rem !important;
                padding: 0.5rem !important;
                border-radius: 4px !important;
                margin-top: 1rem !important;
                font-weight: 500 !important;
                letter-spacing: 0.025em !important;
                text-align: center !important;
                text-decoration: none !important;
                transition: opacity 0.2s ease !important;
            ">
                <a href="https://onenetly.com" 
                   target="_blank" 
                   style="
                        color: inherit !important;
                        text-decoration: none !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        gap: 0.5rem !important;
                   "
                >
                    <svg style="width: 16px !important; height: 16px !important;" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    ${this.options.watermarkText}
                </a>
            </div>
        `;
    }

    hideWarning() {
        if (this.warningElement) {
            this.warningElement.remove();
            this.warningElement = null;
            console.log('Ad blocker not detected - hiding warning');
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdBlockDetector;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return AdBlockDetector; });
} else {
    window.AdBlockDetector = AdBlockDetector;
}