// Usage
/*
  Usage: run the code below in the context of the page, or by injecting another a tag pointing to this file:
      <script src="src/example_browsertrix_driver.js"></script>

  It uses window.Browsertrix, a hypothetical API that would be provided by the Browsertrix extension.
*/

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const BrowsertrixInBrowserCrawlDriver = {
    name: 'BrowsertrixInBrowserCrawlDriver',
    schema: 'BehaviorDriverSchema@0.1.0',

    state: {
        warc_file: null,
    },

    hooks: {
        browser: {
            FS_WRITE_FILE: async (event, BehaviorBus, page) => {
                const opfsRoot = await window.navigator.storage.getDirectory();
                const fileHandle = await opfsRoot.getFileHandle("fast", { create: true });
                const accessHandle = await fileHandle.createSyncAccessHandle();
                accessHandle.write(content); accessHandle.flush(); accessHandle.close();
                
                await window.Browsertrix.addExtraFileToWarc(path, accessHandle);
            },
            DISCOVERED_OUTLINK: async (event, BehaviorBus, page) => {
                await window.Browsertrix.addLinkToCrawlQueue(event.url);
            },
            DISCOVERED_TEXT: async (event, BehaviorBus, page) => {
                await window.Browsertrix.addTextToSearchIndex(event.text);
            },
            PAGE_CAPTURE_COMPLETE: async (event, BehaviorBus, page) => {
                BrowsertrixCrawlDriver.state.warc_file = await window.Browsertrix.saveWarc();
            },
        },
        serviceworker: {
            PAGE_CAPTURE_COMPLETE: async (event, BehaviorBus, page) => {
                await window.Browsertrix.uploadWarc(BrowsertrixCrawlDriver.state.warc_file);
            },
        }
    },
}

const crawlInBrowsertrixInBrowser = async (url, behaviors) => {
    // navigate to the url we want to archive in the browser
    window.location.href = url;

    // inject the behavior_bus.js implementation + example_behaviors.js into the page
    const behavior_bus_tag = document.createElement("script");
    behavior_bus_tag.src = "src/behavior_bus.js";
    document.head.appendChild(behavior_bus_tag);
    const behaviors_tag = document.createElement("script");
    behaviors_tag.src = "src/example_behaviors.js";
    document.head.appendChild(behaviors_tag);

    // initialize the WindowBehaviorBus bus
    const BehaviorBus = window.initWindowBehaviorBus([BrowsertrixInBrowserCrawlDriver, ...behaviors]);
    BehaviorBus.emit({type: 'PAGE_SETUP', url}, {path: [BrowsertrixInBrowserCrawlDriver.name]})

    // run the page lifecycle events
    window.addEventListener('load', async () => {
        BehaviorBus.emit({type: 'PAGE_LOAD', url: window.location.href}, {path: [BrowsertrixInBrowserCrawlDriver.name]})
        await sleep(5000);
        BehaviorBus.emit({type: 'PAGE_CAPTURE', url: window.location.href}, {path: [BrowsertrixInBrowserCrawlDriver.name]})
        await sleep(5000);
        BehaviorBus.emit({type: 'PAGE_CAPTURE_COMPLETE', url: window.location.href}, {path: [BrowsertrixInBrowserCrawlDriver.name]})
    });
}

// run the example
await crawlInBrowsertrixInBrowser('https://example.com', window.BEHAVIORS);
