export type RecognitionResult = 'got' | 'missed';

export interface RecognitionLine {
    readonly index: number;
    readonly track: number;
    readonly start: number;
    readonly end: number;
    readonly text: string;
}

export type MarkOutcome =
    | { readonly kind: 'recorded'; readonly line: RecognitionLine; readonly result: RecognitionResult }
    | { readonly kind: 'unchanged'; readonly line: RecognitionLine; readonly result: RecognitionResult }
    | { readonly kind: 'alreadyRevealed'; readonly line: RecognitionLine }
    | { readonly kind: 'noLine' };

/**
 * Tracks, per subtitle line, whether the learner has seen its text.
 * An audio-recognition mark is recorded only for a line whose text was never shown:
 * that is the one rule that keeps the listening data honest.
 */
export class LineRecognitionTracker {
    private readonly revealed = new Set<number>();
    private readonly marks = new Map<number, RecognitionResult>();

    /** Call with every line whose text was actually rendered on screen. */
    linesDisplayed(indexes: Iterable<number>): void {
        for (const index of indexes) this.revealed.add(index);
    }

    isRevealed(index: number): boolean {
        return this.revealed.has(index);
    }

    mark(line: RecognitionLine | undefined, result: RecognitionResult): MarkOutcome {
        if (line === undefined) return { kind: 'noLine' };
        if (this.revealed.has(line.index)) return { kind: 'alreadyRevealed', line };
        if (this.marks.get(line.index) === result) return { kind: 'unchanged', line, result };
        this.marks.set(line.index, result);
        return { kind: 'recorded', line, result };
    }

    reset(): void {
        this.revealed.clear();
        this.marks.clear();
    }
}

interface TimedLine {
    readonly index: number;
    readonly track: number;
    readonly start: number;
    readonly end: number;
    readonly text: string;
}

/**
 * The line a G/H press refers to: the most recent line on the target track that has
 * started by `nowMs`. Pressing just after a line ends still refers to that line.
 */
export const lineHeardAt = <T extends TimedLine>(
    subtitles: readonly T[],
    nowMs: number,
    track: number
): T | undefined => {
    let best: T | undefined;
    for (const subtitle of subtitles) {
        if (subtitle.track !== track || subtitle.start > nowMs) continue;
        if (best === undefined || subtitle.start > best.start) best = subtitle;
    }
    return best;
};

/** First track index whose bit is set in asbplayer's `seekableTracks` bitset, defaulting to track 0. */
export const primaryTrack = (seekableTracks: number): number => {
    for (let track = 0; track < 32; ++track) {
        if (seekableTracks & (1 << track)) return track;
    }
    return 0;
};
