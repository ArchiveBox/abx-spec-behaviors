// example: behavior to extract a page's article text content
const ExtractArticleTextBehavior = {
    schema: 'BehaviorSchema@0.1.0',
    name: 'ExtractArticleTextBehavior',
    hooks: {
        window: {
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

export default ExtractArticleTextBehavior;
