// BehaviorEvent wraps normal DOMEvents with some extra context metadata for the behaviors system
// it prevent infininte loops in the event bus forwarding by attaching info about the senders

import puppeteer from 'puppeteer';
import fs from 'node:fs';

import { BehaviorEvent, PuppeteerBehaviorBus, initWindowBehaviorBus, initServiceWorkerBehaviorBus } from './behavior_bus.js';
import { BEHAVIORS } from './example_behaviors.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const linkPuppeteerBusToWindowBus = async (PuppeteerBehaviorBus, page) => {
    // add the behavior bus code & behaviors code to the page
    const behavior_bus_js = fs.readFileSync('./behavior_bus.js', 'utf8').split('\nexport {')[0];
    await page.evaluate(behavior_bus_js);
    const behaviors_js = fs.readFileSync('./example_behaviors.js', 'utf8').split('\nexport {')[0];
    await page.evaluate(behaviors_js);

    // set up console log forwarding
    page.on('console', (msg) => {
        console.log(`${msg.text()}`);
    });

    // set up BehaviorBus inside window context
    await page.evaluate(() => {
        window.initWindowBehaviorBus(window.BEHAVIORS)
        console.log(`[window] initialized global.BehaviorBus = WindowBehaviorBus()`);
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
    const behavior_bus_js = fs.readFileSync('./behavior_bus.js', 'utf8').split('\nexport {')[0];
    await service_worker.evaluate(behavior_bus_js);    
    const behaviors_js = fs.readFileSync('./example_behaviors.js', 'utf8').split('\nexport {')[0];
    await service_worker.evaluate(behaviors_js);

    // set up BehaviorBus inside serviceWorker context
    await service_worker.evaluate(() => {
        window.initServiceWorkerBehaviorBus(window.BEHAVIORS)
        console.log(`initialized window.BehaviorBus = ServiceWorkerBehaviorBus()`);
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


const crawlInPuppeteer = async (url, behaviors) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const BehaviorBus = new PuppeteerBehaviorBus();
    console.log(`[puppeteer] initialized global.BehaviorBus = PuppeteerBehaviorBus()`);

    BehaviorBus.addEventListener('*', (event) => {
        console.log()
        console.log(`[puppeteer] -> [LOG] : ${JSON.stringify(event)}`);
    }, {behavior_name: 'PuppeteerCrawlDriver'});

    const navigationPromise = page.goto(url);
    BehaviorBus.attachBehaviors(behaviors);
    BehaviorBus.attachContext(page);
    await navigationPromise;

    await linkPuppeteerBusToWindowBus(BehaviorBus, page);
    // await linkPuppeteerBusToServiceWorkerBus(BehaviorBus, browser, 'some-extension-id');
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_SETUP', {url}, {path: ['PuppeteerCrawlDriver']}));

    await page.waitForSelector('body');
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_LOAD', {url}, {path: ['PuppeteerCrawlDriver']}));
    await sleep(5000);
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_CAPTURE', {url}, {path: ['PuppeteerCrawlDriver']}));
    await sleep(5000);
    BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_CAPTURE_COMPLETE', {url}, {path: ['PuppeteerCrawlDriver']}));
    await sleep(2000);
    
    // await page.close();
    await browser.close();
}



// run the example

await crawlInPuppeteer('https://example.com', BEHAVIORS);
