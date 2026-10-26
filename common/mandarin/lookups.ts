/**
 * Turns the learner resting the pointer on a word's meaning card into a lookup event. A sweep
 * across the line is not a lookup; a dwell on one word is, and only once per word per line.
 */
export interface LookupTarget {
    readonly word: string;
    readonly reading: string;
    readonly gloss: string;
    readonly subtitleIndex: number;
}

export interface LookupHost {
    record(target: LookupTarget): void;
    setTimer(callback: () => void, ms: number): unknown;
    clearTimer(handle: unknown): void;
}

/** How long the pointer must rest on a word before it counts as reading its meaning. */
export const lookupDwellMs = 600;

export class LookupTracker {
    private readonly host: LookupHost;
    private pending: { target: LookupTarget; handle: unknown } | undefined;
    private recorded = new Set<string>();

    constructor(host: LookupHost) {
        this.host = host;
    }

    hovering(target: LookupTarget | undefined): void {
        if (this.pending && (!target || !sameTarget(this.pending.target, target))) {
            this.host.clearTimer(this.pending.handle);
            this.pending = undefined;
        }
        if (!target || this.pending) return;
        const key = `${target.subtitleIndex}:${target.word}`;
        if (this.recorded.has(key)) return;
        const handle = this.host.setTimer(() => {
            this.pending = undefined;
            this.recorded.add(key);
            this.host.record(target);
        }, lookupDwellMs);
        this.pending = { target, handle };
    }

    /** New subtitles: every word may be looked up again. */
    reset(): void {
        if (this.pending) this.host.clearTimer(this.pending.handle);
        this.pending = undefined;
        this.recorded = new Set();
    }
}

const sameTarget = (a: LookupTarget, b: LookupTarget) => a.subtitleIndex === b.subtitleIndex && a.word === b.word;
