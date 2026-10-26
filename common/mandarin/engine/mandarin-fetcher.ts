import type { Fetcher } from '@project/common';
import type { MandarinDictionary } from '@project/common/mandarin/engine/dictionary';
import { markReading } from '@project/common/mandarin/engine/pinyin';
import { preferredReading, resolveLine } from '@project/common/mandarin/engine/readings';
import type { ContextPinyin, Segmenter } from '@project/common/mandarin/engine/readings';
import type {
    TermDictionaryEntry,
    TermEntriesResult,
    TermHeadword,
    TokenizeResult,
    TokenPartResult,
} from '@project/common/yomitan';

export { isMandarinEngineUrl, mandarinEngineUrl } from '@project/common/mandarin/engine/engine-url';

const dictionaryName = 'CC-CEDICT';

/** Reports the newest yomitan-api feature level, so the client uses bulk requests. */
const engineVersion = '26.7.21.0';

export interface MandarinEngineParts {
    readonly dictionary: MandarinDictionary;
    readonly segmenter: Segmenter;
    readonly contextPinyin: ContextPinyin;
    readonly overrides?: ReadonlyMap<string, string>;
    /** Characters the learner reads without help: their pinyin is left out of the ruby. */
    readonly knownCharacters?: string;
}

/** Up to four senses, joined with "; ", trimmed to a card-sized length. */
export const conciseSenses = (glosses: readonly string[]): string => {
    let result = '';
    for (const gloss of glosses.slice(0, 4)) {
        const next = result ? `${result}; ${gloss}` : gloss;
        if (result && next.length > 90) break;
        result = next;
    }
    return result;
};

const exactSource = (term: string) => ({
    originalText: term,
    transformedText: term,
    deinflectedText: term,
    matchType: 'exact' as const,
    matchSource: 'term' as const,
    isPrimary: true,
});

const headword = (term: string, reading: string): TermHeadword => ({
    index: 0,
    headwordIndex: 0,
    term,
    reading,
    sources: [exactSource(term)],
    frequencies: [],
});

/**
 * The Mandarin Edition engine, speaking the three yomitan-api actions asbplayer's Yomitan
 * client uses (tokenize, termEntries, yomitanVersion), so every annotation feature upstream
 * builds on Yomitan works for Chinese without a Yomitan install.
 */
export class MandarinEngine {
    private readonly parts: MandarinEngineParts;
    private knownCharacters: string;
    private known: ReadonlySet<string>;
    /**
     * The reading each word last resolved to in a sentence. Upstream asks termEntries for a
     * word without its sentence, right after tokenizing the line, and glosses from the first
     * entry; leading with this reading makes 便宜 in "this is cheap" gloss as "cheap".
     */
    private readonly resolvedReadings = new Map<string, string>();

    constructor(parts: MandarinEngineParts) {
        this.parts = parts;
        this.knownCharacters = parts.knownCharacters ?? '';
        this.known = new Set(this.knownCharacters);
    }

    setKnownCharacters(chars: string) {
        if (chars === this.knownCharacters) return;
        this.knownCharacters = chars;
        this.known = new Set(chars);
    }

    tokenize(text: string, index: number): TokenizeResult {
        const { dictionary, segmenter, contextPinyin, overrides } = this.parts;
        const tokens = resolveLine(text, segmenter, dictionary, contextPinyin, overrides);
        const content: TokenPartResult[][] = tokens.map((token) => {
            if (!token.isWord) return [{ text: token.text, reading: '' }];
            const reading = token.parts.map((part) => part.reading).join('');
            const numbered = token.parts.map((part) => part.numbered);
            if (!token.uncertain && numbered.every((n) => n !== null)) {
                if (this.resolvedReadings.size > 5000) this.resolvedReadings.clear();
                this.resolvedReadings.set(token.text, numbered.join(' '));
            }
            return token.parts.map((part, i) => {
                // Known characters carry no ruby: pinyin appears only where the learner needs it.
                // The headword keeps the whole word's reading for the dictionary popup.
                const shown = this.known.has(part.text) ? '' : part.reading;
                return {
                    text: part.text,
                    // A reading the engine could not confirm is shown with a question mark, never as fact.
                    reading: token.uncertain && shown && i === token.parts.length - 1 ? `${shown}?` : shown,
                    ...(i === 0 ? { headwords: [[headword(token.text, reading)]] } : {}),
                };
            });
        });
        return { id: 'mandarin', source: 'scanning-parser', dictionary: dictionaryName, index, content };
    }

    termEntries(term: string, index: number): TermEntriesResult {
        const { dictionary } = this.parts;
        const readings = dictionary.readings(term);
        // Sandhi changes the shown tone (不是 → bú shì) but not the dictionary entry, so match on
        // the sentence reading only when the dictionary has it.
        const resolved = this.resolvedReadings.get(term);
        const inSentence = readings.find((r) => r.toLowerCase() === resolved?.toLowerCase());
        const preferred = inSentence ?? preferredReading(term);
        const ordered = preferred
            ? [preferred, ...readings.filter((r) => r.toLowerCase() !== preferred.toLowerCase())]
            : readings;
        const entries = dictionary.lookup(term);
        const dictionaryEntries: TermDictionaryEntry[] = ordered.map((reading, readingIndex) => {
            const glosses = entries
                .filter((e) => e.pinyin.toLowerCase() === reading.toLowerCase())
                .flatMap((e) => e.glosses);
            // Upstream glosses from the first entry and shows its first sense on the word; leading
            // with the senses joined keeps that short while the full entry is there for the card.
            const joined = conciseSenses(glosses);
            return {
                headwords: [headword(term, markReading(reading))],
                frequencies: [],
                pronunciations: [],
                definitions: [
                    {
                        index: readingIndex,
                        headwordIndices: [0],
                        dictionary: dictionaryName,
                        dictionaryIndex: 0,
                        dictionaryAlias: dictionaryName,
                        id: readingIndex,
                        score: 0,
                        frequencyOrder: 0,
                        sequences: [],
                        isPrimary: true,
                        tags: [],
                        entries: joined ? [joined, ...glosses] : glosses,
                    },
                ],
            };
        });
        return { dictionaryEntries, originalTextLength: [...term].length, index };
    }

    handle(action: string, body: { text?: string | string[]; term?: string | string[] } | null): unknown {
        switch (action) {
            case 'yomitanVersion':
                return { version: engineVersion };
            case 'tokenize': {
                const text = body?.text;
                if (Array.isArray(text)) return text.map((t, i) => this.tokenize(t, i));
                return [this.tokenize(text ?? '', 0)];
            }
            case 'termEntries': {
                const term = body?.term;
                if (Array.isArray(term)) return term.map((t, i) => this.termEntries(t, i));
                return this.termEntries(term ?? '', 0);
            }
            default:
                // asbplayer only uses the three actions above; anything else is a programming error.
                return { error: `Unsupported action ${action}` };
        }
    }
}

/** A Fetcher for upstream's Yomitan client that answers from a MandarinEngine instead of HTTP. */
export class MandarinFetcher implements Fetcher {
    private readonly engine: () => Promise<MandarinEngine>;

    constructor(engine: () => Promise<MandarinEngine>) {
        this.engine = engine;
    }

    async fetch(url: string, body: any) {
        const action = url.split('/').pop() ?? '';
        return (await this.engine()).handle(action, body);
    }
}
