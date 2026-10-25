/** A syllable in CC-CEDICT's numbered form, e.g. "zhong1", "lu:4", "de5". */
export type NumberedSyllable = string;

const toneMarks: Record<string, readonly string[]> = {
    a: ['ā', 'á', 'ǎ', 'à'],
    e: ['ē', 'é', 'ě', 'è'],
    i: ['ī', 'í', 'ǐ', 'ì'],
    o: ['ō', 'ó', 'ǒ', 'ò'],
    u: ['ū', 'ú', 'ǔ', 'ù'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const vowels = 'aeiouü';

export const toneOf = (syllable: NumberedSyllable): number | undefined => {
    const match = /([1-5])$/.exec(syllable);
    return match ? Number(match[1]) : undefined;
};

export const withTone = (syllable: NumberedSyllable, tone: number): NumberedSyllable =>
    syllable.replace(/[1-5]$/, String(tone));

/** Converts one numbered syllable to tone marks: "zhong1" → "zhōng", "lu:4" → "lǜ", "de5" → "de". */
export const markSyllable = (syllable: NumberedSyllable): string => {
    const tone = toneOf(syllable);
    const base = syllable
        .replace(/[1-5]$/, '')
        .replace(/u:|v/g, 'ü')
        .replace(/U:|V/g, 'Ü');
    if (tone === undefined || tone === 5) return base;
    const lower = base.toLowerCase();
    // Standard placement: a or e take the mark; in "ou" the o does; otherwise the last vowel.
    let index = lower.indexOf('a');
    if (index < 0) index = lower.indexOf('e');
    if (index < 0 && lower.includes('ou')) index = lower.indexOf('o');
    if (index < 0) {
        for (let i = lower.length - 1; i >= 0; --i) {
            if (vowels.includes(lower[i])) {
                index = i;
                break;
            }
        }
    }
    if (index < 0) return base;
    const vowel = lower[index];
    const marked = toneMarks[vowel][tone - 1];
    const cased = base[index] === base[index].toUpperCase() && base[index] !== vowel ? marked.toUpperCase() : marked;
    return base.slice(0, index) + cased + base.slice(index + 1);
};

/** "yin2 hang2" → ["yin2", "hang2"]. CC-CEDICT readings are space separated. */
export const splitNumbered = (reading: string): NumberedSyllable[] => reading.trim().split(/\s+/).filter(Boolean);

export const markReading = (reading: string): string => splitNumbered(reading).map(markSyllable).join(' ');

/** Normalises a numbered syllable for comparison: lowercase, ü as v, neutral tone as 5. */
export const comparable = (syllable: NumberedSyllable): string => {
    const lower = syllable.toLowerCase().replace(/u:|ü/g, 'v');
    return /[1-5]$/.test(lower) ? lower : `${lower}5`;
};

export interface SandhiSyllable {
    readonly char: string;
    numbered: NumberedSyllable | null;
}

const ordinalBefore = new Set([
    '第',
    '初',
    '十',
    '〇',
    '零',
    '二',
    '三',
    '四',
    '五',
    '六',
    '七',
    '八',
    '九',
    '百',
    '千',
    '万',
]);
// 一 keeps its first tone when counting digits (一二三, 一九八四); before 百, 千, 万 it changes like any word.
const digitAfter = new Set(['〇', '零', '一', '二', '三', '四', '五', '六', '七', '八', '九']);

/**
 * Applies the 不 and 一 tone changes to a line's syllables, in place, and returns which
 * positions changed. Third-tone sandhi is not shown, following dictionary convention.
 */
export const applyBuYiSandhi = (syllables: SandhiSyllable[]): number[] => {
    const changed: number[] = [];
    for (let i = 0; i < syllables.length; ++i) {
        const current = syllables[i];
        if (!current.numbered) continue;
        const next = syllables.slice(i + 1).find((s) => s.numbered !== null);
        const nextIndex = next ? syllables.indexOf(next) : -1;
        const adjacent = nextIndex === i + 1;
        const nextTone = next?.numbered ? toneOf(next.numbered) : undefined;

        if (current.char === '不' && toneOf(current.numbered) === 4 && adjacent && nextTone === 4) {
            current.numbered = withTone(current.numbered, 2);
            changed.push(i);
        } else if (current.char === '一' && toneOf(current.numbered) === 1 && adjacent && next) {
            const previous = i > 0 ? syllables[i - 1].char : '';
            if (ordinalBefore.has(previous) || digitAfter.has(next.char)) continue;
            if (nextTone === 4 || nextTone === 5) {
                current.numbered = withTone(current.numbered, 2);
                changed.push(i);
            } else if (nextTone === 1 || nextTone === 2 || nextTone === 3) {
                current.numbered = withTone(current.numbered, 4);
                changed.push(i);
            }
        }
    }
    return changed;
};

export const isHan = (char: string): boolean => /\p{Script=Han}/u.test(char);
