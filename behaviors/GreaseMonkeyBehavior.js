/*
Usage:
    BehaviorBus.emit({
        type: 'USERSCRIPT_EXEC',
        script_url: 'https://update.greasyfork.org/scripts/462070/Show%20ctime%20of%20retweets.user.js'
    })
*/

const GreaseMonkeyBehavior = {
    name: 'GreaseMonkeyBehavior',
    schema: 'BehaviorSchema@0.1.0',
    version: '0.1.0',
    
    state: {
        loaded_scripts: new Set(),
    },

    hooks: {
        window: {
            USERSCRIPT_EXEC: async (event, BehaviorBus, window) => {
                const script_url = event.script_url;
                if (!script_url) return;

                try {
                    if (GreaseMonkeyBehavior.state.loaded_scripts.has(script_url)) return;
                    
                    const response = await fetch(script_url);
                    if (!response.ok) throw new Error(`failed to fetch script: ${script_url}`);
                    
                    const userscript = await response.text();
                    const script_elem = document.createElement('script');
                    script.textContent = `
                        // minimal gm api shim
                        const GM = {
                            getValue: key => localStorage.getItem(key),
                            setValue: (key, value) => localStorage.setItem(key, value),
                        };
                        ${userscript}
                    `;
                    
                    document.head.appendChild(script_elem);
                    GreaseMonkeyBehavior.state.loaded_scripts.add(script_url);
                    
                    BehaviorBus.emit({
                        type: 'USERSCRIPT_LOADED',
                        script_url,
                    });

                } catch (error) {
                    BehaviorBus.emit({
                        type: 'USERSCRIPT_ERROR',
                        script_url,
                        error: error.message
                    });
                }
            }
        }
    }
};

export default GreaseMonkeyBehavior;
