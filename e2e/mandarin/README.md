# Mandarin Edition end-to-end journeys

Real Chromium (full headless), the built extension loaded unpacked, a local page with a real
video, and a Mandarin `.srt` dropped onto the video the way a learner would. Assertions read
what is on screen, what the extension saved in its settings storage, and the ledger in its
IndexedDB.

```bash
pnpm run test:e2e:mandarin          # builds the extension, then runs every journey
node --test --test-concurrency=1 e2e/mandarin/journeys.test.mjs   # reuse an existing build
```

Needs Playwright with Chromium and `python3`. `make-fixtures.sh` regenerates the test video (ffmpeg).

| # | Journey | What it proves |
| --- | --- | --- |
| 1 | Edition off | Stock behavior: subtitles show when due; G, H, R, [, ], Shift+L do nothing; no ledger |
| 2a | Turn the edition on | The settings switch appends Just Watch, Ears, Listen First after the learner's own recipe and binds Shift+L |
| 2b | Cycle recipes | Shift+L shows each recipe with the right text visibility; the learner's own settings are never written |
| 3a | Ears, hidden text | Text stays hidden while playing and after pausing; R reveals it |
| 3b | Ears, honesty rule | G on a hidden line writes one ledger event with sentence, time and source; G after Reveal writes nothing |
| 3c | Ears, change of mind | H then H then G records missed, got (no duplicate) |
| 3d | Key conflict | Shift+R (upstream repeat) does not reveal |
| 4 | Just Watch | Text is visible, so G is refused and nothing is recorded |
| 5 | Segment loop | [ and ] loop lines 1–2 with text hidden even in Just Watch; [ while looping gives a clean pass; ] stops and text returns |
| 6 | Export to tutor | Settings → Misc → Export learning ledger downloads JSONL; `tools/ledger_to_lesson.py` turns it into the "From last night" block |
| 7 | On-video mode button | The active recipe's icon and label; the vertical menu is fully visible; choosing Just Watch saves it and shows the line; the edition toolbar is a blurred pill |
| 8a | Chinese engine | Hovering 便宜 shows its meaning card and hovering 我 shows none; meanings are never hyphen-wrapped. Enabling seeds HSK 1–2 (598 characters) and points track 1 at the engine. A line of HSK 1–2 characters shows no pinyin. Editing the known set in Settings re-annotates the open video: pinyin appears over exactly 便宜银行 (pián yi, not biàn yí), 便宜 glosses "cheap", known-character words get no gloss. Adding through HSK 3 clears them again |
| 9 | Edition look everywhere | Select Subtitles (opened from the side panel) renders in the edition surface. Shift+L's notice is a 15px pill. The side panel list underlines unknown characters with pinyin hidden at rest, and the current line has the accent bar |
| 8b | Edition look | Enable gives subtitles the pill, weight 500 and the CJK font; disable restores stock asbplayer's look |

A mutation check was run when these were written: disabling the "revealed lines cannot be
counted" rule makes journeys 3b and 4 fail.

Not covered here: real streaming sites. Spot-check YouTube and Netflix by hand before a release.
