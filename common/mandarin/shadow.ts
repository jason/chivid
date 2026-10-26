/**
 * Shadowing: after a line plays, the video pauses and the learner says the line back. This
 * records them during that pause and lets them hear the speaker and themselves back to back.
 *
 * Pure state machine; the host supplies the microphone, the clock and playback.
 */

export interface ShadowTake {
    /** The line that was just heard. */
    readonly lineStartMs: number;
    readonly lineEndMs: number;
    readonly audio: Blob;
}

export interface ShadowHost {
    /** Starts recording the microphone; resolves to a stop function that yields the audio. */
    startRecording(): Promise<() => Promise<Blob>>;
    /** Plays the video from start to end, then resolves. */
    playRange(startMs: number, endMs: number): Promise<void>;
    /** Plays a recording back to the learner, resolving when it ends. */
    playAudio(audio: Blob): Promise<void>;
    notify(locKey: string, replacements?: { [key: string]: string }): void;
}

export type ShadowState =
    | { readonly kind: 'idle' }
    | { readonly kind: 'recording'; readonly lineStartMs: number; readonly lineEndMs: number }
    | { readonly kind: 'comparing' };

export class ShadowRecorder {
    private readonly host: ShadowHost;
    private state: ShadowState = { kind: 'idle' };
    private stop: (() => Promise<Blob>) | undefined;
    private take: ShadowTake | undefined;
    private micDenied = false;

    constructor(host: ShadowHost) {
        this.host = host;
    }

    get current(): ShadowState {
        return this.state;
    }

    get lastTake(): ShadowTake | undefined {
        return this.take;
    }

    /** The line just finished and the video paused for the learner: start recording them. */
    async pausedAfterLine(lineStartMs: number, lineEndMs: number): Promise<void> {
        if (this.state.kind !== 'idle' || this.micDenied) return;
        this.state = { kind: 'recording', lineStartMs, lineEndMs };
        try {
            this.stop = await this.host.startRecording();
        } catch {
            // No microphone, or permission refused: shadowing still works, just without playback.
            this.micDenied = true;
            this.state = { kind: 'idle' };
            this.host.notify('mandarin.shadow.noMicrophone');
            return;
        }
        if (this.state.kind !== 'recording') {
            // Playback resumed while the microphone was being opened.
            void this.stop().catch(() => undefined);
            this.stop = undefined;
        }
    }

    /** Playback resumed (the pause ended or the learner pressed play): the take is complete. */
    async resumed(): Promise<void> {
        if (this.state.kind !== 'recording') return;
        const { lineStartMs, lineEndMs } = this.state;
        this.state = { kind: 'idle' };
        const stop = this.stop;
        this.stop = undefined;
        if (!stop) return;
        try {
            const audio = await stop();
            if (audio.size > 0) this.take = { lineStartMs, lineEndMs, audio };
        } catch {
            // A failed take is just not kept.
        }
    }

    /** Hear the speaker's line, then your own attempt at it. */
    async compare(): Promise<void> {
        if (this.state.kind === 'comparing') return;
        if (this.state.kind === 'recording') await this.resumed();
        const take = this.take;
        if (!take) {
            this.host.notify('mandarin.shadow.nothingRecorded');
            return;
        }
        this.state = { kind: 'comparing' };
        try {
            this.host.notify('mandarin.shadow.them');
            await this.host.playRange(take.lineStartMs, take.lineEndMs);
            this.host.notify('mandarin.shadow.you');
            await this.host.playAudio(take.audio);
        } finally {
            this.state = { kind: 'idle' };
        }
    }

    reset(): void {
        if (this.stop) void this.stop().catch(() => undefined);
        this.stop = undefined;
        this.state = { kind: 'idle' };
        this.take = undefined;
    }
}
