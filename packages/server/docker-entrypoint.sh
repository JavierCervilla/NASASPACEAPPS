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
# volume, and only under /data/ or /var/cache/; then it drops to `node` for
# good and runs the command. Started as any other user it runs the command
# as it is.
set -u

# Only a path under /data/ or /var/cache/, without `..`, is ever touched:
# a variable set to `/` or `/etc` by mistake must not hand it to `node`.
# Its first component there must name a directory: `/data//` and `/data/./`
# are /data itself.
allowed() {
  case "$1" in
    *..*) return 1 ;;
    /data/*) rest=${1#/data/} ;;
    /var/cache/*) rest=${1#/var/cache/} ;;
    *) return 1 ;;
  esac
  case "${rest%%/*}" in
    ''|.) return 1 ;;
  esac
  return 0
}

# The same guard on the path as the kernel resolves it: a symlinked parent
# (/data/x pointing at /etc) must not carry chown out of the volumes.
resolved_allowed() {
  real=$(realpath "$1" 2>/dev/null) || return 1
  allowed "$real"
}

own() {
  dir=$1
  [ -n "$dir" ] || return 0
  if ! allowed "$dir"; then
    echo "entrypoint: $dir is not under /data/ or /var/cache/; left alone"
    return 0
  fi
  mkdir -p "$dir" 2>/dev/null || true
  [ -d "$dir" ] || return 0
  if ! resolved_allowed "$dir"; then
    echo "entrypoint: $dir resolves outside /data/ or /var/cache/; left alone"
    return 0
  fi
  [ "$(stat -c %u "$dir")" = "$(id -u node)" ] && return 0
  # -h: a symlink changes owner itself, never what it points to.
  if chown -h node:node "$dir" 2>/dev/null; then
    echo "entrypoint: $dir now belongs to node"
  else
    echo "entrypoint: cannot give $dir to node; it stays read-only for the server"
  fi
}

if [ "$(id -u)" = 0 ]; then
  own "${TERRAIN_DIR:-}"
  own "${TERRAIN_CACHE_DIR:-}"
  own "${HORIZONS_CACHE_DIR:-}"
  if [ -n "${TERRAIN_DIR:-}" ] && [ -d "$TERRAIN_DIR" ] && resolved_allowed "$TERRAIN_DIR"; then
    # Regular files with one link only: a planted symlink or a hard link to a
    # root file named *.part is never handed to node.
    find "$TERRAIN_DIR" -maxdepth 1 -type f -links 1 \( -name '*.part' -o -name '.fetch.lock' \) \
      ! -user node -exec chown -h node:node {} + 2>/dev/null || true
  fi
  exec su-exec node "$@"
fi
exec "$@"
