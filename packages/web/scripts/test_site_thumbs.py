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

"""Unit tests of the site thumbnails' maths, with no download.

The projection must put each site where the LOLA label's polar
stereographic grid has it (0° E up, 90° E right), or every thumbnail
would show the wrong ground. The windows must frame the site and stay
inside the grid, and only the sites south of the DEM's rim get one.
The cache is fed by a fake server.

  python3 -m unittest discover -s packages/web/scripts -p "test_*.py"
"""

import hashlib
import tempfile
import unittest

import lola_polar
import numpy as np
import site_thumbs
from hillshade import Light
from lola_polar import CHUNK_LINES, POLE_PIXEL, SIZE, StripCache

# IM-2's published touchdown and its pixel in the grid, worked out by hand
# from the label's projection (ASSETS.md).
IM2 = (-84.79, 29.20)
IM2_PIXEL = (8299.33, 19055.87)


def site(site_id, lat, lon_east):
    return {"id": site_id, "lat": lat, "lonEast": lon_east}


class ProjectionTest(unittest.TestCase):
    def test_the_pole_is_the_grid_centre(self):
        line, sample = lola_polar.project(-90.0, 123.0)
        self.assertAlmostEqual(line, POLE_PIXEL, places=6)
        self.assertAlmostEqual(sample, POLE_PIXEL, places=6)

    def test_zero_east_is_up_and_ninety_east_right(self):
        up = lola_polar.project(-85.0, 0.0)
        right = lola_polar.project(-85.0, 90.0)
        self.assertLess(up[0], POLE_PIXEL)
        self.assertAlmostEqual(up[1], POLE_PIXEL, places=6)
        self.assertAlmostEqual(right[0], POLE_PIXEL, places=6)
        self.assertGreater(right[1], POLE_PIXEL)

    def test_the_rim_touches_the_grid_edge(self):
        line, _ = lola_polar.project(-80.0, 0.0)
        self.assertAlmostEqual(line, 0.0, delta=1.0)

    def test_im2_lands_on_its_pixel(self):
        line, sample = lola_polar.project(*IM2)
        self.assertAlmostEqual(line, IM2_PIXEL[0], places=2)
        self.assertAlmostEqual(sample, IM2_PIXEL[1], places=2)


class WindowTest(unittest.TestCase):
    def test_a_30_km_frame_is_1500_pixels_around_the_site(self):
        (l0, l1), (s0, s1) = lola_polar.window(*IM2, 30.0)
        self.assertEqual((l1 - l0, s1 - s0), (1500, 1500))
        self.assertEqual((l0 + l1) // 2, round(IM2_PIXEL[0]))
        self.assertEqual((s0 + s1) // 2, round(IM2_PIXEL[1]))

    def test_a_site_near_the_rim_slides_the_frame_inside(self):
        (l0, l1), _ = lola_polar.window(-80.13, 1.44, 30.0)
        self.assertEqual((l0, l1), (0, 1500))

    def test_chunks_cover_the_lines_and_no_more(self):
        lines = (CHUNK_LINES - 1, 2 * CHUNK_LINES + 1)
        self.assertEqual(list(lola_polar.chunks_of(lines)), [0, 1, 2])

    def test_the_last_chunk_stops_at_the_last_line(self):
        last = (SIZE - 1) // CHUNK_LINES
        _, end = lola_polar.chunk_bytes(last)
        self.assertEqual(end, SIZE * lola_polar.RECORD_BYTES - 1)


class GroupsTest(unittest.TestCase):
    def setUp(self):
        self.groups = site_thumbs.thumb_groups(
            [
                site("apollo11", 0.67, 23.47),
                site("rim-a", -80.13, 1.44),
                site("artemis-haworth", -87.45, -5.17),
                site("plateau", -84.6, 31.0),
                site("mouton", -84.6, 31.0),
            ]
        )

    def test_only_sites_south_of_the_rim_get_a_thumbnail(self):
        files = [group["file"] for group in self.groups]
        self.assertEqual(files, ["rim-a.jpg", "artemis-haworth.jpg", "plateau.jpg"])

    def test_sites_on_one_point_share_the_first_ones_file(self):
        entries = site_thumbs.manifest(self.groups)
        self.assertEqual(entries["mouton"]["file"], "plateau.jpg")
        self.assertEqual(entries["plateau"]["file"], "plateau.jpg")

    def test_haworth_keeps_its_wide_frame_and_its_own_light(self):
        haworth = self.groups[1]
        self.assertEqual(haworth["frame_km"], 62.0)
        self.assertEqual(haworth["light"], Light(5.0, 270.0, 0.6))
        self.assertEqual(self.groups[0]["frame_km"], 30.0)


class FakeResponse:
    def __init__(self, data, status):
        self.data, self.status = data, status

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def read(self):
        return self.data


class CacheTest(unittest.TestCase):
    """Two chunks of a fake product whose DN is the line number."""

    def setUp(self):
        self.calls = []
        self.tmp = tempfile.TemporaryDirectory()
        self.cache = StripCache(self.tmp.name, opener=self.serve)

    def tearDown(self):
        self.tmp.cleanup()

    def serve(self, request, timeout):
        first, last = map(int, request.get_header("Range")[6:].split("-"))
        self.calls.append(first)
        lines = np.arange(first, last + 1, dtype=np.int64) // lola_polar.RECORD_BYTES
        return FakeResponse(lines.astype("<i2")[::2].tobytes(), 206)

    def test_a_crop_reads_heights_in_metres_across_chunks(self):
        lines = (CHUNK_LINES - 2, CHUNK_LINES + 2)
        crop = self.cache.heights(lines, (10, 13))
        self.assertEqual(crop.shape, (4, 3))
        expected = np.arange(*lines, dtype=np.float32) * 0.5
        np.testing.assert_array_equal(crop[:, 0], expected)

    def test_a_cached_chunk_is_not_fetched_again_and_its_sum_is_kept(self):
        data = self.cache.chunk(0)
        self.cache.chunk(0)
        self.assertEqual(len(self.calls), 1)
        again = StripCache(self.tmp.name, opener=self.serve)
        name = next(iter(again.sums))
        self.assertEqual(again.sums[name], hashlib.sha256(data).hexdigest())

    def test_a_short_answer_is_refused(self):
        def short(request, timeout):
            return FakeResponse(b"\0\0", 206)

        with self.assertRaises(OSError):
            StripCache(self.tmp.name, opener=short).chunk(0)


if __name__ == "__main__":
    unittest.main()
