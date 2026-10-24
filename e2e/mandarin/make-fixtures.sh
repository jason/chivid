#!/usr/bin/env bash
# Regenerates the test video. Needs ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/fixtures"
ffmpeg -loglevel error -y -f lavfi -i testsrc=size=640x360:rate=25 -f lavfi -i sine=frequency=440:sample_rate=44100 \
  -t 30 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest clip.mp4
