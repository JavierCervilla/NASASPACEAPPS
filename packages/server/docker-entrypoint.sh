#!/bin/sh
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

# The API image's entrypoint (VENT-43). It starts as root only to give the
# mounted volumes to `node`: a named volume Docker created before the image
# had the directory, or a host directory, can come up owned by root, and
# Docker's copy-up of the image directory's owner is not to be relied on.
# Only the mount points change owner (never a recursive chown over the
# terrain's 48 GB), plus the fetch's own leftovers at the top of the terrain
# volume; then it drops to `node` for good and runs the command. Started as
# any other user it runs the command as it is.
set -u

own() {
  dir=$1
  [ -n "$dir" ] || return 0
  mkdir -p "$dir" 2>/dev/null || true
  [ -d "$dir" ] || return 0
  [ "$(stat -c %u "$dir")" = "$(id -u node)" ] && return 0
  if chown node:node "$dir" 2>/dev/null; then
    echo "entrypoint: $dir now belongs to node"
  else
    echo "entrypoint: cannot give $dir to node; it stays read-only for the server"
  fi
}

if [ "$(id -u)" = 0 ]; then
  own "${TERRAIN_DIR:-}"
  own "${TERRAIN_CACHE_DIR:-}"
  own "${HORIZONS_CACHE_DIR:-}"
  if [ -n "${TERRAIN_DIR:-}" ] && [ -d "$TERRAIN_DIR" ]; then
    find "$TERRAIN_DIR" -maxdepth 1 \( -name '*.part' -o -name '.fetch.lock' \) \
      ! -user node -exec chown node:node {} + 2>/dev/null || true
  fi
  exec su-exec node "$@"
fi
exec "$@"
