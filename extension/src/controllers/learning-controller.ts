import type { IndexedSubtitleModel, PlayMode } from '@project/common';
import {
    isTextHiddenByDefault,
    LearningMode,
    learningModeTransition,
    nextLearningMode,
    pickLearningModeSettings,
} from '@project/common/mandarin/learning-modes';
import type { LearningModeSettings } from '@project/common/mandarin/learning-modes';
import type { NewLedgerEvent } from '@project/common/mandarin/ledger';
import { LineRecognitionTracker, lineHeardAt, primaryTrack } from '@project/common/mandarin/line-recognition';
import type { RecognitionResult } from '@project/common/mandarin/line-recognition';
import type { AsbplayerSettings, LearningModeName } from '@project/common/settings';
import { SegmentLoop } from '@project/common/mandarin/segment-loop';

export interface LearningHost {
    readonly subtitles: readonly IndexedSubtitleModel[];
    readonly currentTimeMs: number;
    setHideUntilRevealed(hide: boolean): void;
    revealCurrentLines(): number[];
    rehideLines(indexes: readonly number[]): void;
    seek(timestampMs: number): void;
    applyPreset(preset: {
        readonly settings: LearningModeSettings;
        readonly playModes?: readonly PlayMode[];
        readonly alsoSave: Partial<AsbplayerSettings>;
    }): boolean;
    recordEvent(event: NewLedgerEvent): void;
    notify(locKey: string, replacements?: { [key: string]: string }): void;
    sourceUrl(): string;
    title(): string;
}

type LearningSettings = Pick<
    AsbplayerSettings,
    'mandarinEditionEnabled' | 'learningMode' | 'learningModeSnapshot' | 'seekableTracks'
> &
    LearningModeSettings;

const modeLocKey = (mode: LearningModeName) => `mandarin.mode.${mode}`;

/**
 * Mandarin Edition learning layer for one video: learning modes, the reveal action,
 * and G/H listening marks. Everything is inert unless `mandarinEditionEnabled` is on.
 */
export default class LearningController {
    private readonly host: LearningHost;
    private readonly tracker = new LineRecognitionTracker();
    private readonly segment = new SegmentLoop();
    private enabled = false;
    private mode: LearningModeName = LearningMode.off;
    private snapshot?: LearningModeSettings;
    private modeSettings?: LearningModeSettings;
    private track = 0;

    constructor(host: LearningHost) {
        this.host = host;
    }

    get active() {
        return this.enabled;
    }

    get currentMode(): LearningModeName {
        return this.mode;
    }

    settingsChanged(settings: LearningSettings): void {
        this.enabled = settings.mandarinEditionEnabled;
        this.mode = settings.learningMode;
        this.snapshot = settings.learningModeSnapshot;
        this.modeSettings = pickLearningModeSettings(settings);
        this.track = primaryTrack(settings.seekableTracks);
        this.applyHiding();
    }

    subtitlesChanged(): void {
        this.tracker.reset();
        this.segment.reset();
        this.applyHiding();
    }

    private applyHiding(): void {
        const looping = this.segment.state.kind === 'looping';
        this.host.setHideUntilRevealed(this.enabled && (looping || isTextHiddenByDefault(this.mode)));
    }

    private primaryLines() {
        return this.host.subtitles.filter((subtitle) => subtitle.track === this.track);
    }

    pressSegmentStart(): void {
        if (!this.enabled) return;
        const action = this.segment.pressStart(this.primaryLines(), this.host.currentTimeMs);
        switch (action.kind) {
            case 'started':
                this.host.notify('mandarin.segment.started');
                return;
            case 'cleanPass':
                this.host.rehideLines(this.segment.linesInLoop(this.host.subtitles));
                this.host.seek(action.startMs);
                this.host.notify('mandarin.segment.cleanPass');
                return;
            case 'rejected':
                this.host.notify(`mandarin.segment.${action.reason}`);
                return;
        }
    }

    pressSegmentEnd(): void {
        if (!this.enabled) return;
        const action = this.segment.pressEnd(this.primaryLines(), this.host.currentTimeMs);
        switch (action.kind) {
            case 'looping':
                this.applyHiding();
                this.host.seek(action.startMs);
                this.host.notify('mandarin.segment.looping');
                return;
            case 'stopped':
                this.applyHiding();
                this.host.notify('mandarin.segment.stopped');
                return;
            case 'rejected':
                this.host.notify(`mandarin.segment.${action.reason}`);
                return;
        }
    }

    timeChanged(nowMs: number): void {
        if (!this.enabled) return;
        const target = this.segment.seekTargetAt(nowMs);
        if (target !== undefined) this.host.seek(target);
    }

    linesDisplayed(indexes: readonly number[]): void {
        this.tracker.linesDisplayed(indexes);
    }

    cycleMode(): void {
        if (!this.enabled || this.modeSettings === undefined || this.snapshot === undefined) return;
        const to = nextLearningMode(this.mode);
        const transition = learningModeTransition(this.mode, to, this.modeSettings, this.snapshot);
        const applied = this.host.applyPreset({
            settings: transition.settings,
            playModes: transition.playModes,
            alsoSave: { learningMode: transition.mode, learningModeSnapshot: transition.snapshot },
        });
        if (!applied) return;
        this.mode = transition.mode;
        this.snapshot = transition.snapshot;
        this.modeSettings = transition.settings;
        this.applyHiding();
        this.host.notify(modeLocKey(this.mode));
    }

    reveal(): void {
        if (!this.enabled) return;
        const revealed = this.host.revealCurrentLines();
        if (revealed.length === 0) {
            this.host.notify('mandarin.nothingToReveal');
            return;
        }
        this.tracker.linesDisplayed(revealed);
    }

    mark(result: RecognitionResult): void {
        if (!this.enabled) return;
        const line = lineHeardAt(this.host.subtitles, this.host.currentTimeMs, this.track);
        const outcome = this.tracker.mark(line, result);

        switch (outcome.kind) {
            case 'noLine':
                return;
            case 'alreadyRevealed':
                this.host.notify('mandarin.alreadyRevealed');
                return;
            case 'unchanged':
                this.host.notify(result === 'got' ? 'mandarin.gotIt' : 'mandarin.missed');
                return;
            case 'recorded':
                this.host.recordEvent({
                    kind: 'audio',
                    result,
                    sentence: outcome.line.text,
                    track: outcome.line.track,
                    start: outcome.line.start,
                    end: outcome.line.end,
                    sourceUrl: this.host.sourceUrl(),
                    title: this.host.title(),
                    mode: this.mode,
                });
                this.host.notify(result === 'got' ? 'mandarin.gotIt' : 'mandarin.missed');
                return;
        }
    }
}
