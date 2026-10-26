import { mandarinEngine } from '@/services/mandarin-engine-service';
import { asbError } from '@project/common/util/log';

/** Requests from the background to the engine living in the offscreen document. */
export interface MandarinEngineRequest {
    readonly sender: 'asbplayer-to-mandarin-engine';
    readonly action: string;
    readonly body: any;
    readonly knownCharacters: string;
}

export type MandarinEngineResponse = { readonly result: unknown } | { readonly error: string };

export const isMandarinEngineRequest = (request: any): request is MandarinEngineRequest =>
    request?.sender === 'asbplayer-to-mandarin-engine';

/**
 * Serves the engine from the offscreen document, which Chrome keeps alive while the service
 * worker is shut down when idle, so the dictionary loads once per browser session rather than
 * after every pause. Starts loading straight away so the first lookup is already warm.
 */
export const hostMandarinEngine = () => {
    void mandarinEngine().catch(() => undefined);
    browser.runtime.onMessage.addListener((request: any, _sender, sendResponse) => {
        if (!isMandarinEngineRequest(request)) return undefined;
        mandarinEngine()
            .then((engine) => {
                engine.setKnownCharacters(request.knownCharacters);
                sendResponse({ result: engine.handle(request.action, request.body) } satisfies MandarinEngineResponse);
            })
            .catch((error) => {
                asbError('mandarin', 'Engine request failed:', error);
                sendResponse({ error: error instanceof Error ? error.message : String(error) });
            });
        return true;
    });
};
