#!/usr/bin/env python3
"""Turn a Mandarin Edition ledger export into a "from last night" block for a tutor.

Usage:
    python3 tools/ledger_to_lesson.py mandarin-ledger.jsonl [--since 2026-10-24] [--hours 24]

Reads the JSONL exported from Settings -> Mandarin Edition -> Export learning ledger and
prints Markdown: every line marked Missed while its text was hidden, latest mark per line
wins, grouped by video, with a timestamp you can jump to.
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


def clock(ms):
    seconds = int(ms // 1000)
    return f"{seconds // 60}:{seconds % 60:02d}"


def render(missed, got_count):
    if not missed:
        return f"## From last night\n\nNo missed lines. {got_count} lines understood without text.\n"
    out = ["## From last night", "", f"{len(missed)} missed, {got_count} understood without text.", ""]
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

    marks = latest_audio_marks(read_events(args.ledger), since)
    missed = [e for e in marks if e["result"] == "missed"]
    got_count = sum(1 for e in marks if e["result"] == "got")
    sys.stdout.write(render(missed, got_count))


if __name__ == "__main__":
    main()
