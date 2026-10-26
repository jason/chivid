const han = /\p{Script=Han}/u;

export interface ComprehensionLine {
    readonly text: string;
    readonly start: number;
    readonly end: number;
}

export interface Comprehension {
    /** Share of Han character occurrences in the episode the learner knows, 0 to 1. */
    readonly knownShare: number;
    readonly hanCount: number;
    /** Distinct characters not yet known, most frequent first. */
    readonly newCharacters: string;
    /** The run of lines with the lowest share known, if the episode is long enough to have one. */
    readonly hardest?: { readonly start: number; readonly end: number; readonly knownShare: number };
}

/** Lines per stretch when looking for the hardest part: roughly a short exchange or a scene beat. */
const stretchLines = 8;
/** Below this many characters a stretch is too short to call hard. */
const minStretchHan = 30;

const hanChars = (text: string) => [...text].filter((char) => han.test(char));

/**
 * How much of an episode a learner can read: the share of character occurrences they know
 * (what they will actually meet, so repeats count), the new characters by frequency, and the
 * hardest stretch. Comprehensible input research puts the comfortable zone around 95% known.
 */
export const comprehension = (
    lines: readonly ComprehensionLine[],
    knownCharacters: string
): Comprehension | undefined => {
    const known = new Set(knownCharacters);
    const perLine = lines.map((line) => {
        const chars = hanChars(line.text);
        return { line, total: chars.length, known: chars.filter((c) => known.has(c)).length, chars };
    });
    const hanCount = perLine.reduce((sum, l) => sum + l.total, 0);
    if (hanCount === 0) return undefined;
    const knownCount = perLine.reduce((sum, l) => sum + l.known, 0);

    const frequency = new Map<string, number>();
    for (const { chars } of perLine)
        for (const char of chars) if (!known.has(char)) frequency.set(char, (frequency.get(char) ?? 0) + 1);
    const newCharacters = [...frequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([char]) => char)
        .join('');

    let hardest: Comprehension['hardest'];
    if (perLine.length >= stretchLines * 2) {
        for (let i = 0; i + stretchLines <= perLine.length; ++i) {
            const window = perLine.slice(i, i + stretchLines);
            const total = window.reduce((sum, l) => sum + l.total, 0);
            if (total < minStretchHan) continue;
            const share = window.reduce((sum, l) => sum + l.known, 0) / total;
            if (hardest === undefined || share < hardest.knownShare) {
                hardest = { start: window[0].line.start, end: window[window.length - 1].line.end, knownShare: share };
            }
        }
    }
    return { knownShare: knownCount / hanCount, hanCount, newCharacters, hardest };
};

/** "93%": floor, so 94.9% never reads as the 95% comfort mark. */
export const formatShare = (share: number) => `${Math.floor(share * 100)}%`;

export const formatClock = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, '0');
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
};
