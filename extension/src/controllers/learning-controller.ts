import type { IndexedSubtitleModel } from '@project/common';
import type { NewLedgerEvent } from '@project/common/mandarin/ledger';
import { LineRecognitionTracker, lineHeardAt, primaryTrack } from '@project/common/mandarin/line-recognition';
import type { RecognitionResult } from '@project/common/mandarin/line-recognition';
import { SegmentLoop } from '@project/common/mandarin/segment-loop';
import type { AsbplayerSettings } from '@project/common/settings';

export interface LearningHost {
    readonly subtitles: readonly IndexedSubtitleModel[];
    readonly currentTimeMs: number;
    setHideUntilRevealed(hide: boolean): void;
    revealCurrentLines(): number[];
    rehideLines(indexes: readonly number[]): void;
    seek(timestampMs: number): void;
    recordEvent(event: NewLedgerEvent): void;
    notify(locKey: string, replacements?: { [key: string]: string }): void;
    sourceUrl(): string;
    title(): string;
}

/** Effective settings (the learner's settings with the active recipe applied) plus the recipe's name. */
export type LearningSettings = Pick<
    AsbplayerSettings,
    'mandarinEditionEnabled' | 'hideUntilRevealed' | 'seekableTracks'
> & { readonly recipeName: string | null };

/**
 * Mandarin Edition learning layer for one video: hide until revealed, the reveal action,
 * G/H listening marks, and the segment loop. Playback modes and presets are upstream Recipes;
 * this controller only reads the effective settings they produce.
 * Everything is inert unless `mandarinEditionEnabled` is on.
 */
export default class LearningController {
    private readonly host: LearningHost;
    private readonly tracker = new LineRecognitionTracker();
    private readonly segment = new SegmentLoop();
    private enabled = false;
    private hideByRecipe = false;
    private recipeName: string | null = null;
    private track = 0;

    constructor(host: LearningHost) {
        this.host = host;
    }

    get active() {
        return this.enabled;
    }

    settingsChanged(settings: LearningSettings): void {
        this.enabled = settings.mandarinEditionEnabled;
        this.hideByRecipe = settings.hideUntilRevealed;
        this.recipeName = settings.recipeName;
        this.track = primaryTrack(settings.seekableTracks);
        this.applyHiding();
    }

    subtitlesChanged(): void {
        this.tracker.reset();
        this.segment.reset();
        this.applyHiding();
    }

    linesDisplayed(indexes: readonly number[]): void {
        this.tracker.linesDisplayed(indexes);
    }

    private applyHiding(): void {
        const looping = this.segment.state.kind === 'looping';
        this.host.setHideUntilRevealed(this.enabled && (looping || this.hideByRecipe));
    }

    private primaryLines() {
        return this.host.subtitles.filter((subtitle) => subtitle.track === this.track);
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
                    recipe: this.recipeName,
                });
                this.host.notify(result === 'got' ? 'mandarin.gotIt' : 'mandarin.missed');
                return;
        }
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
}
