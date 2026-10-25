import type { AsbplayerSettings, TextSubtitleSettings } from '@project/common/settings/settings';
import { mandarinCjk } from '@project/common/theme/theme';

type StyleFields = Pick<
    TextSubtitleSettings,
    | 'subtitleThickness'
    | 'subtitleShadowThickness'
    | 'subtitleBackgroundColor'
    | 'subtitleBackgroundOpacity'
    | 'subtitleFontFamily'
    | 'subtitleCustomStyles'
>;

/** Upstream asbplayer's subtitle look for the fields the edition restyles. */
const upstreamStyle: StyleFields = {
    subtitleThickness: 700,
    subtitleShadowThickness: 3,
    subtitleBackgroundColor: '#000000',
    subtitleBackgroundOpacity: 0,
    subtitleFontFamily: '',
    subtitleCustomStyles: [],
};

/**
 * Mandarin Edition subtitle look: medium-weight hanzi on a soft dark pill, no glow, a CJK font
 * stack, slight tracking. Size and color stay the learner's.
 */
export const mandarinSubtitleStyle: StyleFields = {
    subtitleThickness: 500,
    subtitleShadowThickness: 0,
    subtitleBackgroundColor: '#000000',
    subtitleBackgroundOpacity: 0.55,
    subtitleFontFamily: '',
    subtitleCustomStyles: [
        // Single quotes: upstream writes custom styles into a double-quoted style attribute.
        { key: 'fontFamily', value: mandarinCjk.replace(/"/g, "'") },
        { key: 'letterSpacing', value: '0.02em' },
        { key: 'borderRadius', value: '8px' },
        { key: 'padding', value: '0.15em 0.45em' },
    ],
};

const matches = (settings: Partial<StyleFields>, style: StyleFields) =>
    (Object.keys(style) as (keyof StyleFields)[]).every(
        (key) => JSON.stringify(settings[key]) === JSON.stringify(style[key])
    );

/** The edition look, only if the learner's first-track subtitles still have upstream's look. */
export const subtitleStyleForEnabling = (settings: Partial<AsbplayerSettings>): Partial<AsbplayerSettings> =>
    matches(settings, upstreamStyle) ? mandarinSubtitleStyle : {};

/** Upstream's look back, only if the learner has not changed the edition's look since. */
export const subtitleStyleForDisabling = (settings: Partial<AsbplayerSettings>): Partial<AsbplayerSettings> =>
    matches(settings, mandarinSubtitleStyle) ? upstreamStyle : {};
