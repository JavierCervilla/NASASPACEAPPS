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

# Renders a built site film (VENT-115) and makes its deliverables: the move
# at twice the size for both looks, scaled down into the masters with the
# one-second hold (deliver.sh), then the coverage check (the surface fills
# every frame under its skyline) and the frame-to-frame jump scan. raea runs
# offline from the studio's install; nothing is installed or downloaded.
#
#   bash packages/landing/media-src/site-films/scripts/render-site.sh SITE_ID
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
site="$1"
raea() { env HOME="$HOME/.gamestudio/raea/home" RAEA_OFFLINE=1 "$HOME/.gamestudio/raea/raea/bin/raea" "$@"; }
cd "$here/$site"
mkdir -p out/render out/coverage
start=$(date +%s)
for look in wide phone; do
  # the frame count is fixed, so a second render overwrites every frame of the first
  raea render film.tsx --composition "${look}-2x" -o "out/render/${look}-2x-png" 2>&1 | grep -E '^(APPLIED|error|Error)' | tail -1
done
rendered=$(date +%s)
bash "$here/scripts/deliver.sh" "$site"
delivered=$(date +%s)
for look in wide phone; do
  if [ "$look" = wide ]; then size=(--w 480 --h 270); else size=(--w 270 --h 480); fi
  raea render film.tsx --composition "diag-normals-${look}" "${size[@]}" -o "out/coverage/${look}" 2>&1 | grep -E '^(APPLIED|error|Error)' | tail -1
done
python3 "$here/scripts/coverage.py" out/coverage/wide out/coverage/phone
python3 "$here/scripts/jumps.py" "out/masters/${site}-wide-png" "out/masters/${site}-phone-png"
echo "render $((rendered - start)) s, deliverables $((delivered - rendered)) s, checks $(($(date +%s) - delivered)) s"
