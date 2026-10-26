# Mandarin Edition — design

The visual contract is `common/theme/theme.ts` (`mandarinTokens`), taken from the reference page. All of it applies only while the edition is on; stock asbplayer keeps its own look.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| bg / bg-2 / surface | #16130f / #1e1a16 / #26211c | #f6f2ec / #efe9e1 / #ffffff | Page, inset, cards and menus |
| fg / fg-2 / fg-3 | #ece2d6 / #a89c8e / #6f655a | #241e18 / #6e6256 / #a2968a | Text, secondary, disabled |
| line / line-strong | 12% / 24% of fg | 12% / 24% of fg | Hairlines instead of shadows |
| accent / accent-soft | #d2543a / 16% | #b8432b / 12% | "A mode is on", focus, selection |
| overlay | rgba(22,19,15,.72) + blur(14px) | rgba(246,242,236,.86) | On-video toolbar |

Type: Inter or the system sans for Latin text; Noto Sans SC, PingFang SC or Microsoft YaHei for hanzi. Shape: an 8px grid and a 10px radius (6px on tooltips, 8px on the subtitle pill, fully round on the toolbar).

Where it lands:

- **MUI theme** (`createTheme(themeType, mandarinEdition)`): settings, side panel, popup, statistics and the on-video controls. No elevation, hairline borders on menus and popovers, and tooltips use the surface color.
- **Subtitles** (`common/mandarin/subtitle-style.ts`): weight 500, no glow, black at 55% as a pill (radius 8px, padding .15em/.45em), the CJK font stack, and .02em tracking. These are written as settings, so the learner can change them. They are applied only over untouched upstream defaults and reverted only if still unchanged.
- **Ruby and meaning card** (`video.css` and `subtitles.css`, gated by `body.asbplayer-mandarin`): pinyin in the Latin sans at weight 400 and 80% opacity with a legibility shadow. Meanings are a card (surface, hairline, no shadow) above a hovered or selected word that has an unknown character, never ruby.
- **Notifications**: the toolbar's pill (overlay, blur, hairline), 15px at weight 500.
- **Subtitle list**: an accent bar (inset 3px) and accent-soft wash on the current line. At rest, unknown characters get an amber underline and no pinyin; on hover, pinyin and the meaning card, anchored to the word's start.
- **Frames on the video page** follow the page's edition class; extension pages read the setting (`useMandarinEdition`).
