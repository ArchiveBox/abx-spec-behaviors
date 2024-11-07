# 🧩 `abx-spec-behaviors` @ `v0.1.0`

> <img src="https://github.com/user-attachments/assets/9a504dab-07f0-47bb-bbe6-46e5be9949a4" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/23a03894-6c0b-47e3-b90b-c5b1067d92f7" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/cf28c807-e7b7-4c29-ba1e-9cc73ab557a4" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/ed13a5f9-8ccb-46d6-83be-2f4290ccee4a" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/064d5912-61be-409e-b0c4-70b689fbd2a0" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/46279a32-469d-4810-9eb7-b887f7068261" width="60px"/>  

Spec for browser automation plugins that can be shared between scraping/crawling/archiving tools.  
Building on the ideas from [`browsertrix-behaviors`](https://github.com/webrecorder/browsertrix-behaviors).

Designed to allow extending browser automation and crawling workflows with custom behavior, using an event-based interface.  
```javascript
BehaviorBus.on('PAGE_LOAD', async ({url}, BehaviorBus, window) => ... do something ...)
BehaviorBus.on('DISCOVERED_OUTLINK',  async ({url}, BehaviorBus, window) => ... add to crawl queue ...)
BehaviorBus.on('DISCOVERED_VIDEO',  async ({url}, BehaviorBus, window) => ... download with yt-dlp ...)
```

It's one step up from TamperMonkey, with the ability to define event listeners for `window` events, puppeteer lifecycle events, service worker / browser extension events, and other events implemented by `CrawlDriver`s.

**Key Concepts:**

> `BehaviorSchema`, `BehaviorBusSchema`, `BehaviorEventSchema`, `BehaviorDriverSchema`

- [`Behavior`](#behavior): a plugin that implements some event listener hook methods
- [`BehaviorBus`](#behaviorbus): an event bus that coordinates emitting events and firing matching listeners
- [`BehaviorEvent`](#behaviorevent): an event `{type: 'PAGE_LOAD', url}` that goes through a `BehaviorBus`
- [`BehaviorDriver`](#behaviordriver): navigates to URLs, sets up `BehaviorBus` instances for browser/puppeteer/extensions, registers all the `Behavior` event listeners, and fires main crawl lifecycle events 

**Dependencies:** *None*, relies only on JS standard library `EventTarget` which is native in both browser and Node.

## Goals

To create an inter-operable spec for plugins that many scraper and digital archiving projects can share.

#### Use Cases

No one wants to maintain all the user scripts needed effectively crawl millions of different websites alone.  
Here are some examples of things that could be implemented as behaviors and shared between these communities:

- `scroll down to load infiniscroll content`
- `expand/unroll reddit/twitter comment threads automatically`
- `auto-solve CAPTCHAs`
- `log into a site using some saved credentils`
- `dismiss modals / cookie consent popups / privacy policies`
- `block ads requests / remove ads elements from page`
- `extract youtube videos/audio/subtitles to mp4/mp3/sub files`
- `export discovered outlink URLs to a Google Sheet`
- `send some page content to an LLM with a prompt and store the response`
- and more...

We're aiming to foster easier collaboration of browser automation snippets like these between:

#### Toolmakers
- https://ArchiveBox.io
- https://webrecorder.net (https://github.com/webrecorder/browsertrix-behaviors)
- https://archive.org
- https://conifer.rhizome.org
- https://linkwarden.app
- https://github.com/gildas-lormeau/singlefile
- https://github.com/bellingcat/auto-archiver
- https://docs.anthropic.com/en/docs/build-with-claude/computer-use
- https://docs.anthropic.com/en/docs/build-with-claude/tool-use / and other AI function calling systems

#### Industry
- https://reset.tech
- https://mediaforcellc.com
- https://www.starlinglab.org

> *Want to collaborate? Join us on the [ArchiveBox Zulip](https://zulip.archivebox.io/#narrow/stream/163-ideas/topic/new.20Behavior.20specification.20for.20community.20ecosystem.20plugins) or [WebRecorder Discord](https://discord.com/channels/895426029194207262/1303099855262187715/1303955724442931202), or [open an issue](https://github.com/ArchiveBox/behaviors-spec).*


## Quickstart

```bash
git clone https://github.com/ArchiveBox/behaviors-spec && cd behaviors-spec
npm install                                   # only needed to run examples

node src/example_puppeteer_driver.js
```

---

## `Behavior`

### `Behavior` Usage

`Behaviors` are used as part of a crawl process implemented by a [`BehaviorDriver`](#behaviordriver):
```javascript
await crawlInBrowser('https://example.com', [ExtractArticleText, DiscoverOutlinks])
// OR
await crawlInPuppeteer('https://example.com', [ExtractArticleText, DiscoverOutlinks])
```

### `Behavior` Examples

```javascript
class ExtractArticleText {
    name: 'ExtractArticleText',
    schema: 'BehaviorSchema@0.1.0',
    hooks: {
        window: {
            PAGE_CAPTURE: async (event, BehaviorBus, window) => {
                 const article_text = window.document.body.innerText
                 BehaviorBus.emit({type: 'DISCOVERED_TEXT', selector: 'body', text: article_text})
                 BehaviorBus.emit({type: 'FS_WRITE_FILE', path: 'article.txt', content: article_text})
            },
        },
    },
}
```
```javascript
const DiscoverOutlinks = {
    name: 'DiscoverOutlinks',
    version: '0.1.9',
    schema: 'BehaviorSchema@0.1.0',
    license: 'MIT',
    author: 'ArchiveBox',
    description: 'Find all the outgoing <a href> and <iframe> URLs on the page',
    documentation: 'https://github.com/ArchiveBox/behaviors-spec#example-behavior',

    findOutlinkURLs: (elem) => {
        return [...elem.querySelectorAll('a[href], iframe[src]')].map(a => a.href || a.src),
    },

    hooks: {
        window: {
            // PAGE_SETUP: ...
            // PAGE_LOAD: ...
            PAGE_CAPTURE: async (event, BehaviorBus, window) => {
                for (const url of DiscoverOutlinks.findOutlinkURLs(window.document.body)) {
                    BehaviorBus.emit({type: 'DISCOVERED_OUTLINK', url})
                    BehaviorBus.emit({type: 'FS_WRITE_FILE', path: 'outlinks.txt', mode: 'append', content: url + '\n'})
                }
            },
         // PAGE_CAPTURE_COMPLETE: ...
        },
     // serviceworker: ...
     // puppeteer: ...
     // playwright: ...
     // archivebox: ...
     // browsertrix: ...
     // ... any other BehaviorBus: {hooks} the behavior defines ...
    },
}
```

To see more example behaviors, check out: [`src/example_behaviors.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_behaviors.js).


<br/>


---


<br/>

## `BehaviorBus`

`BehaviorBus` extends [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) and is a simple event bus that can consume/emit events + dispatch event listener callbacks.  
`BehaviorEvent` extends [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent), both are based on the normal DOM event system / standard types and require no extra libraries.

### `BehaviorBus` Usage

A new `BehaviorBus` is set up for each context by the `BehaviorDriver` as soon as page loading starts.
```javascript
window.location.href = 'https://example.com'
window.BehaviorBus = new WindowBehaviorBus(window.BEHAVIORS, window);
```

```javascript
// these methods are all the same, they are just aliases of each other
BehaviorBus.dispatch(event) == BehaviorBus.dispatchEvent(event) == BehaviorBus.emit(event)
BehaviorBus.addEventListener(event_name, handler, options) == BehaviorBus.on(event_name, handler, options)
```

See `src/event_bus.js` for the full implementation.

### `BehaviorBus` Examples

```javascript
global.BehaviorBus = new WindowBehaviorBus(window.BEHAVIORS, window);
BehaviorBus.attachBehaviors([PuppeteerCrawlDriver])
BehaviorBus.attachBehaviors(window.BEHAVIORS)
BehaviorBus.attachContext(window)
```

Event listeners attached by `BehaviorBus.attachBehaviors([...])` look like this:
```javascript
// example: listen for PAGE_LOAD event, look for URLs on the page, and emit a DISCOVERED_URL event for each
BehaviorBus.on('PAGE_LOAD', async (event, BehaviorBus, window) => {
    for (const elem of window.document.querySelector('a[href]')) {
        BehaviorBus.emit({type: 'DISCOVERED_OUTLINK', url: elem.href})
    }
})
```

```javascript
// example: listen for *all* events on the BehaviorBus and log them to console
BehaviorBus.on('*', (event, BehaviorBus, window) => {
    console.log(`[window] -> [LOG] : ${JSON.stringify(event)}`);
}, {behavior_name: BehaviorBus.name});
```

```javascript
// dispatching an Event
BehaviorBus.emit({type: 'DISCOVERED_OUTLINK', url})
// OR
BehaviorBus.emit(new BehaviorEvent('DISCOVERED_OUTLINK', {url}))
```


### How `BehaviorBus` instances get connected

<details><summary><code>BehaviorBus</code> instances are typically linked together so that events emitted by one get sent to all the others.</summary>

<br/>
  
Drivers set this up before a page is first loaded so that behavior code running in any context can coordinate
across all the contexts available to the driver.  e.g. a behavior hook running inside a page on <code>WindowBehaviorBus</code> can
emit an event that triggers a hook it defined on the <code>PuppeteerBehaviorBus</code>.  
This means <code>BehaviorEvent</code>s can "jailbreak" out of a page's context and propagate up to a parent puppeteer context, and vice versa.

<pre lang="javascript"><code>// set up forwarding from WindowBehaviorBus -> PuppeteerBehaviorBus
await page.exposeFunction('dispatchEventToPuppeteerBus', (event) => PuppeteerBehaviorBus.emit(event));
await page.evaluate(() => {
    window.BehaviorBus.addEventListener('*', (event) => {
        // if the event didn't come from the PuppeteerBehaviorBus already, forward it to them
        if (!event.detail.metadata.path.includes('PuppeteerBehaviorBus')) {
            console.log(`[window] -> [puppeteer]: ${JSON.stringify(event)}`);
            window.dispatchEventToPuppeteerBus(event.detail)
        }
    }, {behavior_name: 'WindowBusToPuppeteerBusForwarder'});
});
</code></pre>
<pre lang="javascript"><code>// set up forwarding from PuppeteerBehaviorBus -> WindowBehaviorBus
PuppeteerBehaviorBus.addEventListener('*', (event) => {
    event = new BehaviorEvent(event);

    // if the event didn't come from the WindowBehaviorBus already, forward it to them
    if (!event.detail.metadata.path.includes('WindowBehaviorBus')) {
        console.log(`[puppeteer] -> [window]: ${JSON.stringify(event.detail)}`);
        page.evaluate((event) => {
            event = new BehaviorEvent(JSON.parse(event));
            window.BehaviorBus.emit(event);
        }, JSON.stringify(event.detail));
    }
}, {behavior_name: 'PuppeteerBusToWindowBusForwarder'});
</code></pre>

For the full linking code, see here:

<ul>
<li><a href="https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_puppeteer_driver.js"><code>src/example_puppeteer_driver.js: linkPuppeteerBusToWindowBus(...)</code></a></li>
<li><a href="https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_puppeteer_driver.js"><code>src/example_puppeteer_driver.js: linkPuppeteerBusToServiceWorkerBus(...)</code></a></li>
</ul>

</details>

<br/>

---

<br/>

## `BehaviorEvent`

`BehaviorEvent` extends [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) which is the standard `Event` type that browsers use for all DOM events.

```javascript
const event = new BehaviorEvent(
    'PAGE_LOAD',
    {url},
    {path: ['PuppeteerBehaviorBus']},
)

console.log(event.detail)
{
    type: 'PAGE_LOAD',         // must be all-caps [A-Z_]+
    metadata: {                // added automatically by BehaviorBus
        id: uuid4(),
        timestamp: Date.now(),
        path: ['PuppeteerBehaviorBus', 'WindowBehaviorBus'],
    }
    ...detail,                 // any extra data you include e.g. {url}
}
```

### `BehaviorEvent` Usage

Events can be dispatched by calling `BehaviorBus.emit({type: 'EVENT_TYPE', ...})` from any context:
```javascript
// example: dispatch an event to the event bus immediately
BehaviorBus.emit({type: 'PAGE_LOAD', url: window.location.href})

// equivalent:
BehaviorBus.emit(new BehaviorEvent('PAGE_LOAD', {url: window.location.href}))
```

<br/>


---

<br/>

## `BehaviorDriver`

`BehaviorDriver`s are just like `Behavior`s in that they implement some event listeners.  
Drivers are designed to implement the core events used by all the other behaviors as
their "standard library" of utilities, e.g. filesystem IO, adding to crawl queue, etc...

Drivers can maintain some persistent state across crawl as well (just like `Behaviors`).
```javascript
const BrowserCrawlDriver = {
    name: 'BrowserCrawlDriver',
    schema: 'BehaviorDriverSchema@0.1.0',

    state: {
        output_files: [],
        output_urls: [],
        output_texts: [],
    },

    hooks: {
        browser: {
            FS_WRITE_FILE: async (event, BehaviorBus, page) => {
                const opfsRoot = await window.navigator.storage.getDirectory();
                const fileHandle = await opfsRoot.getFileHandle("fast", { create: true });
                const accessHandle = await fileHandle.createSyncAccessHandle();
                accessHandle.write(content); accessHandle.flush(); accessHandle.close();
                BrowserCrawlDriver.state.output_files.push({path, accessHandle});
            },
            DISCOVERED_OUTLINK: async (event, BehaviorBus, page) => {
                BrowserCrawlDriver.state.output_urls.push(event.url);
            },
            DISCOVERED_TEXT: async (event, BehaviorBus, page) => {
                BrowserCrawlDriver.state.output_texts.push(event.text);
            },
            // DISCOVERED_MEDIA: async (event, BehaviorBus, page) => {
            //     BehaviorBus.emit({type: 'CALL_EXTERNAL_TOOL', bin: 'yt-dlp', cmd: ['yt-dlp', event.url]})
            // })
        },
    },
}
```


To see how Behaviors would be run by different tools, check out the example drivers:

- [`src/example_puppeteer_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_puppeteer_driver.js)
- [`src/example_browser_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_browser_driver.js)
- [`src/example_browsertrix_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_browsertrix_driver.js)
- [`src/example_archivebox_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/)

<br/>

### `BehaviorDriver` Usage

Here's how you can test a driver:
```javascript
window.location.href = 'https://example.com'

// driver is initialized right after navigation starts, before page is loaded
const BehaviorBus = new WindowBehaviorBus([BrowserCrawlDriver, ...window.BEHAVIORS], window);

// you can test the driver implementation by firing one of the events it handles
BehaviorBus.emit({type: 'FS_WRITE_FILE', path: 'text.txt', content: 'testing writing to filesystsem using drivers FS_WRITE_FILE implementation'})
```

### `BehaviorDriver` Example Output

Here's the example output from a full puppeteer crawl run with all the example behaviors:
```javascript
$ cd src/
$ node ./example_puppeteer_driver.js
// loading src/behavior_bus.js
[window] loaded window.BehaviorEvent
[window] loaded window.WindowBehaviorBus
[window] loaded window.PuppeteerBehaviorBus
[window] loaded window.ServiceWorkerBehaviorBus

// loading src/example_behaviors.js
[window] loaded window.DiscoverOutlinksBehavior
[window] loaded window.ExtractArticleTextBehavior
[window] loaded window.ExpandCommentsBehavior
[window] loaded window.BEHAVIORS

// setting up BehaviorBus instances
[puppeteer] initialized page.BehaviorBus    = PuppeteerBehaviorBus()
[window]    initialized window.BehaviorBus  = WindowBehaviorBus()
[puppeteer] linked PuppeteerBehaviorBus() <-> WindowBehaviorBus()

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

<br/>

---

<br/>

## Further Reading

- Proposal Discussions: [ArchiveBox Zulip](https://zulip.archivebox.io/#narrow/stream/163-ideas/topic/new.20Behavior.20specification.20for.20community.20ecosystem.20plugins) and [WebRecorder Discord](https://discord.com/channels/895426029194207262/1303099855262187715/1303955724442931202)
- Development Accouncement: https://docs.sweeting.me/s/archivebox-plugin-ecosystem-announcement
- Browsertrix's existing behaviors system: https://github.com/webrecorder/browsertrix-behaviors
- Built on: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
- Inspired by: https://pluggy.readthedocs.io/en/stable/index.html
