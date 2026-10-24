export interface SegmentLine {
    readonly index: number;
    readonly start: number;
    readonly end: number;
}

export type SegmentState =
    | { readonly kind: 'idle' }
    | { readonly kind: 'marked'; readonly startMs: number }
    | { readonly kind: 'looping'; readonly startMs: number; readonly endMs: number };

/** Grace period after the out point before jumping back, so the last syllable is heard. */
export const segmentLoopTailMs = 200;
/** Segments are meant for 15 to 90 seconds of speech; anything longer is almost certainly a mistake. */
export const maxSegmentMs = 120_000;

export type SegmentAction =
    | { readonly kind: 'started'; readonly startMs: number }
    | { readonly kind: 'looping'; readonly startMs: number; readonly endMs: number }
    | { readonly kind: 'cleanPass'; readonly startMs: number; readonly endMs: number }
    | { readonly kind: 'stopped' }
    | { readonly kind: 'rejected'; readonly reason: 'noLine' | 'endBeforeStart' | 'tooLong' };

const lineAt = (lines: readonly SegmentLine[], nowMs: number): SegmentLine | undefined => {
    let best: SegmentLine | undefined;
    for (const line of lines) {
        if (line.start > nowMs) continue;
        if (best === undefined || line.start > best.start) best = line;
    }
    return best;
};

/**
 * A multi-line A-B loop snapped to subtitle boundaries.
 * `[` marks the start (or, while looping, starts a clean text-free pass); `]` marks the end
 * and starts looping (or, while looping, stops).
 */
export class SegmentLoop {
    private _state: SegmentState = { kind: 'idle' };

    get state(): SegmentState {
        return this._state;
    }

    pressStart(lines: readonly SegmentLine[], nowMs: number): SegmentAction {
        if (this._state.kind === 'looping') {
            const { startMs, endMs } = this._state;
            return { kind: 'cleanPass', startMs, endMs };
        }
        const line = lineAt(lines, nowMs);
        if (line === undefined) return { kind: 'rejected', reason: 'noLine' };
        this._state = { kind: 'marked', startMs: line.start };
        return { kind: 'started', startMs: line.start };
    }

    pressEnd(lines: readonly SegmentLine[], nowMs: number): SegmentAction {
        if (this._state.kind === 'looping') {
            this._state = { kind: 'idle' };
            return { kind: 'stopped' };
        }
        if (this._state.kind === 'idle') return { kind: 'rejected', reason: 'noLine' };
        const line = lineAt(lines, nowMs);
        if (line === undefined) return { kind: 'rejected', reason: 'noLine' };
        const { startMs } = this._state;
        if (line.end <= startMs) return { kind: 'rejected', reason: 'endBeforeStart' };
        if (line.end - startMs > maxSegmentMs) return { kind: 'rejected', reason: 'tooLong' };
        this._state = { kind: 'looping', startMs, endMs: line.end };
        return { kind: 'looping', startMs, endMs: line.end };
    }

    /** Returns the time to seek to when playback has run past the end of the loop. */
    seekTargetAt(nowMs: number): number | undefined {
        if (this._state.kind !== 'looping') return undefined;
        return nowMs >= this._state.endMs + segmentLoopTailMs ? this._state.startMs : undefined;
    }

    linesInLoop(lines: readonly SegmentLine[]): number[] {
        if (this._state.kind !== 'looping') return [];
        const { startMs, endMs } = this._state;
        return lines.filter((line) => line.start >= startMs && line.end <= endMs).map((line) => line.index);
    }

    reset(): void {
        this._state = { kind: 'idle' };
    }
}
