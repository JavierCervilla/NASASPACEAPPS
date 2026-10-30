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

"""Unit tests of moon_textures.py that need no source TIFF.

The polar grid must match the web's projection (src/lib/polar-projection.ts):
0° E at the top, 90° E on the right, the pole at the centre and 80° S on the
rim. A flipped sign would mirror the map image against the site markers, and
nothing else would notice. The pixel cap must let the documented sources in
and keep a forged header out.

  python3 -m unittest discover -s packages/web/scripts -p "test_*.py"
"""

import math
import re
import tempfile
import unittest
from pathlib import Path

import moon_textures
import numpy as np
from PIL import Image

PROJECTION_TS = (
    Path(__file__).resolve().parent.parent / "src" / "lib" / "polar-projection.ts"
)
# Odd, so the middle row and column pass through the pole.
SIZE = 101
MIDDLE = SIZE // 2


def to_polar_map(lat_deg, lon_east_deg, rim_lat_deg):
    """polar-projection.ts `toPolarMap`, line for line."""
    rim_scale = math.tan(math.radians(90 + rim_lat_deg) / 2)
    r = math.tan(math.radians(90 + lat_deg) / 2) / rim_scale
    lon = math.radians(lon_east_deg)
    return r * math.sin(lon), -r * math.cos(lon)


def web_rim_lat_deg():
    """RIM_LAT_DEG as polar-projection.ts declares it."""
    source = PROJECTION_TS.read_text(encoding="utf-8")
    found = re.search(r"RIM_LAT_DEG = (-?\d+(?:\.\d+)?);", source)
    if found is None:
        raise AssertionError("RIM_LAT_DEG not found in polar-projection.ts")
    return float(found.group(1))


class PolarGridTest(unittest.TestCase):
    def setUp(self):
        lat, lon, inside = moon_textures.polar_grid(SIZE)
        self.lat = np.degrees(lat)
        self.lon = np.degrees(lon)
        self.inside = inside

    def test_pole_is_at_the_centre(self):
        self.assertAlmostEqual(self.lat[MIDDLE, MIDDLE], -90.0, places=9)

    def test_zero_east_is_at_the_top_and_180_at_the_bottom(self):
        self.assertAlmostEqual(self.lon[0, MIDDLE], 0.0, places=9)
        self.assertAlmostEqual(abs(self.lon[SIZE - 1, MIDDLE]), 180.0, places=9)

    def test_90_east_is_on_the_right_and_90_west_on_the_left(self):
        self.assertAlmostEqual(self.lon[MIDDLE, SIZE - 1], 90.0, places=9)
        self.assertAlmostEqual(self.lon[MIDDLE, 0], -90.0, places=9)

    def test_80_south_is_on_the_rim(self):
        rim_side = self.lat[self.inside].max()
        self.assertLessEqual(rim_side, -80.0)
        self.assertGreater(rim_side, -80.5)
        self.assertTrue((self.lat[~self.inside] > -80.0).all())
        self.assertFalse(self.inside[0, 0])

    def test_every_pixel_agrees_with_the_web_projection(self):
        rim_lat = web_rim_lat_deg()
        self.assertEqual(rim_lat, -(90 - moon_textures.POLAR_RIM_COLAT_DEG))
        axis = (np.arange(SIZE) + 0.5) / SIZE * 2 - 1
        for row in range(0, SIZE, 5):
            for col in range(0, SIZE, 5):
                lat, lon = self.lat[row, col], self.lon[row, col]
                x, y = to_polar_map(lat, lon, rim_lat)
                self.assertAlmostEqual(x, axis[col], places=9)
                self.assertAlmostEqual(y, axis[row], places=9)


class PixelCapTest(unittest.TestCase):
    def test_the_documented_sources_fit_under_the_cap(self):
        for width, height in ((8192, 4096), (5760, 2880)):
            self.assertLessEqual(width * height, Image.MAX_IMAGE_PIXELS)

    def test_the_cap_is_set(self):
        self.assertIsNotNone(Image.MAX_IMAGE_PIXELS)
        self.assertLess(Image.MAX_IMAGE_PIXELS, 2 * 8192 * 4096)

    def test_a_header_above_the_cap_is_refused(self):
        side = math.isqrt(Image.MAX_IMAGE_PIXELS) + 1
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "bomb.pgm"
            # Only the header: Pillow checks the size before reading pixels.
            path.write_bytes(f"P5\n{side} {side}\n255\n".encode())
            with self.assertRaises(Image.DecompressionBombWarning):
                moon_textures.open_source(path)

    def test_a_header_under_the_cap_opens(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "small.pgm"
            Image.new("L", (4, 2)).save(path)
            with moon_textures.open_source(path) as image:
                self.assertEqual(image.size, (4, 2))


if __name__ == "__main__":
    unittest.main()
