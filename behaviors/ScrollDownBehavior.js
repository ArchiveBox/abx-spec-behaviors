const ScrollDownBehavior = {
    name: 'ScrollDownBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        window: {
            PAGE_LOAD: async (event, BehaviorBus, window) => {
                const config = {
                    scrollDelay: 2000,
                    scrollDistance: 1000,
                    scrollLimit: 50,
                    timeout: 120000
                };
                
                // Scroll to top first
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                
                let scrollCount = 0;
                let lastHeight = window.document.body.scrollHeight;
                let scrollPosition = 0;
                
                const startTime = Date.now();
                
                while (scrollCount < config.scrollLimit && 
                       (Date.now() - startTime) < config.timeout) {
                    
                    BehaviorBus.emit({
                        type: 'SCROLL',
                        scrollCount,
                        scrollPosition,
                        totalHeight: lastHeight,
                    });
                    
                    // Perform smooth scroll
                    window.scrollTo({ 
                        top: scrollPosition,
                        left: 0,
                        behavior: 'smooth'
                    });
                    
                    // Check for infiniscroll
                    const newHeight = window.document.body.scrollHeight;
                    const addedHeight = newHeight - lastHeight;
                    
                    if (addedHeight > 0) {
                        BehaviorBus.emit({
                            type: 'PAGE_LOAD_EXTRA',
                            addedHeight,
                            newTotalHeight: newHeight
                        });
                    } else if (scrollPosition >= newHeight + config.scrollDistance) {
                        // Reached the bottom
                        break;
                    }
                    
                    lastHeight = newHeight;
                    scrollCount++;
                    scrollPosition = scrollCount * config.scrollDistance;
                        
                    await new Promise(r => setTimeout(r, config.scrollDelay));
                }
                
                // Final scroll to bottom if needed
                if (scrollPosition < lastHeight) {
                    window.scrollTo({
                        top: window.document.body.scrollHeight,
                        left: 0,
                        behavior: 'smooth'
                    });
                    await new Promise(r => setTimeout(r, config.scrollDelay));
                }
                
                // Return to top
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                
                BehaviorBus.emit({
                    type: 'SCROLL_COMPLETE',
                    finalHeight: lastHeight,
                    scrollCount,
                    reachedBottom: scrollPosition >= lastHeight
                });
            }
        }
    }
};

export default ScrollDownBehavior;
