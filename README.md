# 🧩 [`abx-spec-behaviors`](https://archivebox.gitbook.io/abx-spec-behaviors) @ `v0.1.0` [DRAFT]

Proposal to allow user scripts to be shared between different browser automation / scraping / crawling tools.

> <img src="https://github.com/user-attachments/assets/9a504dab-07f0-47bb-bbe6-46e5be9949a4" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/23a03894-6c0b-47e3-b90b-c5b1067d92f7" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/cf28c807-e7b7-4c29-ba1e-9cc73ab557a4" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/ed13a5f9-8ccb-46d6-83be-2f4290ccee4a" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/064d5912-61be-409e-b0c4-70b689fbd2a0" width="60px"/> &nbsp; &nbsp; &nbsp; &nbsp; <img src="https://github.com/user-attachments/assets/46279a32-469d-4810-9eb7-b887f7068261" width="60px"/>  

> 🤔 To scrape Reddit comments using `playwright` today, you'd probably Google `reddit playwright`, attempt to copy/paste some examples, and likely end up writing your own code to scroll pages, wait for lazy loading, expand comments, extract as JSON, etc.  
>  
> 🚀 *Instead*, imagine if a simple Github search for `reddit topic:abx-behavior` yielded hundreds of community-mainted, spec-compliant `reddit` scripts for many different tasks, ready to run from any driver library (`puppeteer`/`playwright`/`webdriver`/etc.).

This spec defines a common format for user scripts + some core events that can be triggered from *any* browser automation environment.
```javascript
// example of a simple Behavior that could be shared via Github/Gist
const ScrollDownBehavior = {
    name: 'ScrollDownBehavior',
    schema: 'BehaviorSpec@0.1.0',
    version: '1.2.3',
    description: 'Scroll the page down to trigger any lazy-loaded content, then scroll back up.',
    documentation: 'https://github.com/example/ScrollDownBehavior',
    hooks: {
        window: {
            PAGE_LOAD: async (event, BehaviorBus, window) => {
                window.scrollTo({top: 1400, behavior: 'smooth'})   // scroll page down by 1400px
                setTimeout(() => {                                 // wait 2s, scroll back up
                    window.scrollTo({top: 0, behavior: 'smooth'})
                    document.querySelector('#loading-indicator').remove()  // can modify the DOM
                    BehaviorBus.emit({type: 'SCROLL_COMPLETE'})            // can emit events
                }, 2000)
            },
        },
    },
}

// to use this Behavior in a crawl, load it and fire PAGE_LOAD once `window` is ready:
BehaviorBus.attachBehaviors([ScrollDownBehavior])
BehaviorBus.attachContext(window); 
BehiavorBus.emit({type: 'PAGE_LOAD'})
```

🎭  `Behavior`s can define event listeners for normal `window` DOM events, but also for puppeteer lifecycle events, service worker / browser extension events, and other events that your crawling environment may choose to dispatch (see below for examples). It's one step up from [Greasemonkey user scripts](https://hayageek.com/greasemonkey-tutorial/#hello-world), with additional inspiration from <a href="https://github.com/webrecorder/browsertrix-behaviors"><code>browsertrix-behaviors</code></a>.

**Dependencies:** *None*, uses native JS `EventTarget` API, works consistently across browser and Node.  
**Easy to Run:** `import {BehaviorBus} from `[`'behaviors.js'`](https://github.com/ArchiveBox/abx-spec-behaviors/blob/main/src/behaviors.js) (&lt; 500 lines), load `Behavior`s, fire `PAGE_LOAD`

> [!IMPORTANT]  
> This is an early-stage proposal, we're seeking feedback from tool makers who build with browser automation!

## Goals

> To create an inter-operable spec that allows scraping projects to share browser automation scripts.

Everyone scraping today has to hide the same popups / block the same ads / log into the same sites / get around the same CAPTCHAs / expand the same comments, leading to a massive duplication of effort. Most projects manually write their own scripts for every site they want to scrape, and there's no good way to *share* those scripts consistently.

[Greasemonkey](https://en.wikipedia.org/wiki/Greasemonkey) grew into a [huge community](https://github.com/awesome-scripts/awesome-userscripts) because their very [very simple spec](https://hayageek.com/greasemonkey-tutorial/#hello-world) allows anyone to quickly write a function and [share it](https://greasyfork.org/en) in a way that's compatible with many different driver extensions (e.g. [Tampermonkey](https://www.tampermonkey.net/), [ViolentMonkey](https://violentmonkey.github.io/), FireBug, etc.).  
  
This `Behavior` spec proposal aims to do something similar, but for slightly more powerful user scripts that can leverage `puppeteer`, `playwright`, and other crawling & scraping driver APIs.

#### Use Cases

No one wants to maintain all the user scripts needed effectively crawl millions of different websites alone.  
Here are some examples of things that could be implemented as `Behavior`s and shared between tools:

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

We're aiming to foster easier collaboration & sharing of browser automation snippets between communities like these:

#### Toolmakers
- https://ArchiveBox.io
- https://webrecorder.net (https://github.com/webrecorder/browsertrix-behaviors)
- https://archive.org
- https://conifer.rhizome.org
- https://browser-use.com
- https://linkwarden.app
- https://github.com/gildas-lormeau/singlefile
- https://github.com/bellingcat/auto-archiver
- https://docs.anthropic.com/en/docs/build-with-claude/computer-use
- https://docs.anthropic.com/en/docs/build-with-claude/tool-use / and other AI function calling systems
- https://mcp-b.ai/

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

**Key Concepts:**

- [`Behavior`](#behavior): a plugin that implements some event listener hook methods
- [`BehaviorBus`](#behaviorbus): an event bus that coordinates emitting events and firing matching listeners
- [`BehaviorEvent`](#behaviorevent): an event `{type: 'PAGE_LOAD', url}` that goes through a `BehaviorBus`
- [`BehaviorDriver`](#behaviordriver): navigates to URLs, sets up `BehaviorBus` instances for browser/puppeteer/extensions, registers all the `Behavior` event listeners, and fires main crawl lifecycle events 

```mermaid
classDiagram
    class BehaviorEvent {
        +type: string
        +detail: object
        +metadata: object
    }
    
    class BehaviorBus {
        +context: object
        +behaviors: Behavior[]
        +attachContext(context)
        +attachBehaviors(behaviors)
        +on(type: string, handler: Function)
        +emit(event: BehaviorEvent | object)
    }
    
    class Behavior {
        +name: string
        +schema: string
        +state: object?
        +hooks: object
    }
    
    class BehaviorDriver {
        +name: string
        +schema: string
        +state: object?
        +hooks: object
    }
    

    Behavior --> BehaviorBus : emits events
    BehaviorDriver --> BehaviorBus : initializes, sends main events to
    BehaviorBus --> Behavior : executes hooks
```

## `Behavior`

Behaviors are the main focus of this proposal. A `Behavior` is a plain JS object containing some metadata fields (`name`, `schema`, `version`, `description`, ...) and some `hooks` (methods that get called to manipulate a page during crawling).

A simple one like `HideModalsBehavior` might only provide one hook `window: PAGE_LOAD` that deletes `div.modal` from the DOM.

A more complex behavior like `ExpandComments` might provide a `window: PAGE_LOAD` hook that expands `<details>` elements in the body, but it could also provide an extra `puppeteer: PAGE_LOAD` hook that will run if the crawling environment uses puppeteer. The `Behavior` is usable whether you're automating via browser extension or headless browser, because you can run it as long as you have `window`, but when puppeter's extra powers (e.g. `$$('pierce/...`) are available, the `Behvior` provides extra functionality that makes it work across shadow DOMs and inside `<iframe>`s.

If we all agree to use a minimal shared [event spec](#page-lifecycle-events) like this then can we all share the benefit of community-maintained pools of "Behaviors" organically on Github. You can build a fancy app store style interface in your own tool and just populate it with all Github repos tagged with `abx-behavior` + `yourtoolname`. Different crawling tools can implement different events and listeners, and when they dispatch events on `BehaviorBus` during crawling, `BehaviorBus` will run any `Behavior`s that respond to those events. You get opt-in plugin functionality for free based on the events you fire, and you barely have to modify existing crawling code at all. 

> [!TIP]
> Almost all `Behavior`s will only need a single `PAGE_LOAD` or `PAGE_CAPTURE` method to implement their functionality (under the `window` context). Hooks for other contexts are only to be used when a `Behavior` author wants to provide some extra bonus functionality for specific contexts (e.g. `puppeteer`, `serviceworker`, etc.).

**This Spec is A-La-Carte**

You can be minimalist and only fire `PAGE_LOAD` if you don't want your crawling tool offer a big surface area to `Behavior` scripts, or if you want all the functionality plugins have to offer, you can fire [all the lifcycle events](#page-lifecycle-events) like `PAGE_SETUP` `PAGE_CAPTURE` `PAGE_CLOSE`, etc.

Different browser automation environments provide different APIs to access the page during crawling. We expect *all* environments to provide `window`, but we also provide `BehaviorBus` implementations for other contexts like `puppeteer`'s `page`, or `serviceworker`'s `window`, `playwright`, and more.  
`Behavior` `hooks` methods are grouped by the name of the context they expect (e.g. `window`), and they'll only trigger if you provide that context during your crawl.

### `Behavior` Usage

Your crawling code should set up a `new BehaviorBus()` for each context you'll have available, then attach that context (e.g. `window` or `puppeteer`'s `page` object) + the `Behavior`s to run and link the busses together. When the page is ready, fire the [main lifecycle events](#page-lifecycle-events) to trigger the `Behaviors`.

```javascript
// use one of our provided  example driver implementations:
await crawlInBrowser('https://example.com', [ExtractArticleText, DiscoverOutlinks])
// OR
await crawlInPuppeteer('https://example.com', [ExtractArticleText, DiscoverOutlinks])

// OR run Behaviors in your existing crawl flow by setting up a BehaviorBus and firing PAGE_LOAD at the right time, e.g.:

const page = await browser.newPage();
await page.goto('https://example.com');
const BehaviorBus = new PuppeteerBehaviorBus([ExtractArticleText, DiscoverOutlinks], page);
await linkPuppeteerBusToWindowBus(BehaviorBus, page);
await page.waitForSelector('body');
BehaviorBus.emit({type: 'PAGE_LOAD', url});
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
         // ... see full list of Common Events below...
        },
        serviceworker: {
            PAGE_SETUP: async (event, BehaviorBus, window) => {
                // this only runs if the behavior is executed from a chrome extension / background.js
                // uses extra CDP APIs available to service workers to detect URLs in AJAX requests (in addition to <a href> element detection above)
                chrome.debugger.onEvent.addListener((source, method, params) => {
                    if (method === "Target.attachedToTarget") {
                        const new_tab_cdp = { ...source, sessionId: params.sessionId };
                        await chrome.debugger.sendCommand(new_tab_cdp, "Network.enable");
                    }
                    if (method === 'Network.requestWillBeSent' && params.resourceType == 'Document') {
                        BehaviorBus.emit({type: 'DISCOVERED_OUTLINK', url: params.request.url})
                    }
                });
            }
        },
     // webdriver: ...
     // puppeteer: ...
     // playwright: ...
     // archivebox: ...
     // browsertrix: ...
     // ... any other contexts: {...handlers...} the behavior defines ...
    },
}
```

To see more example behaviors, check out: [`src/example_behaviors.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_behaviors.js) and [`behaviors/`](https://github.com/ArchiveBox/abx-spec-behaviors/tree/main/behaviors).


<br/>

### `Behavior` Composition

If you want to have a `Behavior` depend on the output of an earlier one, it can simply listen for the relevant events it needs.  

```javascript
const ScreenshotBehavior = {
    ...
    puppeteer: {
        PAGE_CAPTURE: async (event, BehaviorBus, page) => {
            await page.screenshot(...);
            BehaviorBus.emit({type: 'EXTRACTED_SCREENSHOT', path: 'screenshot.png', ...})
        },
    }
}

const SomeBehaviorThatDependsOnScreenshot = {
    ...
    puppeteer: {
        EXTRACTED_SCREENSHOT: async (event, BehaviorBus, page) => {
            // this fires when any earlier behavior emits EXTRACTED_SCREENSHOT
            console.log('do something with the screenshot here...', event.path)
        }
    }
}
```

No API is provided for Behaviors to directly depend on other specific behaviors (e.g. `depends_on: ['SomeOtherBehavior']`), and in general trying to do so is strongly discouraged.  

By listening for a generic event, it allows users to swap out `ScreenshotBehavior` for a different screenshot implementation, as long as it emits the same `EXTRACTED_SCREENSHOT` event.  
Strive for "loose coupling" / [duck typing](https://en.wikipedia.org/wiki/Duck_typing), the only hard contracts between behaviors are the `EVENT_NAME` + args they emit/listen for.  
Respect the UNIX philosophy: `Expect the output of every program to become the input to another, as yet unknown, program.`.

---


<br/>

## `BehaviorBus`

`BehaviorBus` extends [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget), a simple event bus that can consume/emit events + trigger event listeners.  
`BehaviorEvent` extends [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent), both use the native JS event system (and work the same as DOM events).

### `BehaviorBus` Usage

A new `BehaviorBus` should be set up for each context as soon as page loading starts.
```javascript
window.BEHAVIORS = [HideModalsBehavior, ExpandCommentsBehavior, ...]
window.location.href = 'https://example.com'
window.BehaviorBus = new WindowBehaviorBus(window.BEHAVIORS, window);
```

```javascript
// these methods are all the same, they are just aliases of each other
BehaviorBus.dispatch(event) === BehaviorBus.dispatchEvent(event) === BehaviorBus.emit(event)
BehaviorBus.addEventListener(event_name, handler, options) === BehaviorBus.on(event_name, handler, options)
```

See `src/behaviors.js` for the full implementation.

### `BehaviorBus` Examples

```javascript
const BehaviorBus = new WindowBehaviorBus([PuppeteerCrawlDriver, ...window.BEHAVIORS], window);
// OR equivalent:
const BehaviorBus = new WindowBehaviorBus()
BehaviorBus.attachBehaviors([PuppeteerCrawlDriver, ...window.BEHAVIORS])
BehaviorBus.attachContext(window)
```

`Behavior`s define some event listener hooks, which get attached to the `BehaviorBus` by `BehaviorBus.attachBehaviors([...])`:
```javascript
// example of attaching a PAGE_LOAD event listener manually:
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
// OR equivalent:
BehaviorBus.emit(new BehaviorEvent('DISCOVERED_OUTLINK', {url}))
```


### How `BehaviorBus` instances get connected across contexts

<details><summary><code>BehaviorBus</code> instances are typically linked together so that events emitted by one get sent to all the others.</summary>

<br/>
  
Drivers set this up before a page is first loaded so that behavior code running in any context can coordinate
across all the contexts available to the driver.  e.g. a behavior hook running inside a page on <code>WindowBehaviorBus</code> can
emit an event that triggers a hook it defined on the <code>PuppeteerBehaviorBus</code>.  
This means <code>BehaviorEvent</code>s can "jailbreak" out of a page's context and propagate up to a parent puppeteer context, and vice versa.

<pre lang="javascript"><code>// set up forwarding from WindowBehaviorBus -> PuppeteerBehaviorBus
await page.exposeFunction('dispatchEventToPuppeteerBus', (event) => PuppeteerBehaviorBus.emit(event));
await page.evaluate(() => {
    window.BehaviorBus.on('*', (event) => {
        // if the event didn't come from the PuppeteerBehaviorBus already, forward it to them
        if (!event.detail.metadata.path.includes('PuppeteerBehaviorBus')) {
            console.log(`[window] -> [puppeteer]: ${JSON.stringify(event)}`);
            window.dispatchEventToPuppeteerBus(event.detail)
        }
    }, {behavior_name: 'WindowBusToPuppeteerBusForwarder'});
});
</code></pre>
<pre lang="javascript"><code>// set up forwarding from PuppeteerBehaviorBus -> WindowBehaviorBus
PuppeteerBehaviorBus.on('*', (event) => {
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

### Common Event Types

Each event should include relevant context in its payload such as URLs, extracted text, file paths, selectors, etc. Events can contain plain JSON-serilizable values only, don't put raw DOM element handles or special objects like `window` into events.

Event type names (e.g. `PAGE_LOAD`) should follow these principles:
1. Use existing DOM event names where applicable
2. Use NOUN + present tense VERB pattern for events typically fired by driver, that hooks react to (e.g., `PAGE_SETUP`, `PAGE_LOAD`, `PAGE_CHANGE`, `PAGE_CLOSE`)
3. Use past tense VERB + NOUN pattern e.g. `DISCOVERED_VIDEO` or `EXTRACTED_VIDEO` when a Behavior is reporting a content discovery or extraction it made
4. Include `_COMPLETE` suffix for events that report the ending of a process
5. Include `_ERROR` suffix for error variants of events

#### Page Lifecycle Events

A driver striving to be feature-complete should emit all these lifecycle events to the `BehaviorBus` at the correct times, however it is not required for it to emit all of them.  
A simple driver may only emit `PAGE_LOAD` for example, but it would miss out on any more complex `Behavior` plugin functionality that might depended on `PAGE_SETUP`.

- `PAGE_SETUP`: Fired when page navigation starts but before DOM is ready (equivalent to `document.readystate = 'loading'`)
- `DOM_CONTENT_LOADED`: Fired when initial HTML is loaded and parsed (maps directly to DOM event)
- **`PAGE_LOAD`**: Fired when page has finished loading including images/styles (equivalent to `window.onload`)
- `PAGE_IDLE`: Fired when page has been idle with no network activity for 2+ seconds
- `PAGE_CAPTURE`: Fired when it's time to extract content/take snapshots of the page
- `PAGE_CAPTURE_COMPLETE`: Fired when all capture/extraction operations are finished
- `PAGE_BEFORE_UNLOAD`: Fired before page is about to be unloaded (maps to `window.onbeforeunload`)
- `PAGE_UNLOAD`: Fired when page is being unloaded (maps to `window.onunload`)

#### File System Events

A driver that expects `Behaviors` (e.g. `ExtractArticleText`) to output files to the filesystem
needs to listen for these events and provide implementations for them. e.g. if you're in node
you could handle `FS_WRITE_FILE` by calling `fs.writeFileSync(event.path, event.content)`, but
if you are running `Behaviors` from a browser you may need to use OPFS instead.

- **`FS_WRITE_FILE`:** Fired when a `Behavior` is requesting to write a file
- `FS_MAKE_DIR`: Fired when requesting to create a directory (optional)
- `FS_DELETE_FILE`: Fired when requesting to delete a file (optional)
- `FS_REMOVE_DIR`: Fired when requesting to remove a directory (optional)

#### AI/LLM/External API Events

A driver could choose to implement these if it wants to allow `Behaviors` to use LLM APIs to do things. Behaviors should do LLM logic using these events, as then they be used with any LLM backend of the driver's choosing. Behaviors then won't have to hardcode their own internal logic to make calls to Open AI or Anthropic's APIs, and it makes it easier to swap in and out models depending on context.

- `LLM_REQUEST`: Fired when a Behavior wants to call whatever AI/LLM API might be provided by the driver
- `LLM_REQUEST_COMPLET`: Fired when AI/LLM processing completes
- `LLM_REQUEST_ERROR`: Fired when AI/LLM processing fails
- `... you coordinate other custom event types for your own private APIs too ...`

#### Content Discovery Events

Behaviors working with these types of content should emit these events when they discover relevant content on the page.
You might have a `Behavior` that scans `<a href>` links on the page, have it emit `DISCOVERED_OUTLINK` for each one it finds.
Then if your driver wants to do recursiving crawling, it could listen for `DISCOVERED_OUTLINK` events on the `BehaviorBus`, 
and add the reported URLs to its crawl queue.

- `DISCOVERED_OUTLINK`: Fired when a new URL is found that could be crawled
- `DISCOVERED_IMAGE`: Fired when an image resource is found
- `DISCOVERED_VIDEO`: Fired when a video resource is found
- `DISCOVERED_AUDIO`: Fired when an audio resource is found
- `DISCOVERED_DOWNLOAD`: Fired when a download link (ZIP/PDF/DOC/EXE/etc.) is found
- `DISCOVERED_FEED`: Fired when an RSS/Atom feed is found
- `DISCOVERED_API`: Fired when an API endpoint is found
- `DISCOVERED_FORM`: Fired when an interactive form is found
- `DISCOVERED_TEXT`: Fired when significant text content is found

#### Content Extraction Events

When content has been extracted out of a page and saved as a file somewhere.

- `EXTRACTED_METADATA`: Fired when page metadata has been collected
- `EXTRACTED_SCREENSHOT`: Fired when a screenshot has been taken
- `EXTRACTED_PDF`: Fired when a PDF has been generated
- `EXTRACTED_WARC`: Fired when an archive file has been created

#### Human Behavior Emulation Events

Behaviors can choose to emit these when emulating user stpes on a page / listen for them being emitted from other behaviors.  
These events don't do anything on their own and are not required, it's just recommended to announce these to make it easier for other
plugins to listen for changes and coordinate their own logic.

- `SCROLL`: Announce whenver a page's croll position is changed
- `SCROLL_COMPLETE`: Fired when a sequence of scroll operations is finished
- `FORM_SUBMIT`: Fired when attempting to submit a form
- `FORM_SUBMIT_COMPLETE`: Fired when form submission is finished
- `CLICK`: Fired when programmatically clicking an element
- `HOVER`: Fired when programmatically hovering over an element
- `INPUT`: Fired when programmatically entering text into a field
- `INPUT_COMPLETE`: Fired when a sequence of text input operations is finished
- `DIALOG_OPEN`: Fired when a modal/dialog opens
- `DIALOG_CLOSE`: Fired when a modal/dialog closes

<br/>



---

<br/>

## `BehaviorDriver`

`BehaviorDriver`s are actually just `Behavior`s like any other, with the same metadata fields + `hooks`.  
The only distinction is that `BehaviorDriver`s generally implement `hooks` to handle the [discovery events](#common-event-types)
that `Behavior`s use to *announce outputs* that you can do something with e.g. extracted video/audio/text, URLs to add to crawl queue, etc...

If a crawling project wants to use `Behavior`s to extract things out of pages during a crawl, 
then it should implement a `BehaviorDriver` to listen for the announcements about content it cares about.

Like normal `Behavior`s, `BehaviorDriver`s also can also maintain some `state` internally (if needed).
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
            //     SomeRemoteAPI.submit_new_job('yt-dlp', ['--add-metadata', event.url])
            // })
        },
    },
}
```


To see how drivers might implement the core event handlers differently, check out the example drivers:

- [`src/example_puppeteer_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_puppeteer_driver.js)
- [`src/example_browser_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_browser_driver.js)
- [`src/example_browsertrix_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/example_browsertrix_driver.js)
- [`src/example_archivebox_driver.js`](https://github.com/ArchiveBox/behaviors-spec/blob/main/src/)

<br/>

### `BehaviorDriver` Usage

Here's how you can test a driver:
```javascript
window.location.href = 'https://example.com'

// driver is registed on the bus just like any other Behavior
const BehaviorBus = new WindowBehaviorBus([BrowserCrawlDriver, ...window.BEHAVIORS], window);

// to test the driver, just emit one of the event types it handles
BehaviorBus.emit({type: 'FS_WRITE_FILE', path: 'text.txt', content: 'testing writing to filesystsem using drivers FS_WRITE_FILE implementation'})
```

---

## Full Crawl Example Output

Here's the example output from a full puppeteer crawl run with all the example `Behavior`s:
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
- ⭐️ Ideas from abx-spec-behaviors have since gone into: https://github.com/browser-use/bubus/ and https://github.com/browser-use/cdp-use
* Alternatives:
    * https://modelcontextprotocol.io/introduction + https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer
    * https://github.com/JuroOravec/portadom (unified DOM manipulation interface using cheerio on top of playwright/pupeteer/DOM)
    * https://docs.browserless.io/browserql/ (DSL on top of puppeteer/playwright/DOM)
    * https://quasar.dev/quasar-cli-vite/developing-browser-extensions/bex-bridge/ (event bus bridge between extension and page contexts)
