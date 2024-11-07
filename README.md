# behaviors-spec

Proposal for a shared user script specification between archiving &amp; crawling tools.

Designed to allow expending a puppeteer or browser-based workflow with custom JS snippets.  
(similar to TamperMonkey, but more powerful and designed to extend more pieces of the archiving flow)

## Quickstart

```bash
git clone https://github.com/ArchiveBox/behaviors-spec
cd behaviors-spec

npm install puppeteer
cd src/
node example_puppeteer_driver.js
```

## Example Behavior

```javascript
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
```

To see more example behaviors, check out:

- `src/example_behaviors.js`

## Example Behavior Driver


To see how Behaviors would be run by different tools, check out the example drivers:

- `src/example_puppeteer_driver.js`
- `src/example_browser_driver.js`

```javascript
$ cd src/
$ node ./example_puppeteer_driver.js
Registering window.BehaviorEvent = ...
Registering window.WindowBehaviorBus = ...
Registering window.PuppeteerBehaviorBus = ...
Registering window.ServiceWorkerBehaviorBus = ...
Registering window.initWindowBehaviorBus = ...
Registering window.initServiceWorkerBehaviorBus = ...
Registering window.BEHAVIORS = ...
Registering window.DiscoverOutlinksBehavior = ...
Registering window.ExtractArticleTextBehavior = ...
Registering window.ExpandCommentsBehavior = ...
initialized window.BehaviorBus = WindowBehaviorBus()
[puppeteer] -> [DiscoverOutlinksBehavior] 🔧 Setting up page for outlink discovery...

[puppeteer] -> [LOG] : {"type":"PAGE_SETUP","metadata":{"id":"af16f6ea-a17b-4339-88ec-040262cdeaa5","timestamp":1730956441325,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_SETUP","metadata":{"id":"af16f6ea-a17b-4339-88ec-040262cdeaa5","timestamp":1730956441325,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
Failed to load resource: the server responded with a status of 404 ()
[window] -> [LOG] : {"type":"PAGE_SETUP","metadata":{"id":"af16f6ea-a17b-4339-88ec-040262cdeaa5","timestamp":1730956441325,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [ExpandCommentsBehavior] 💬 Expanding comments...

[puppeteer] -> [LOG] : {"type":"PAGE_LOAD","metadata":{"id":"91ef07af-21cd-4a78-8446-d4f5cae2fb3d","timestamp":1730956441350,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_LOAD","metadata":{"id":"91ef07af-21cd-4a78-8446-d4f5cae2fb3d","timestamp":1730956441350,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [ExpandCommentsBehavior] 💬 Expanding comments...
[window] -> [LOG] : {"type":"PAGE_LOAD","metadata":{"id":"91ef07af-21cd-4a78-8446-d4f5cae2fb3d","timestamp":1730956441350,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}

[puppeteer] -> [LOG] : {"type":"PAGE_CAPTURE","metadata":{"id":"f967c174-70a6-4262-af3e-20209a7a03fb","timestamp":1730956446352,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_CAPTURE","metadata":{"id":"f967c174-70a6-4262-af3e-20209a7a03fb","timestamp":1730956446352,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [DiscoverOutlinksBehavior] 🔍 Discovering outlinks...
[window] -> [ExtractArticleTextBehavior] 📄 Extracting article text...
[window] -> [LOG] : {"type":"PAGE_CAPTURE","metadata":{"id":"f967c174-70a6-4262-af3e-20209a7a03fb","timestamp":1730956446352,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}
[window] -> [DiscoverOutlinksBehavior] ➕ Found a new outlink to add to crawl! https://www.iana.org/domains/example
[window] -> [LOG] : {"type":"DISCOVERED_OUTLINK","metadata":{"id":"9cf9d614-20e6-47e9-8564-1768c1f4f8bf","timestamp":1730956446354,"path":["WindowBehaviorBus"]},"url":"https://www.iana.org/domains/example","elem":{}}
[window] -> [LOG] : {"type":"FS_WRITE_FILE","metadata":{"id":"8a2e0164-c7f0-43a1-b415-4e6b10f080f1","timestamp":1730956446355,"path":["WindowBehaviorBus"]},"path":"body_text.txt","content":"Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\nMore information..."}
[window] -> [LOG] : {"type":"DISCOVERED_TEXT","metadata":{"id":"9fb09d49-cce9-4f16-98fc-daaf7df34e26","timestamp":1730956446355,"path":["WindowBehaviorBus"]},"selector":"body","text":"Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\nMore information..."}

[puppeteer] -> [LOG] : {"type":"PAGE_CAPTURE_COMPLETE","metadata":{"id":"c5bed695-db37-43b2-8bc5-eab058642c75","timestamp":1730956451353,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_CAPTURE_COMPLETE","metadata":{"id":"c5bed695-db37-43b2-8bc5-eab058642c75","timestamp":1730956451353,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [LOG] : {"type":"PAGE_CAPTURE_COMPLETE","metadata":{"id":"c5bed695-db37-43b2-8bc5-eab058642c75","timestamp":1730956451353,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}
```
