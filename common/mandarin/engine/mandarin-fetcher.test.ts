/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import { pinyinProContext } from '@project/common/mandarin/engine/context-pinyin';
import {
    conciseSenses,
    MandarinEngine,
    MandarinFetcher,
    mandarinEngineUrl,
} from '@project/common/mandarin/engine/mandarin-fetcher';
import { nodeSegmenter, testDictionary } from '@project/common/mandarin/engine/test-support';
import { defaultDictionaryTracks } from '@project/common/settings';
import { Yomitan } from '@project/common/yomitan';

const engine = new MandarinEngine({
    dictionary: testDictionary(),
    segmenter: nodeSegmenter,
    contextPinyin: pinyinProContext,
});
const track = { ...defaultDictionaryTracks[0], dictionaryYomitanUrl: mandarinEngineUrl };
const yomitan = () => new Yomitan(track, new MandarinFetcher(async () => engine));

// These tests drive upstream's own Yomitan client against the engine: the client is the contract.
describe('MandarinFetcher through upstream Yomitan client', () => {
    it('reports a version the client accepts', async () => {
        await expect(yomitan().version()).resolves.toBe('26.7.21.0');
    });

    it('splits a line into words with one pinyin part per character', async () => {
        const client = yomitan();
        await client.version();
        const tokens = await client.tokenize('我觉得这个便宜的银行不太好。');
        expect(tokens.map((parts) => parts.map((p) => p.text).join(''))).toEqual([
            '我',
            '觉得',
            '这个',
            '便宜',
            '的',
            '银行',
            '不太好',
            '。',
        ]);
        expect(tokens[5]).toEqual([
            { text: '银', reading: 'yín' },
            { text: '行', reading: 'háng' },
        ]);
        expect(tokens[7]).toEqual([{ text: '。', reading: '' }]);
        client.verifyTokenizeResult('我觉得这个便宜的银行不太好。', tokens);
    });

    it('leaves known characters without pinyin, keeping the word reading for the popup', () => {
        const knowing = new MandarinEngine({
            dictionary: testDictionary(),
            segmenter: nodeSegmenter,
            contextPinyin: pinyinProContext,
            knownCharacters: '银',
        });
        const content = knowing.tokenize('银行', 0).content;
        expect(content[0].map(({ text, reading }) => ({ text, reading }))).toEqual([
            { text: '银', reading: '' },
            { text: '行', reading: 'háng' },
        ]);
        expect(content[0][0].headwords?.[0][0].reading).toBe('yínháng');
        knowing.setKnownCharacters('银行');
        expect(knowing.tokenize('银行', 0).content[0].map((p) => p.reading)).toEqual(['', '']);
    });

    it('glosses a word in the sense its sentence just resolved', () => {
        const fresh = new MandarinEngine({
            dictionary: testDictionary(),
            segmenter: nodeSegmenter,
            contextPinyin: pinyinProContext,
        });
        fresh.tokenize('这个很便宜。', 0);
        const [first] = fresh.termEntries('便宜', 0).dictionaryEntries;
        expect(first.headwords[0].reading).toBe('pián yi');
        expect(first.definitions[0].entries[0]).toMatch(/cheap/);
    });

    it('tokenizes several lines in one request and caches each line', async () => {
        const client = yomitan();
        await client.version();
        const flat = await client.tokenizeBulk(['他跑得很快。', '你得去。']);
        expect(flat.flatMap((parts) => parts.map((p) => p.reading)).filter(Boolean)).toEqual([
            'tā',
            'pǎo',
            'de',
            'hěn',
            'kuài',
            'nǐ',
            'děi',
            'qù',
        ]);
        const second = await client.tokenize('你得去。');
        expect(second.map((parts) => parts.map((p) => p.reading).join(' '))).toEqual(['nǐ', 'děi', 'qù', '']);
    });

    it('gives the word as its own lemma and a first English gloss', async () => {
        const client = yomitan();
        await client.version();
        await expect(client.lemmatize('银行')).resolves.toEqual(['银行', 'yín háng']);
        await expect(client.gloss('银行')).resolves.toMatch(/bank/i);
    });

    it('puts the everyday reading of 东西 first, so the gloss is "thing"', async () => {
        const client = yomitan();
        await client.version();
        await expect(client.gloss('东西')).resolves.toMatch(/thing/i);
    });

    it('returns no entries for text that is not Chinese', async () => {
        const client = yomitan();
        await client.version();
        await expect(client.gloss('hello')).resolves.toBeNull();
    });

    it('joins up to four senses for the meaning card, keeping it card-sized', () => {
        expect(conciseSenses(['cheap', 'inexpensive'])).toBe('cheap; inexpensive');
        expect(conciseSenses(['a', 'b', 'c', 'd', 'e'])).toBe('a; b; c; d');
        const long = 'x'.repeat(80);
        expect(conciseSenses(['first sense', long])).toBe('first sense');
        expect(conciseSenses([long + long])).toBe(long + long);
        expect(conciseSenses([])).toBe('');
    });
});
