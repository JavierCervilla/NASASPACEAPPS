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

"""Builds the on-foot view's regolith normal map and its Earth maps.

  normal  Poly Haven's «Moon 02» OpenGL normal map (moon_02_nor_gl_1k.jpg)
          to a 1024 px lossy WebP. The map is fine grain everywhere, so a
          lossless or high-quality WebP spends its bytes on the grain's
          noise; at quality 50 the rendered ground matches the old q88
          file within one level per channel on average (VENT-94).
  earth   NASA's Blue Marble (world.topo.bathy.200412.3x5400x2700.jpg) to
          two equirectangular WebP maps: 1024 x 512 for desktops and
          512 x 256 for phones, where the Earth is a disc some 30 device
          pixels wide and the smaller map still has texels to spare.

Regenerate (sources and checksums in ASSETS.md; Pillow, hash-pinned in
requirements.txt next to this file; the WebP bytes depend on the libwebp
Pillow bundles, ASSETS.md names the one used):

  python3 packages/web/scripts/on_foot_maps.py normal \\
      moon_02_nor_gl_1k.jpg packages/web/src/terrain/maps
  python3 packages/web/scripts/on_foot_maps.py earth \\
      world.topo.bathy.200412.3x5400x2700.jpg packages/web/src/terrain/maps
"""

import argparse
import hashlib
from pathlib import Path

from PIL import Image

NORMAL_FILE = "on-foot-regolith-normal.webp"
NORMAL_QUALITY = 50
# The Earth's maps: (file, width); each is half as tall as it is wide.
EARTH_FILES = (("on-foot-earth.webp", 1024), ("on-foot-earth-512.webp", 512))
EARTH_QUALITY = 86
# libwebp's slowest and smallest method.
METHOD = 6


def normal_map(source):
    """The normal map's pixels, as the source has them (no resampling)."""
    return source.convert("RGB")


def earth_map(source, width):
    """The Blue Marble resampled to `width` x `width / 2` (Lanczos)."""
    return source.convert("RGB").resize((width, width // 2), Image.LANCZOS)


def save_webp(image, path, quality):
    """Writes `image` as a lossy WebP and returns its sha256."""
    image.save(path, "WEBP", quality=quality, method=METHOD)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build(kind, source, out_dir):
    """Writes the maps of `kind` from `source` into `out_dir`; their paths."""
    with Image.open(source) as image:
        if kind == "normal":
            jobs = [(NORMAL_FILE, normal_map(image), NORMAL_QUALITY)]
        else:
            jobs = [
                (name, earth_map(image, w), EARTH_QUALITY) for name, w in EARTH_FILES
            ]
    written = []
    for name, pixels, quality in jobs:
        path = out_dir / name
        digest = save_webp(pixels, path, quality)
        print(f"{path} {path.stat().st_size} bytes sha256 {digest}")
        written.append(path)
    return written


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("kind", choices=("normal", "earth"))
    parser.add_argument("source", type=Path)
    parser.add_argument("out_dir", type=Path)
    args = parser.parse_args()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    build(args.kind, args.source, args.out_dir)


if __name__ == "__main__":
    main()
