const TitleBehavior = {
    name: 'TitleBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        puppeteer: {
            PAGE_CAPTURE: async (event, BehaviorBus, page) => {
                const url = await page.url();

                try {
                    // Gather titles from all available sources
                    const titleInfo = {
                        url,
                        title_from_browser: await page.title(),
                        title_from_js: await page.evaluate(() => document?.title),
                        title_from_html: await page.evaluate(() => 
                            document?.querySelector('title')?.innerText
                        ),
                        title_from_og: await page.evaluate(() => 
                            document?.querySelector('meta[property="og:title"]')?.content
                        )
                    };

                    // Choose best title (longest non-null title)
                    const bestTitle = [
                        titleInfo.title_from_html,
                        titleInfo.title_from_og,
                        titleInfo.title_from_js,
                        titleInfo.title_from_browser,
                        ''
                    ]
                        .filter(Boolean)
                        .sort((a, b) => b.length - a.length)[0]
                        .replaceAll('\n', ' ');

                    titleInfo.title = bestTitle;

                    // Write title files
                    if (bestTitle) {
                        BehaviorBus.emit({
                            type: 'FS_WRITE_FILE',
                            path: `${event.out_dir}/title.txt`,
                            content: bestTitle,
                            encoding: 'utf-8',
                        });
                    }

                    BehaviorBus.emit({
                        type: 'FS_WRITE_FILE',
                        path: `${event.out_dir}/title.json`,
                        content: JSON.stringify(titleInfo, null, 4),
                        encoding: 'utf-8',
                    });

                    BehaviorBus.emit({
                        type: 'TITLE_COMPLETE',
                        url,
                        title: bestTitle,
                        titleInfo,
                    });
                } catch (error) {
                    BehaviorBus.emit({
                        type: 'ERROR',
                        error: `TITLE EXTRACTION ERROR ${error.message}`,
                        url,
                    });
                    throw error;
                }
            }
        }
    }
};

export default TitleBehavior;
