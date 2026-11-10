#!/usr/bin/env bash
#   _   _       _                         _ _
#  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
#  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
#  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
#   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
#
#             =++==--::.
#         %%%%##**++=--:..  .
#      ##**#%@%%#***+=--::.   .
#    #**=+*#*#**#++++=-:::.. .  .
#   #++-====*@%+*++==--::...   .  .    Ventana Lunar
#  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
# #----====-------=-=---:..  .  .  .   windows at the lunar
# #+---+=====--=---==-::..     .  .  . south pole
# #*----==---==-=-=-:-....    .  .  .
# *#----===+*===--:-::...    .  .  .   Built for the NASA Space
#  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
#   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
#    %*===-=-==--==-:::.  .  .  .      by NASA.
#      *+:--+:--::::::.  .  .  .
#         -=:::...:..   .  .           (c) 2026 Universelle
#             :::.. .  .               SPDX-License-Identifier: MIT

# A site film's deliverables (VENT-115) from its rendered 2x frames, per
# look (wide 16:9, phone 9:16): the PNG master (the move scaled down with
# Lanczos, then its last frame repeated for the one-second hold, 180 frames
# at 30 fps), the same as lossless FFV1, the start and end stills, and an
# H.264 preview under 10 MB. Needs ffmpeg.
#
#   bash packages/landing/media-src/site-films/scripts/deliver.sh SITE_ID
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
site="$1"
cd "$here/$site"
FPS=30
MOVE=151
TOTAL=180
MAX_PREVIEW=10000000
mkdir -p out/masters out/stills out/previews
for look in wide phone; do
  if [ "$look" = wide ]; then size=1920:1080; else size=1080:1920; fi
  src="out/render/${look}-2x-png"
  png="out/masters/${site}-${look}-png"
  test "$(ls "$src" | grep -c '^frame-.*\.png$')" = "$MOVE" || { echo "$src: not $MOVE frames" >&2; exit 1; }
  mkdir -p "$png"
  ffmpeg -loglevel error -y -i "$src/frame-%05d.png" -vf "scale=${size}:flags=lanczos" -pix_fmt rgb24 -start_number 0 "$png/frame-%05d.png"
  last=$(printf 'frame-%05d.png' $((MOVE - 1)))
  for ((i = MOVE; i < TOTAL; i++)); do cp "$png/$last" "$png/$(printf 'frame-%05d.png' "$i")"; done
  test "$(ls "$png" | wc -l | tr -d ' ')" = "$TOTAL" || { echo "$png: not $TOTAL frames" >&2; exit 1; }
  ffmpeg -loglevel error -y -framerate $FPS -i "$png/frame-%05d.png" -c:v ffv1 -level 3 -pix_fmt gbrp "out/masters/${site}-${look}.mkv"
  cp "$png/frame-00000.png" "out/stills/${site}-${look}-start.png"
  cp "$png/$(printf 'frame-%05d.png' $((TOTAL - 1)))" "out/stills/${site}-${look}-end.png"
  preview="out/previews/${site}-${look}.mp4"
  ffmpeg -loglevel error -y -framerate $FPS -i "$png/frame-%05d.png" -c:v libx264 -preset slow -crf 18 -maxrate 12M -bufsize 12M -pix_fmt yuv420p -movflags +faststart "$preview"
  bytes=$(stat -f %z "$preview" 2>/dev/null || stat -c %s "$preview")
  test "$bytes" -le $MAX_PREVIEW || { echo "$preview: $bytes bytes, over $MAX_PREVIEW" >&2; exit 1; }
done
ls -l out/masters/*.mkv out/stills out/previews
