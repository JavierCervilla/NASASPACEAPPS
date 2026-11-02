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

"""NASA's Apollo Lunar Module for the on-foot view's Apollo sites (VENT-34).

Runs inside Blender 5.2: onfoot_blender.py calls build(source) with NASA
3D Resources' «Apollo Lunar Module» GLB, whose sha256 onfoot_models.py
has already checked. Ported from Mooner (JavierCervilla/Mooner,
packages/web/scripts/module_models_blender.py at commit cc528da), with
three changes: real metres instead of a game cell, the two decals turned
into flat colour instead of painted textures (nothing is left to load),
and a budget of TRIANGLE_BUDGET.

The model's two decal textures, a US flag (`TEXTURE_`) and the
«UNITED STATES» lettering (`TEXTUREA`), each sit on a flat gold foil
field: their materials lose the texture and take the field's colour, so
no flag, lettering or insignia remains. The striped booster texture
(`BOOSTER3`) stays, cut to TEXTURE_PX. The gold and orange foil wear the
generated crumpled-foil maps (foil_maps.py), the grey panels the same
normals, fainter.
"""

import math
import sys
from pathlib import Path

import numpy as np

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import foil_maps  # noqa: E402  (Blender's Python ships NumPy)

TRIANGLE_BUDGET = 25_000
# Across the landing gear, footpad to footpad (NASA: 9.4 m diagonally
# across the gear); the model's legs lie on its X and Y axes.
SPAN_M = 9.4
TEXTURE_PX = 512
SHARP_DEG = 40
DECAL_IMAGES = ("TEXTURE_", "TEXTUREA")
# The decal materials (blinn12SG, blinn8SG) become foil like the field
# they sat on, so the patch where the flag was reads as more blanket.
FOIL_MATERIALS = ("blinn1SG", "blinn9SG", "blinn12SG", "blinn8SG")
PANEL_MATERIALS = ("blinn4SG", "blinn3SG")
FOIL_PX = 512
# Crinkles per metre of height: Mooner's 5 across a 23 m-high cell model
# would be 0.7 per metre here, too coarse at real size.
FOIL_REPEATS_PER_M = 0.8
PANEL_NORMAL = 0.35


def import_joined(path):
    """NASA's model as one object, its transforms applied."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    for obj in [o for o in bpy.data.objects if o not in before and o != body]:
        bpy.data.objects.remove(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    body.name = body.data.name = "apollo-lm"
    return body


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def field_colour(image):
    """The image's most common colour (its foil field), 0..1 as stored."""
    rgba = np.empty(len(image.pixels), dtype=np.float32)
    image.pixels.foreach_get(rgba)
    levels = np.round(rgba.reshape(-1, 4)[:, :3] * 255).astype(np.int64)
    keys = (levels[:, 0] << 16) | (levels[:, 1] << 8) | levels[:, 2]
    values, counts = np.unique(keys, return_counts=True)
    key = int(values[counts.argmax()])
    return [((key >> shift) & 255) / 255 for shift in (16, 8, 0)]


def flatten_decals(mat):
    """A decal material loses its texture and wears its field's colour;
    {image name: field colour (sRGB 0..255)}."""
    nodes = mat.node_tree.nodes
    decals = [n for n in nodes if n.type == "TEX_IMAGE" and n.image
              and n.image.name.startswith(DECAL_IMAGES)]
    flattened = {}
    for node in decals:
        colour = field_colour(node.image)
        bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
        linear = [srgb_to_linear(c) for c in colour]
        if node.image.colorspace_settings.name != "sRGB":
            linear = colour
        bsdf.inputs["Base Color"].default_value = (*linear, 1.0)
        flattened[node.image.name] = [round(c * 255) for c in colour]
        image = node.image
        nodes.remove(node)
        bpy.data.images.remove(image)
    return flattened


def cut_textures(mat):
    """Cuts every image texture of `mat` to TEXTURE_PX at most."""
    for node in mat.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image and max(node.image.size) > TEXTURE_PX:
            width, height = node.image.size
            scale = TEXTURE_PX / max(width, height)
            node.image.scale(max(1, round(width * scale)), max(1, round(height * scale)))


def foil_image(name, rgb):
    """A Non-Color image from an (n, n, 3) array of 0..1 floats."""
    size = rgb.shape[0]
    image = bpy.data.images.new(name, size, size, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    rgba = np.dstack([rgb[::-1], np.ones((size, size))]).astype(np.float32)
    image.pixels.foreach_set(rgba.ravel())
    image.pack()
    return image


def foil_nodes(mat, images, shiny):
    """The foil normal map into `mat`; if `shiny`, also the
    metal-roughness map (glTF's G and B)."""
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    normal_tex, normal = nodes.new("ShaderNodeTexImage"), nodes.new("ShaderNodeNormalMap")
    normal_tex.image = images["normal"]
    normal.inputs["Strength"].default_value = 1.0 if shiny else PANEL_NORMAL
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    if shiny:
        mr_tex, split = nodes.new("ShaderNodeTexImage"), nodes.new("ShaderNodeSeparateColor")
        mr_tex.image = images["metal_roughness"]
        links.new(mr_tex.outputs["Color"], split.inputs["Color"])
        links.new(split.outputs["Green"], bsdf.inputs["Roughness"])
        links.new(split.outputs["Blue"], bsdf.inputs["Metallic"])


def box_project(body, indices, cube_size):
    """Box-projects the UVs of the faces whose material is in `indices`."""
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(body.data)
    for face in bm.faces:
        face.select = face.material_index in indices
    bmesh.update_edit_mesh(body.data)
    bpy.ops.uv.cube_project(cube_size=cube_size, correct_aspect=True,
                            scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")


def crumple(body):
    """Foil and panels wear the generated crumpled-foil maps."""
    images = {"normal": foil_image("foil_normal", foil_maps.normal_map(FOIL_PX)),
              "metal_roughness": foil_image("foil_metal_roughness",
                                            foil_maps.metal_roughness_map(FOIL_PX))}
    worn = {}
    for index, mat in enumerate(body.data.materials):
        shiny = mat.name.startswith(FOIL_MATERIALS)
        if shiny or mat.name.startswith(PANEL_MATERIALS):
            foil_nodes(mat, images, shiny)
            worn[index] = mat.name
    box_project(body, set(worn), 1 / FOIL_REPEATS_PER_M)
    return sorted(worn.values())


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def decimate(body, budget):
    """Collapses `body` to `budget` triangles at most (a few passes)."""
    for _ in range(6):
        count = triangles(body)
        if count <= budget:
            return
        modifier = body.modifiers.new("decimate", "DECIMATE")
        modifier.ratio = budget / count * 0.97
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_apply(modifier="decimate")
    raise RuntimeError(f"{body.name}: {triangles(body)} triangles > {budget}")


def to_real_size(body):
    """Scales the model so its gear spans SPAN_M and sets its footpads on
    Z = 0, centred on the origin."""
    corners = [body.matrix_world @ Vector(c) for c in body.bound_box]
    low = Vector([min(c[i] for c in corners) for i in range(3)])
    high = Vector([max(c[i] for c in corners) for i in range(3)])
    scale = SPAN_M / max(high.x - low.x, high.y - low.y)
    centre = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
    body.location = -centre * scale
    body.scale = (scale, scale, scale)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return scale


def smooth_by_angle(body):
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(SHARP_DEG),
                                         keep_sharp_edges=True)


def build(source):
    """The LM as one object at real size; what was done to it."""
    body = import_joined(source)
    flattened = {}
    for mat in body.data.materials:
        flattened.update(flatten_decals(mat))
        cut_textures(mat)
    scale = to_real_size(body)
    foil = crumple(body)
    decimate(body, TRIANGLE_BUDGET)
    smooth_by_angle(body)
    return body, {"decals_flattened": flattened, "foil": foil,
                  "scale": round(scale, 4)}
