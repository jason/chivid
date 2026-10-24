import { LineRecognitionTracker, lineHeardAt, primaryTrack } from '@project/common/mandarin/line-recognition';

const line = (index: number, start: number, end: number, track = 0) => ({
    index,
    track,
    start,
    end,
    text: `line ${index}`,
});

describe('LineRecognitionTracker', () => {
    it('records a mark on a line whose text was never shown', () => {
        const tracker = new LineRecognitionTracker();
        expect(tracker.mark(line(3, 0, 1000), 'got')).toEqual({
            kind: 'recorded',
            line: line(3, 0, 1000),
            result: 'got',
        });
    });

    it('refuses a mark once the line text has been displayed', () => {
        const tracker = new LineRecognitionTracker();
        tracker.linesDisplayed([3]);
        expect(tracker.mark(line(3, 0, 1000), 'got')).toEqual({ kind: 'alreadyRevealed', line: line(3, 0, 1000) });
    });

    it('ignores a repeated identical mark but records a changed one', () => {
        const tracker = new LineRecognitionTracker();
        tracker.mark(line(1, 0, 1000), 'got');
        expect(tracker.mark(line(1, 0, 1000), 'got').kind).toBe('unchanged');
        expect(tracker.mark(line(1, 0, 1000), 'missed').kind).toBe('recorded');
    });

    it('keeps a recorded mark valid when the line is revealed afterwards', () => {
        const tracker = new LineRecognitionTracker();
        expect(tracker.mark(line(1, 0, 1000), 'missed').kind).toBe('recorded');
        tracker.linesDisplayed([1]);
        expect(tracker.isRevealed(1)).toBe(true);
        expect(tracker.mark(line(1, 0, 1000), 'got').kind).toBe('alreadyRevealed');
    });

    it('reports no line when nothing has been heard yet', () => {
        expect(new LineRecognitionTracker().mark(undefined, 'got')).toEqual({ kind: 'noLine' });
    });

    it('forgets everything on reset', () => {
        const tracker = new LineRecognitionTracker();
        tracker.linesDisplayed([1]);
        tracker.reset();
        expect(tracker.mark(line(1, 0, 1000), 'got').kind).toBe('recorded');
    });
});

describe('lineHeardAt', () => {
    const subtitles = [line(0, 0, 1000), line(1, 1500, 2500), line(2, 1600, 2400, 1), line(3, 4000, 5000)];

    it('picks the latest line on the track that has started', () => {
        expect(lineHeardAt(subtitles, 2000, 0)?.index).toBe(1);
    });

    it('still refers to a line just after it ends', () => {
        expect(lineHeardAt(subtitles, 3000, 0)?.index).toBe(1);
    });

    it('ignores other tracks', () => {
        expect(lineHeardAt(subtitles, 2000, 1)?.index).toBe(2);
    });

    it('returns undefined before the first line', () => {
        expect(lineHeardAt([line(0, 500, 1000)], 100, 0)).toBeUndefined();
    });
});

describe('primaryTrack', () => {
    it('returns the first seekable track', () => {
        expect(primaryTrack(0b001)).toBe(0);
        expect(primaryTrack(0b110)).toBe(1);
        expect(primaryTrack(0)).toBe(0);
    });
});
