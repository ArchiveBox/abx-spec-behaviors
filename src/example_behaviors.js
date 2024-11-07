
/*********************** Example Behaviors ***********************/

// example: find all the <a href>s on the page and add them to the crawl queue
const DiscoverOutlinksBehavior = {
    schema: 'BehaviorSchema@0.1.0',
    name: 'DiscoverOutlinksBehavior',
    contexts: {
        WindowBehaviorBus: {
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
        PuppeteerBehaviorBus: {
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


// example: behavior to extract a page's article text content
const ExtractArticleTextBehavior = {
    schema: 'BehaviorSchema@0.1.0',
    name: 'ExtractArticleTextBehavior',
    contexts: {
        WindowBehaviorBus: {
            // '*': async (event, BehaviorBus, window) => {
            //     console.log(`[window] -> [ExtractArticleTextBehavior] ${JSON.stringify(event)}`);
            // },
            PAGE_CAPTURE: async (event, BehaviorBus, window) => {
                console.log(`[window] -> [ExtractArticleTextBehavior] 📄 Extracting article text...`)
                const article_text = window.document.body.innerText
                BehaviorBus.dispatchEvent(new BehaviorEvent('FS_WRITE_FILE', {path: 'body_text.txt', content: article_text}))
                BehaviorBus.dispatchEvent(new BehaviorEvent('DISCOVERED_TEXT', {selector: 'body', text: article_text}))
                // browsertrix could listen for this to build a full-text-search index in the WARC if it wants
            },
        },
    },
}

// example: behavior to expand comments on reddit, facebook, and github
const ExpandCommentsBehavior = {
    schema: 'BehaviorSchema@0.1.0',
    name: 'ExpandCommentsBehavior',

    // private helper methods that behavior can use internally
    _expand: (elem) => { elem.open = true },
    _shouldRun: (page_url) => {
        for (const domain of ['//facebook.com', '//reddit.com', '//github.com']) {
            if (page_url.includes(domain)) return true;
        }
        return false;
    },
    _selectors: (page_url) => {
        if (ExpandCommentsBehavior._shouldRun(page_url)) {
            return ['article details', 'div.js-discussion details:not(.details-overlay)', '.markdown-body details']
        }
        return [];
    },

    contexts: {
        WindowBehaviorBus: {
            // '*': async (event, BehaviorBus, window) => {
            //     console.log(`[window] -> [ExpandCommentsBehavior] ${JSON.stringify(event)}`);
            // },
            PAGE_LOAD: async (event, BehaviorBus, window) => {
                console.log(`[window] -> [ExpandCommentsBehavior] 💬 Expanding comments...`)

                // expand all <details> sections in Github READMEs, HedgeDoc pages, etc.
                for (const selector of ExpandCommentsBehavior._selectors(window.location.href)) {
                    for (const elem of window.document.querySelectorAll(selector)) {
                        ExpandCommentsBehavior._expand(elem);
                    }
                }
            }
        },
        PuppeteerBehaviorBus: {
            // '*': async (event, BehaviorBus, page) => {
            //     console.log(`[puppeteer] -> [ExpandCommentsBehavior] ${JSON.stringify(event)}`);
            // },
            PAGE_LOAD: async (event, BehaviorBus, page) => {
                console.log(`[puppeteer] -> [ExpandCommentsBehavior] 💬 Expanding comments...`)

                // if driver offers a puppeteer context the behavior can use its extra powers to pierce nested iframes/shadow doms/etc
                for (const selector of ExpandCommentsBehavior._selectors(page.url())) {
                    await page.$$eval(`pierce/${selector}`, ExpandCommentsBehavior._expand);
                }
            }
        },
    },
}

const BEHAVIORS = [DiscoverOutlinksBehavior, ExtractArticleTextBehavior, ExpandCommentsBehavior]
var all_exports = { DiscoverOutlinksBehavior, ExtractArticleTextBehavior, ExpandCommentsBehavior, BEHAVIORS }

if (globalThis.navigator) {
    // loaded from browser, running in window
    console.log(`[window] importing src/example_behaviors.js ...`);
    for (const key of Object.keys(all_exports)) {
        console.log(`[window] loaded window.${key}`);
        globalThis[key] = all_exports[key];
    }
} else {
    // loaded from node, running in puppeteer
    console.log(`[puppeteer] importing src/example_behaviors.js ...`);
    for (const key of Object.keys(all_exports)) {
        console.log(`[puppeteer] loaded global.${key}`);
    }
}

export { BEHAVIORS, DiscoverOutlinksBehavior, ExtractArticleTextBehavior, ExpandCommentsBehavior }
