#!/bin/bash
# Renderira sve *__WxH.html u JPEG (kvaliteta 92) u nadređenu mapu.
cd "$(dirname "$0")"
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for f in ${1:-*__*.html}; do
  size=$(echo "$f" | sed -E 's/.*__([0-9]+x[0-9]+)\.html/\1/'); w=${size%x*}; h=${size#*x}
  name=$(basename "$f" .html | sed -E 's/__[0-9]+x[0-9]+$//')
  "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=$w,$h --virtual-time-budget=6000 --screenshot="$PWD/tmp.png" "file://$PWD/$f" >/dev/null 2>&1
  sips -s format jpeg -s formatOptions 92 tmp.png --out "../$name.jpg" >/dev/null && rm tmp.png && echo "OK $name.jpg ${w}x${h}"
done
