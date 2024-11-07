function _objIsSerializable(obj) {
    // TODO: add more thorough check like _.deepEqual(obj, JSON.parse(JSON.stringify(obj)))
    const json_str = JSON.stringify(obj);
    return json_str.startsWith('{') && json_str.endsWith('}');
}

function _validateBehaviorEvent(event) {
    if (!event?.type || typeof event.type !== 'string') {
        throw new Error(`Event must have a string type, got ${JSON.stringify(event.type)}`);
    }
    if (![...event.type].every(letter => letter.match(/[A-Z_]/))) {
        throw new Error(`Event type must be uppercase letters and underscores only (e.g. PAGE_LOAD), got ${event.type}`);
    }
    if (typeof event.metadata !== 'object' || event.metadata === null) {
        throw new Error(`Event metadata must be an object, got ${JSON.stringify(event.metadata)}`);
    }
    if (typeof event.metadata.id !== 'string' || !event.metadata.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        throw new Error(`Event metadata.id must be a UUID, got ${event.metadata.id}`);
    }
    if (typeof event.metadata.timestamp !== 'number' || isNaN(event.metadata.timestamp) || event.metadata.timestamp < 0) {
        throw new Error(`Event metadata.timestamp must be a non-negative number, got ${event.metadata.timestamp}`);
    }
    if (!Array.isArray(event.metadata.path) || !event.metadata.path.every(sender => typeof sender === 'string' && sender.match(/^[a-zA-Z_]+$/))) {
        throw new Error(`Event metadata.path must be an array of strings like ["window", "puppeteer", "serviceWorker"], got ${JSON.stringify(event.metadata.path)}`);
    }
    if (!_objIsSerializable(event)) {
        throw new Error('Event object must be serializable with JSON.stringify(event), make sure it doesn\'t contain any non-standard types (e.g. DOM elements, window object, etc.)');
    }
    return event;
}



// and it validates that events are objects containing a {type: 'EVENT_NAME'} key
class BehaviorEvent extends CustomEvent {
    // BehaviorEvent('PAGE_LOAD', event={url: 'https://example.com', ...detail}, metadata={id: '1234-...', path: ['page'], ...})
    constructor(dispatch_type, event_object = {}, extra_metadata = {}) {
        if (typeof dispatch_type === 'object') {
            // if they called BehaviorEvent({type: 'PAGE_LOAD', url: 'https://example.com'}, {...})
            // only (event_object), without string dispatch_type first arg before it
            event_object = {...dispatch_type, ...(event_object || {}), ...(extra_metadata || {}), ...(dispatch_type?.detail || {}), ...(event_object.detail || {})};
            dispatch_type = event_object.type;
        }
        if (event_object?.type && event_object.type !== dispatch_type) {
            if (dispatch_type != '*') {
                throw new Error(`BehaviorEvent(${dispatch_type}, {type: "${event_object.type}", ...}) dispatch_type doesn't match event {type}`);
            }
        }
        const {type=dispatch_type, metadata, ...detail} = event_object
        const event_detail = _validateBehaviorEvent({
            type,                                 // e.g. 'PAGE_LOAD'
            metadata: {
                schema: 'BehaviorEventSchema@0.1.0',
                id: crypto.randomUUID(),          // e.g. '1234-5678-90ab-cdef'
                timestamp: Date.now(),            // e.g. 1715177600000
                path: [],                         // e.g. ['window', 'puppeteer'], or ['serviceWorker', 'window', 'puppeteer']
                ...(metadata || {}),              // e.g. ...{id: '1234-...', timestamp: ..., path: [...], ...} (from provided event.detail.metadata, if present)
                ...(extra_metadata || {}),        // e.g. ...{id: '1234-...', timestamp: ..., path: [...], ...} (from provided extra_metadata arg, if one is passed)
            },
            ...detail,                            // e.g. ...{url: 'https://example.com', selector: '#video', xpath: '//video', ...}
        })

        // init CustomEvent(event_type, detail=event_detail)
        super(dispatch_type, {detail: event_detail});          // e.g. super('PAGE_LOAD', {type: 'PAGE_LOAD', metadata: {...}, ...detail})
        
        _validateBehaviorEvent(this.detail);

        // DEBUG ONLY: attach a reference to the global context on the event as a helpful pointer
        // to the context it would recieve when handled by BehaviorBus handler
        // doens't persist when event gets passed to a different context, is just a pointer to whatever the current local context is
        // this.Context = globalThis;                // e.g. window ({document, BehaviorBus, ...}), page ({browser, page, BehaviorBus, ...}), serviceWorker ({window, BehaviorBus, ...}), etc.
        // this.BehaviorBus = null;
    }
}

// Base class with common event handling logic
class BaseBehaviorBus extends EventTarget {
    schema = 'BehaviorBusSchema@0.1.0';

    // const broadcast = (event) => {PuppeteerBus_dispatch(event), ServiceWorkerBus_dispatch(event), WindowBus_dispatch(event)}
    // const BehaviorBus = new WindowBehaviorBus('window', on_emit_event_listener=broadcast)
    constructor() {
        super();
        this.context = null;               // e.g. window={navigator, window, document, BehaviorBus, ...}, puppeteer={browser, page, BehaviorBus, ...}, serviceWorker={navigator, BehaviorBus, ...}
        this.behaviors = null;             // e.g. [{hooks: {window: {PAGE_LOAD: (event, BehaviorBus, window) => {}}}}, {hooks: {puppeteer: {FOUND_CONTENT: (event, BehaviorBus, page) => {}}}}]
        this._wrappedListeners = new Map();
        this.name = this.constructor.name || this.name || 'BaseBehaviorBus';
        if (this.name === 'BaseBehaviorBus' || this.name === null) {
            throw new Error(`BaseBehaviorBus cannot be instantiated directly, use a subclass like WindowBehaviorBus, PuppeteerBehaviorBus, or ServiceWorkerBehaviorBus instead`);
        }
        if (!['PuppeteerBehaviorBus', 'WindowBehaviorBus', 'ServiceWorkerBehaviorBus'].includes(this.name)) {
            throw new Error(`BehaviorBus subclass name must be one of ['PuppeteerBehaviorBus', 'WindowBehaviorBus', 'ServiceWorkerBehaviorBus'], got ${this.name}`);
        }
    }

    attachContext(context) {          // e.g. WindowBehaviorBus.attachContext(window)
        if (!context) return;
        this.context = context;
        this._notifyIfReady();
    }
    attachBehaviors(behaviors) {   // e.g. WindowBehaviorBus.attachBehaviors([{hooks: {window: {PAGE_LOAD: (event, BehaviorBus, window) => {}}}}])
        if (!behaviors) return;
        this.behaviors = [...(this.behaviors || []), ...behaviors]
        for (const behavior of behaviors) {
            const handlers_for_this_context = behavior.hooks[this.name] ||  behavior.hooks[this.name.toLowerCase().replace('behaviorbus', '')] || {};
            for (const [eventName, handler] of Object.entries(handlers_for_this_context)) {
                this.addEventListener(eventName, handler, {behavior_name: behavior.name || 'UNKNOWN_BEHAVIOR'});
            }
        }
        this._notifyIfReady()
    }


    _notifyIfReady() {
        const is_ready = this.context !== null && this.behaviors !== null
        if (is_ready && this._resolveReady) {
            this._resolveReady();
        }
        return is_ready;
    }
    
    async waitUntilReady() {
        const is_ready = this.context !== null && this.behaviors !== null;
        if (is_ready) return;

        this._readyPromise = this._readyPromise || new Promise((resolve) => {this._resolveReady = resolve});
        
        // Wait for bus to be ready before allowing events
        await this._readyPromise;
    }

    _getListenerWithBusAndContextArgsPopulated(handler, behavior_name='UNKNOWN') {
        const wrappedListener = async (event) => {
            await this.waitUntilReady();
            const BehaviorBus = this;
            const context = BehaviorBus.context;
            const event_detail = {
                ...event.detail,
                metadata: {
                    ...event.detail.metadata,
                    path: [...event.detail.metadata.path, ...(event.detail.metadata.path.includes(behavior_name) ? [] : [behavior_name])],
                },
            };
            await handler(event_detail, BehaviorBus, context);
        };
        return wrappedListener
    }

    addEventListener(event_type, listener, {behavior_name='UNKNOWN', ...options}={}) {
        const wrappedListener = this._getListenerWithBusAndContextArgsPopulated(listener, behavior_name);
        this._wrappedListeners.set(listener, wrappedListener);
        super.addEventListener(event_type, wrappedListener, options);
    }

    removeEventListener(event_type, listener, {behavior_name='UNKNOWN', ...options}={}) {
        const wrappedListener = this._wrappedListeners.get(listener)
        super.removeEventListener(event_type, listener, options);
        super.removeEventListener(event_type, wrappedListener, options);
        this._wrappedListeners.delete(wrappedListener);
        this._wrappedListeners.delete(listener);
    }

    dispatchEvent(event) {       // BehaviorBus.dispatchEvent(new BehaviorEvent('PAGE_LOAD', {url: 'https://example.com'}))
        if (event?.detail) {
            event = new BehaviorEvent(event.type, event.detail);
        } else if (event?.type) {
            event = new BehaviorEvent(event.type, event);
        } else {
            throw new Error(`BehaviorBus.dispatchEvent() takes either a BehaviorEvent or a raw event object with a {type} property, got ${JSON.stringify(event)}`);
        }

        if (!['WindowBehaviorBus', 'PuppeteerBehaviorBus', 'ServiceWorkerBehaviorBus'].includes(this.name)) {
            throw new Error(`BehaviorBus.dispatchEvent() called on a bus with an invalid name: ${this.name}`);
        }

        // check if this event has already been handled by this bus, then dispatch it to handler listeners
        if (!event.detail.metadata.path.includes(this.name)) {
            event.detail.metadata.path.push(this.name);
            // trigger handlers listening on the specific event type
            super.dispatchEvent(event);

            // send to external listeners listening for all events (aka listeners listening on '*')
            const broadcastEvent = new BehaviorEvent('*', event.detail);
            super.dispatchEvent(broadcastEvent)
        }
    }

    // aliases
    on(type, handler) {this.addEventListener(type, handler);}
    emit(event) {this.dispatchEvent(event);}
    dispatch(event) {this.dispatchEvent(event);}
}

class WindowBehaviorBus extends BaseBehaviorBus {
    name = 'WindowBehaviorBus';

    constructor(behaviors, window=globalThis.window) {
        super();
        window.BehaviorBus = this;
        this.attachBehaviors(behaviors);
        this.attachContext(window);
    
        this.addEventListener('*', (event, BehaviorBus, window) => {
            console.log(`[window] -> [LOG] : ${JSON.stringify(event)}`);
        }, {behavior_name: this.name});

        console.log(`[window] initialized window.BehaviorBus = WindowBehaviorBus()`);
    }
}

class ServiceWorkerBehaviorBus extends BaseBehaviorBus {
    name = 'ServiceWorkerBehaviorBus';

    constructor(behaviors, window=globalThis.window) {
        super();
        window.BehaviorBus = this;
        this.attachBehaviors(behaviors);
        this.attachContext(window);
        
        // log all events to the console
        this.addEventListener('*', (event, BehaviorBus, window) => {
            console.log(`[serviceWorker] -> [LOG] : ${JSON.stringify(event)}`);
        }, {behavior_name: this.name});
    
        // listen for chrome.runtime.onMessage events from content scripts
        window.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message._is_behaviorbus_event) {
                BehaviorBus.dispatchEvent(message.event);
            }
        }, {behavior_name: this.name});

        console.log(`[serviceWorker] initialized window.BehaviorBus = ServiceWorkerBehaviorBus()`);
    }
}

class PuppeteerBehaviorBus extends BaseBehaviorBus {
    name = 'PuppeteerBehaviorBus';

    constructor(behaviors, page) {
        super();
        page.BehaviorBus = this;
        this.attachBehaviors(behaviors);
        this.attachContext(page);

        this.addEventListener('*', (event, BehaviorBus, page) => {
            console.log(`[puppeteer] -> [LOG] : ${JSON.stringify(event)}`);
        }, {behavior_name: this.name});

        console.log(`[puppeteer] initialized page.BehaviorBus = PuppeteerBehaviorBus()`);
    }
}



var all_exports = { BehaviorEvent, WindowBehaviorBus, PuppeteerBehaviorBus, ServiceWorkerBehaviorBus }

if (globalThis.navigator) {
    // loaded from browser, running in window
    console.log(`[window] importing src/behavior_bus.js ...`);
    for (const key of Object.keys(all_exports)) {
        globalThis[key] = all_exports[key];
        console.log(`[window] loaded window.${key}`);
    }
} else {
    // loaded from node, running in puppeteer
    console.log(`[puppeteer] importing src/behavior_bus.js ...`);
    for (const key of Object.keys(all_exports)) {
        console.log(`[puppeteer] loaded global.${key}`);
    }
}

export { BehaviorEvent, WindowBehaviorBus, PuppeteerBehaviorBus, ServiceWorkerBehaviorBus }
