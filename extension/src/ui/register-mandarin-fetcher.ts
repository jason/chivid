import type { Command, HttpPostMessage } from '@project/common';
import { registerMandarinFetcher } from '@project/common/mandarin/engine/engine-url';
import { v4 as uuidv4 } from 'uuid';

/** Lets this extension page reach the Mandarin engine in the background service worker. */
registerMandarinFetcher({
    fetch: (url: string, body: any) => {
        const command: Command<HttpPostMessage> = {
            sender: 'asbplayer-popup',
            message: { command: 'http-post', url, body, messageId: uuidv4() },
        };
        return browser.runtime.sendMessage(command);
    },
});
