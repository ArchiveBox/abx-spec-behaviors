import { createCursor, getRandomPagePoint } from 'ghost-cursor';

const JiggleMouseBehavior = {
    name: 'JiggleMouseBehavior',
    schema: 'BehaviorSchema@0.1.0',
    hooks: {
        puppeteer: {
            PAGE_LOAD: async (event, BehaviorBus, page) => {
                const randomPoint = await getRandomPagePoint(page);
                const cursor = createCursor(page, randomPoint, true);
                
                // Move mouse randomly for first half of timeout
                cursor.toggleRandomMove(true);
                await new Promise(r => setTimeout(r, 300));
                
                // Move to center for second half
                await cursor.moveTo({
                    x: page.viewport().width / 2,
                    y: page.viewport().height / 2
                });
                await new Promise(r => setTimeout(r, 300));
                
                cursor.toggleRandomMove(false);
                
                BehaviorBus.emit({
                    type: 'MOUSE_MOVEMENT',
                    coordinates: {
                        start: randomPoint,
                        end: {
                            x: page.viewport().width / 2,
                            y: page.viewport().height / 2
                        }
                    }
                });
            }
        }
    }
};

export default JiggleMouseBehavior
