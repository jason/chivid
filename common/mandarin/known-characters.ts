import type { AsbplayerSettings } from '@project/common/settings/settings';
import type { DictionaryTrack } from '@project/common/settings/settings-dictionary';
import { hskCharacterLevels } from '@project/common/mandarin/hsk-characters';
import { isMandarinEngineUrl, mandarinEngineUrl } from '@project/common/mandarin/engine/engine-url';

const han = /\p{Script=Han}/u;

/** The distinct Han characters in any text (a pasted word list, a lesson, a known set), in first-seen order. */
export const parseKnownCharacters = (text: string): string => {
    const seen = new Set<string>();
    let result = '';
    for (const char of text) {
        if (!han.test(char) || seen.has(char)) continue;
        seen.add(char);
        result += char;
    }
    return result;
};

/** Number of HSK 3.0 levels available; the last one covers HSK 7-9. */
export const hskLevelCount = hskCharacterLevels.length;

/** Every character introduced at HSK levels 1 to `level`. */
export const hskCharactersThrough = (level: number): string =>
    hskCharacterLevels.slice(0, Math.max(0, Math.min(level, hskLevelCount))).join('');

/** The set a learner starts with when the Mandarin Edition is first enabled: HSK 1 and 2. */
export const defaultKnownCharacters = (): string => hskCharactersThrough(2);

export const mergeKnownCharacters = (existing: string, added: string): string => parseKnownCharacters(existing + added);

export const removeKnownCharacters = (existing: string, removed: string): string => {
    const drop = new Set(parseKnownCharacters(removed));
    return [...parseKnownCharacters(existing)].filter((char) => !drop.has(char)).join('');
};

/** Short, stable fingerprint of a known-character set (FNV-1a), for the engine address. */
export const knownCharactersVersion = (chars: string): string => {
    let hash = 0x811c9dc5;
    for (const char of [...chars].sort()) {
        hash ^= char.codePointAt(0)!;
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(36);
};

/**
 * The engine address for a known-character set. The fingerprint makes the address change with
 * the set, so asbplayer's existing "dictionary track changed" path re-annotates open subtitles.
 * The engine ignores it and reads the set itself.
 */
export const engineUrlForKnownCharacters = (chars: string): string =>
    `${mandarinEngineUrl}/known-${knownCharactersVersion(chars)}`;

const withEngineUrl = (tracks: readonly DictionaryTrack[], chars: string): DictionaryTrack[] =>
    tracks.map((track) =>
        isMandarinEngineUrl(track.dictionaryYomitanUrl)
            ? { ...track, dictionaryYomitanUrl: engineUrlForKnownCharacters(chars) }
            : track
    );

/** Settings to write when the known-character set changes: the set, and every engine track's address. */
export const settingsForKnownCharacters = (
    settings: Pick<AsbplayerSettings, 'dictionaryTracks'>,
    chars: string
): Pick<AsbplayerSettings, 'mandarinKnownCharacters' | 'dictionaryTracks'> => {
    const known = parseKnownCharacters(chars);
    return { mandarinKnownCharacters: known, dictionaryTracks: withEngineUrl(settings.dictionaryTracks, known) };
};
