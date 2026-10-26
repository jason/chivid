import { autoPauseDurationMs } from '@project/common/playback/controllers/auto-pause-controller';
import { AutoPauseResumeMode } from '@project/common/settings';

const line = (start: number, end: number, text = '你好') => ({
    start,
    end,
    text,
    originalStart: start,
    originalEnd: end,
    track: 0,
});

describe('subtitle duration auto-pause (shadowing)', () => {
    const resume = {
        mode: AutoPauseResumeMode.subtitleDuration as const,
        minimumDurationMs: 1200,
        maximumDurationMs: 12000,
        durationFactor: 1.3,
        delayMs: 0,
    };

    it('pauses for the spoken length times the factor', () => {
        expect(autoPauseDurationMs(resume, [line(1000, 3000)])).toBe(2600);
    });

    it('adds the lines when several are due at once', () => {
        expect(autoPauseDurationMs(resume, [line(0, 1000), line(1000, 2000)])).toBe(2600);
    });

    it('never pauses shorter than the minimum or longer than the maximum', () => {
        expect(autoPauseDurationMs(resume, [line(0, 400)])).toBe(1200);
        expect(autoPauseDurationMs(resume, [line(0, 60000)])).toBe(12000);
        expect(autoPauseDurationMs({ ...resume, maximumDurationMs: 0 }, [line(0, 60000)])).toBe(78000);
    });

    it('leaves the character-based mode alone', () => {
        const byLength = { ...resume, mode: AutoPauseResumeMode.subtitleLength as const, timePerCharacterMs: 1000 };
        expect(autoPauseDurationMs(byLength, [line(0, 100, '你好吗')])).toBe(3000);
    });
});
