import type { Command, HttpPostMessage, Message } from '@project/common';
import { asbError } from '@project/common/util/log';
import type { SettingsProvider } from '@project/common/settings';
import { isMandarinEngineUrl } from '@project/common/mandarin/engine/mandarin-fetcher';
import { askMandarinEngine } from '@project/extension/src/services/mandarin-engine-client';

const allowedKeys = ['version', 'action', 'params', 'key', 'text', 'scanLength', 'parser', 'term'];
const allowedActions = [
    'areSuspended',
    'guiAddCards',
    'deckNames',
    'modelNames',
    'modelFieldNames',
    'findCards',
    'findNotes',
    'getIntervals',
    'guiBrowse',
    'requestPermission',
    'cardsInfo',
    'cardsModTime',
    'notesInfo',
    'notesModTime',
    'updateNoteFields',
    'addNote',
    'storeMediaFile',
    'version',
    'addTags',
];

export default class HttpPostHandler {
    private readonly settings: Pick<SettingsProvider, 'getSingle'>;

    constructor(settings: Pick<SettingsProvider, 'getSingle'>) {
        this.settings = settings;
    }

    get sender() {
        return ['asbplayer-video', 'asbplayer-video-tab', 'asbplayer-popup'];
    }

    get command() {
        return 'http-post';
    }

    handle(command: Command<Message>, sender: Browser.runtime.MessageSender, sendResponse: (response?: any) => void) {
        const message = command.message as HttpPostMessage;

        if (isMandarinEngineUrl(message.url)) {
            // Mandarin Edition: answer Yomitan requests from the built-in engine, not the network.
            const action = message.url.split('/').pop() ?? '';
            void this.settings
                .getSingle('mandarinKnownCharacters')
                .then((known) => askMandarinEngine(action, message.body, known))
                .then((result) => sendResponse(result))
                .catch((e) => sendResponse({ error: e instanceof Error ? e.message : String(e) }));
            return true;
        }

        if (!this._validateBody(message.body)) {
            sendResponse({ error: 'Invalid request' });
            return;
        }

        fetch(message.url, {
            method: 'POST',
            body: JSON.stringify(message.body),
        })
            .then((response) => response.json())
            .then((json) => sendResponse(json))
            .catch((e) => {
                asbError('http-post', e);
                sendResponse({ error: e.message });
            });

        return true;
    }

    private _validateBody(body: any) {
        if (body === null) return true;

        const bodyKeys = Object.keys(body);

        for (const k of bodyKeys) {
            if (!allowedKeys.includes(k)) {
                return false;
            }
        }

        const version = body['version'];

        if (version !== undefined && typeof version !== 'number') {
            return false;
        }

        const action = body['action'];

        if (action !== undefined && !allowedActions.includes(action)) {
            return false;
        }

        return true;
    }
}
