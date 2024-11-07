// BehaviorEvent wraps normal DOMEvents with some extra context metadata for the behaviors system
// it prevent infininte loops in the event bus forwarding by attaching info about the senders

import puppeteer from 'puppeteer';
import fs from 'node:fs';

import { BehaviorEvent, PuppeteerBehaviorBus } from './behavior_bus.js';
import { BEHAVIORS } from './example_behaviors.js';

process.chdir(import.meta.dirname);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const linkPuppeteerBusToWindowBus = async (PuppeteerBehaviorBus, page) => {
    // add the behavior bus code & behaviors code to the page
    const behavior_bus_js = fs.readFileSync(`./abx_behavior_spec.js`, 'utf8').split('\nexport {')[0];
    await page.evaluate(behavior_bus_js);
    const behaviors_js = fs.readFileSync(`./example_behaviors.js`, 'utf8').split('\nexport {')[0];
    await page.evaluate(behaviors_js);

    // set up console log forwarding
    page.on('console', (msg) => {
        console.log(`${msg.text()}`);
    });

    // set up BehaviorBus inside window context
    await page.evaluate(() => {
        window.BehaviorBus = new WindowBehaviorBus(window.BEHAVIORS, window)
    });

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

}

const linkPuppeteerBusToServiceWorkerBus = async (PuppeteerBehaviorBus, browser, extensionId) => {
    // set up BehaviorBus inside serviceWorker context
    const service_worker = browser.targets().find((target) =>
        target.url().startsWith(`chrome-extension://${extensionId}`)
        && (target.type() === "background_page" || target.type() === "service_worker")
    )?.worker();

    if (!service_worker) {
        return
        // throw new Error(`No service worker found for extension ${extensionId}`);
    }
    // set up console log forwarding
    service_worker.on('console', (msg) => {
        console.log(`[serviceWorker] ${msg.text()}`);
    });

    // add the behavior bus code & behaviors code to the page
    const behavior_bus_js = fs.readFileSync(`./abx_behavior_spec.js`, 'utf8').split('\nexport {')[0];
    await service_worker.evaluate(behavior_bus_js);    
    const behaviors_js = fs.readFileSync(`./example_behaviors.js`, 'utf8').split('\nexport {')[0];
    await service_worker.evaluate(behaviors_js);

    // set up BehaviorBus inside serviceWorker context
    await service_worker.evaluate(() => {
        window.BehaviorBus = new ServiceWorkerBehaviorBus(window.BEHAVIORS, window)
    });

    // set up forwarding from ServiceWorkerBehaviorBus -> PuppeteerBehaviorBus
    await service_worker.exposeFunction('dispatchEventToPuppeteerBus', (event) => PuppeteerBehaviorBus.dispatchEvent(event));
    await service_worker.evaluate(() => {
        window.BehaviorBus.addEventListener('*', (event) => {
            event = new BehaviorEvent(event);

            // if the event didn't come from the PuppeteerBehaviorBus already, forward it to them
            if (!event.detail.metadata.path.includes('PuppeteerBehaviorBus')) {
                console.log(`[serviceWorker] -> [puppeteer]: ${JSON.stringify(event.detail)}`);
                window.dispatchEventToPuppeteerBus(event.detail)
            }
        }, {behavior_name: 'ServiceWorkerBusToPuppeteerBusForwarder'});    
    });

    // set up forwarding from PuppeteerBehaviorBus -> ServiceWorkerBehaviorBus
    PuppeteerBehaviorBus.addEventListener('*', async (event) => {
        event = new BehaviorEvent(event);
        console.log(`[puppeteer] -> [serviceWorker]: ${JSON.stringify(event.detail)}`);
        await service_worker.evaluate((event) => {  

            // if the event didn't come from the ServiceWorkerBehaviorBus already, forward it to them
            if (!event.detail.metadata.path.includes('ServiceWorkerBehaviorBus')) {
                event = new BehaviorEvent(JSON.parse(event));
                window.BehaviorBus.dispatchEvent(event);
            }
        }, JSON.stringify(event.detail));
    }, {behavior_name: 'PuppeteerBusToServiceWorkerBusForwarder'});

}

/*********************** Crawl Drivers ***********************/


const PuppeteerCrawlDriver = {
    name: 'PuppeteerCrawlDriver',
    schema: 'BehaviorDriverSchema@0.1.0',

    state: {
        crawl_queue: [],
    },

    hooks: {
        // events the driver cares about / listens for / implements for other behaviors
        puppeteer: {
            FS_WRITE_FILE: async (event, BehaviorBus, page) => {
                const {path, content, mode='write', ...options} = event;
                console.log(`[PuppeteerCrawlDriver] 🔧 Writing file to ${path}...`)
                fs.writeFileSync(path, content, mode, ...options);
            },
            DISCOVERED_OUTLINK: async (event, BehaviorBus, page) => {
                console.log(`[PuppeteerCrawlDriver] 🔍 Adding URL to crawl queue: ${event.url}`)
                this.state.crawl_queue.push(event.url);
            },
        },
    },
}

const crawlInPuppeteer = async (url, behaviors) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    const navigationPromise = page.goto(url);
    const BehaviorBus = new PuppeteerBehaviorBus(behaviors, page);
    await navigationPromise;

    await linkPuppeteerBusToWindowBus(BehaviorBus, page);
    // await linkPuppeteerBusToServiceWorkerBus(BehaviorBus, browser, 'some-extension-id');
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_SETUP', {url}, {path: [PuppeteerCrawlDriver.name]}));

    await page.waitForSelector('body');
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_LOAD', {url}, {path: [PuppeteerCrawlDriver.name]}));
    await sleep(5000);
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_CAPTURE', {url}, {path: [PuppeteerCrawlDriver.name]}));
    await sleep(5000);
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_CAPTURE_COMPLETE', {url}, {path: [PuppeteerCrawlDriver.name]}));
    await sleep(2000);
    
    // await page.close();
    await browser.close();
}



// run the example

await crawlInPuppeteer('https://example.com', BEHAVIORS);
