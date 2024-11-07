# behaviors-spec

Proposal for a shared user script specification between archiving &amp; crawling tools.

Designed to allow expending a puppeteer or browser-based workflow with custom JS snippets.  
(similar to TamperMonkey, but more powerful and designed to extend more pieces of the archiving flow)

**Key Concepts:**

- [`Behavior`](#example-behavior): a plugin that defines some event listener hook methods
- [`BehaviorBus`](#behaviorbus-implementation): an event bus that lets you register event listener methods + dispatch `BehaviorEvent`s
- [`Behavior Driver`](#example-behavior-driver): sets up a `BehaviorBus` for browser/puppeteer/extensions, registers `Behavior` hooks, and fires all the main lifecycle events 

## Quickstart

```bash
git clone https://github.com/ArchiveBox/behaviors-spec
cd behaviors-spec

npm install
cd src/
node example_puppeteer_driver.js
```

---

## Example Behavior

```javascript
// example: find all the <a href>s on the page and add them to the crawl queue
const DiscoverOutlinksBehavior = {
    name: 'DiscoverOutlinksBehavior',
    schema: 'BehaviorSchema@0.1.0',

    // private helper methods can be defined on the behavior
    _isValidOutlink: (url) => {
        const extension = url.split('?')[0].split('#')[0].split('.').at(-1) || 'html'
        return ['html', 'htm', 'php', 'asp', 'aspx', 'jsp'].includes(extension.toLowerCase())
    },

    // hooks are public methods that get called when those events fire on a certain Event Bus
    hooks: {
        WindowBehaviorBus: {
            // this hook will be called when the PAGE_CAPTURE event is fired on the WindowBehaviorBus
            // the driver fires the PAGE_CAPTURE event on all event busses when it has finished loading a page and its time to extract content
            PAGE_CAPTURE: async (event, BehaviorBus, window) => {
                console.log(`[window] -> [DiscoverOutlinksBehavior] 🔍 Discovering outlinks by finding <a href> tags...`)

                for (const elem of window.document.querySelectorAll('a')) {
                    BehaviorBus.emit({type: 'DISCOVERED_OUTLINK', url: elem.href, elem})
                }
            },
        },
        PuppeteerBehaviorBus: {
            // the driver fires the PAGE_SETUP event on all buses as soon as the page has started navigating but before it has finished loading
            // because this hook is under PuppeteerBehaviorBus, only drivers that use puppeteer will trigger this hook
            PAGE_SETUP: async (event, BehaviorBus, page) => {
                console.log(`[puppeteer] -> [DiscoverOutlinksBehavior] 🔧 Discovering outlinks by watching for requests ending in .html...`)

                await page.setRequestInterception(true);
                page.on('request', request => {
                    request.continue();
                    if (DiscoverOutlinksBehavior._isValidOutlink(request.url())) {
                        BehaviorBus.emit({type: 'DISCOVERED_OUTLINK', url: request.url()})
                    }
                })
            },
        },
    },
}
```

To see more example behaviors, check out:

- `src/example_behaviors.js`

---

## Example Behavior Driver


To see how Behaviors would be run by different tools, check out the example drivers:

- `src/example_puppeteer_driver.js`
- `src/example_browser_driver.js`

```javascript
$ cd src/
$ node ./example_puppeteer_driver.js
// loading src/behavior_bus.js
Registering window.BehaviorEvent = ...
Registering window.WindowBehaviorBus = ...
Registering window.PuppeteerBehaviorBus = ...
Registering window.ServiceWorkerBehaviorBus = ...
Registering window.initWindowBehaviorBus = ...
Registering window.initServiceWorkerBehaviorBus = ...

// loading src/example_behaviors.js
Registering window.DiscoverOutlinksBehavior = ...
Registering window.ExtractArticleTextBehavior = ...
Registering window.ExpandCommentsBehavior = ...
Registering window.BEHAVIORS = ...

// setting up BehaviorBus instances
initialized PuppeteerBehaviorBus()
initialized WindowBehaviorBus()
linked PuppeteerBehaviorBus() <-> WindowBehaviorBus()

[puppeteer] -> [LOG] : {"type":"PAGE_SETUP","metadata":{"id":"af16f6ea-a17b-4339-88ec-040262cdeaa5","timestamp":1730956441325,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_SETUP","metadata":{"id":"af16f6ea-a17b-4339-88ec-040262cdeaa5","timestamp":1730956441325,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [LOG] : {"type":"PAGE_SETUP","metadata":{"id":"af16f6ea-a17b-4339-88ec-040262cdeaa5","timestamp":1730956441325,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}

[puppeteer] -> [DiscoverOutlinksBehavior] 🔧 Discovering outlinks by watching for requests ending in .html

[puppeteer] -> [LOG] : {"type":"PAGE_LOAD","metadata":{"id":"91ef07af-21cd-4a78-8446-d4f5cae2fb3d","timestamp":1730956441350,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_LOAD","metadata":{"id":"91ef07af-21cd-4a78-8446-d4f5cae2fb3d","timestamp":1730956441350,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [LOG] : {"type":"PAGE_LOAD","metadata":{"id":"91ef07af-21cd-4a78-8446-d4f5cae2fb3d","timestamp":1730956441350,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}

[puppeteer] -> [ExpandCommentsBehavior] 💬 Expanding comments...
[window] -> [ExpandCommentsBehavior] 💬 Expanding comments...

[puppeteer] -> [LOG] : {"type":"PAGE_CAPTURE","metadata":{"id":"f967c174-70a6-4262-af3e-20209a7a03fb","timestamp":1730956446352,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_CAPTURE","metadata":{"id":"f967c174-70a6-4262-af3e-20209a7a03fb","timestamp":1730956446352,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [LOG] : {"type":"PAGE_CAPTURE","metadata":{"id":"f967c174-70a6-4262-af3e-20209a7a03fb","timestamp":1730956446352,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}

[window] -> [DiscoverOutlinksBehavior] 🔍 Discovering outlinks...
[window] -> [ExtractArticleTextBehavior] 📄 Extracting article text...
[window] -> [DiscoverOutlinksBehavior] ➕ Found a new outlink to add to crawl! https://www.iana.org/domains/example

[window] -> [LOG] : {"type":"DISCOVERED_OUTLINK","metadata":{"id":"9cf9d614-20e6-47e9-8564-1768c1f4f8bf","timestamp":1730956446354,"path":["WindowBehaviorBus"]},"url":"https://www.iana.org/domains/example","elem":{}}
[window] -> [LOG] : {"type":"FS_WRITE_FILE","metadata":{"id":"8a2e0164-c7f0-43a1-b415-4e6b10f080f1","timestamp":1730956446355,"path":["WindowBehaviorBus"]},"path":"body_text.txt","content":"Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\nMore information..."}
[window] -> [LOG] : {"type":"DISCOVERED_TEXT","metadata":{"id":"9fb09d49-cce9-4f16-98fc-daaf7df34e26","timestamp":1730956446355,"path":["WindowBehaviorBus"]},"selector":"body","text":"Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\nMore information..."}

[puppeteer] -> [LOG] : {"type":"PAGE_CAPTURE_COMPLETE","metadata":{"id":"c5bed695-db37-43b2-8bc5-eab058642c75","timestamp":1730956451353,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus"]},"url":"https://example.com"}
[puppeteer] -> [window]: {"type":"PAGE_CAPTURE_COMPLETE","metadata":{"id":"c5bed695-db37-43b2-8bc5-eab058642c75","timestamp":1730956451353,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder"]},"url":"https://example.com"}
[window] -> [LOG] : {"type":"PAGE_CAPTURE_COMPLETE","metadata":{"id":"c5bed695-db37-43b2-8bc5-eab058642c75","timestamp":1730956451353,"path":["PuppeteerCrawlDriver","PuppeteerBehaviorBus","PuppeteerBusToWindowBusForwarder","WindowBehaviorBus"]},"url":"https://example.com"}
```

---

## BehaviorBus Implementation

`BehaviorBus` extends [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) and is a simple event bus that can consumer/emit events and dispatch event listener callbacks.  
`BehaviorEvent` extends [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent), both work just like the normal DOM event system.

```javascript

window.BehaviorBus = new WindowBehaviorBus();
window.BehaviorBus.attachBehaviors(window.BEHAVIORS);
window.BehaviorBus.attachContext(window);

// example: listen for all events on the BehaviorBus and log them to console
window.BehaviorBus.addEventListener('*', (event, BehaviorBus, window) => {
    console.log(`[window] -> [LOG] : ${JSON.stringify(event)}`);
}, {behavior_name: 'WindowBehaviorBus'});

// example: listen for PAGE_LOAD event, look for URLs on the page, and emit a DISCOVERED_URL event for each
window.BehaviorBus.addEventListener('PAGE_LOAD', async (event, BehaviorBus, window) => {
    for (const elem of window.document.querySelector('a[href]')) {
        BehaviorBus.dispatch({type: 'DISCOVERED_OUTLINK', url: elem.href})
    }
})

// example: dispatch an event to the event bus immediately
window.BehaviorBus.dispatch({type: 'PAGE_LOAD', url: window.location.href})

// OR for stricter validation you can pass a new BehaviorEvent(type, {...detail}) instead:
window.BehaviorBus.dispatch(new BehaviorEvent('PAGE_LOAD', {url: window.location.href}))

// these methods are all the same, they are just aliases of each other
BehaviorBus.dispatch(event) == BehaviorBus.dispatchEvent(event) == BehaviorBus.emit(event)
BehaviorBus.addEventListener(event_name, handler, options) == BehaviorBus.on(event_name, handler, options)
```

See `src/event_bus.js` for the full implementation.

#### All `BehaviorBus` instances get connected

`BehaviorBus` instances are typically linked together so that events emitted by one get sent to all the others.  
  
Drivers set this up before a page is first loaded so that behavior code running in any context can coordinate
across all the contexts available to the driver. e.g. a behavior hook running inside a page on `WindowBehaviorBus` can
emit an event that triggers a hook it defines on the `PuppeteerBehaviorBus`. This means `BehaviorEvent`s will "jailbreak"
out of a page's typically isolated context and propagate up to a parent puppeteer context, and vice versa.

```javascript
// set up forwarding from WindowBehaviorBus -> PuppeteerBehaviorBus
await page.exposeFunction('dispatchEventToPuppeteerBus', (event) => PuppeteerBehaviorBus.dispatchEvent(event));
await page.evaluate(() => {
    window.BehaviorBus.addEventListener('*', (event) => {
        // if the event didn't come from the PuppeteerBehaviorBus already, forward it to them
        if (!event.detail.metadata.path.includes('PuppeteerBehaviorBus')) {
            console.log(`[window] -> [puppeteer]: ${JSON.stringify(event)}`);
            window.dispatchEventToPuppeteerBus(event.detail)
        }
    }, {behavior_name: 'WindowBusToPuppeteerBusForwarder'});
});

// set up forwarding from PuppeteerBehaviorBus -> WindowBehaviorBus
PuppeteerBehaviorBus.addEventListener('*', (event) => {
    event = new BehaviorEvent(event);

    // if the event didn't come from the WindowBehaviorBus already, forward it to them
    if (!event.detail.metadata.path.includes('WindowBehaviorBus')) {
        console.log(`[puppeteer] -> [window]: ${JSON.stringify(event.detail)}`);
        page.evaluate((event) => {
            event = new BehaviorEvent(JSON.parse(event));
            window.BehaviorBus.dispatchEvent(event);
        }, JSON.stringify(event.detail));
    }
}, {behavior_name: 'PuppeteerBusToWindowBusForwarder'});
```

For the full linking code, see here:

- `src/example_puppeteer_driver.js: linkPuppeteerBusToWindowBus(...)` 
- `src/example_puppeteer_driver.js: linkPuppeteerBusToServiceWorkerBus(...)` 
