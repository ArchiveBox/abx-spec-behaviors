const HideModalsBehavior = {
    name: 'HideModalsBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    findAndRemoveElements: (selectors) => {
        const removed = [];
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            for (const elem of elements) {
                if (elem && elem.style.display !== 'none') {
                    elem.style.display = 'none';
                    removed.push({
                        selector,
                        id: elem.id,
                        classes: Array.from(elem.classList),
                        text: elem.innerText?.slice(0, 50)
                    });
                }
            }
        }
        return removed;
    },
    
    hooks: {
        window: {
            PAGE_LOAD: async (event, BehaviorBus, window) => {
                // Common selectors for various types of popups/modals
                const modalSelectors = [
                    // Generic Modal/Popup/Overlay Selectors
                    '[class*="modal"]',
                    '[class*="popup"]',
                    '[class*="overlay"]',
                    '[class*="dialog"]',
                    '[id*="modal"]',
                    '[id*="popup"]',
                    '[id*="overlay"]',
                    '[id*="dialog"]',
                    '[role="dialog"]',
                    '[aria-modal="true"]',
                    
                    // Cookie Consent Selectors
                    '[class*="cookie"]',
                    '[id*="cookie"]',
                    '[class*="consent"]',
                    '[id*="consent"]',
                    '[class*="gdpr"]',
                    '[id*="gdpr"]',
                    '#cookies-banner',
                    '#cookie-banner',
                    '.cookie-banner',
                    '.cookies-banner',
                    '[aria-label*="cookie"]',
                    '[aria-label*="consent"]',
                    
                    // Newsletter/Subscription Popups
                    '[class*="newsletter"]',
                    '[id*="newsletter"]',
                    '[class*="subscribe"]',
                    '[id*="subscribe"]',
                    
                    // Generic Fixed Position Elements (Often Modals/Popups)
                    'div[style*="position: fixed"]',
                    'div[style*="position:fixed"]',
                    'div[class*="fixed"]',
                    
                    // Site-Specific Common Selectors
                    '.fc-consent-root',                // Funding Choices consent
                    '.qc-cmp2-container',             // Quantcast consent
                    '#onetrust-consent-sdk',          // OneTrust consent
                    '.cc-window',                     // Cookie Consent banner
                    '.js-consent-banner',             // Generic consent
                    '#sp-cc',                         // Amazon consent
                    '.js-gdpr-consent-banner',        // GDPR specific
                    '#CybotCookiebotDialog',         // Cookiebot
                    '.osano-cm-window',              // Osano consent
                    '#trustarcNoticeFrame',          // TrustArc
                    '.evidon-banner',                // Evidon
                    '#gdpr-consent-tool-wrapper',    // Generic GDPR
                    
                    // Paywall/Login Prompts
                    '[class*="paywall"]',
                    '[id*="paywall"]',
                    '[class*="login-prompt"]',
                    '[id*="login-prompt"]',
                    
                    // Social Media Prompts
                    '[class*="social-prompt"]',
                    '[id*="social-prompt"]',
                    '[aria-label*="social"]'
                ];

                // First pass: immediate removal
                const removed = HideModalsBehavior.findAndRemoveElements(modalSelectors);
                
                if (removed.length) {
                    BehaviorBus.emit({
                        type: 'MODALS_REMOVED',
                        count: removed.length,
                        removedElements: removed
                    });
                }

                // Second pass: delayed removal for lazy-loaded modals
                setTimeout(() => {
                    const removedDelayed = HideModalsBehavior.findAndRemoveElements(modalSelectors);
                    if (removedDelayed.length) {
                        BehaviorBus.emit({
                            type: 'MODALS_REMOVED_DELAYED',
                            count: removedDelayed.length,
                            removedElements: removedDelayed
                        });
                    }
                }, 2000);

                // Monitor for dynamically added modals
                const observer = new MutationObserver((mutations) => {
                    const removedDynamic = HideModalsBehavior.findAndRemoveElements(modalSelectors);
                    if (removedDynamic.length) {
                        BehaviorBus.emit({
                            type: 'MODALS_REMOVED_DYNAMIC',
                            count: removedDynamic.length,
                            removedElements: removedDynamic
                        });
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                // Clean up observer after 10 seconds
                setTimeout(() => {
                    observer.disconnect();
                    BehaviorBus.emit({
                        type: 'MODAL_OBSERVATION_COMPLETE',
                        url: window.location.href
                    });
                }, 10000);
            },

            PAGE_BEFORE_UNLOAD: (event, BehaviorBus, window) => {
                // Some sites redirect if you block their modal, override that
                window.onbeforeunload = null;
                window.onunload = null;
            }
        }
    }
};

export default HideModalsBehavior;
