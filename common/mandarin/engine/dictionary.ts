/** One CC-CEDICT sense group: traditional form, numbered pinyin, English glosses. */
export type CompactEntry = readonly [traditional: string, pinyin: string, glosses: readonly string[]];

/** The packed dictionary file: simplified headword → its entries, in CC-CEDICT order. */
export type CompactDictionary = Readonly<Record<string, readonly CompactEntry[]>>;

export interface DictionaryEntry {
    readonly simplified: string;
    readonly traditional: string;
    readonly pinyin: string;
    readonly glosses: readonly string[];
    /** Capitalised pinyin marks a proper noun (place or person name). */
    readonly properNoun: boolean;
}

/** Where the dictionary's entries come from: a parsed object (tests) or the packed text (extension). */
export interface DictionarySource {
    has(word: string): boolean;
    get(word: string): readonly CompactEntry[] | undefined;
    words(): Iterable<string>;
}

const objectSource = (data: CompactDictionary): DictionarySource => ({
    has: (word) => Object.prototype.hasOwnProperty.call(data, word),
    get: (word) => (Object.prototype.hasOwnProperty.call(data, word) ? data[word] : undefined),
    words: () => Object.keys(data),
});

/** Separates glosses within a packed line; never appears in CC-CEDICT text. */
const glossSeparator = '\u001f';

/**
 * The packed text format the extension ships (built by scripts/mandarin/build-assets.mjs): one
 * line per CC-CEDICT entry, `simplified TAB traditional TAB pinyin TAB glosses` with glosses
 * separated by U+001F and the traditional form left empty when it equals the simplified one.
 * Lines for a headword are adjacent, in CC-CEDICT order.
 *
 * Only an index of where each headword's lines start is built up front; entries are parsed
 * when a word is looked up. That keeps loading fast and memory low compared with parsing
 * 120,000 headwords into objects.
 */
export const packedTextSource = (text: string): DictionarySource => {
    const index = new Map<string, number>(); // headword → offset of its first line
    let lineStart = 0;
    let previous = '';
    while (lineStart < text.length) {
        const tab = text.indexOf('\t', lineStart);
        let lineEnd = text.indexOf('\n', lineStart);
        if (lineEnd < 0) lineEnd = text.length;
        if (tab > lineStart && tab < lineEnd) {
            const word = text.slice(lineStart, tab);
            if (word !== previous) {
                if (!index.has(word)) index.set(word, lineStart);
                previous = word;
            }
        }
        lineStart = lineEnd + 1;
    }
    const parse = (word: string, offset: number): CompactEntry[] => {
        const entries: CompactEntry[] = [];
        let start = offset;
        while (start < text.length) {
            let end = text.indexOf('\n', start);
            if (end < 0) end = text.length;
            const [simplified, traditional, pinyin, glosses] = text.slice(start, end).split('\t');
            if (simplified !== word) break;
            entries.push([traditional || simplified, pinyin, glosses ? glosses.split(glossSeparator) : []]);
            start = end + 1;
        }
        return entries;
    };
    return {
        has: (word) => index.has(word),
        get: (word) => {
            const offset = index.get(word);
            return offset === undefined ? undefined : parse(word, offset);
        },
        words: () => index.keys(),
    };
};

/** Glosses kept per entry: the meaning card shows at most four senses. */
export const maxGlossesPerEntry = 4;

/** Packs cedict-json rows into the text format above. */
export const packCedictText = (
    rows: readonly { traditional: string; simplified: string; pinyin: string; english: readonly string[] }[]
): string => {
    const groups = new Map<string, string[]>();
    for (const row of rows) {
        const traditional = row.traditional === row.simplified ? '' : row.traditional;
        const glosses = row.english.slice(0, maxGlossesPerEntry).join(glossSeparator);
        const line = `${row.simplified}\t${traditional}\t${row.pinyin}\t${glosses}`;
        const group = groups.get(row.simplified);
        if (group) group.push(line);
        else groups.set(row.simplified, [line]);
    }
    return [...groups.values()].map((lines) => lines.join('\n')).join('\n');
};

export class MandarinDictionary {
    private readonly source: DictionarySource;
    readonly maxWordLength: number;

    constructor(data: CompactDictionary | DictionarySource) {
        this.source =
            typeof (data as DictionarySource).get === 'function'
                ? (data as DictionarySource)
                : objectSource(data as CompactDictionary);
        let max = 1;
        for (const word of this.source.words()) if (word.length > max) max = word.length;
        this.maxWordLength = Math.min(max, 12);
    }

    has(word: string): boolean {
        return this.source.has(word);
    }

    lookup(word: string): DictionaryEntry[] {
        const entries = this.source.get(word);
        if (!entries) return [];
        return entries.map(([traditional, pinyin, glosses]) => ({
            simplified: word,
            traditional,
            pinyin,
            glosses,
            properNoun: /^[A-Z]/.test(pinyin),
        }));
    }

    /** Distinct readings, common-word readings before proper-noun ones, in dictionary order. */
    readings(word: string): string[] {
        const entries = this.lookup(word);
        const ordered = [...entries.filter((e) => !e.properNoun), ...entries.filter((e) => e.properNoun)];
        const seen = new Set<string>();
        const result: string[] = [];
        for (const entry of ordered) {
            const key = entry.pinyin.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            result.push(entry.pinyin);
        }
        return result;
    }
}

/** Converts the cedict-json package format into the packed format the extension ships. */
export const packCedict = (
    rows: readonly { traditional: string; simplified: string; pinyin: string; english: readonly string[] }[]
): CompactDictionary => {
    const packed: Record<string, CompactEntry[]> = {};
    for (const row of rows) {
        (packed[row.simplified] ??= []).push([row.traditional, row.pinyin, row.english]);
    }
    return packed;
};
