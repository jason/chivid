# Mandarin Edition — user guide

## Set up (about 90 seconds, no account, no Yomitan, no Anki)

1. Build or download the extension and load it in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `extension/.output/chrome-mv3`.
2. Open the asbplayer settings → **Misc** → **Mandarin Edition** → switch on **Enable Mandarin Edition**.
3. Open a Mandarin video (YouTube with Chinese captions, or any page with a `<video>`) and load Chinese subtitles the usual asbplayer way.
4. Press **Shift+L** to pick a learning mode.

## Modes

| Mode | Text | Use it to |
| --- | --- | --- |
| Off | Your normal asbplayer settings | Watch as before |
| Just Watch | Shown when due | Enjoy the show, read along |
| Ears | Hidden, even when paused, until you press R | Train listening |
| Listen First | Hidden until R; pauses at the end of each line | Deliberate practice, line by line |

Switching modes never touches Anki, annotation or key-binding settings. Returning to Off restores your own playback settings.

## Keys (all remappable in Settings → Keyboard Shortcuts)

| Key | Does |
| --- | --- |
| Shift+L | Next learning mode |
| R | Reveal the current line |
| G | I understood the line I just heard |
| H | I missed it |
| [ | Mark the start of a segment; while looping, replay it once more without text |
| ] | Mark the end and loop the segment with text hidden; press again to stop |

G and H only count for a line whose text you have not seen. After a Reveal, or in Just Watch where text is on screen, the press is refused and nothing is recorded. That rule is what makes the numbers mean "understood by ear".

## Your learning ledger

Every G and H is saved locally in the extension, never sent anywhere. Settings → Misc → **Export learning ledger** downloads a `.jsonl` file. To turn last night's misses into notes for your tutor:

```bash
python3 tools/ledger_to_lesson.py mandarin-ledger-*.jsonl --hours 24
```

## Saving a moment

Use asbplayer's normal mine shortcut (Ctrl+Shift+Z). Without Anki, set Settings → Mining → mining button default action to **None**; the line, time and source go to the mining history.
