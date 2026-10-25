# Mandarin Edition — release notes

## Slice B: the Chinese engine, known characters, design pass

- **Built-in Chinese engine** that answers asbplayer's own Yomitan client, so every upstream annotation feature works for Chinese with nothing else installed. It uses jieba (WebAssembly, dictionary mode) for segmentation, CC-CEDICT for readings and meanings, and pinyin-pro for sentence context. It runs in the extension's background worker.
- Readings in context: particle rules (了 的 着 地 得 过 还 长), the A-not-A 不, and 不/一 tone changes. A reading that cannot be confirmed is marked "?". Scores: 35/35 on the reference set and 18/20 on held-out lines, which were not tuned on.
- **Known characters.** Pinyin is left off characters the learner reads. The set is seeded with HSK 3.0 levels 1–2 (598 characters) on first enable and is editable in Settings → Misc (paste text, add through an HSK level). The engine address carries a fingerprint of the set, so open subtitles re-annotate when it changes.
- **Meanings on hover** for words with an unknown character, in the sense the sentence uses: the engine leads the dictionary answer with the reading it just resolved.
- **Design pass**, behind the edition switch:
  - The reference tokens in `common/theme/theme.ts`: warm neutrals, one accent, hairlines instead of shadows, a 10px radius.
  - These apply to the settings page, side panel, popup and on-video controls.
  - The on-video toolbar is a blurred pill.
  - Subtitles sit on a soft pill with a Chinese font stack, applied only over untouched upstream defaults and restored on disable.
  - Ruby is lighter, with a legibility shadow; the hover gloss uses the reference card styling.
- Tests: 1,953 common, 7 client and 330 extension unit tests, and 13 end-to-end journeys, including the engine and the look.

## Recipes merge, on top of upstream asbplayer `60850f1`

- Merged upstream's Recipes, adaptive playback (pause, repeat, fast-forward and word visibility driven by word status) and select-word-on-pause.
- Learning modes are now three seeded recipes. Removed our own mode layer, which overwrote settings and restored a snapshot; recipes layer over the learner's settings instead.
- New recipe setting **Hide text until revealed**, used by Ears and Listen First.
- On-video mode button: one icon per recipe, name and shortcut in the tooltip and accessible label, vertical menu. The controls frame grows in place while the menu is open.
- Fixed a bug the journeys caught: choosing a recipe from the menu was lost because closing the menu rebuilt the controls frame mid-save.
- Ledger events record the active recipe name (`recipe`) instead of `mode`.
- Removed accidentally committed `__pycache__` files.
- Tests: 1,905 common, 7 client, 330 extension unit tests; 11 end-to-end journeys.


## Slice A (listening loop), on top of upstream asbplayer `61764e8`

- Mandarin Edition switch (off by default; off is stock asbplayer).
- Learning modes Just Watch, Ears, Listen First, cycled with Shift+L or the on-video mode pill (since replaced by recipes, above).
- Hide until revealed: in Ears and Listen First, text stays hidden through pauses until R.
- G and H listening marks with the honesty rule: a line whose text was shown is never counted.
- Segment loop with [ and ], text hidden, clean pass, 2-minute cap.
- Local, append-only learning ledger in the extension's own IndexedDB; JSONL export; `tools/ledger_to_lesson.py`.
- Tests: 1,573 common, 7 client, 309 extension unit tests; 9 end-to-end journeys in real Chromium; 3 Python tests.

## Known limitations

- **Engine accuracy is measured, not perfect.** The reference set has not been checked by a human yet (`humanVerified: false`), so the 35/35 score is against Claude-written answers. On held-out lines, 2 of 20 still differ.
- **No word frequencies.** The engine does not supply frequency data, so frequency annotations stay empty.
- **Known characters are per profile.** Like any setting, they live in the active settings profile.
- **Meaning on hover is the first CC-CEDICT sense, cut to fit the word's width** (upstream's gloss renderer). Long senses wrap or are truncated.
- **Extension pages** (side panel, popup) reach the engine through a registered fetcher. A page that does not register one cannot annotate with the engine.
- **Verified on a local test page only.** The journeys run against a local `<video>`. YouTube, Netflix and other sites need a manual spot check; site key handlers could still interact with G, H, R, [ and ].
- **Upstream's adaptive word visibility and the honesty rule.** A line the renderer draws counts as shown even if adaptive visibility hid most of it, so G/H can be refused for it. Safe in the honest direction; refined when the Chinese engine lands.
- **Blurred subtitles count as shown.** With upstream's subtitle blur on, a blurred line is treated as displayed, so G/H are refused for it.
- **Loop timing follows `timeupdate`** (about 4 per second), so the jump back can land up to roughly 250 ms after the end of the segment.
- **Saved Moments is upstream's mining history.** There is no Mandarin-specific list view yet.
- **New strings are English in every locale except Simplified Chinese.**
- **The 5-minute review, progress panel, multi-step reveal ladder and recipe tuning are not built yet.** They are deliberately deferred until after a week of real use.
