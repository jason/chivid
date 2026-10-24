import { AutoPausePreference, PlayMode } from '@project/common';
import { AutoPauseResumeMode, SubtitleVisibility } from '@project/common/settings';
import type { LearningModeName, MiscSettings } from '@project/common/settings';

/**
 * A learning mode is a small patch of playback settings plus a set of play modes,
 * applied to the active settings profile. It never touches Anki, annotation, or key
 * binding settings, so switching modes cannot disturb the rest of the configuration.
 */
export const LearningMode = {
    off: 'off',
    justWatch: 'justWatch',
    ears: 'ears',
    listenFirst: 'listenFirst',
} as const satisfies Record<string, LearningModeName>;

export type LearningMode = LearningModeName;
type ActiveLearningMode = Exclude<LearningMode, 'off'>;

export const learningModeOrder: readonly LearningMode[] = [
    LearningMode.off,
    LearningMode.justWatch,
    LearningMode.ears,
    LearningMode.listenFirst,
];

export type LearningModeSettingKey =
    | 'subtitleVisibility'
    | 'autoPausePreference'
    | 'autoPauseResumeMode'
    | 'repeatCountPreference';

export const learningModeSettingKeys: readonly LearningModeSettingKey[] = [
    'subtitleVisibility',
    'autoPausePreference',
    'autoPauseResumeMode',
    'repeatCountPreference',
];

export type LearningModeSettings = Pick<MiscSettings, LearningModeSettingKey>;

export interface LearningModePreset {
    readonly settings: LearningModeSettings;
    readonly playModes: readonly PlayMode[];
    /**
     * Whether each line's text stays hidden, through pauses, until the learner reveals it.
     * Pausing never reveals, so the learner can pause, think, and still mark the line.
     */
    readonly textHiddenByDefault: boolean;
}

const presets: Record<ActiveLearningMode, LearningModePreset> = {
    [LearningMode.justWatch]: {
        settings: {
            subtitleVisibility: SubtitleVisibility.whenDue,
            autoPausePreference: AutoPausePreference.atEnd,
            autoPauseResumeMode: AutoPauseResumeMode.manual,
            repeatCountPreference: 1,
        },
        playModes: [PlayMode.normal],
        textHiddenByDefault: false,
    },
    [LearningMode.ears]: {
        settings: {
            subtitleVisibility: SubtitleVisibility.whenDue,
            autoPausePreference: AutoPausePreference.atEnd,
            autoPauseResumeMode: AutoPauseResumeMode.manual,
            repeatCountPreference: 1,
        },
        playModes: [PlayMode.normal],
        textHiddenByDefault: true,
    },
    [LearningMode.listenFirst]: {
        settings: {
            subtitleVisibility: SubtitleVisibility.whenDue,
            autoPausePreference: AutoPausePreference.atEnd,
            autoPauseResumeMode: AutoPauseResumeMode.manual,
            repeatCountPreference: 1,
        },
        playModes: [PlayMode.autoPause],
        textHiddenByDefault: true,
    },
};

export const learningModePreset = (mode: ActiveLearningMode): LearningModePreset => presets[mode];

export const nextLearningMode = (mode: LearningMode): LearningMode => {
    const index = learningModeOrder.indexOf(mode);
    return learningModeOrder.at((index + 1) % learningModeOrder.length)!;
};

export const pickLearningModeSettings = (settings: LearningModeSettings): LearningModeSettings => ({
    subtitleVisibility: settings.subtitleVisibility,
    autoPausePreference: settings.autoPausePreference,
    autoPauseResumeMode: settings.autoPauseResumeMode,
    repeatCountPreference: settings.repeatCountPreference,
});

export interface LearningModeTransition {
    readonly mode: LearningMode;
    readonly settings: LearningModeSettings;
    /** Undefined means leave play modes as they are (only when returning to Off). */
    readonly playModes?: readonly PlayMode[];
    /** The learner's own values to restore when they turn learning modes off. */
    readonly snapshot: LearningModeSettings;
}

/**
 * Computes the settings to apply when moving from `from` to `to`.
 * Leaving Off saves the learner's current values; returning to Off restores them.
 */
export const learningModeTransition = (
    from: LearningMode,
    to: LearningMode,
    current: LearningModeSettings,
    snapshot: LearningModeSettings
): LearningModeTransition => {
    if (to === LearningMode.off) {
        return { mode: to, settings: pickLearningModeSettings(snapshot), snapshot };
    }

    const preset = learningModePreset(to);
    const nextSnapshot = from === LearningMode.off ? pickLearningModeSettings(current) : snapshot;
    return {
        mode: to,
        settings: preset.settings,
        playModes: preset.playModes,
        snapshot: nextSnapshot,
    };
};

export const isTextHiddenByDefault = (mode: LearningMode): boolean =>
    mode === LearningMode.off ? false : learningModePreset(mode).textHiddenByDefault;
