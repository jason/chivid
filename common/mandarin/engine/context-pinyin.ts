import { pinyin } from 'pinyin-pro';
import type { ContextPinyin } from '@project/common/mandarin/engine/readings';

/**
 * Sentence-level readings from pinyin-pro, one per character, in CC-CEDICT's numbered form.
 * Used as context evidence, never as the only source for a character the dictionary knows.
 */
export const pinyinProContext: ContextPinyin = (text) => {
    const result = pinyin(text, { type: 'all', toneType: 'num', v: true, nonZh: 'consecutive' });
    const readings: (string | null)[] = [];
    for (const item of result) {
        const chars = [...item.origin];
        if (!item.isZh || chars.length !== 1) {
            for (let i = 0; i < chars.length; ++i) readings.push(null);
            continue;
        }
        const numbered = item.pinyin.replace(/v/g, 'u:').replace(/0$/, '5');
        readings.push(/[1-5]$/.test(numbered) ? numbered : `${numbered}5`);
    }
    return readings;
};
