/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pinyinProContext } from '@project/common/mandarin/engine/context-pinyin';
import { isHan } from '@project/common/mandarin/engine/pinyin';
import { resolveLine } from '@project/common/mandarin/engine/readings';
import { nodeSegmenter, testDictionary } from '@project/common/mandarin/engine/test-support';

interface GoldSentence {
    readonly text: string;
    readonly pinyin: string;
    readonly covers: readonly string[];
    readonly humanVerified: boolean;
}

const gold: GoldSentence[] = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/gold-sentences.json'), 'utf8')
).sentences;

const readingsOf = (text: string) =>
    resolveLine(text, nodeSegmenter, testDictionary(), pinyinProContext)
        .flatMap((token) => token.parts)
        .filter((part) => isHan(part.text))
        .map((part) => part.reading.toLowerCase())
        .join(' ');

describe('Mandarin readings against the reference sentences', () => {
    const results = gold.map((sentence) => ({ sentence, actual: readingsOf(sentence.text) }));
    const mismatches = results.filter(({ sentence, actual }) => actual !== sentence.pinyin);

    it('reports the score', () => {
        const report = mismatches.map(
            ({ sentence, actual }) => `  ${sentence.text}\n    expected ${sentence.pinyin}\n    actual   ${actual}`
        );
        process.stdout.write(
            `Mandarin engine: ${gold.length - mismatches.length}/${gold.length} reference sentences exact\n${report.join('\n')}`
        );
        expect(gold.length).toBeGreaterThanOrEqual(30);
    });

    const verified = results.filter(({ sentence }) => sentence.humanVerified);
    if (verified.length > 0) {
        it.each(verified)('reads verified line $sentence.text', ({ sentence, actual }) => {
            expect(actual).toBe(sentence.pinyin);
        });
    } else {
        it.todo('reads every human-verified line exactly (none verified yet)');
    }

    it('stays at or above the current accuracy on unverified lines', () => {
        expect(gold.length - mismatches.length).toBeGreaterThanOrEqual(MINIMUM_EXACT);
    });
});

// Raise this as rules improve; lowering it needs a reason in the commit message.
const MINIMUM_EXACT = 35;

describe('Mandarin readings on held-out lines (reported, not tuned on)', () => {
    const heldout: { text: string; pinyin: string }[] = JSON.parse(
        readFileSync(join(__dirname, '../fixtures/heldout-sentences.json'), 'utf8')
    ).sentences;

    it('reports the held-out score', () => {
        const misses = heldout
            .map((s) => ({ s, actual: readingsOf(s.text) }))
            .filter(({ s, actual }) => actual !== s.pinyin);
        process.stdout.write(
            `Held-out: ${heldout.length - misses.length}/${heldout.length} exact\n` +
                misses
                    .map(({ s, actual }) => `  ${s.text}\n    expected ${s.pinyin}\n    actual   ${actual}`)
                    .join('\n') +
                '\n'
        );
        expect(heldout.length).toBe(20);
    });
});
