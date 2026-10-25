import type { MandarinDictionary } from '@project/common/mandarin/engine/dictionary';
import {
    applyBuYiSandhi,
    comparable,
    isHan,
    markSyllable,
    splitNumbered,
} from '@project/common/mandarin/engine/pinyin';
import type { SandhiSyllable } from '@project/common/mandarin/engine/pinyin';

export interface Segmenter {
    /** Dictionary-mode word segmentation (no statistical guessing). */
    cut(text: string): string[];
    /** Part-of-speech tags for the same segmentation, one per token (jieba's tag set). */
    tag(text: string): { word: string; tag: string }[];
}

/** Numbered pinyin for every character of a line, read in context; null where there is none. */
export type ContextPinyin = (text: string) => (string | null)[];

export interface ReadingPart {
    readonly text: string;
    /** Tone-marked pinyin shown above the character; empty for punctuation and Latin text. */
    readonly reading: string;
    readonly numbered: string | null;
}

export interface ResolvedToken {
    readonly text: string;
    readonly parts: readonly ReadingPart[];
    readonly isWord: boolean;
    /** True when the reading could not be confirmed from the dictionary and the sentence. */
    readonly uncertain: boolean;
    readonly reason?: 'dictionary' | 'single-reading' | 'context' | 'rule' | 'context-only' | 'ambiguous';
}

const hasHan = (text: string) => [...text].some(isHan);

/** Re-splits a token the dictionary does not know into the longest dictionary words, left to right. */
export const maxMatch = (token: string, dictionary: MandarinDictionary): string[] => {
    const chars = [...token];
    const words: string[] = [];
    let i = 0;
    while (i < chars.length) {
        let length = Math.min(dictionary.maxWordLength, chars.length - i);
        while (length > 1 && !dictionary.has(chars.slice(i, i + length).join(''))) --length;
        words.push(chars.slice(i, i + length).join(''));
        i += length;
    }
    return words;
};

interface Draft {
    text: string;
    tag?: string;
    numbered: (string | null)[];
    uncertain: boolean;
    reason?: ResolvedToken['reason'];
}

/**
 * Everyday readings for words CC-CEDICT lists with two readings of different meaning,
 * where the conversational sense is far more common in subtitles.
 */
const preferredReadings: Readonly<Record<string, string>> = {
    东西: 'dong1 xi5',
    地方: 'di4 fang5',
};

export const preferredReading = (word: string): string | undefined => preferredReadings[word];

const verbLike = (tag?: string) => tag !== undefined && /^(v|a|z)/.test(tag);
const verbOnly = (tag?: string) => tag !== undefined && /^v/.test(tag);
const subjectLike = (tag?: string) => tag !== undefined && /^(r|n)/.test(tag);

/**
 * Context rules for the particles whose reading depends on the sentence, not the word.
 * Returns undefined when no rule applies, so the caller keeps its own choice.
 */
const particleRule = (drafts: Draft[], index: number): string | undefined => {
    const current = drafts[index];
    const previous = drafts[index - 1];
    const next = drafts[index + 1];
    switch (current.text) {
        case '了':
            return 'le5';
        case '的':
            return 'de5';
        case '着':
            return verbLike(previous?.tag) ? 'zhe5' : undefined;
        case '地':
            if (next && verbOnly(next.tag) && previous && hasHan(previous.text)) return 'de5';
            return 'di4';
        case '还':
            // 还书, 还钱, 还给: the verb huán (give back); otherwise the adverb hái.
            if (next && (/^n/.test(next.tag ?? '') || ['给', '钱', '清', '回'].includes(next.text))) return 'huan2';
            return 'hai2';
        case '长':
            // 长得 (grow to look), 长了 / 长出: the verb zhǎng; otherwise leave the dictionary or context choice.
            return next && (next.text === '得' || next.text === '出' || next.text === '了') ? 'zhang3' : undefined;
        case '得':
            if (next?.text === '了' || next?.text === '到') return 'de2';
            if (next && verbOnly(next.tag) && !verbLike(previous?.tag)) return 'dei3';
            if (previous && verbLike(previous.tag)) return 'de5';
            // After a subject (你得, 我们得): "must", děi.
            if (previous && subjectLike(previous.tag)) return 'dei3';
            if (next && verbOnly(next.tag)) return 'dei3';
            return undefined;
        case '过':
            // Experiential 过 after a verb (来过, 去过): neutral guo. jieba tags it ug.
            return current.tag === 'ug' || (previous && verbOnly(previous.tag)) ? 'guo5' : undefined;
        default:
            return undefined;
    }
};

/**
 * Splits a subtitle line into words and gives every character a reading, preferring in order:
 * a learner's override, the only dictionary reading, the dictionary reading that the sentence
 * context agrees with, a particle rule, and finally the sentence context alone. A reading that
 * cannot be confirmed is flagged uncertain rather than shown as fact.
 */
export const resolveLine = (
    text: string,
    segmenter: Segmenter,
    dictionary: MandarinDictionary,
    contextPinyin: ContextPinyin,
    overrides: ReadonlyMap<string, string> = new Map()
): ResolvedToken[] => {
    const tagged = segmenter.tag(text);
    const cut = tagged.length ? tagged.map((t) => t.word) : segmenter.cut(text);
    const tagByIndex = tagged.map((t) => t.tag);

    const tokens: { text: string; tag?: string }[] = [];
    cut.forEach((token, i) => {
        if (hasHan(token) && token.length > 1 && !dictionary.has(token)) {
            // Pieces keep the whole token's tag, so 说得对 (v) still reads as verb + 得 + complement.
            for (const word of maxMatch(token, dictionary)) tokens.push({ text: word, tag: tagByIndex[i] });
        } else {
            tokens.push({ text: token, tag: tagByIndex[i] });
        }
    });

    const context = contextPinyin(text);
    let offset = 0;
    const drafts: Draft[] = tokens.map((token) => {
        const chars = [...token.text];
        const contextual = chars.map((_, k) => context[offset + k] ?? null);
        offset += chars.length;
        if (!hasHan(token.text)) {
            return { text: token.text, tag: token.tag, numbered: chars.map(() => null), uncertain: false };
        }
        const override = overrides.get(token.text);
        if (override) {
            return { text: token.text, tag: token.tag, numbered: splitNumbered(override), uncertain: false };
        }
        const preferred = preferredReadings[token.text];
        if (preferred) {
            return {
                text: token.text,
                tag: token.tag,
                numbered: splitNumbered(preferred),
                uncertain: false,
                reason: 'rule',
            };
        }
        const readings = dictionary.readings(token.text).filter((r) => splitNumbered(r).length === chars.length);
        if (readings.length === 1) {
            return {
                text: token.text,
                tag: token.tag,
                numbered: splitNumbered(readings[0]),
                uncertain: false,
                reason: 'single-reading',
            };
        }
        if (readings.length > 1) {
            const contextKey = contextual.map((c) => (c ? comparable(c) : '')).join(' ');
            const agreed = readings.find((r) => splitNumbered(r).map(comparable).join(' ') === contextKey);
            if (agreed) {
                return {
                    text: token.text,
                    tag: token.tag,
                    numbered: splitNumbered(agreed),
                    uncertain: false,
                    reason: 'context',
                };
            }
            return {
                text: token.text,
                tag: token.tag,
                numbered: splitNumbered(readings[0]),
                uncertain: true,
                reason: 'ambiguous',
            };
        }
        // Not in the dictionary as a whole (rare after max-match): trust the sentence context per character.
        return {
            text: token.text,
            tag: token.tag,
            numbered: contextual,
            uncertain: contextual.some((c) => c === null),
            reason: 'context-only',
        };
    });

    drafts.forEach((draft, index) => {
        if (overrides.has(draft.text)) return;
        const rule = particleRule(drafts, index);
        if (rule) {
            draft.numbered = [rule];
            draft.uncertain = false;
            draft.reason = 'rule';
        }
    });

    // Tone changes for 不 and 一 depend on the next syllable, which may be in the next word.
    const syllables: SandhiSyllable[] = [];
    for (const draft of drafts) {
        [...draft.text].forEach((char, k) => syllables.push({ char, numbered: draft.numbered[k] ?? null }));
    }
    // A-not-A questions (会不会, 是不是, 一样不一样): the 不 between the repeats is unstressed.
    const chars = syllables.map((s) => s.char);
    syllables.forEach((syllable, i) => {
        if (syllable.char !== '不' || !syllable.numbered) return;
        for (let length = 1; length <= 3; ++length) {
            const before = chars.slice(i - length, i).join('');
            const after = chars.slice(i + 1, i + 1 + length).join('');
            if (before.length === length && before === after) {
                syllable.numbered = 'bu5';
                return;
            }
        }
    });
    applyBuYiSandhi(syllables);
    let position = 0;
    for (const draft of drafts) {
        draft.numbered = [...draft.text].map(() => syllables[position++].numbered);
    }

    return drafts.map((draft) => ({
        text: draft.text,
        isWord: hasHan(draft.text),
        uncertain: draft.uncertain,
        reason: draft.reason,
        parts: [...draft.text].map((char, k) => {
            const numbered = isHan(char) ? (draft.numbered[k] ?? null) : null;
            return { text: char, numbered, reading: numbered ? markSyllable(numbered) : '' };
        }),
    }));
};
