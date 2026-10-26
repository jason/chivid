# Mandarin Edition — user guide

## Set up (about 90 seconds, no account, no Yomitan, no Anki)

1. Build or download the extension and load it in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `extension/.output/chrome-mv3`.
2. Open the asbplayer settings → **Misc** → **Mandarin Edition** → switch on **Enable Mandarin Edition**.
3. Open a Mandarin video (YouTube with Chinese captions, or any page with a `<video>`) and load Chinese subtitles the usual asbplayer way.
4. Press **Shift+L** to pick a learning mode.

## Pinyin and meanings, only where you need them

The edition has its own Chinese engine (word splitting, pinyin in context, CC-CEDICT), so there is nothing else to install. Turning the edition on points subtitle track 1 at it, unless you had already set that track up with your own Yomitan.

- Hover a subtitle line to see help. Pinyin appears over characters you do not know yet, and the English meaning over the words that contain them. Words made only of characters you know stay clean.
- Readings follow the sentence: 便宜 in "this is cheap" reads pián yi and means "cheap"; 不 and 一 show their tone changes (不是 bú shì, 一个 yí gè). A reading the engine could not confirm ends in "?".
- **Known characters** start as the 598 characters of HSK 1–2. Edit them in Settings → Misc → Mandarin Edition: paste any text or word list into the box (only the Chinese characters are kept), or use **Add HSK characters** to add everything through a level. Open videos update within a second or two.
- When subtitles load, a notice shows how much of the episode you can read, for example "93% of characters known · 41 new · hardest 12:40–14:10 (78%)". Material around 95% known is the sweet spot. Below about 90%, try another episode or drill the hardest stretch with the segment loop.
- The subtitle look changes to a soft dark pill with a Chinese font, but only if you had not customized the subtitle look yourself. Turning the edition off puts asbplayer's look back, unless you have changed it since.

## Modes are recipes

Turning the edition on adds three [recipes](https://docs.asbplayer.dev/docs/guides/recipes) after any you already have, and binds Shift+L to the next recipe if that key is free. A recipe never overwrites your settings; it is layered on top while it is active, and **Off** (Disabled) gives you exactly your own settings back.

| Recipe | Icon | Text | Use it to |
| --- | --- | --- | --- |
| Off | sliders, grey | Your normal settings | Watch as before |
| Just Watch | eye | Shown when due | Enjoy the show, read along |
| Ears | ear | Hidden, even when paused, until you press R | Train listening |
| Listen First | ear with a pause | Hidden until R; pauses at the end of each line | Deliberate practice, line by line |
| Shadow | microphone | Shown; pauses after each line for 1.3× its length while you say it | Speaking practice |

The active recipe shows as its icon on the video controls; hover for its name, click for the list. You can edit these recipes or add your own in Settings → Playback; any recipe can include **Hide text until revealed**.

## Keys (all remappable in Settings → Keyboard Shortcuts)

| Key | Does |
| --- | --- |
| Shift+L | Next recipe |
| R | Reveal the current line |
| G | I understood the line I just heard |
| H | I missed it |
| P | Shadow: play the speaker's line, then your recording of it |
| [ | Mark the start of a segment; while looping, replay it once more without text |
| ] | Mark the end and loop the segment with text hidden; press again to stop |

G and H only count for a line whose text you have not seen. After a Reveal, or with Just Watch where text is on screen, the press is refused and nothing is recorded. That rule is what makes the numbers mean "understood by ear".

## Shadowing

Pick **Shadow**. Each line plays, then the video waits about 1.3 times as long as the line took, and you say it. Chrome will ask for the microphone the first time; while the video waits, you are being recorded. Press **P** to hear the speaker's line and then your own attempt, back to back. If you refuse the microphone, Shadow still pauses for you, just without the playback. The pause length is Settings → Playback → Auto-pause → "Pause as a multiple of the line".

## Your learning ledger

Every G and H is saved locally in the extension, never sent anywhere. So is every word you look up: resting the pointer on a word's meaning card for a moment records the word, its reading and meaning, and the sentence it was in. Settings → Misc → **Export learning ledger** downloads a `.jsonl` file. To turn last night's lookups and misses into notes for your tutor:

```bash
python3 tools/ledger_to_lesson.py mandarin-ledger-*.jsonl --hours 24
```

## Saving a moment

Use asbplayer's normal mine shortcut (Ctrl+Shift+Z). Without Anki, set Settings → Mining → mining button default action to **None**; the line, time and source go to the mining history.
