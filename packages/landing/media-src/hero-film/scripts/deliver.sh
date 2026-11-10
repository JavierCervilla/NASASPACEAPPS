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

# The hero film's deliverables from the rendered 2x descent PNGs (README.md):
# lossless masters (FFV1), the hold (the descent's last frame, locked, 7 s,
# so it loops seamlessly and starts exactly where the descent ends), PNG
# posters and H.264 previews, each preview under 30 MB. Needs ffmpeg.
#
#   bash packages/landing/media-src/hero-film/scripts/deliver.sh
set -euo pipefail
cd "$(dirname "$0")/.."
FPS=30
HOLD_FRAMES=210
mkdir -p out/masters out/posters out/previews
for look in desktop phone; do
  png="out/masters/${look}-descent-png"
  # the masters are the supersampled render scaled down (Lanczos)
  if [ "${look}" = desktop ]; then size=1920:1080; else size=1080:1920; fi
  mkdir -p "$png"
  ffmpeg -loglevel error -y -i "out/masters/${look}-descent-2x-png/frame-%05d.png" -vf "scale=${size}:flags=lanczos" -start_number 0 "$png/frame-%05d.png"
  last=$(ls "$png" | sort | tail -1)
  test "$(ls "$png" | wc -l | tr -d ' ')" = 421 || { echo "missing frames in $png" >&2; exit 1; }
  ffmpeg -loglevel error -y -framerate $FPS -i "$png/frame-%05d.png" -c:v ffv1 -level 3 -pix_fmt gbrp "out/masters/hero-${look}-descent.mkv"
  ffmpeg -loglevel error -y -i "$png/$last" -pix_fmt rgb24 "out/posters/hero-${look}-poster.png"
  ffmpeg -loglevel error -y -loop 1 -framerate $FPS -i "out/posters/hero-${look}-poster.png" -frames:v $HOLD_FRAMES -c:v ffv1 -level 3 -pix_fmt gbrp "out/masters/hero-${look}-hold.mkv"
  ffmpeg -loglevel error -y -framerate $FPS -i "$png/frame-%05d.png" -c:v libx264 -preset slow -crf 17 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -movflags +faststart "out/previews/hero-${look}-descent.mp4"
  ffmpeg -loglevel error -y -loop 1 -framerate $FPS -i "out/posters/hero-${look}-poster.png" -frames:v $HOLD_FRAMES -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart "out/previews/hero-${look}-hold.mp4"
done
ls -l out/masters/*.mkv out/posters out/previews
