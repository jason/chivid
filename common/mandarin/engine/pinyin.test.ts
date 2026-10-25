import { describe, expect, it } from '@jest/globals';
import { applyBuYiSandhi, markReading, markSyllable } from '@project/common/mandarin/engine/pinyin';

describe('tone marks', () => {
    it.each([
        ['zhong1', 'zhōng'],
        ['hao3', 'hǎo'],
        ['xue2', 'xué'],
        ['gou3', 'gǒu'],
        ['gui4', 'guì'],
        ['liu2', 'liú'],
        ['lu:4', 'lǜ'],
        ['nv3', 'nǚ'],
        ['de5', 'de'],
        ['r5', 'r'],
        ['Zhong1', 'Zhōng'],
        ['er2', 'ér'],
    ])('%s → %s', (numbered, marked) => expect(markSyllable(numbered)).toBe(marked));

    it('marks a whole reading', () => expect(markReading('yin2 hang2')).toBe('yín háng'));
});

describe('不 and 一 tone changes', () => {
    const run = (chars: string, numbered: string[]) => {
        const syllables = [...chars].map((char, i) => ({ char, numbered: numbered[i] ?? null }));
        applyBuYiSandhi(syllables);
        return syllables.map((s) => s.numbered).join(' ');
    };

    it('不 before a fourth tone becomes second', () => expect(run('不去', ['bu4', 'qu4'])).toBe('bu2 qu4'));
    it('不 before other tones stays fourth', () => expect(run('不好', ['bu4', 'hao3'])).toBe('bu4 hao3'));
    it('一 before a fourth or neutral tone becomes second', () => {
        expect(run('一个', ['yi1', 'ge5'])).toBe('yi2 ge5');
        expect(run('一样', ['yi1', 'yang4'])).toBe('yi2 yang4');
    });
    it('一 before first, second or third tones becomes fourth', () => {
        expect(run('一天', ['yi1', 'tian1'])).toBe('yi4 tian1');
        expect(run('一百', ['yi1', 'bai3'])).toBe('yi4 bai3');
    });
    it('一 keeps first tone as an ordinal or in digit strings', () => {
        expect(run('第一次', ['di4', 'yi1', 'ci4'])).toBe('di4 yi1 ci4');
        expect(run('一九八四', ['yi1', 'jiu3', 'ba1', 'si4'])).toBe('yi1 jiu3 ba1 si4');
    });
    it('一 at the end of a line keeps first tone', () => expect(run('统一', ['tong3', 'yi1'])).toBe('tong3 yi1'));
    it('punctuation stops the change', () => expect(run('不，去', ['bu4', null as never, 'qu4'])).toBe('bu4  qu4'));
});
