import { ensureOffscreenAudioServiceDocument, resetOffscreenDocument } from '@/services/offscreen-document';
import type { MandarinEngineRequest, MandarinEngineResponse } from '@/services/mandarin-engine-host';
import { mandarinEngine } from '@/services/mandarin-engine-service';

const offscreenAvailable = () => typeof browser !== 'undefined' && browser.offscreen !== undefined;

const askOffscreen = async (request: MandarinEngineRequest): Promise<unknown> => {
    await ensureOffscreenAudioServiceDocument();
    const response: MandarinEngineResponse | undefined = await browser.runtime.sendMessage(request);
    if (response === undefined) throw new Error('No engine in the offscreen document');
    if ('error' in response) throw new Error(response.error);
    return response.result;
};

/**
 * Answers a yomitan-api action from the Mandarin engine. On Chrome the engine lives in the
 * offscreen document; Firefox, which has no offscreen documents, runs it in the background.
 */
export const askMandarinEngine = async (action: string, body: any, knownCharacters: string): Promise<unknown> => {
    if (!offscreenAvailable()) {
        const engine = await mandarinEngine();
        engine.setKnownCharacters(knownCharacters);
        return engine.handle(action, body);
    }
    const request: MandarinEngineRequest = { sender: 'asbplayer-to-mandarin-engine', action, body, knownCharacters };
    try {
        return await askOffscreen(request);
    } catch {
        // The document may have been closed (or not finished loading) since we last made sure of it.
        resetOffscreenDocument();
        return askOffscreen(request);
    }
};
