#!/usr/bin/env bash
# Build silent step-by-step demo MP4 from rendered scene frames.
# Output: docs/demo_silent.mp4 — duration = sum of scene durations (no padding).
set -euo pipefail
cd "$(dirname "$0")/.."

python scripts/render_demo_frames.py

ffmpeg -hide_banner -loglevel error -y \
  -f concat -safe 0 -i docs/.video_frames/concat.txt \
  -vf "fps=30,format=yuv420p" \
  -c:v libx264 -preset medium -crf 20 \
  -movflags +faststart \
  docs/demo_silent.mp4

echo
echo "Wrote docs/demo_silent.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height,r_frame_rate \
  -of default=nw=1 docs/demo_silent.mp4
