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

"""Unit tests of the on-foot view's model bake (VENT-34): the source pin,
GLB packing and audit, and the shipped models in packages/web/models/
(budgets, the page reader's glTF subset, real sizes, no decals).

python3 -m unittest discover -s packages/web/scripts -p "test_*.py"
"""

import tempfile
import unittest
from pathlib import Path

import onfoot_models as om

PINNED = "379101dfcee399267addf771709107c35e826b0b9e5233272f123e4c8a585c4e"


def load(name):
    return om.read_glb((om.MODELS / f"{name}.glb").read_bytes())[0]


def bounds(gltf):
    """(min, max) of the one mesh's positions, glTF axes (Y up)."""
    lows, highs = [], []
    for primitive in gltf["meshes"][0]["primitives"]:
        accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
        lows.append(accessor["min"])
        highs.append(accessor["max"])
    return ([min(v[i] for v in lows) for i in range(3)],
            [max(v[i] for v in highs) for i in range(3)])


class SourceTest(unittest.TestCase):
    def test_the_lm_source_is_pinned(self):
        self.assertEqual(om.SOURCE_SHA256, PINNED)

    def test_a_missing_or_changed_source_is_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "apollo-lm.glb"
            with self.assertRaisesRegex(om.BakeError, "missing"):
                om.check_source(path)
            path.write_bytes(b"not the LM")
            with self.assertRaisesRegex(om.BakeError, "not the pinned one"):
                om.check_source(path)


class PackTest(unittest.TestCase):
    def test_a_glb_reads_back_what_was_written(self):
        gltf = {"asset": {"version": "2.0"}, "buffers": [{"byteLength": 3}]}
        back, binary = om.read_glb(om.write_glb(gltf, b"abc"))
        self.assertEqual(back, gltf)
        self.assertEqual(binary, b"abc\x00")

    def test_maps_go_on_every_material_but_the_unmapped(self):
        gltf = {"materials": [{"name": "suit"}, {"name": "visor"}]}
        om.add_textures(gltf, {"ao": "a.webp", "normal": "n.webp"}, {"visor"})
        suit, visor = gltf["materials"]
        self.assertEqual(suit["occlusionTexture"], {"index": 0})
        self.assertEqual(suit["normalTexture"], {"index": 1})
        self.assertNotIn("normalTexture", visor)
        self.assertEqual([i["uri"] for i in gltf["images"]], ["a.webp", "n.webp"])

    def test_the_reader_subset_refuses_a_rotated_node(self):
        gltf = {"meshes": [{"primitives": []}], "nodes": [{"rotation": [0, 0, 0, 1]}]}
        self.assertIn("the node is rotated", om.reader_problems(gltf))


class ShippedTest(unittest.TestCase):
    def test_every_model_is_within_its_budgets_and_the_reader_subset(self):
        report = om.audit(om.MODELS)
        self.assertEqual(sorted(report), sorted(om.NAMES))

    def test_the_astronaut_stands_on_the_origin_at_suit_height(self):
        low, high = bounds(load("astronaut-v2"))
        self.assertAlmostEqual(low[1], 0.0, places=3)
        self.assertTrue(1.8 < high[1] < 2.0, high[1])

    def test_the_visor_is_gold_metal_without_maps(self):
        (visor,) = [m for m in load("astronaut-v2")["materials"]
                    if m["name"] == "visor_gold"]
        self.assertEqual(visor["pbrMetallicRoughness"].get("metallicFactor", 1), 1)
        self.assertNotIn("normalTexture", visor)

    def test_the_lander_is_a_nova_c_class_lander_at_real_scale(self):
        low, high = bounds(load("lander"))
        self.assertAlmostEqual(low[1], 0.0, places=3)
        self.assertTrue(4.2 < high[1] < 4.4, high[1])

    def test_the_lm_spans_its_gear_at_real_scale_on_its_footpads(self):
        low, high = bounds(load("apollo-lm"))
        # Decimation after the fit may move a pad's rim a millimetre or so.
        self.assertAlmostEqual(low[1], 0.0, places=2)
        self.assertAlmostEqual(max(high[0] - low[0], high[2] - low[2]), 9.4, places=2)

    def test_the_lm_keeps_no_flag_or_lettering_texture(self):
        """The flag (TEXTURE_) and «UNITED STATES» (TEXTUREA) decals are
        gone: no image is left on their materials, which are plain foil."""
        gltf = load("apollo-lm")
        names = [image.get("name", "") for image in gltf.get("images", [])]
        self.assertFalse([n for n in names if n.startswith(("TEXTURE_", "TEXTUREA"))])
        for mat in gltf["materials"]:
            if mat["name"].startswith(("blinn12SG", "blinn8SG")):
                base = mat["pbrMetallicRoughness"].get("baseColorTexture")
                self.assertIsNone(base, mat["name"])
        self.assertEqual(sorted(names), ["BOOSTER3", "foil_metal_roughness", "foil_normal"])


if __name__ == "__main__":
    unittest.main()
