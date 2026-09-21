#!/usr/bin/env bash
# build.sh — encode captured frames into the deliverable.
# Usage: tools/build.sh [h264|prores|gif]
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-web}"
N=$(ls frames/f*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$N" -eq 0 ]; then echo "no frames — run tools/capture.py first"; exit 1; fi
echo "encoding $N frames ($MODE)…"
mkdir -p out

case "$MODE" in
  web)
    # What the site plays, and what you'd upload to social.
    # CRF 26 because heavy film grain is extremely expensive to encode —
    # CRF 16 on this footage lands around 200 MB for 21 seconds, over
    # GitHub's 100 MB file limit, with no visible gain at this grain level.
    ffmpeg -y -loglevel error -stats \
      -framerate 24 -i frames/f%05d.png \
      -c:v libx264 -preset slow -crf 26 \
      -pix_fmt yuv420p -movflags +faststart \
      assets/portfolio.mp4
    OUT=assets/portfolio.mp4
    ffmpeg -y -loglevel error -i frames/f00060.png -q:v 4 assets/poster.jpg
    ;;
  master)
    # Archival / regrade master. Large. Not committed.
    ffmpeg -y -loglevel error -stats \
      -framerate 24 -i frames/f%05d.png \
      -c:v libx264 -preset slow -crf 16 \
      -pix_fmt yuv420p -movflags +faststart \
      out/portfolio_master.mp4
    OUT=out/portfolio_master.mp4
    ;;
  prores)
    # Edit-friendly intermediate, if this is going into a timeline later.
    ffmpeg -y -loglevel error -stats \
      -framerate 24 -i frames/f%05d.png \
      -c:v prores_ks -profile:v 3 -pix_fmt yuv422p10le \
      out/portfolio_prores.mov
    OUT=out/portfolio_prores.mov
    ;;
  gif)
    # Note: GIF of grainy footage is larger than the MP4. Use sparingly.
    ffmpeg -y -loglevel error \
      -framerate 24 -i frames/f%05d.png \
      -vf "fps=10,scale=270:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
      out/portfolio_preview.gif
    OUT=out/portfolio_preview.gif
    ;;
  *) echo "unknown mode: $MODE"; exit 1 ;;
esac

echo
echo "wrote $OUT"
ffprobe -v error -show_entries format=duration,size \
        -show_entries stream=width,height,r_frame_rate,codec_name \
        -of default=noprint_wrappers=1 "$OUT"
