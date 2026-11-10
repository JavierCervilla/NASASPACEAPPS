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

# Builds a site film's inputs (VENT-115) with moon-scene: the LOLA tiles
# (fetched once, cached), the app's maps, and the Moon built for the instant
# into <site-id>/media/moon/, its azimuths dense within 45° of the final
# heading (the far skyline of the last frames stays smooth through the
# app's lens). Then prints the plan as built (framing.mjs). Needs Node 22+.
#
#   bash packages/landing/media-src/site-films/scripts/build-site.sh SITE_ID
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
site="$1"
S="$here/../moon-scene/scripts"
key="$(node "$here/scripts/sites.mjs" "$site")"
instant="$(node -e "import('$here/scripts/sites.mjs').then((m) => console.log(m.INSTANT))")"
heading="$(node --input-type=module -e "
import { SITES } from '$S/sites.mjs';
import { skyOf } from '$S/sky.mjs';
import { startHeading } from '$here/scene/light.ts';
console.log(startHeading(skyOf(SITES['$key'], '$instant')).toFixed(1));
")"
media="$here/$site/media/moon"
node "$S/fetch-tiles.mjs" --site "$key"
node "$S/textures.mjs" --out "$media" > /dev/null
node "$S/build.mjs" --site "$key" --instant "$instant" --out "$media" --sector "$heading,45,6144"
node "$here/scripts/framing.mjs" "$site"
