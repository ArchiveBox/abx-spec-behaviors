const ExpandCommentsBehavior = {
    name: 'ExpandCommentsBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        puppeteer: {
            PAGE_LOAD: async (event, BehaviorBus, page) => {
                // Expand all <details> elements first
                await page.$$eval('pierce/article details', elems => elems.forEach(e => e.open = true));
                await page.$$eval('pierce/div.js-discussion details:not(.details-overlay)', elems => elems.forEach(e => e.open = true));
                await page.$$eval('pierce/.markdown-body details', elems => elems.forEach(e => e.open = true));

                BehaviorBus.emit({type: 'DETAILS_SECTIONS_EXPANDED'});
            }
        },

        window: {
            PAGE_LOAD: async (event, BehaviorBus, window) => {
                const config = {
                    timeout: 120000,
                    limit: 15000,
                    delay: 650
                };

                function getElementsByXPath(xpath, context) {
                    const results = [];
                    const iterator = document.evaluate(
                        xpath,
                        context || document,
                        null,
                        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
                        null
                    );
                    let node;
                    while ((node = iterator.iterateNext())) {
                        results.push(node);
                    }
                    return results;
                }

                const getLoadMoreLinks = () => [
                    ...document.querySelectorAll('faceplate-partial[loading=action]'),
                    ...document.querySelectorAll('a[onclick^="return morechildren"]'),
                    ...document.querySelectorAll('a[onclick^="return togglecomment"]'),
                    ...getElementsByXPath("//*[text()='Show more replies']"),
                    ...getElementsByXPath("//*[text()='Show replies']"),
                ];

                const startTime = Date.now();
                let numExpanded = 0;
                
                while (true) {
                    const links = getLoadMoreLinks();
                    if (!links.length) break;
                    
                    for (const link of links) {
                        link.scrollIntoView({behavior: 'smooth'});
                        
                        if (link.slot === 'children') continue;
                        
                        link.click();
                        numExpanded++;
                        
                        BehaviorBus.emit({
                            type: 'COMMENT_EXPANDED',
                            numExpanded,
                            linkType: link.tagName,
                            linkText: link.textContent
                        });
                        
                        await new Promise(r => setTimeout(r, config.delay));
                        
                        if (numExpanded >= config.limit || 
                            (Date.now() - startTime) >= config.timeout) {
                            return;
                        }
                    }
                }

                if (numExpanded > 0) {
                    // Scroll to bottom then back to top
                    const finalHeight = document.body.scrollHeight;
                    window.scrollTo({ top: finalHeight + 1000, left: 0, behavior: 'smooth' });
                    await new Promise(r => setTimeout(r, config.delay));
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    await new Promise(r => setTimeout(r, config.delay));
                    BehaviorBus.emit({
                        type: 'PAGE_LOAD_EXTRA',
                        numExpanded,
                        timeElapsed: Date.now() - startTime,
                    });
                }
            }
        }
    }
};
