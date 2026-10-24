import type { Command, Message } from '@project/common';
import { LedgerRepository } from '@project/common/mandarin/ledger';
import type { NewLedgerEvent } from '@project/common/mandarin/ledger';
import { asbError } from '@project/common/util/log';

export interface RecordLearningEventMessage extends Message {
    readonly command: 'mandarin-record-learning-event';
    readonly event: NewLedgerEvent;
}

/**
 * Writes Mandarin Edition ledger events into the extension's own IndexedDB, so learning
 * data never lands in the storage of the site the video is playing on.
 */
export default class RecordLearningEventHandler {
    private readonly ledger: LedgerRepository;

    constructor(ledger = new LedgerRepository()) {
        this.ledger = ledger;
    }

    get sender() {
        return 'asbplayer-video';
    }

    get command() {
        return 'mandarin-record-learning-event';
    }

    handle(command: Command<Message>, _sender: Browser.runtime.MessageSender, sendResponse: (r?: any) => void) {
        const message = command.message as RecordLearningEventMessage;
        void this.ledger
            .append(message.event)
            .then(() => sendResponse({}))
            .catch((error) => {
                asbError('mandarin', 'Failed to record learning event:', error);
                sendResponse({ error: String(error) });
            });
        return true;
    }
}
