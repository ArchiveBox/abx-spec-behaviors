const PDFBehavior = {
    name: 'PDFBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    hooks: {
        puppeteer: {
            PAGE_CAPTURE: async (event, BehaviorBus, page) => {
                const url = await page.url();
                
                // Skip certain URL schemes
                if (url.split(':')[0] in ['about', 'chrome', 'data']) {
                    return;
                }

                try {
                    await page.bringToFront();
                    
                    // Use streaming PDF creation for better memory handling
                    const pdfStream = await page.createPDFStream({
                        timeout: 30000,
                        printBackground: true,
                        outline: true,
                        tagged: true,
                        format: 'A4',
                        displayHeaderFooter: false,
                    });
                    
                    const reader = pdfStream.getReader();
                    const chunks = [];
                    let totalBytes = 0;

                    while (true) {
                        const {done, value} = await reader.read();
                        if (done) break;
                        chunks.push(value);
                        totalBytes += value.length;
                    }

                    if (!totalBytes) {
                        throw new Error('PDF generation produced 0 bytes');
                    }

                    // Combine chunks and write file
                    const pdfBuffer = Buffer.concat(chunks);
                    BehaviorBus.emit({
                        type: 'FS_WRITE_FILE',
                        path: `${event.out_dir}/snapshot.pdf`,
                        content: pdfBuffer,
                        encoding: 'binary'
                    });

                    BehaviorBus.emit({
                        type: 'PDF_COMPLETE',
                        url,
                        outputPath: `${event.out_dir}/snapshot.pdf`,
                        size: totalBytes
                    });
                } catch (error) {
                    BehaviorBus.emit({
                        type: 'ERROR',
                        error: `PDF EROR: ${error.message}`,
                        url,
                    });
                    throw error;
                }
            }
        }
    }
};

export default PDFBehavior;
