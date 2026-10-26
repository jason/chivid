# Mandarin Edition — release notes

## Shadow mode and the tutor feed

- **Shadow recipe** for speaking practice: the text shows, and after each line the video waits 1.3× the line's spoken length while you say it. Built on a new auto-pause resume mode, *Subtitle duration*, that pauses in proportion to how long the line was spoken rather than how many characters it has (upstream's *Subtitle length*). The factor is in Settings → Playback.
- **Hear yourself.** During the pause the microphone records you. **P** plays the speaker's line and then your take. Without a microphone Shadow still pauses, with a one-time notice.
- **Lookups in the ledger.** Resting on a word's meaning card for 600 ms records a `lookup` event (word, reading, meaning, sentence, time, recipe), once per word per line. A sweep across the line records nothing.
- **Tutor block** (`tools/ledger_to_lesson.py`) now opens with "Words I looked up", most looked-up first with the sentence each appeared in, before the missed lines.
- Upstream's resume-mode cycle shortcut is unchanged (the new mode is reached through the recipe or Settings), so this stays merge-friendly.
- Tests: 1,977 unit, 17 end-to-end journeys (Shadow timing and recording with a fake microphone; a lookup through to the tutor script).

## Performance, percent known, cleanup

- **The engine stays loaded.**
  - **Before:** the engine ran in the background worker, which Chrome stops after about 30 seconds idle, so every pause meant reloading the dictionary and segmenter.
  - **Now (Chrome):** it lives in the extension's offscreen document, which stays open; the worker only forwards requests. After a worker restart, re-annotation takes about 100 ms (journey 10).
  - **Firefox,** which has no offscreen documents, keeps the engine in the background as before.
- **Smaller, lazier dictionary.** CC-CEDICT ships as packed text (8.8 MB, was 11.0 MB of JSON) with at most four glosses per entry, the most the meaning card shows. Only a headword index is built on load, and entries are parsed when looked up. Loading takes about 60 ms instead of about 175 ms, and memory is about 28 MB instead of about 80 MB.
- **Smaller install.** The zip leaves out source maps (17.4 MB, was 21.0 MB); dev builds keep them.
- **Percent known.** When subtitles load, a notice shows what share of the episode's characters you know, how many new characters it has, and its hardest stretch, for example "93% of characters known · 41 new · hardest 12:40–14:10 (78%)". Repeats count, because that's what you actually read; about 95% known is the comfortable zone for learning from input.
- **Engine label.** Settings → Annotation shows "Built-in Chinese engine" instead of `local://mandarin/known-…`, with a **Use Yomitan** button to switch the track to your own Yomitan.
- **One branch.** `main` now holds the Mandarin Edition. The old feature branches (`mandarin-edition`, `mandarin-recipes`, `mandarin-engine`) are fully merged and can be deleted.
- Tests: 15 end-to-end journeys.

## Design polish: rough spots

- **Meaning card.** Glosses are no longer squeezed into ruby and hyphen-wrapped ("conveni-/ent"). Hovering or selecting a word with a character you do not know yet shows a card with up to four senses, in the sense the sentence uses. Pinyin stays as ruby. Stock asbplayer's gloss rendering is unchanged.
- **Notifications** ("Recipe: Ears", segment loop messages) are a small pill matching the toolbar, not text in the subtitle's look.
- **Side panel subtitle list.**
  - The current line has an accent bar and a soft wash.
  - At rest, characters you don't know yet are underlined in amber, with no pinyin.
  - Hovering a line shows the pinyin and the meaning card, anchored so it is never clipped.
- **Dialogs** on the video page (Select Subtitles, video select, first-run) and the notification and statistics frames now use the edition theme, and info banners are restyled. Also fixed a crash found on the way: an early version of this change blanked the Select Subtitles dialog. Journey 9 now guards it.
- **Light theme** was checked in settings, side panel and dialogs.
- Tests: 14 end-to-end journeys.

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
- **The meaning card shows up to four CC-CEDICT senses** of the reading the sentence uses. Rare senses beyond that are left out.
- **Shadow replays through the page's video**, so on sites with their own player controls (Netflix) the replay goes through asbplayer's seek and play; a site that blocks programmatic play will replay only your recording.
- **Shadow recordings are not kept.** Only the latest take is held, in memory, for P.
- **Two videos at once can mix up a meaning.** The engine leads a word's meaning with the reading it most recently chose. With two tabs playing different videos, a word read differently in each can occasionally show the other tab's sense.
- **The offscreen document stays open while the browser runs** (about 28 MB with the engine loaded), as it did for asbplayer's audio capture.
- **Extension pages** (side panel, popup) reach the engine through a registered fetcher. A page that does not register one cannot annotate with the engine.
- **Verified on a local test page only.** The journeys run against a local `<video>`. YouTube, Netflix and other sites need a manual spot check; site key handlers could still interact with G, H, R, [ and ].
- **Upstream's adaptive word visibility and the honesty rule.** A line the renderer draws counts as shown even if adaptive visibility hid most of it, so G/H can be refused for it. Safe in the honest direction; refined when the Chinese engine lands.
- **Blurred subtitles count as shown.** With upstream's subtitle blur on, a blurred line is treated as displayed, so G/H are refused for it.
- **Loop timing follows `timeupdate`** (about 4 per second), so the jump back can land up to roughly 250 ms after the end of the segment.
- **Saved Moments is upstream's mining history.** There is no Mandarin-specific list view yet.
- **New strings are English in every locale except Simplified Chinese.**
- **The 5-minute review, progress panel, multi-step reveal ladder and recipe tuning are not built yet.** They are deliberately deferred until after a week of real use.
