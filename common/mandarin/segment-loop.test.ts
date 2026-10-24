import { describe, expect, it } from '@jest/globals';
import { maxSegmentMs, SegmentLoop, segmentLoopTailMs } from '@project/common/mandarin/segment-loop';

const lines = [
    { index: 0, start: 1000, end: 3000 },
    { index: 1, start: 4000, end: 6000 },
    { index: 2, start: 7000, end: 9000 },
    { index: 3, start: 20000, end: 22000 },
];

describe('SegmentLoop', () => {
    it('snaps start and end to subtitle boundaries and loops across several lines', () => {
        const loop = new SegmentLoop();
        expect(loop.pressStart(lines, 1500)).toEqual({ kind: 'started', startMs: 1000 });
        expect(loop.pressEnd(lines, 8000)).toEqual({ kind: 'looping', startMs: 1000, endMs: 9000 });
        expect(loop.linesInLoop(lines)).toEqual([0, 1, 2]);
    });

    it('jumps back only after the tail grace period', () => {
        const loop = new SegmentLoop();
        loop.pressStart(lines, 1500);
        loop.pressEnd(lines, 8000);
        expect(loop.seekTargetAt(9000)).toBeUndefined();
        expect(loop.seekTargetAt(9000 + segmentLoopTailMs)).toBe(1000);
    });

    it('starts a clean pass when start is pressed while looping', () => {
        const loop = new SegmentLoop();
        loop.pressStart(lines, 1500);
        loop.pressEnd(lines, 5000);
        expect(loop.pressStart(lines, 5500)).toEqual({ kind: 'cleanPass', startMs: 1000, endMs: 6000 });
        expect(loop.state.kind).toBe('looping');
    });

    it('stops when end is pressed while looping', () => {
        const loop = new SegmentLoop();
        loop.pressStart(lines, 1500);
        loop.pressEnd(lines, 5000);
        expect(loop.pressEnd(lines, 5000)).toEqual({ kind: 'stopped' });
        expect(loop.seekTargetAt(100000)).toBeUndefined();
    });

    it('rejects an end before the start, an end with no start, and over-long segments', () => {
        const loop = new SegmentLoop();
        expect(loop.pressEnd(lines, 5000)).toEqual({ kind: 'rejected', reason: 'noLine' });
        loop.pressStart(lines, 4500);
        expect(loop.pressEnd(lines, 1500)).toEqual({ kind: 'rejected', reason: 'endBeforeStart' });
        const far = [...lines, { index: 4, start: maxSegmentMs + 5000, end: maxSegmentMs + 7000 }];
        expect(loop.pressEnd(far, maxSegmentMs + 6000)).toEqual({ kind: 'rejected', reason: 'tooLong' });
    });

    it('rejects a start before any line has played', () => {
        expect(new SegmentLoop().pressStart(lines, 500)).toEqual({ kind: 'rejected', reason: 'noLine' });
    });
});
