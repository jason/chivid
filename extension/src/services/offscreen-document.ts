let documentPromise: Promise<void> | undefined = undefined;

export const ensureOffscreenAudioServiceDocument = async () => {
    if (documentPromise === undefined) {
        documentPromise = offscreenAudioServiceDocumentPromise();
    }

    const promise = documentPromise;
    try {
        await promise;
    } catch (e) {
        if (promise === documentPromise) {
            documentPromise = undefined;
        }

        throw e;
    }
};

/** Forgets that the document exists, so the next ensure checks again (it may have been closed). */
export const resetOffscreenDocument = () => {
    documentPromise = undefined;
};

const offscreenAudioServiceDocumentPromise = async () => {
    const contexts = await browser.runtime.getContexts({
        contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });

    if (contexts.length === 0) {
        await browser.offscreen.createDocument({
            url: 'offscreen-audio-service.html',
            // One offscreen document per extension: asbplayer's audio capture and, for the Mandarin
            // Edition, the Chinese engine (WebAssembly segmenter and dictionary).
            reasons: [browser.offscreen.Reason.USER_MEDIA, browser.offscreen.Reason.WORKERS],
            justification: 'Audio recording and encoding; Chinese word segmentation and dictionary',
        });
    }
};
