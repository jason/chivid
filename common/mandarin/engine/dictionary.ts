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

export class MandarinDictionary {
    private readonly data: CompactDictionary;
    readonly maxWordLength: number;

    constructor(data: CompactDictionary) {
        this.data = data;
        let max = 1;
        for (const word of Object.keys(data)) if (word.length > max) max = word.length;
        this.maxWordLength = Math.min(max, 12);
    }

    has(word: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.data, word);
    }

    lookup(word: string): DictionaryEntry[] {
        if (!this.has(word)) return [];
        return this.data[word].map(([traditional, pinyin, glosses]) => ({
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
