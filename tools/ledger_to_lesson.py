#!/usr/bin/env python3
"""Turn a Mandarin Edition ledger export into a "from last night" block for a tutor.

Usage:
    python3 tools/ledger_to_lesson.py mandarin-ledger.jsonl [--since 2026-10-24] [--hours 24]

Reads the JSONL exported from Settings -> Mandarin Edition -> Export learning ledger and
prints Markdown: the words looked up (meaning card opened), most looked-up first, with the
sentence they appeared in; then every line marked Missed while its text was hidden, latest
mark per line wins, grouped by video, with a timestamp you can jump to.
"""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone


def read_events(path):
    with open(path, encoding="utf-8") as f:
        for number, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as error:
                sys.exit(f"{path}:{number}: not valid JSON ({error})")


def parse_ts(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def latest_audio_marks(events, since):
    """Latest audio mark per (video, line start), ignoring anything before the last reset."""
    marks = {}
    for event in events:
        if event.get("kind") == "reset":
            marks.clear()
            continue
        if event.get("kind") != "audio" or parse_ts(event["ts"]) < since:
            continue
        marks[(event["sourceUrl"], event["start"])] = event
    return list(marks.values())


def lookups_since(events, since):
    """Words looked up since `since`, ignoring anything before the last reset.

    Returns a list of (word, reading, gloss, count, example sentence), most looked-up first,
    then alphabetically by reading so the order is stable.
    """
    words = {}
    for event in events:
        if event.get("kind") == "reset":
            words.clear()
            continue
        if event.get("kind") != "lookup" or parse_ts(event["ts"]) < since:
            continue
        entry = words.setdefault(event["word"], {"reading": event["reading"], "gloss": event["gloss"], "count": 0, "sentence": event["sentence"]})
        entry["count"] += 1
    return sorted(
        ((w, e["reading"], e["gloss"], e["count"], e["sentence"]) for w, e in words.items()),
        key=lambda item: (-item[3], item[1]),
    )


def clock(ms):
    seconds = int(ms // 1000)
    return f"{seconds // 60}:{seconds % 60:02d}"


def render(missed, got_count, lookups=()):
    out = ["## From last night", ""]
    if lookups:
        out.append(f"### Words I looked up ({len(lookups)})")
        out.append("")
        for word, reading, gloss, count, sentence in lookups:
            times = f" ×{count}" if count > 1 else ""
            short_gloss = gloss.split(";")[0].strip()
            out.append(f"- **{word}** {reading} — {short_gloss}{times}  \n  {sentence.strip()}")
        out.append("")
    if not missed:
        out.append(f"No missed lines. {got_count} lines understood without text.")
        return "\n".join(out) + "\n"
    out.append(f"{len(missed)} missed, {got_count} understood without text.")
    out.append("")
    by_video = {}
    for event in missed:
        by_video.setdefault((event["title"] or event["sourceUrl"], event["sourceUrl"]), []).append(event)
    for (title, url), events in by_video.items():
        out.append(f"### [{title}]({url})")
        out.append("")
        for event in sorted(events, key=lambda e: e["start"]):
            out.append(f"- {event['sentence'].strip()}  ({clock(event['start'])})")
        out.append("")
    return "\n".join(out)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("ledger", help="path to mandarin-ledger-*.jsonl")
    parser.add_argument("--since", help="ISO date or datetime; default is --hours ago")
    parser.add_argument("--hours", type=float, default=24, help="look-back window when --since is not given")
    args = parser.parse_args(argv)

    if args.since:
        since = parse_ts(args.since)
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
    else:
        since = datetime.now(timezone.utc) - timedelta(hours=args.hours)

    events = list(read_events(args.ledger))
    marks = latest_audio_marks(events, since)
    missed = [e for e in marks if e["result"] == "missed"]
    got_count = sum(1 for e in marks if e["result"] == "got")
    sys.stdout.write(render(missed, got_count, lookups_since(events, since)))


if __name__ == "__main__":
    main()
