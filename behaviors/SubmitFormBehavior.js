const SubmitFormBehavior = {
    name: 'SubmitFormBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        puppeteer: {
            FORM_SUBMIT: async (event, BehaviorBus, page) => {
                await page.click(event.submit_target || 'button[type=submit]');
                
                try {
                    await page.waitForNavigation({timeout: event.timeout || 30_000});
                    
                    BehaviorBus.emit({
                        type: 'FORM_SUBMIT_COMPLETE',
                        success: true,
                        url: await page.url(),
                    });
                } catch (error) {
                    BehaviorBus.emit({
                        type: 'FORM_SUBMIT_ERROR',
                        success: false,
                        error: error.message,
                        url: await page.url(),
                    });
                    throw error;
                }
            }
        }
    }
};

export default SubmitFormBehavior;
