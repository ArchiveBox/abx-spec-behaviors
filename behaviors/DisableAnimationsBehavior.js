const DisableAnimationsBehavior = {
    name: 'DisableAnimationsBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        window: {
            PAGE_SETUP: async (event, BehaviorBus, window) => {
                const cssOverride = `*, *::before, *::after {
                    -moz-animation: none !important;
                    -moz-transition: none !important;
                    animation: none !important;
                    transition: none !important;
                    caret-color: transparent !important;
                }`;
                
                // Add style to current page
                const style = window.document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = cssOverride;
                window.document.getElementsByTagName('head')[0].appendChild(style);
                
                BehaviorBus.emit({
                    type: 'ANIMATIONS_DISABLED',
                    cssOverride
                });
            }
        },
        
        puppeteer: {
            PAGE_SETUP: async (event, BehaviorBus, page) => {
                // Ensure styles are added to any new pages
                const cssOverride = `*, *::before, *::after {
                    -moz-animation: none !important;
                    -moz-transition: none !important;
                    animation: none !important;
                    transition: none !important;
                    caret-color: transparent !important;
                }`;
                
                await page.evaluateOnNewDocument((css) => {
                    const style = document.createElement('style');
                    style.type = 'text/css';
                    style.innerHTML = css;
                    document.getElementsByTagName('head')[0].appendChild(style);
                }, cssOverride);
            }
        }
    }
};

export default DisableAnimationsBehavior;
