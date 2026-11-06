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

"""Unit tests of the on-foot maps' build, on synthetic sources.

The phone's Earth must be half the desktop's in each direction and both
2:1, and the normal map must keep the source's pixels and be lossy WebP
(VP8, not the lossless VP8L that would weigh several times more).

  python3 -m unittest discover -s packages/web/scripts -p "test_on_foot_maps.py"
"""

import tempfile
import unittest
from pathlib import Path

import numpy as np
import on_foot_maps
from PIL import Image


def noise(width, height):
    pixels = np.random.default_rng(7).integers(
        0, 256, (height, width, 3), dtype=np.uint8
    )
    return Image.fromarray(pixels)


def webp_kind(path):
    """The WebP's first chunk: 'VP8 ' lossy, 'VP8L' lossless."""
    return path.read_bytes()[12:16].decode("ascii")


class OnFootMapsTest(unittest.TestCase):
    def build(self, kind, image):
        out = Path(tempfile.mkdtemp())
        source = out / "source.png"
        image.save(source)
        return on_foot_maps.build(kind, source, out)

    def test_the_earth_comes_at_two_sizes_both_two_to_one(self):
        paths = self.build("earth", noise(540, 270))
        sizes = {path.name: Image.open(path).size for path in paths}
        self.assertEqual(
            sizes,
            {"on-foot-earth.webp": (1024, 512), "on-foot-earth-512.webp": (512, 256)},
        )

    def test_the_normal_map_keeps_its_pixels_and_is_lossy(self):
        (path,) = self.build("normal", noise(64, 32))
        self.assertEqual(path.name, "on-foot-regolith-normal.webp")
        self.assertEqual(Image.open(path).size, (64, 32))
        self.assertEqual(webp_kind(path), "VP8 ")


if __name__ == "__main__":
    unittest.main()
