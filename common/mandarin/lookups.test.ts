import { LookupTracker, lookupDwellMs } from '@project/common/mandarin/lookups';
import type { LookupTarget } from '@project/common/mandarin/lookups';

const target = (word: string, subtitleIndex = 2): LookupTarget => ({ word, reading: 'x', gloss: 'y', subtitleIndex });

describe('LookupTracker', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const tracker = () => {
        const recorded: string[] = [];
        const t = new LookupTracker({
            record: (x) => recorded.push(`${x.subtitleIndex}:${x.word}`),
            setTimer: (cb, ms) => setTimeout(cb, ms),
            clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
        });
        return { t, recorded };
    };

    it('records a word the pointer rests on', () => {
        const { t, recorded } = tracker();
        t.hovering(target('便宜'));
        jest.advanceTimersByTime(lookupDwellMs - 1);
        expect(recorded).toEqual([]);
        jest.advanceTimersByTime(1);
        expect(recorded).toEqual(['2:便宜']);
    });

    it('ignores a sweep across several words', () => {
        const { t, recorded } = tracker();
        t.hovering(target('便宜'));
        jest.advanceTimersByTime(200);
        t.hovering(target('银行'));
        jest.advanceTimersByTime(200);
        t.hovering(undefined);
        jest.advanceTimersByTime(lookupDwellMs);
        expect(recorded).toEqual([]);
    });

    it('counts a word once per line until the subtitles change', () => {
        const { t, recorded } = tracker();
        t.hovering(target('便宜'));
        jest.advanceTimersByTime(lookupDwellMs);
        t.hovering(undefined);
        t.hovering(target('便宜'));
        jest.advanceTimersByTime(lookupDwellMs);
        t.hovering(target('便宜', 5));
        jest.advanceTimersByTime(lookupDwellMs);
        expect(recorded).toEqual(['2:便宜', '5:便宜']);
        t.reset();
        t.hovering(target('便宜'));
        jest.advanceTimersByTime(lookupDwellMs);
        expect(recorded).toEqual(['2:便宜', '5:便宜', '2:便宜']);
    });
});
