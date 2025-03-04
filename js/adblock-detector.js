class AdBlockDetector {
    constructor(options = {}) {
        this.options = {
            warningMessage: options.warningMessage || 'Please disable your ad blocker to continue',
            warningTitle: options.warningTitle || '🛡️ Ad Blocker Detected',
            blur: options.blur ?? true,
            blurAmount: options.blurAmount ?? 5,
            opacity: options.opacity ?? 0.95,
            checkInterval: 1000,
            minChecks: 2,
            watermark: options.watermark ?? true,
            watermarkText: options.watermarkText ?? 'Protected by FreeNetly',
            watermarkStyle: options.watermarkStyle ?? 'light', // 'light' or 'dark'
            customRules: options.customRules ?? [],
            generatorUrl: options.generatorUrl ?? 'index.html'
        };

        this.detected = false;
        this.warningElement = null;
        this.checkCount = 0;
        this.positiveChecks = 0;
        this.detectionRules = [];
        this.adNetworks = [
            { name: 'Google Ads', urls: [
                'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
                'https://googleads.g.doubleclick.net/pagead/id',
                'https://securepubads.g.doubleclick.net/gpt/pubads_impl_*'
            ]},
            { name: 'Media.net', urls: [
                'https://contextual.media.net/dmedianet.js',
                'https://static.media.net/ads.js'
            ]},
            { name: 'Amazon Associates', urls: [
                'https://ir-na.amazon-adsystem.com/e/ir',
                'https://z-na.amazon-adsystem.com/widgets/'
            ]},
            { name: 'Taboola', urls: [
                'https://cdn.taboola.com/libtrc/loader.js',
                'https://trc.taboola.com/'
            ]},
            { name: 'Outbrain', urls: [
                'https://widgets.outbrain.com/outbrain.js'
            ]},
            { name: 'AdRoll', urls: [
                'https://s.adroll.com/j/roundtrip.js'
            ]},
            { name: 'PropellerAds', urls: [
                'https://propu.sh/pfe/current/tag.min.js'
            ]}
        ];

        this.commonAdClassNames = [
            'ad', 'ads', 'adsbox', 'ad-box', 'ad-placement', 'doubleclick-ad', 
            'ad-container', 'advertisement', 'google-ad', 'sponsored-content',
            'promoted-content', 'pub_300x250', 'pub_300x250m', 'pub_728x90',
            'text-ad', 'text_ad', 'text_ads', 'text-ads'
        ];
    }

    async init() {
        // Load custom rules from generator if available
        await this.loadCustomRules();
        
        // Initial check
        await this.checkAdBlocker();
        
        // Continuous monitoring
        setInterval(() => this.checkAdBlocker(), this.options.checkInterval);
    }

    async loadCustomRules() {
        try {
            const response = await fetch(this.options.generatorUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.options)
            });
            
            const data = await response.json();
            if (data.rules) {
                this.detectionRules = [...this.options.customRules, ...data.rules];
            }
        } catch (error) {
            console.warn('Failed to load custom rules:', error);
        }
    }

    async checkAdBlocker() {
        const results = await Promise.all([
            this.checkAdNetworks(),
            this.checkBaitElements(),
            this.checkNetworkRequests(),
            this.checkDOMManipulation(),
            this.checkPixelAds(),
            this.checkIframeAds()
        ]);

        this.checkCount++;
        if (results.some(Boolean)) {
            this.positiveChecks++;
        }

        if (this.checkCount >= this.options.minChecks) {
            const isBlocked = this.positiveChecks / this.checkCount > 0.5;
            if (isBlocked !== this.detected) {
                this.detected = isBlocked;
                if (isBlocked) {
                    this.showWarning();
                } else {
                    this.hideWarning();
                }
            }
        }
    }

    async checkAdNetworks() {
        const checks = this.adNetworks.flatMap(network => 
            network.urls.map(url => this.checkAdResource(url))
        );
        const results = await Promise.all(checks);
        return results.some(Boolean);
    }

    async checkAdResource(url) {
        try {
            const resource = document.createElement('script');
            resource.src = url;
            resource.async = true;

            const blocked = await new Promise((resolve) => {
                resource.onload = () => resolve(false);
                resource.onerror = () => resolve(true);
                document.head.appendChild(resource);
                setTimeout(() => resolve(true), 1000);
            });
            resource.remove();
            return blocked;
        } catch {
            return true;
        }
    }

    async checkBaitElements() {
        const results = await Promise.all(
            this.commonAdClassNames.map(className => this.createBaitElement(className))
        );
        return results.some(Boolean);
    }

    async createBaitElement(className) {
        const bait = document.createElement('div');
        bait.className = className;
        bait.style.cssText = `
            position: absolute !important;
            top: -9999px !important;
            left: -9999px !important;
            height: 1px !important;
            width: 1px !important;
            opacity: 0.01 !important;
        `;
        
        // Add fake ad content
        bait.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="ad" />';
        
        document.body.appendChild(bait);
        await new Promise(resolve => setTimeout(resolve, 100));

        const isBlocked = this.checkElementVisibility(bait);
        bait.remove();
        return isBlocked;
    }

    checkElementVisibility(element) {
        const style = window.getComputedStyle(element);
        return !element.offsetParent ||
               style.display === 'none' ||
               style.visibility === 'hidden' ||
               style.opacity === '0' ||
               element.getBoundingClientRect().height === 0;
    }

    async checkDOMManipulation() {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = `
            <div class="advertising">
                <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" class="banner">
            </div>
        `;
        document.body.appendChild(testDiv);

        await new Promise(resolve => setTimeout(resolve, 100));
        const wasModified = !testDiv.querySelector('.advertising') || 
                           !testDiv.querySelector('.banner');
        testDiv.remove();
        return wasModified;
    }

    async checkPixelAds() {
        const pixel = document.createElement('img');
        pixel.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
        pixel.className = 'ad-pixel';
        pixel.style.position = 'absolute';
        
        document.body.appendChild(pixel);
        await new Promise(resolve => setTimeout(resolve, 100));
        const isBlocked = this.checkElementVisibility(pixel);
        pixel.remove();
        return isBlocked;
    }

    async checkIframeAds() {
        const iframe = document.createElement('iframe');
        iframe.src = 'about:blank';
        iframe.style.cssText = 'position: absolute; top: -9999px; width: 1px; height: 1px;';
        iframe.sandbox = 'allow-same-origin allow-scripts';
        
        document.body.appendChild(iframe);
        try {
            iframe.contentWindow.document.write('<div class="banner_ad"></div>');
            await new Promise(resolve => setTimeout(resolve, 100));
            const isBlocked = !iframe.contentWindow || 
                            !iframe.contentWindow.document.querySelector('.banner_ad');
            iframe.remove();
            return isBlocked;
        } catch {
            iframe.remove();
            return true;
        }
    }

    async checkNetworkRequests() {
        const urls = [
            'https://googleads.g.doubleclick.net/pagead/id',
            'https://securepubads.g.doubleclick.net/gpt/pubads_impl_*',
            'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
        ];

        try {
            const results = await Promise.all(urls.map(url => 
                fetch(url, { mode: 'no-cors', cache: 'no-cache' })
                    .then(() => false)
                    .catch(() => true)
            ));
            return results.some(Boolean);
        } catch {
            return true;
        }
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

        // Protection mechanisms
        this.protectWarningElement(warning);
        this.protectWarningElement(messageBox);

        document.body.appendChild(warning);
        this.warningElement = warning;

        // Enhanced visibility protection
        this.setupVisibilityProtection(warning);

        // Add additional protection
        this.preventDevTools();
        this.preventAdBlockerScripts();
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

    protectWarningElement(element) {
        Object.defineProperties(element, {
            remove: { value: () => this.handleRemovalAttempt() },
            style: {
                get: function() { return this._style; },
                set: function() { return false; }
            },
            innerHTML: {
                get: function() { return this._innerHTML; },
                set: function() { return false; }
            },
            className: {
                get: function() { return this._className; },
                set: function() { return false; }
            }
        });
    }

    setupVisibilityProtection(element) {
        const observer = new MutationObserver(() => {
            if (!document.body.contains(element)) {
                document.body.appendChild(element);
            }
            element.style.display = 'flex';
            element.style.visibility = 'visible';
            element.style.opacity = '1';
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // Periodic check
        setInterval(() => {
            if (!document.body.contains(element)) {
                document.body.appendChild(element);
            }
        }, 100);
    }

    preventDevTools() {
        const handler = setInterval(() => {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            if(widthThreshold || heightThreshold) {
                this.handleRemovalAttempt();
            }
        }, 1000);

        this.cleanup = () => {
            clearInterval(handler);
            // ...existing cleanup code...
        };
    }

    preventAdBlockerScripts() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT') {
                        const src = node.src.toLowerCase();
                        if (src.includes('adblock') || src.includes('ublock')) {
                            node.remove();
                        }
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    handleRemovalAttempt() {
        this.showWarning();
        if (this.options.forceReload) {
            setTimeout(() => location.reload(), 100);
        }
    }

    hideWarning() {
        if (this.warningElement) {
            this.warningElement.remove();
            this.warningElement = null;
        }
    }

    cleanup() {
        this.hideWarning();
        clearInterval(this.interval);
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