# Mandarin Edition — Baseline

Upstream commit: `61764e8ed546045317e19e72d4a54df836c50359` (asbplayer/asbplayer, main, 2026-10-24)
Brief: "asbplayer Mandarin Edition — Build Brief v2"

## Toolchain (verified)

| Item | Value |
| --- | --- |
| Package manager | pnpm 11.27.0 (enforced by `devEngines`; `npm i -g pnpm@11.27.0`) |
| Node | `.nvmrc` says 24.22.1; installs, tests and builds also pass on 22.23.4 |
| Extension framework | WXT 0.21.4, React 19, MUI 6, Emotion |
| Storage | `browser.storage.local` for settings; Dexie (IndexedDB) for dictionary, copy history, file sessions |
| Install | `pnpm install` (42 s) |
| Full check | `pnpm verify` |
| Extension build | `cd extension && pnpm run build` → `.output/chrome-mv3` (11.5 s) |

Baseline results on the commit above, before any change:

| Suite | Result |
| --- | --- |
| common typecheck | pass |
| common tests | 68 suites, 1,543 tests pass |
| client tests | 2 suites, 7 tests pass |
| extension tests | 23 suites, 286 tests pass |
| eslint | clean |
| prettier | clean |
| chrome-mv3 build | pass, 37.06 MB |

## Seams found in source

| Need | Where it lives | Finding |
| --- | --- | --- |
| Tokenizer / dictionary | `common/yomitan/yomitan.ts` (`class Yomitan`, 1,466 lines) | No interface. Constructor takes a `Fetcher` (`common/src/fetcher.ts`). Only three yomitan-api actions are called: `tokenize`, `termEntries`, `yomitanVersion`. Ten call sites construct `new Yomitan(dictionaryTrack)`. **Engine = a `MandarinFetcher` selected inside the constructor.** |
| Playback modes | `common/playback/playback-engine.ts` (`PlaybackEngine`, shared by extension and web app) | `togglePlaybackMode(PlayMode)`, `toggleSubtitleVisibility()`, `cycleAutoPauseResumeMode()`, `settingsChanged(settings)`. All mode behavior is reachable without new playback code. |
| Extension ↔ video glue | `extension/src/services/binding.ts` (2,372 lines) | Owns the `PlaybackEngine` and `SubtitleController`; key commands route here. |
| Controls overlay | `common/components/MobileVideoOverlay.tsx`, rendered in an iframe by `extension/src/controllers/mobile-video-overlay-controller.ts` | Shown on hover over video with loaded subtitles. Mode pill goes here. |
| Key bindings | `extension/src/services/key-bindings.ts`, defaults in `common/settings/settings-provider.ts` (`keyBindSet`) | New binds = new `KeyBindName` + default + handler. |
| Settings | `common/settings/settings.ts` (types), `settings-provider.ts` (defaults), `import-export/settings-import-export.ts` (schema) | Adding a setting touches these three files plus a locale key. |
| Local DB | Dexie; each feature owns its own database class | A separate `MandarinDatabase` needs no migration of upstream databases. |

## Corrections to the brief

1. **Modes are not settings profiles.** `addProfile` copies every setting — Anki fields, annotation tracks, key binds — under a new prefix. Shipping three modes as three profiles would split the learner's configuration three ways and silently diverge. Instead a mode is a small patch of playback keys (`subtitleVisibility`, auto-pause edge and resume mode, repeat count) plus a set of `PlayMode`s, applied to whatever profile is active. The pre-mode values are saved and restored when the learner picks Off.
2. **The engine is a Fetcher, not an AnnotationProvider.** See the tokenizer row above. Already reflected in the brief's Phase 0 gate.
3. **New tables live in their own Dexie database** (`mandarin-edition`), not added to upstream's word DB. Zero upstream schema migration; reset deletes one database.

## Capability table, verified

| Capability | Status | Source |
| --- | --- | --- |
| Repeat line, prev/next line, seek to line start | exists | `keyBindSet` + `PlaybackEngine` |
| Auto-pause, resume modes, two-phase hide | exists | `AutoPauseResumeMode`, `autoPauseResumeDelayMs` |
| Subtitles only while paused | exists | `SubtitleVisibility.whilePaused` |
| Settings profiles | exists, but full copies (see correction 1) | `SettingsStorage.addProfile` |
| Word status, readings, definitions, statistics, word DB | exists | `common/annotations`, `common/dictionary-db` |
| Mining history, Anki export | exists | `PostMineAction`, `miningHistoryStorageLimit` |
| Controls overlay on video | exists | `MobileVideoOverlay.tsx` |
| Tokenizer for Chinese without Yomitan | missing | via `MandarinFetcher` (Slice B) |
| Character-level status | missing | `MandarinDatabase.characters` (Slice B) |
| Audio-recognition events (G/M) | missing | Slice A |
| Mode switcher | missing | Slice A |
| Multi-line segment loop | missing (repeat is per subtitle) | Slice A |
| Ledger export | missing | Slice A |
