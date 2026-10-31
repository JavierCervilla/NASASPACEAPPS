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

"""Unit tests of the app icon's geometry and the phase frames' lighting.

python3 -m unittest discover -s packages/web/scripts -p "test_*.py"
"""

import math
import unittest
from itertools import pairwise

import app_icons
import numpy as np


def flat_maps(size=64):
    """A uniform grey Moon with flat relief."""
    albedo = np.full((size, size * 2), 0.6, np.float32)
    normals = np.zeros((size, size * 2, 3), np.float32)
    normals[..., 2] = 1
    return albedo, normals


class PhaseSunTest(unittest.TestCase):
    def test_new_moon_is_lit_from_behind(self):
        self.assertEqual(app_icons.phase_sun(0.0), (0.0, 0.0, -1.0))

    def test_first_quarter_is_lit_on_the_right(self):
        x, _, z = app_icons.phase_sun(0.25)
        self.assertAlmostEqual(x, 1.0)
        self.assertAlmostEqual(z, 0.0)

    def test_full_moon_faces_the_sun(self):
        self.assertAlmostEqual(app_icons.phase_sun(0.5)[2], 1.0)


class RenderTest(unittest.TestCase):
    def test_a_waxing_moon_is_brighter_on_the_right(self):
        moon = app_icons.render_moon(
            flat_maps(), 32, app_icons.phase_sun(0.2), 0.0, 0.06
        )
        pixels = np.asarray(moon, np.float32)
        self.assertGreater(pixels[16, 26, 0], pixels[16, 6, 0])

    def test_the_dark_side_keeps_earthshine(self):
        moon = app_icons.render_moon(
            flat_maps(), 32, app_icons.phase_sun(0.0), 0.0, 0.06
        )
        centre = np.asarray(moon)[16, 16]
        self.assertGreater(centre[0], 0)
        self.assertEqual(centre[3], 255)

    def test_outside_the_disk_is_transparent(self):
        moon = app_icons.render_moon(flat_maps(), 32, (0, 0, 1), 0.0)
        self.assertEqual(np.asarray(moon)[0, 0, 3], 0)


class RingTest(unittest.TestCase):
    def test_arcs_start_at_twelve_and_turn_clockwise(self):
        x, y = app_icons.arc_end(512, 372, 0)
        self.assertAlmostEqual(x, 512)
        self.assertAlmostEqual(y, 140)
        x, y = app_icons.arc_end(512, 372, 90)
        self.assertAlmostEqual(x, 884)
        self.assertAlmostEqual(y, 512)

    def test_the_maskable_ring_fits_the_safe_zone(self):
        outer = (
            app_icons.RING_RADIUS + app_icons.RING_WIDTH / 2
        ) * app_icons.MASKABLE_SCALE
        self.assertLess(outer, 0.4 * app_icons.CANVAS)

    def test_the_legend_covers_half_the_ring_without_gaps(self):
        spans = [(start, end) for _, start, end in app_icons.ARCS]
        self.assertEqual(spans[0][0], 0)
        for (_, end), (start, _) in pairwise(spans):
            self.assertEqual(end, start)
        self.assertEqual(spans[-1][1], 180)
        self.assertTrue(math.isclose(sum(e - s for s, e in spans), 180))


if __name__ == "__main__":
    unittest.main()
