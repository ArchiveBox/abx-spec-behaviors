const OpenAIAnalysisBehavior = {
    name: 'OpenAIAnalysisBehavior',
    schema: 'BehaviorSchema@0.1.0',
    
    extractPageText: (document) => {
        const bodyText = document.body.innerText;
        return bodyText
            .split('\n')
            .filter(line =>  line.trim().length > 0)
            .join('\n');
    },

    hooks: {
        window: {
            PAGE_CAPTURE: async (event, BehaviorBus, window) => {
                const url = window.location.href;
                
                BehaviorBus.emit({
                    type: 'AI_ANALYSIS_STARTED',
                    url
                });

                try {
                    const content = OpenAIAnalysisBehavior.extractPageText(document);
                    
                    // System prompt configuring the analysis style
                    const systemPrompt = `You are a skilled analyst and summarizer. 
                        Analyze web content and provide concise, insightful analysis in this format:
                        1. Main Topic (2-3 words)
                        2. Key Points (3-5 bullet points)
                        3. Sentiment (positive/negative/neutral + brief explanation)
                        4. Actionable Insights (2-3 concrete takeaways)
                        Keep the total response under 400 words.`;
                    
                    // assumes driver/another behavior implementes LLM_REQUEST method
                    // that fires LLM_RESPONSE when it returns
                    BehaviorBus.emit({
                        type: 'LLM_REQUEST',
                        model: 'gpt-4-turbo-preview',
                        messages: [
                            {
                                role: 'system',
                                content: systemPrompt
                            },
                            {
                                role: 'user',
                                content: `Analyze this content from ${url}:\n\n${content}`
                            }
                        ],
                        temperature: 0.3,  // Lower temperature for more consistent analysis
                        max_tokens: 800
                    });
                    
                } catch (error) {
                    BehaviorBus.emit({
                        type: 'AI_ANALYSIS_ERROR',
                        error: error.message,
                        url
                    });
                    throw error;
                }
            },

            LLM_RESPONSE: async (event, BehaviorBus, window) => {
                try {
                    const {response, url} = event;
                    
                    // Save the API response
                    BehaviorBus.emit({
                        type: 'FS_WRITE_FILE',
                        path: `${event.outputDir}/analysis.json`,
                        content: JSON.stringify({
                            url,
                            timestamp: new Date().toISOString(),
                            analysis: response
                        }, null, 2),
                        encoding: 'utf-8'
                    });

                    BehaviorBus.emit({
                        type: 'AI_ANALYSIS_COMPLETE',
                        url,
                        analysisLength: response.length
                    });
                } catch (error) {
                    BehaviorBus.emit({
                        type: 'AI_ANALYSIS_ERROR',
                        error: error.message,
                        stage: 'response_processing',
                        url: window.location.href
                    });
                }
            }
        }
    }
};

export default OpenAIAnalysisBehavior;
