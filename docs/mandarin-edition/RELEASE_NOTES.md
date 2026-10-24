# Mandarin Edition — release notes

## Slice A (listening loop), on top of upstream asbplayer `61764e8`

- Mandarin Edition switch (off by default; off is stock asbplayer).
- Learning modes Just Watch, Ears, Listen First, cycled with Shift+L or the on-video mode pill.
- Hide until revealed: in Ears and Listen First, text stays hidden through pauses until R.
- G and H listening marks with the honesty rule: a line whose text was shown is never counted.
- Segment loop with [ and ], text hidden, clean pass, 2-minute cap.
- Local, append-only learning ledger in the extension's own IndexedDB; JSONL export; `tools/ledger_to_lesson.py`.
- Tests: 1,573 common, 7 client, 309 extension unit tests; 9 end-to-end journeys in real Chromium; 3 Python tests.

## Known limitations

- **No Chinese engine yet.** Pinyin, segmentation and the dictionary are Slice B. Until then, readings and definitions need Yomitan as in stock asbplayer.
- **Verified on a local test page only.** The journeys run against a local `<video>`. YouTube, Netflix and other sites need a manual spot check; site key handlers could still interact with G, H, R, [ and ].
- **The on-video mode pill is not covered by the journeys** (the overlay is disabled in those runs); it is covered by type checks only.
- **Blurred subtitles count as shown.** With upstream's subtitle blur on, a blurred line is treated as displayed, so G/H are refused for it.
- **Loop timing follows `timeupdate`** (about 4 per second), so the jump back can land up to roughly 250 ms after the end of the segment.
- **Saved Moments is upstream's mining history.** There is no Mandarin-specific list view yet.
- **New strings are English in every locale.**
- **The 5-minute review, progress panel, character status and import dialog are not built yet** (Slice B / Phase 2).
