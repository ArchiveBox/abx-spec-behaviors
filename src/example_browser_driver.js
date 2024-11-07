// Usage
/*
  Usage: run the code below in the context of the page, or by injecting another a tag pointing to this file:
      <script src="src/example_browser_driver.js"></script>
*/

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/*********************** Crawl Drivers ***********************/

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
        },
    },
}


const crawlInBrowser = async (url, behaviors) => {
    // navigate to the url we want to archive
    window.location.href = url;

    // inject the behavior_bus.js implementation into the page
    const behavior_bus_tag = document.createElement("script");
    behavior_bus_tag.src = "src/behavior_bus.js";
    document.head.appendChild(behavior_bus_tag);

    // inject the example_behaviors.js into the page
    const behaviors_tag = document.createElement("script");
    behaviors_tag.src = "src/example_behaviors.js";
    document.head.appendChild(behaviors_tag);

    // initialize the WindowBehaviorBus bus
    const BehaviorBus = window.initWindowBehaviorBus([BrowserCrawlDriver, ...behaviors]);
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_SETUP', {url}, {path: [BrowserCrawlDriver.name]}));

    // run the page lifecycle events
    window.addEventListener('load', async () => {
        BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_LOAD', {url: window.location.href}, {path: [BrowserCrawlDriver.name]}));
        await sleep(5000);
        BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_CAPTURE', {url: window.location.href}, {path: [BrowserCrawlDriver.name]}));
        await sleep(5000);
        BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_CAPTURE_COMPLETE', {url: window.location.href}, {path: [BrowserCrawlDriver.name]}));
    });
}

// run the example
await crawlInBrowser('https://example.com', window.BEHAVIORS);
