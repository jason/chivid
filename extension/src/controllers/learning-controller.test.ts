import { describe, expect, it } from '@jest/globals';
import { AutoPausePreference, PlayMode } from '@project/common';
import type { IndexedSubtitleModel } from '@project/common';
import type { NewLedgerEvent } from '@project/common/mandarin/ledger';
import { AutoPauseResumeMode, calculateSeekableTracksValue, SubtitleVisibility } from '@project/common/settings';
import type { LearningModeName } from '@project/common/settings';
import LearningController from '@project/extension/src/controllers/learning-controller';
import type { LearningHost } from '@project/extension/src/controllers/learning-controller';

const learnerOwn = {
    subtitleVisibility: SubtitleVisibility.whenDue,
    autoPausePreference: AutoPausePreference.atStartAndEnd,
    autoPauseResumeMode: AutoPauseResumeMode.subtitleLength,
    repeatCountPreference: 3,
};

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
    presets: Parameters<LearningHost['applyPreset']>[0][] = [];
    dueIndexes = [1];
    bound = true;

    setHideUntilRevealed(hide: boolean) {
        this.hideUntilRevealed = hide;
    }
    revealCurrentLines() {
        return this.dueIndexes;
    }
    applyPreset(preset: Parameters<LearningHost['applyPreset']>[0]) {
        if (!this.bound) return false;
        this.presets.push(preset);
        return true;
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

const controllerIn = (mode: LearningModeName, enabled = true) => {
    const host = new FakeHost();
    const controller = new LearningController(host);
    controller.settingsChanged({
        mandarinEditionEnabled: enabled,
        learningMode: mode,
        learningModeSnapshot: learnerOwn,
        seekableTracks: calculateSeekableTracksValue([0]),
        ...learnerOwn,
    });
    return { host, controller };
};

describe('LearningController', () => {
    it('does nothing at all while the Mandarin Edition flag is off', () => {
        const { host, controller } = controllerIn('ears', false);
        controller.cycleMode();
        controller.mark('got');
        controller.reveal();
        expect(host.hideUntilRevealed).toBe(false);
        expect(host.presets).toEqual([]);
        expect(host.events).toEqual([]);
        expect(host.notes).toEqual([]);
    });

    it('hides text until revealed in listening modes only', () => {
        expect(controllerIn('ears').host.hideUntilRevealed).toBe(true);
        expect(controllerIn('listenFirst').host.hideUntilRevealed).toBe(true);
        expect(controllerIn('justWatch').host.hideUntilRevealed).toBe(false);
        expect(controllerIn('off').host.hideUntilRevealed).toBe(false);
    });

    it('records one audio event for the line just heard while its text is hidden', () => {
        const { host, controller } = controllerIn('ears');
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
                mode: 'ears',
            },
        ]);
        expect(host.notes).toEqual(['mandarin.gotIt']);
    });

    it('records nothing for a line after it has been revealed', () => {
        const { host, controller } = controllerIn('listenFirst');
        controller.reveal();
        controller.mark('got');
        expect(host.events).toEqual([]);
        expect(host.notes).toEqual(['mandarin.alreadyRevealed']);
    });

    it('records nothing for a line the player displayed on its own', () => {
        const { host, controller } = controllerIn('justWatch');
        controller.linesDisplayed([1]);
        controller.mark('missed');
        expect(host.events).toEqual([]);
    });

    it('does not record the same mark twice', () => {
        const { host, controller } = controllerIn('ears');
        controller.mark('missed');
        controller.mark('missed');
        expect(host.events).toHaveLength(1);
    });

    it('forgets reveals when subtitles change', () => {
        const { host, controller } = controllerIn('ears');
        controller.reveal();
        controller.subtitlesChanged();
        controller.mark('got');
        expect(host.events).toHaveLength(1);
    });

    it('cycles from off into Just Watch, saving the learner settings', () => {
        const { host, controller } = controllerIn('off');
        controller.cycleMode();
        expect(controller.currentMode).toBe('justWatch');
        expect(host.presets[0].playModes).toEqual([PlayMode.normal]);
        expect(host.presets[0].alsoSave).toEqual({ learningMode: 'justWatch', learningModeSnapshot: learnerOwn });
        expect(host.notes).toEqual(['mandarin.mode.justWatch']);
    });

    it('restores the learner settings when cycling back to off', () => {
        const { host, controller } = controllerIn('listenFirst');
        controller.cycleMode();
        expect(controller.currentMode).toBe('off');
        expect(host.presets[0].settings).toEqual(learnerOwn);
        expect(host.presets[0].playModes).toBeUndefined();
        expect(host.hideUntilRevealed).toBe(false);
    });

    it('turns on hiding when cycling into Ears', () => {
        const { host, controller } = controllerIn('justWatch');
        controller.cycleMode();
        expect(controller.currentMode).toBe('ears');
        expect(host.hideUntilRevealed).toBe(true);
    });

    it('keeps the current mode when the player is not ready', () => {
        const { host, controller } = controllerIn('justWatch');
        host.bound = false;
        controller.cycleMode();
        expect(controller.currentMode).toBe('justWatch');
        expect(host.notes).toEqual([]);
    });

    it('tells the learner when there is nothing to reveal', () => {
        const { host, controller } = controllerIn('ears');
        host.dueIndexes = [];
        controller.reveal();
        expect(host.notes).toEqual(['mandarin.nothingToReveal']);
    });
});
