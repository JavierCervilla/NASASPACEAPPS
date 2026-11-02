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

"""Unit tests of the on-foot view's model bake (VENT-34): the source pins,
GLB packing and audit, the Meshy astronaut's decal cleaning, and the
shipped models in packages/web/models/ (budgets, the page reader's glTF
subset or the skin's limits, real sizes, no decals).

python3 -m unittest discover -s packages/web/scripts -p "test_*.py"
"""

import tempfile
import unittest
from pathlib import Path

import astronaut_meshy_clean as decals
import numpy as np
import onfoot_models as om
from PIL import Image

PINNED = "379101dfcee399267addf771709107c35e826b0b9e5233272f123e4c8a585c4e"
MESHY_PINNED = "9acf2bd95ff4018c2f7e1202add3d688ce204d0cea92d78957095324bb81f291"
MESHY = "astronaut-meshy"
FLAG_CHROMA = 0.2
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
DTYPES = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}


def load(name):
    return om.read_glb((om.MODELS / f"{name}.glb").read_bytes())[0]


def bounds(gltf):
    """(min, max) of the one mesh's positions, glTF axes (Y up)."""
    lows, highs = [], []
    for primitive in gltf["meshes"][0]["primitives"]:
        accessor = gltf["accessors"][primitive["attributes"]["POSITION"]]
        lows.append(accessor["min"])
        highs.append(accessor["max"])
    return (
        [min(v[i] for v in lows) for i in range(3)],
        [max(v[i] for v in highs) for i in range(3)],
    )


def accessor(gltf, binary, index):
    """An accessor's items as an (count, components) array."""
    acc = gltf["accessors"][index]
    view = gltf["bufferViews"][acc["bufferView"]]
    width = COMPONENTS[acc["type"]]
    dtype = np.dtype(DTYPES[acc["componentType"]])
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride", width * dtype.itemsize)
    rows = [
        np.frombuffer(binary, dtype, width, start + i * stride)
        for i in range(acc["count"])
    ]
    return np.array(rows)


def meshy_rest():
    """The Meshy astronaut's triangles (rest pose, metres) and UVs."""
    data = (om.MODELS / f"{MESHY}.glb").read_bytes()
    gltf, binary = om.read_glb(data)
    (primitive,) = gltf["meshes"][0]["primitives"]
    # A skinned mesh's node transform is ignored: its joints and inverse
    # binds cancel the armature's 0.01, so positions are already metres.
    pos = accessor(gltf, binary, primitive["attributes"]["POSITION"])
    uv = accessor(gltf, binary, primitive["attributes"]["TEXCOORD_0"])
    tris = accessor(gltf, binary, primitive["indices"]).reshape(-1, 3)
    return gltf, pos[tris], uv[tris]


class SourceTest(unittest.TestCase):
    def test_the_lm_source_is_pinned(self):
        self.assertEqual(om.SOURCE_SHA256, PINNED)

    def test_the_meshy_source_is_pinned(self):
        self.assertEqual(om.MESHY_SOURCE_SHA256, MESHY_PINNED)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "animations.glb"
            path.write_bytes(b"not Meshy's")
            with self.assertRaisesRegex(om.BakeError, "not the pinned one"):
                om.check_source(path, om.MESHY_SOURCE_SHA256)

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


class SkinTest(unittest.TestCase):
    def skinned(
        self, joints=24, attrs=("JOINTS_0", "WEIGHTS_0"), clips=("idle", "walk")
    ):
        accessors = [{"componentType": om.UINT16}, {"componentType": om.FLOAT}]
        primitive = {
            "indices": 0,
            "attributes": {"TEXCOORD_0": 1, **dict.fromkeys(attrs, 1)},
        }
        return {
            "meshes": [{"primitives": [primitive]}],
            "skins": [{"joints": list(range(joints))}],
            "accessors": accessors,
            "animations": [{"name": c} for c in clips],
        }

    def test_a_skinned_model_within_its_limits_passes(self):
        self.assertEqual(om.skin_problems(self.skinned(), ("idle", "walk")), [])

    def test_too_many_joints_influences_or_wrong_clips_are_refused(self):
        clips = ("idle", "walk")
        self.assertIn("more than 64 joints", om.skin_problems(self.skinned(65), clips))
        eight = self.skinned(attrs=("JOINTS_0", "WEIGHTS_0", "JOINTS_1"))
        self.assertIn("not four influences a vertex", om.skin_problems(eight, clips))
        renamed = om.skin_problems(self.skinned(clips=("Idle", "walk")), clips)
        self.assertTrue([p for p in renamed if p.startswith("clips")])


class DecalCleanTest(unittest.TestCase):
    def test_a_decal_in_a_region_becomes_its_fabric_and_nothing_else_moves(self):
        size = 64
        base = np.full((size, size, 4), 0.86, np.float32)
        base[20:30, 20:30, :3] = [0.8, 0.1, 0.1]
        other = base.copy()
        positions = np.zeros((size, size, 3))
        positions[:, :32] = [1.0, 1.0, 0.0]
        regions = {"flag": ((1.0, 1.0, 0.0), 0.05, "colour")}
        normal = np.full((size, size, 4), 0.5, np.float32)
        normal[22:28, 22:28, :3] = 0.9
        maps = {"base_color": base, "normal": normal}
        cleaned, report = decals.clean(maps, positions, regions)
        self.assertTrue(np.allclose(cleaned["base_color"][15:35, 15:32], 0.86))
        self.assertTrue(np.allclose(cleaned["normal"][15:35, 15:32], 0.5))
        self.assertTrue(np.array_equal(cleaned["base_color"][:, 33:], other[:, 33:]))
        self.assertGreater(report["flag"]["texels"], 100)

    def test_a_region_without_a_decal_is_refused(self):
        maps = {"base_color": np.full((8, 8, 4), 0.86, np.float32)}
        positions = np.zeros((8, 8, 3))
        regions = {"flag": ((0.0, 0.0, 0.0), 0.05, "colour")}
        with self.assertRaisesRegex(ValueError, "no decal"):
            decals.clean(maps, positions, regions)

    def test_a_uv_triangle_covers_its_texels(self):
        faces = decals.face_map(np.array([[[0, 0], [1, 0], [0, 1]]], float), 8)
        self.assertEqual(faces[1, 1], 0)
        self.assertEqual(faces[7, 7], -1)


class ShippedTest(unittest.TestCase):
    def test_every_model_is_within_its_budgets_and_the_reader_subset(self):
        report = om.audit(om.MODELS)
        self.assertEqual(sorted(report), sorted(om.NAMES))

    def test_the_astronaut_stands_on_the_origin_at_suit_height(self):
        low, high = bounds(load("astronaut-v2"))
        self.assertAlmostEqual(low[1], 0.0, places=3)
        self.assertTrue(1.8 < high[1] < 2.0, high[1])

    def test_the_visor_is_gold_metal_without_maps(self):
        (visor,) = [
            m for m in load("astronaut-v2")["materials"] if m["name"] == "visor_gold"
        ]
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
        self.assertEqual(
            sorted(names), ["BOOSTER3", "foil_metal_roughness", "foil_normal"]
        )


class ShippedMeshyTest(unittest.TestCase):
    def test_it_stands_on_the_origin_at_suit_height(self):
        _, tri_pos, _ = meshy_rest()
        low, high = tri_pos.reshape(-1, 3).min(0), tri_pos.reshape(-1, 3).max(0)
        self.assertAlmostEqual(low[1], 0.0, delta=0.02)
        self.assertAlmostEqual(high[1], 1.91, delta=0.05)

    def test_it_is_skinned_with_its_two_clips(self):
        gltf, _, _ = meshy_rest()
        self.assertEqual(om.skin_problems(gltf, ("idle", "walk")), [])
        self.assertLessEqual(len(gltf["skins"][0]["joints"]), om.JOINT_BUDGET)

    def test_no_decal_texel_is_left_in_any_region(self):
        """Every texel on the triangles of a flag's region is fabric, not
        flag colour; every one on the label's is not ink."""
        gltf, tri_pos, tri_uv = meshy_rest()
        material = gltf["materials"][0]
        index = material["pbrMetallicRoughness"]["baseColorTexture"]["index"]
        source = gltf["textures"][index]["extensions"][om.WEBP]["source"]
        image = Image.open(om.MODELS / gltf["images"][source]["uri"]).convert("RGB")
        rgb = np.asarray(image, np.float32) / 255
        faces = decals.face_map(tri_uv, rgb.shape[0])
        positions = decals.texel_positions(faces, tri_pos)
        for name, (centre, radius, kind) in decals.REGIONS.items():
            dist = np.linalg.norm(positions - np.asarray(centre), axis=2)
            inside = np.nan_to_num(dist, nan=np.inf) < radius
            self.assertGreater(inside.sum(), 50, name)
            if kind == "colour":
                # Lossy WebP leaves the fabric a faint warm tint at island
                # edges (chroma about 0.1); a flag's red or blue is far over.
                left = inside & (rgb.max(axis=2) - rgb.min(axis=2) > FLAG_CHROMA)
            else:
                left = decals.decal_mask(rgb, inside, kind)
            self.assertEqual(int(left.sum()), 0, name)


if __name__ == "__main__":
    unittest.main()
