import { AutoPausePreference, PlayMode } from '@project/common';
import { AutoPauseResumeMode, SubtitleVisibility } from '@project/common/settings';
import {
    isTextHiddenByDefault,
    LearningMode,
    learningModeOrder,
    learningModePreset,
    learningModeTransition,
    nextLearningMode,
} from '@project/common/mandarin/learning-modes';
import type { LearningModeSettings } from '@project/common/mandarin/learning-modes';

const learnerOwn: LearningModeSettings = {
    subtitleVisibility: SubtitleVisibility.whenDue,
    autoPausePreference: AutoPausePreference.atStartAndEnd,
    autoPauseResumeMode: AutoPauseResumeMode.subtitleLength,
    repeatCountPreference: 3,
};

const upstreamDefaults: LearningModeSettings = {
    subtitleVisibility: SubtitleVisibility.whenDue,
    autoPausePreference: AutoPausePreference.atEnd,
    autoPauseResumeMode: AutoPauseResumeMode.manual,
    repeatCountPreference: 0,
};

describe('learning modes', () => {
    it('cycles through every mode and wraps back to off', () => {
        let mode: LearningMode = LearningMode.off;
        const seen: LearningMode[] = [];
        for (let i = 0; i < learningModeOrder.length; ++i) {
            seen.push(mode);
            mode = nextLearningMode(mode);
        }
        expect(seen).toEqual(learningModeOrder);
        expect(mode).toBe(LearningMode.off);
    });

    it('saves the learner settings when leaving off and restores them when returning', () => {
        const toEars = learningModeTransition(LearningMode.off, LearningMode.ears, learnerOwn, upstreamDefaults);
        expect(toEars.snapshot).toEqual(learnerOwn);
        expect(toEars.settings.subtitleVisibility).toBe(SubtitleVisibility.whenDue);
        expect(toEars.settings.repeatCountPreference).toBe(1);

        const toListenFirst = learningModeTransition(
            LearningMode.ears,
            LearningMode.listenFirst,
            toEars.settings,
            toEars.snapshot
        );
        expect(toListenFirst.snapshot).toEqual(learnerOwn);

        const backToOff = learningModeTransition(
            LearningMode.listenFirst,
            LearningMode.off,
            toListenFirst.settings,
            toListenFirst.snapshot
        );
        expect(backToOff.settings).toEqual(learnerOwn);
        expect(backToOff.snapshot).toEqual(learnerOwn);
        expect(backToOff.playModes).toBeUndefined();
    });

    it('does not overwrite the saved snapshot when moving between learning modes', () => {
        const presetSettings = learningModePreset(LearningMode.justWatch).settings;
        const t = learningModeTransition(LearningMode.justWatch, LearningMode.ears, presetSettings, learnerOwn);
        expect(t.snapshot).toEqual(learnerOwn);
    });

    it('replaces a stale snapshot with current values each time learning starts from off', () => {
        const t = learningModeTransition(LearningMode.off, LearningMode.justWatch, learnerOwn, upstreamDefaults);
        expect(t.snapshot).toEqual(learnerOwn);
    });

    it('turns on auto-pause only in listen first', () => {
        expect(learningModePreset(LearningMode.justWatch).playModes).toEqual([PlayMode.normal]);
        expect(learningModePreset(LearningMode.ears).playModes).toEqual([PlayMode.normal]);
        expect(learningModePreset(LearningMode.listenFirst).playModes).toEqual([PlayMode.autoPause]);
    });

    it('hides text by default only in listening modes', () => {
        expect(isTextHiddenByDefault(LearningMode.off)).toBe(false);
        expect(isTextHiddenByDefault(LearningMode.justWatch)).toBe(false);
        expect(isTextHiddenByDefault(LearningMode.ears)).toBe(true);
        expect(isTextHiddenByDefault(LearningMode.listenFirst)).toBe(true);
    });
});
