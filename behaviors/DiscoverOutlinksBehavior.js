const DiscoverOutlinksBehavior = {
    schema: 'BehaviorSchema@0.1.0',
    name: 'DiscoverOutlinksBehavior',
    hooks: {
        window: {
            // '*': async (event, BehaviorBus, window) => {
            //     console.log(`[window] -> [DiscoverOutlinksBehavior] ${JSON.stringify(event)}`);
            // },
            PAGE_CAPTURE: async (event, BehaviorBus, window) => {
                console.log(`[window] -> [DiscoverOutlinksBehavior] 🔍 Discovering outlinks...`)
                for (const elem of window.document.querySelectorAll('a')) {
                    BehaviorBus.dispatchEvent(new BehaviorEvent('DISCOVERED_OUTLINK', {url: elem.href, elem}))
                }
            },
            DISCOVERED_OUTLINK: async (event, BehaviorBus, window) => {
                console.log(`[window] -> [DiscoverOutlinksBehavior] ➕ Found a new outlink to add to crawl! ${event.url}`)
                // browsertrix driver itself would also listen for this event and use it to add add URLs to the crawl queue
            }
        },
        puppeteer: {
            // '*': async (event, BehaviorBus, page) => {
            //     console.log(`[puppeteer] -> [DiscoverOutlinksBehavior] ${JSON.stringify(event)}`);
            // },
            // can also optionally implement handlers that run in other contexts (if driver implements that context)
            PAGE_SETUP: async (event, BehaviorBus, page) => {
                console.log(`[puppeteer] -> [DiscoverOutlinksBehavior] 🔧 Setting up page for outlink discovery...`)
                await page.setRequestInterception(true);
                page.on('request', request => {
                    request.continue();
                    if (request.url().endsWith('.html')) {
                        BehaviorBus.dispatchEvent(new BehaviorEvent('DISCOVERED_OUTLINK', {url: request.url()}));
                        // consumes/broadcasts events to all contexts using same shared BehaviorBus
                        // so the DISCOVERED_OUTLINK handler above would fire even though it's bound in a different context
                    }
                })
            },
        },
    },
}

export default DiscoverOutlinksBehavior;
