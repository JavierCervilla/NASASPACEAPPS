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

"""The Meshy astronaut for the on-foot view (VENT-34): rigged and animated.

Runs inside Blender 5.2: onfoot_blender.py calls build(source) with
Meshy's animation GLB (the textured, rigged figure with its clips), whose
sha256 onfoot_models.py has already checked. Meshy made it on the
project owner's paid plan: text to 3D (preview, then refine with PBR
maps), auto-rigging at 1.91 m and three library clips (ASSETS.md).

The figure keeps Meshy's skeleton (24 joints, at most four per vertex)
and its rest pose. Its atlas loses its decals (astronaut_meshy_clean.py:
the flags on the upper arms and the label on the chest box) in all three
maps, which are then cut to TEXTURE_PX. The mesh is collapsed to about
TARGET_TRIANGLES and shaded smooth again (the collapse leaves creases,
a hard seam down the visor among them). The hard upper torso, the helmet and
the backpack are bound to the upper spine, as on a real suit where they
are one rigid shell, through smooth ramps (Meshy's weights bent and tore
them with the neck and the spine). The idle keeps only IDLE_SWING of its
spine's turn from the rest pose, so the figure stands upright. Two clips stay, renamed: «Idle» as `idle` (it brings
the arms down to the sides) and «Casual_Walk» as `walk`, walked in
place (its hips' drift taken out, their bob kept). The armature keeps
Meshy's centimetre bones under a 0.01 scale, so the figure is in metres.
"""

import math
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import astronaut_meshy_clean as decals

TARGET_TRIANGLES = 24_900
SMOOTH_DEG = 50
# The suit's rigid shell, bound to the bone under the neck: the hard upper
# torso, the helmet on it and the backpack behind it (rest pose, glTF
# metres). Each edge is a smooth ramp of RAMP_M over which Meshy's weights
# hand over, so no seam tears; the arms (out in the rest pose) stay free.
RAMP_M = 0.05
SHELL = {
    "torso": {"y": 1.12, "abs_x": 0.22},
    "helmet": {"y": 1.5, "abs_x": 0.26},
    "backpack": {"back_z": -0.12, "y": 0.92, "abs_x": 0.34},
}
# The idle clip stoops, the spine bent far forward: its hips', spine's and
# head's rotations keep this share of their turn from the upright rest
# pose, so it still breathes and sways without slumping.
IDLE = "idle"
IDLE_SWING = 0.25
IDLE_BONES = ("Hips", "Spine02", "Spine01", "Spine", "neck", "Head")
TEXTURE_PX = 1024
MAX_INFLUENCES = 4
CLIPS = {"Idle": "idle", "Casual_Walk": "walk"}
WALK = "walk"
ROOT_BONE = "Hips"


def import_figure(path):
    """The armature and its skinned mesh; anything else imported goes."""
    bpy.ops.import_scene.gltf(filepath=str(path))
    armature = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    body = next(
        o for o in bpy.data.objects if o.type == "MESH" and o.parent == armature
    )
    for obj in list(bpy.data.objects):
        if obj not in (armature, body):
            bpy.data.objects.remove(obj)
    body.name = body.data.name = "astronaut-meshy"
    return armature, body


def triangles(body):
    body.data.calc_loop_triangles()
    return len(body.data.loop_triangles)


def rest_triangles(body):
    """Each triangle's corners in glTF metres (+Y up) and glTF UVs."""
    mesh = body.data
    mesh.calc_loop_triangles()
    world = np.array(body.matrix_world)
    co = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3) @ world[:3, :3].T + world[:3, 3]
    gltf = np.column_stack([co[:, 0], co[:, 2], -co[:, 1]])
    uv = np.empty(len(mesh.loops) * 2)
    mesh.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2) * [1, -1] + [0, 1]
    tris = np.array([t.vertices[:] for t in mesh.loop_triangles])
    loops = np.array([t.loops[:] for t in mesh.loop_triangles])
    return gltf[tris], uv[loops]


def material_images(body):
    """{map: image} of the figure's one material."""
    nodes = body.data.materials[0].node_tree.nodes
    found = {}
    for node in nodes:
        if node.type != "TEX_IMAGE" or not node.image:
            continue
        target = node.outputs["Color"].links[0].to_node
        if target.type == "BSDF_PRINCIPLED":
            found["base_color"] = node.image
        elif target.type == "NORMAL_MAP":
            found["normal"] = node.image
        else:
            found["metal_roughness"] = node.image
    return found


def pixels(image):
    """(h, w, 4) as stored, row 0 at the top (glTF's image layout)."""
    width, height = image.size
    data = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(data)
    return data.reshape(height, width, 4)[::-1]


def clean_atlas(body):
    """Paints the decals out of every map, then cuts each to TEXTURE_PX."""
    images = material_images(body)
    size = images["base_color"].size[0]
    tri_pos, tri_uv = rest_triangles(body)
    positions = decals.texel_positions(decals.face_map(tri_uv, size), tri_pos)
    maps = {key: pixels(image) for key, image in images.items()}
    cleaned, report = decals.clean(maps, positions)
    for key, image in images.items():
        image.pixels.foreach_set(np.ascontiguousarray(cleaned[key][::-1]).ravel())
        image.scale(TEXTURE_PX, TEXTURE_PX)
        image.pack()
    return report


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def decimate(body):
    """Collapses the mesh to about TARGET_TRIANGLES, before the skin."""
    select_only(body)
    mod = body.modifiers.new("decimate", "DECIMATE")
    mod.ratio = TARGET_TRIANGLES / triangles(body)
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def smooth(body):
    """Smooth normals, recomputed: sharp only past SMOOTH_DEG."""
    select_only(body)
    if body.data.has_custom_normals:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(SMOOTH_DEG))


def rest_vertices(body):
    """Every vertex's rest position, glTF metres (+Y up, front +Z)."""
    world = np.array(body.matrix_world)
    co = np.empty(len(body.data.vertices) * 3)
    body.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3) @ world[:3, :3].T + world[:3, 3]
    return np.column_stack([co[:, 0], co[:, 2], -co[:, 1]])


def above(value, edge):
    """0 under `edge`, 1 from RAMP_M over it, smooth between."""
    t = np.clip((value - edge) / RAMP_M, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def shell_share(pos):
    """How much each vertex belongs to the rigid shell, 0..1."""
    x, y, z = np.abs(pos[:, 0]), pos[:, 1], pos[:, 2]
    torso, helmet, pack = SHELL["torso"], SHELL["helmet"], SHELL["backpack"]
    return np.maximum.reduce(
        [
            above(y, torso["y"]) * above(-x, -torso["abs_x"]),
            above(y, helmet["y"]) * above(-x, -helmet["abs_x"]),
            above(-z, -pack["back_z"])
            * above(y, pack["y"])
            * above(-x, -pack["abs_x"]),
        ]
    )


def rigid_shell(body, armature):
    """Hands each vertex's weights over to the bone under the neck by its
    shell share; returns the bone and how many vertices are wholly rigid."""
    upper = armature.data.bones["neck"].parent.name
    share = shell_share(rest_vertices(body))
    target = body.vertex_groups.get(upper) or body.vertex_groups.new(name=upper)
    names = {g.index: g for g in body.vertex_groups}
    for vertex, rigid in zip(body.data.vertices, share):
        if rigid <= 0:
            continue
        own = {e.group: e.weight for e in vertex.groups}
        for index, weight in own.items():
            names[index].add([vertex.index], weight * (1 - rigid), "REPLACE")
        kept = own.get(target.index, 0.0) * (1 - rigid)
        target.add([vertex.index], kept + rigid, "REPLACE")
    return {"bone": upper, "rigid": int((share >= 1).sum())}


def calm_idle(action):
    """Keeps IDLE_SWING of the hips', spine's and head's rotations in the
    idle, measured from the rest pose (the identity quaternion)."""
    paths = {f'pose.bones["{b}"].rotation_quaternion' for b in IDLE_BONES}
    for curve in fcurves(action):
        if curve.data_path not in paths:
            continue
        rest = 1.0 if curve.array_index == 0 else 0.0
        for key in curve.keyframe_points:
            for point in (key.co, key.handle_left, key.handle_right):
                point[1] = rest + IDLE_SWING * (point[1] - rest)


def limit_influences(body):
    select_only(body)
    bpy.ops.object.vertex_group_limit_total(
        group_select_mode="ALL", limit=MAX_INFLUENCES
    )
    bpy.ops.object.vertex_group_normalize_all(
        group_select_mode="ALL", lock_active=False
    )


def fcurves(action):
    """Every F-curve of a (layered) action."""
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves += list(bag.fcurves)
    return curves


def walk_in_place(action):
    """Takes the straight drift out of the root bone's location (the
    walk's advance), keeping its bob and sway; a loop has none to take."""
    path = f'pose.bones["{ROOT_BONE}"].location'
    for curve in fcurves(action):
        if curve.data_path != path or len(curve.keyframe_points) < 2:
            continue
        keys = curve.keyframe_points
        (t0, v0), (t1, v1) = keys[0].co, keys[-1].co
        slope = (v1 - v0) / (t1 - t0)
        for key in keys:
            drift = slope * (key.co[0] - t0)
            key.co[1] -= drift
            key.handle_left[1] -= drift
            key.handle_right[1] -= drift


def keep_clips(armature):
    """The two clips under their names; the others go."""
    for action in list(bpy.data.actions):
        if action.name not in CLIPS:
            bpy.data.actions.remove(action)
            continue
        action.name = CLIPS[action.name]
        action.use_fake_user = True
        if action.name == WALK:
            walk_in_place(action)
        if action.name == IDLE:
            calm_idle(action)
    armature.animation_data.action = bpy.data.actions["idle"]
    return sorted(a.name for a in bpy.data.actions)


def build(source):
    """The armature and the cleaned, decimated body; and what was done."""
    armature, body = import_figure(source)
    before = triangles(body)
    report = clean_atlas(body)
    decimate(body)
    smooth(body)
    rigid = rigid_shell(body, armature)
    limit_influences(body)
    clips = keep_clips(armature)
    return (
        armature,
        body,
        {
            "source_triangles": before,
            "decals": report,
            "rigid": rigid,
            "clips": clips,
            "joints": len(armature.data.bones),
        },
    )
