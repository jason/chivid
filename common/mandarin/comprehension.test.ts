import { comprehension, formatClock, formatShare } from '@project/common/mandarin/comprehension';

const line = (text: string, i: number) => ({ text, start: i * 2000, end: i * 2000 + 1500 });

describe('comprehension', () => {
    it('counts occurrences, so a repeated known character weighs more than a rare unknown one', () => {
        const result = comprehension([line('我我我我我我我我我银', 0)], '我')!;
        expect(result.knownShare).toBeCloseTo(0.9);
        expect(result.hanCount).toBe(10);
        expect(result.newCharacters).toBe('银');
    });

    it('lists new characters by how often they appear and ignores punctuation and Latin', () => {
        const result = comprehension([line('银行，银子 OK 行？', 0)], '')!;
        expect(result.newCharacters).toBe('银行子');
        expect(result.hanCount).toBe(5);
    });

    it('finds the hardest stretch of lines', () => {
        const easy = '我们今天很好我们今天很好';
        const hard = '鳄鱼蜥蜴鹦鹉蝙蝠鳄鱼蜥蜴';
        const lines = [
            ...Array.from({ length: 10 }, (_, i) => line(easy, i)),
            ...Array.from({ length: 8 }, (_, i) => line(hard, 10 + i)),
            ...Array.from({ length: 6 }, (_, i) => line(easy, 18 + i)),
        ];
        const result = comprehension(lines, '我们今天很好')!;
        expect(result.hardest).toEqual({ start: 20000, end: 35500, knownShare: 0 });
    });

    it('has nothing to say about text without Chinese', () => {
        expect(comprehension([line('Hello', 0)], '我')).toBeUndefined();
    });

    it('formats shares down and clock times', () => {
        expect(formatShare(0.949)).toBe('94%');
        expect(formatClock(760000)).toBe('12:40');
        expect(formatClock(3725000)).toBe('1:02:05');
    });
});
