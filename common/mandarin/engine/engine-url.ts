import type { Fetcher } from '@project/common';

/** Yomitan URL that selects the built-in Mandarin engine instead of a Yomitan server. */
export const mandarinEngineUrl = 'local://mandarin';

export const isMandarinEngineUrl = (url: string | undefined): boolean =>
    url !== undefined && url.startsWith(mandarinEngineUrl);

let pageFetcher: Fetcher | undefined;

/**
 * Extension pages (settings, side panel, popup) register how to reach the engine in the
 * background. Video pages already route Yomitan requests there through the http-post handler.
 */
export const registerMandarinFetcher = (fetcher: Fetcher): void => {
    pageFetcher = fetcher;
};

/** The registered page fetcher for engine URLs, or the given fetcher unchanged. */
export const fetcherForYomitanUrl = <T extends Fetcher>(url: string, fetcher: T, isPlainHttp: boolean): Fetcher =>
    isPlainHttp && isMandarinEngineUrl(url) && pageFetcher ? pageFetcher : fetcher;
