#!/bin/bash
# Adds "dresify.hr" watermark to all front.jpg and komplet.png images

DRESOVI_DIR="$(dirname "$0")/../public/dresovi"
WATERMARK_TEXT="dresify.hr"
FONT="/System/Library/Fonts/HelveticaNeue.ttc"

find "$DRESOVI_DIR" -type f \( -name "front.jpg" -o -name "komplet.png" \) | sort | while read -r img; do
  magick "$img" \
    \( -clone 0 -fill "rgba(0,0,0,0.5)" -font "$FONT" -pointsize 30 -gravity SouthEast -annotate +18+12 "$WATERMARK_TEXT" \) \
    -composite \
    -fill "rgba(255,255,255,0.80)" -font "$FONT" -pointsize 30 -gravity SouthEast -annotate +20+14 "$WATERMARK_TEXT" \
    "$img" 2>/dev/null \
    && echo "✓ $img" \
    || echo "✗ FAILED: $img"
done
