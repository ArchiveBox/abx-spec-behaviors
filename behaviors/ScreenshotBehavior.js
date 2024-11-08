const ScreenshotBehavior = {
    name: 'ScreenshotBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        puppeteer: {
            PAGE_CAPTURE: async (event, BehaviorBus, page) => {
                try {
                    const output_path = (page.out_dir || '/tmp') + '/screenshot.png'

                    await page.bringToFront();
                    const screenshotBuffer = await page.screenshot({
                        fullPage: true,
                        type: 'png',
                        quality: 100,
                        path: output_path,
                    });
                    BehaviorBus.emit({
                        type: 'FS_WRITE_FILE',
                        path: `${event.out_dir || '.'}/screenshot.png`,
                        content: fs.readFileSync(output_path),
                        encoding: 'binary'
                    });
                    
                    BehaviorBus.emit({
                        type: 'SCREENSHOT_COMPLETE',
                        url: await page.url(),
                        path: `${event.out_dir || '.'}/screenshot.png`,
                        size: screenshotBuffer.length
                    });
                } catch (error) {
                    BehaviorBus.emit({
                        type: 'ERROR',
                        error: `SCREENSHOT ERROR: ${error.message}`,
                        url: await page.url(),
                    });
                    throw error;
                }
            }
        }
    }
};

export default ScreenshotBehavior;
