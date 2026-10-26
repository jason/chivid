/** @jest-environment node */
import { existsSync, readFileSync } from 'fs';
import { describe, expect, it } from '@jest/globals';
import {
    MandarinDictionary,
    maxGlossesPerEntry,
    packCedict,
    packCedictText,
    packedTextSource,
} from '@project/common/mandarin/engine/dictionary';
import { cedictRows, packedPath } from '@project/common/mandarin/engine/test-support';

const rows = [
    { traditional: '銀行', simplified: '银行', pinyin: 'yin2 hang2', english: ['bank', 'CL:家[jia1],個|个[ge4]'] },
    { traditional: '便宜', simplified: '便宜', pinyin: 'bian4 yi2', english: ['convenient'] },
    {
        traditional: '便宜',
        simplified: '便宜',
        pinyin: 'pian2 yi5',
        english: ['cheap', 'inexpensive', 'a', 'b', 'c', 'd'],
    },
    { traditional: '好', simplified: '好', pinyin: 'hao3', english: ['good'] },
];

describe('packed dictionary text', () => {
    it('answers lookups exactly like the parsed object form, keeping at most four glosses', () => {
        const packed = new MandarinDictionary(packedTextSource(packCedictText(rows)));
        const object = new MandarinDictionary(
            packCedict(rows.map((row) => ({ ...row, english: row.english.slice(0, maxGlossesPerEntry) })))
        );
        for (const word of ['银行', '便宜', '好', '坏']) {
            expect(packed.has(word)).toBe(object.has(word));
            expect(packed.lookup(word)).toEqual(object.lookup(word));
        }
        expect(packed.lookup('便宜')[1].glosses).toEqual(['cheap', 'inexpensive', 'a', 'b']);
        expect(packed.lookup('好')[0].traditional).toBe('好');
        expect(packed.maxWordLength).toBe(2);
    });

    // The build script packs with its own copy of the format; the built file must match.
    (existsSync(packedPath) ? it : it.skip)('matches what the build script ships', () => {
        expect(readFileSync(packedPath, 'utf8') === packCedictText(cedictRows())).toBe(true);
    });
});
