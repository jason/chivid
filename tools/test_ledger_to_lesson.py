import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout

sys.path.insert(0, os.path.dirname(__file__))
import ledger_to_lesson  # noqa: E402


def audio(ts, result, sentence, start, url="https://www.youtube.com/watch?v=a", title="Ep 1"):
    return {"v": 1, "ts": ts, "kind": "audio", "result": result, "sentence": sentence, "track": 0,
            "start": start, "end": start + 1500, "sourceUrl": url, "title": title, "mode": "ears"}


class LedgerToLessonTest(unittest.TestCase):
    def run_tool(self, events, *args):
        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as f:
            f.write("\n".join(json.dumps(e, ensure_ascii=False) for e in events) + "\n")
        try:
            out = io.StringIO()
            with redirect_stdout(out):
                ledger_to_lesson.main([f.name, *args])
            return out.getvalue()
        finally:
            os.unlink(f.name)

    def test_lists_missed_lines_by_video_with_timestamps(self):
        out = self.run_tool([
            audio("2026-10-24T20:00:00Z", "missed", "银行九点就开门了。", 65000),
            audio("2026-10-24T20:01:00Z", "got", "因为离家近啊。", 70000),
        ], "--since", "2026-10-24")
        self.assertIn("1 missed, 1 understood without text.", out)
        self.assertIn("### [Ep 1](https://www.youtube.com/watch?v=a)", out)
        self.assertIn("- 银行九点就开门了。  (1:05)", out)

    def test_latest_mark_for_a_line_wins(self):
        out = self.run_tool([
            audio("2026-10-24T20:00:00Z", "missed", "你今天怎么这么早？", 1000),
            audio("2026-10-24T20:05:00Z", "got", "你今天怎么这么早？", 1000),
        ], "--since", "2026-10-24")
        self.assertIn("No missed lines. 1 lines understood without text.", out)

    def test_ignores_events_before_a_reset_and_before_since(self):
        out = self.run_tool([
            audio("2026-10-24T19:00:00Z", "missed", "旧的", 1000),
            {"v": 1, "ts": "2026-10-24T19:30:00Z", "kind": "reset"},
            audio("2026-10-22T20:00:00Z", "missed", "太早了", 2000),
            audio("2026-10-24T20:00:00Z", "missed", "新的", 3000),
        ], "--since", "2026-10-24")
        self.assertNotIn("旧的", out)
        self.assertNotIn("太早了", out)
        self.assertIn("新的", out)


if __name__ == "__main__":
    unittest.main()
