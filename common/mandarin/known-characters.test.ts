import { defaultDictionaryTracks } from '@project/common/settings/settings-dictionary';
import { isMandarinEngineUrl, mandarinEngineUrl } from '@project/common/mandarin/engine/engine-url';
import { hskCharacterLevels } from '@project/common/mandarin/hsk-characters';
import {
    defaultKnownCharacters,
    engineUrlForKnownCharacters,
    hskCharactersThrough,
    knownCharactersVersion,
    mergeKnownCharacters,
    parseKnownCharacters,
    removeKnownCharacters,
    settingsForKnownCharacters,
} from '@project/common/mandarin/known-characters';

describe('known characters', () => {
    it('keeps only distinct Han characters from pasted text', () => {
        expect(parseKnownCharacters('我们 wǒmen\n你好, 我! 123 abc')).toBe('我们你好');
    });

    it('builds HSK sets from levels whose characters do not repeat', () => {
        const all = hskCharacterLevels.join('');
        expect(new Set(all).size).toBe([...all].length);
        expect([...hskCharactersThrough(1)].length).toBe(300);
        expect(defaultKnownCharacters()).toBe(hskCharacterLevels[0] + hskCharacterLevels[1]);
        expect(defaultKnownCharacters()).toContain('我');
        expect(hskCharactersThrough(0)).toBe('');
        expect(hskCharactersThrough(99)).toBe(all);
    });

    it('merges and removes without duplicates', () => {
        expect(mergeKnownCharacters('我你', '你他')).toBe('我你他');
        expect(removeKnownCharacters('我你他', '你')).toBe('我他');
    });

    it('fingerprints a set regardless of order', () => {
        expect(knownCharactersVersion('我你')).toBe(knownCharactersVersion('你我'));
        expect(knownCharactersVersion('我你')).not.toBe(knownCharactersVersion('我他'));
        expect(isMandarinEngineUrl(engineUrlForKnownCharacters('我'))).toBe(true);
    });

    it('moves only engine tracks to the new address', () => {
        const engineTrack = { ...defaultDictionaryTracks[1], dictionaryYomitanUrl: mandarinEngineUrl };
        const result = settingsForKnownCharacters(
            { dictionaryTracks: [defaultDictionaryTracks[0], engineTrack] },
            'x我我你'
        );
        expect(result.mandarinKnownCharacters).toBe('我你');
        expect(result.dictionaryTracks[0]).toBe(defaultDictionaryTracks[0]);
        expect(result.dictionaryTracks[1].dictionaryYomitanUrl).toBe(engineUrlForKnownCharacters('我你'));
    });
});
