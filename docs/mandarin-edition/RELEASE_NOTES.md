# Mandarin Edition — release notes

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

- **No Chinese engine yet.** Pinyin, segmentation and the dictionary are Slice B. Until then, readings and definitions need Yomitan as in stock asbplayer.
- **Verified on a local test page only.** The journeys run against a local `<video>`. YouTube, Netflix and other sites need a manual spot check; site key handlers could still interact with G, H, R, [ and ].
- **Upstream's adaptive word visibility and the honesty rule.** A line the renderer draws counts as shown even if adaptive visibility hid most of it, so G/H can be refused for it. Safe in the honest direction; refined when the Chinese engine lands.
- **Blurred subtitles count as shown.** With upstream's subtitle blur on, a blurred line is treated as displayed, so G/H are refused for it.
- **Loop timing follows `timeupdate`** (about 4 per second), so the jump back can land up to roughly 250 ms after the end of the segment.
- **Saved Moments is upstream's mining history.** There is no Mandarin-specific list view yet.
- **New strings are English in every locale.**
- **The 5-minute review, progress panel, character status and import dialog are not built yet** (Slice B / Phase 2).
