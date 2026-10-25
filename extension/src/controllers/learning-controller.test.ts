import { describe, expect, it } from '@jest/globals';
import type { IndexedSubtitleModel } from '@project/common';
import type { NewLedgerEvent } from '@project/common/mandarin/ledger';
import { calculateSeekableTracksValue } from '@project/common/settings';
import LearningController from '@project/extension/src/controllers/learning-controller';
import type { LearningHost } from '@project/extension/src/controllers/learning-controller';

const subtitle = (index: number, start: number, end: number, text: string): IndexedSubtitleModel => ({
    index,
    start,
    end,
    originalStart: start,
    originalEnd: end,
    text,
    track: 0,
});

class FakeHost implements LearningHost {
    subtitles = [subtitle(0, 0, 1500, '你今天怎么这么早？'), subtitle(1, 2000, 3500, '银行九点就开门了。')];
    currentTimeMs = 2500;
    hideUntilRevealed = false;
    events: NewLedgerEvent[] = [];
    notes: string[] = [];
    dueIndexes = [1];
    rehidden: number[][] = [];
    seeks: number[] = [];

    setHideUntilRevealed(hide: boolean) {
        this.hideUntilRevealed = hide;
    }
    revealCurrentLines() {
        return this.dueIndexes;
    }
    rehideLines(indexes: readonly number[]) {
        this.rehidden.push([...indexes]);
    }
    seek(timestampMs: number) {
        this.seeks.push(timestampMs);
    }
    recordEvent(event: NewLedgerEvent) {
        this.events.push(event);
    }
    notify(locKey: string) {
        this.notes.push(locKey);
    }
    sourceUrl() {
        return 'https://www.youtube.com/watch?v=example';
    }
    title() {
        return 'Example video';
    }
}

const controllerWith = ({ enabled = true, hideUntilRevealed = false, recipeName = null as string | null } = {}) => {
    const host = new FakeHost();
    const controller = new LearningController(host);
    controller.settingsChanged({
        mandarinEditionEnabled: enabled,
        hideUntilRevealed,
        seekableTracks: calculateSeekableTracksValue([0]),
        recipeName,
    });
    return { host, controller };
};

describe('LearningController', () => {
    it('does nothing at all while the Mandarin Edition flag is off', () => {
        const { host, controller } = controllerWith({ enabled: false, hideUntilRevealed: true });
        controller.mark('got');
        controller.reveal();
        controller.pressSegmentStart();
        expect(host.hideUntilRevealed).toBe(false);
        expect(host.events).toEqual([]);
        expect(host.notes).toEqual([]);
    });

    it('hides text until revealed only when the active recipe asks for it', () => {
        expect(controllerWith({ hideUntilRevealed: true }).host.hideUntilRevealed).toBe(true);
        expect(controllerWith({ hideUntilRevealed: false }).host.hideUntilRevealed).toBe(false);
    });

    it('records one audio event, tagged with the active recipe, for the line just heard while hidden', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true, recipeName: 'Ears' });
        controller.mark('got');
        expect(host.events).toEqual([
            {
                kind: 'audio',
                result: 'got',
                sentence: '银行九点就开门了。',
                track: 0,
                start: 2000,
                end: 3500,
                sourceUrl: 'https://www.youtube.com/watch?v=example',
                title: 'Example video',
                recipe: 'Ears',
            },
        ]);
        expect(host.notes).toEqual(['mandarin.gotIt']);
    });

    it('records nothing for a line after it has been revealed', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        controller.reveal();
        controller.mark('got');
        expect(host.events).toEqual([]);
        expect(host.notes).toEqual(['mandarin.alreadyRevealed']);
    });

    it('records nothing for a line the player displayed on its own', () => {
        const { host, controller } = controllerWith();
        controller.linesDisplayed([1]);
        controller.mark('missed');
        expect(host.events).toEqual([]);
    });

    it('does not record the same mark twice', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        controller.mark('missed');
        controller.mark('missed');
        expect(host.events).toHaveLength(1);
    });

    it('forgets reveals when subtitles change', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        controller.reveal();
        controller.subtitlesChanged();
        controller.mark('got');
        expect(host.events).toHaveLength(1);
    });

    it('records a null recipe when none is active', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        controller.mark('missed');
        expect(host.events[0]).toMatchObject({ recipe: null });
    });

    it('tells the learner when there is nothing to reveal', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        host.dueIndexes = [];
        controller.reveal();
        expect(host.notes).toEqual(['mandarin.nothingToReveal']);
    });

    it('loops a multi-line segment with text hidden, even when the recipe shows text', () => {
        const { host, controller } = controllerWith();
        host.currentTimeMs = 500;
        controller.pressSegmentStart();
        host.currentTimeMs = 2500;
        controller.pressSegmentEnd();

        expect(host.hideUntilRevealed).toBe(true);
        expect(host.seeks).toEqual([0]);
        expect(host.notes).toEqual(['mandarin.segment.started', 'mandarin.segment.looping']);

        controller.timeChanged(3500 + 200);
        expect(host.seeks).toEqual([0, 0]);
    });

    it('re-hides the segment and replays it for a clean pass', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        host.currentTimeMs = 500;
        controller.pressSegmentStart();
        host.currentTimeMs = 2500;
        controller.pressSegmentEnd();
        controller.pressSegmentStart();

        expect(host.rehidden).toEqual([[0, 1]]);
        expect(host.seeks).toEqual([0, 0]);
        expect(host.notes.at(-1)).toBe('mandarin.segment.cleanPass');
    });

    it('goes back to the recipe hiding when the loop stops', () => {
        const { host, controller } = controllerWith();
        host.currentTimeMs = 500;
        controller.pressSegmentStart();
        host.currentTimeMs = 2500;
        controller.pressSegmentEnd();
        controller.pressSegmentEnd();

        expect(host.hideUntilRevealed).toBe(false);
        controller.timeChanged(10000);
        expect(host.seeks).toEqual([0]);
    });

    it('explains why a segment end was rejected', () => {
        const { host, controller } = controllerWith({ hideUntilRevealed: true });
        controller.pressSegmentEnd();
        expect(host.notes).toEqual(['mandarin.segment.noLine']);
    });
});
