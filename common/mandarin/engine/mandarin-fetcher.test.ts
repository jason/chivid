/** @jest-environment node */
import { describe, expect, it } from '@jest/globals';
import { pinyinProContext } from '@project/common/mandarin/engine/context-pinyin';
import { MandarinEngine, MandarinFetcher, mandarinEngineUrl } from '@project/common/mandarin/engine/mandarin-fetcher';
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
});
