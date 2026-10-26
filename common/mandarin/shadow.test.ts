import { ShadowRecorder } from '@project/common/mandarin/shadow';
import type { ShadowHost } from '@project/common/mandarin/shadow';

const blob = (size: number) => ({ size }) as Blob;

const host = (overrides: Partial<ShadowHost> = {}) => {
    const calls: string[] = [];
    const h: ShadowHost = {
        startRecording: async () => {
            calls.push('start');
            return async () => {
                calls.push('stop');
                return blob(10);
            };
        },
        playRange: async (start, end) => {
            calls.push(`range ${start}-${end}`);
        },
        playAudio: async (audio) => {
            calls.push(`audio ${audio.size}`);
        },
        notify: (key) => {
            calls.push(`notify ${key}`);
        },
        ...overrides,
    };
    return { h, calls };
};

describe('ShadowRecorder', () => {
    it('records during the pause and keeps the take when playback resumes', async () => {
        const { h, calls } = host();
        const shadow = new ShadowRecorder(h);
        await shadow.pausedAfterLine(1000, 3000);
        expect(shadow.current.kind).toBe('recording');
        await shadow.resumed();
        expect(shadow.current.kind).toBe('idle');
        expect(shadow.lastTake).toMatchObject({ lineStartMs: 1000, lineEndMs: 3000 });
        expect(calls).toEqual(['start', 'stop']);
    });

    it('plays the speaker, then the learner', async () => {
        const { h, calls } = host();
        const shadow = new ShadowRecorder(h);
        await shadow.pausedAfterLine(1000, 3000);
        await shadow.resumed();
        await shadow.compare();
        expect(calls.slice(2)).toEqual([
            'notify mandarin.shadow.them',
            'range 1000-3000',
            'notify mandarin.shadow.you',
            'audio 10',
        ]);
    });

    it('finishes the take first when compare is pressed while still recording', async () => {
        const { h, calls } = host();
        const shadow = new ShadowRecorder(h);
        await shadow.pausedAfterLine(0, 1000);
        await shadow.compare();
        expect(calls).toEqual([
            'start',
            'stop',
            'notify mandarin.shadow.them',
            'range 0-1000',
            'notify mandarin.shadow.you',
            'audio 10',
        ]);
    });

    it('says so when there is nothing to compare yet', async () => {
        const { h, calls } = host();
        await new ShadowRecorder(h).compare();
        expect(calls).toEqual(['notify mandarin.shadow.nothingRecorded']);
    });

    it('gives up on the microphone once it is refused, without breaking the mode', async () => {
        const { h, calls } = host({
            startRecording: async () => {
                calls.push('start');
                throw new Error('NotAllowedError');
            },
        });
        const shadow = new ShadowRecorder(h);
        await shadow.pausedAfterLine(0, 1000);
        await shadow.pausedAfterLine(1000, 2000);
        expect(shadow.current.kind).toBe('idle');
        expect(calls).toEqual(['start', 'notify mandarin.shadow.noMicrophone']);
    });

    it('drops an empty take and keeps the previous one', async () => {
        let size = 10;
        const { h } = host({
            startRecording: async () => async () => blob(size),
        });
        const shadow = new ShadowRecorder(h);
        await shadow.pausedAfterLine(0, 1000);
        await shadow.resumed();
        size = 0;
        await shadow.pausedAfterLine(1000, 2000);
        await shadow.resumed();
        expect(shadow.lastTake?.lineStartMs).toBe(0);
    });

    it('stops a recording that was opened after playback already resumed', async () => {
        let resolveStart: (stop: () => Promise<Blob>) => void = () => {};
        const { h, calls } = host({
            startRecording: () =>
                new Promise((resolve) => {
                    calls.push('start');
                    resolveStart = resolve;
                }),
        });
        const shadow = new ShadowRecorder(h);
        const pending = shadow.pausedAfterLine(0, 1000);
        await shadow.resumed();
        resolveStart(async () => {
            calls.push('stop');
            return blob(10);
        });
        await pending;
        await Promise.resolve();
        expect(calls).toEqual(['start', 'stop']);
        expect(shadow.lastTake).toBeUndefined();
    });
});
