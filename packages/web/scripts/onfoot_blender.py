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

"""The Blender half of onfoot_models.py (VENT-34): runs inside Blender 5.2.

Never run by hand: onfoot_models.py calls

  blender -b --factory-startup --python onfoot_blender.py -- <job.json>

A model built from code (astronaut_model.py, lander_model.py) is joined
into one object, unwrapped into one atlas, and its ambient occlusion and
its fine surface (suit wrinkles, crinkled foil: procedural bump only
used for the bake) baked by Cycles into two images: `<name>-ao.webp`
and `<name>-normal.webp` (tangent space, OpenGL). The Apollo LM is
imported from NASA's model (apollo_lm_model.py). Each is exported as
glTF with separate files (`<name>.gltf`, `.bin`, images), which
onfoot_models.py packs into the GLB the page reads. With `previews`, the
packed GLBs are imported again and rendered from four sides.
"""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import apollo_lm_model
import astronaut_meshy_model
import astronaut_model
import lander_model

BUILDERS = {"astronaut-v2": astronaut_model, "lander": lander_model}
BAKE_SAMPLES = {"AO": 256, "NORMAL": 8}
AO_DISTANCE_M = 0.35
BAKE_MARGIN_PX = 6
WEBP_QUALITY = {"ao": 85, "normal": 92, "meshy": 85}
SEED = 34


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.seed = SEED
    scene.cycles.use_denoising = False


def select_only(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def join(parts, name):
    """One object from `parts`, transforms applied, named `name`."""
    meshes = [p for p in parts if p.type == "MESH"]
    select_only(meshes)
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    body.name = body.data.name = name
    return body


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def unwrap(body):
    """One atlas for the whole model: islands split at 60°, packed."""
    select_only([body])
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(60),
        island_margin=0.004,
        area_weight=0.0,
        correct_aspect=True,
        scale_to_bounds=False,
    )
    bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake_image(name, size):
    image = bpy.data.images.new(name, size, size, alpha=False, float_buffer=True)
    image.colorspace_settings.name = "Non-Color"
    return image


def surface_bump(mat, recipe):
    """Wires a procedural bump into `mat`'s normal (bake only)."""
    if recipe is None:
        return
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    coord = nodes.new("ShaderNodeTexCoord")
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = recipe["strength"]
    bump.inputs["Distance"].default_value = recipe["distance"]
    height = recipe["height"](nodes, links, coord.outputs["Object"])
    links.new(height, bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


def target(mat, image):
    nodes = mat.node_tree.nodes
    node = nodes.get("bake_target") or nodes.new("ShaderNodeTexImage")
    node.name = "bake_target"
    node.image = image
    nodes.active = node


def bake(body, kind, image):
    scene = bpy.context.scene
    scene.cycles.samples = BAKE_SAMPLES[kind]
    for mat in body.data.materials:
        target(mat, image)
    select_only([body])
    bpy.ops.object.bake(
        type=kind,
        normal_space="TANGENT",
        margin=BAKE_MARGIN_PX,
        use_clear=True,
        target="IMAGE_TEXTURES",
    )


def strip_bake_nodes(mat):
    """Leaves the Principled BSDF alone: glTF gets the factors only."""
    nodes = mat.node_tree.nodes
    for node in list(nodes):
        if node.type not in ("BSDF_PRINCIPLED", "OUTPUT_MATERIAL"):
            nodes.remove(node)


def save_webp(image, path, quality):
    scene = bpy.context.scene
    settings = scene.render.image_settings
    settings.file_format = "WEBP"
    settings.color_mode = "RGB"
    settings.quality = quality
    settings.color_management = "OVERRIDE"
    settings.view_settings.view_transform = "Standard"
    settings.linear_colorspace_settings.name = "Non-Color"
    image.save_render(str(path), scene=scene)


def bake_maps(body, module, out, name):
    """AO and fine-surface normal into `<name>-ao.webp`, `-normal.webp`."""
    world = bpy.data.worlds.new("bake")
    world.light_settings.distance = AO_DISTANCE_M
    bpy.context.scene.world = world
    for mat in body.data.materials:
        surface_bump(mat, module.BUMPS.get(mat.name))
    files = {}
    for kind, key in (("AO", "ao"), ("NORMAL", "normal")):
        px = module.AO_PX if key == "ao" else module.ATLAS_PX
        image = bake_image(f"{name}-{key}", px)
        bake(body, kind, image)
        files[key] = f"{name}-{key}.webp"
        save_webp(image, out / files[key], WEBP_QUALITY[key])
    for mat in body.data.materials:
        strip_bake_nodes(mat)
    return files


def export(body, path, images="NONE"):
    select_only([body])
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLTF_SEPARATE",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_image_format=images,
        export_image_quality=85,
        export_normals=True,
        export_texcoords=True,
        export_tangents=False,
        export_animations=False,
        export_extras=False,
        export_cameras=False,
        export_lights=False,
        export_vertex_color="NONE",
    )


def make_built(name, out):
    reset()
    module = BUILDERS[name]
    body = join(module.build(), name)
    budget = module.TRIANGLE_BUDGET
    if triangles(body) > budget:
        raise RuntimeError(f"{name}: {triangles(body)} > {budget} triangles")
    unwrap(body)
    files = bake_maps(body, module, out, name)
    export(body, out / f"{name}.gltf")
    return {
        "triangles": triangles(body),
        "maps": files,
        "unmapped": sorted(module.UNMAPPED),
        "size_m": [round(v, 3) for v in body.dimensions],
    }


def make_lm(source, out):
    reset()
    body, info = apollo_lm_model.build(source)
    export(body, out / "apollo-lm.gltf", images="WEBP")
    return {
        "triangles": triangles(body),
        **info,
        "size_m": [round(v, 3) for v in body.dimensions],
    }


def export_skinned(armature, body, path):
    """glTF with the skin and every kept action as a clip."""
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (armature, body):
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLTF_SEPARATE",
        use_selection=True,
        export_yup=True,
        export_image_format="WEBP",
        export_image_quality=WEBP_QUALITY["meshy"],
        export_normals=True,
        export_texcoords=True,
        export_tangents=False,
        export_skins=True,
        export_influence_nb=astronaut_meshy_model.MAX_INFLUENCES,
        export_all_influences=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_extras=False,
        export_cameras=False,
        export_lights=False,
        export_vertex_color="NONE",
    )


def make_meshy(source, out):
    reset()
    armature, body, info = astronaut_meshy_model.build(source)
    export_skinned(armature, body, out / "astronaut-meshy.gltf")
    return {
        "triangles": triangles(body),
        **info,
        "size_m": [round(v, 3) for v in body.dimensions],
    }


def make(job):
    out = Path(job["out"])
    out.mkdir(parents=True, exist_ok=True)
    results = {}
    for name in job["models"]:
        if name == "apollo-lm":
            results[name] = make_lm(job["source"], out)
        elif name == "astronaut-meshy":
            results[name] = make_meshy(job["meshy_source"], out)
        else:
            results[name] = make_built(name, out)
    return results


def render(path, camera_at, look_at, lens=50, size=560, samples=48):
    scene = bpy.context.scene
    cam = bpy.data.objects.new("camera", bpy.data.cameras.new("camera"))
    scene.collection.objects.link(cam)
    cam.data.lens = lens
    cam.location = camera_at
    cam.rotation_euler = (
        (Vector(look_at) - Vector(camera_at)).to_track_quat("-Z", "Y").to_euler()
    )
    scene.camera = cam
    scene.cycles.samples = samples
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


def stage(height):
    """A grey regolith floor, a low hard Sun, a faint fill."""
    scene = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=height * 12)
    floor = bpy.context.active_object
    floor.data.materials.append(bpy.data.materials.new("floor"))
    bsdf = floor.data.materials[0].node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.16, 0.155, 0.15, 1)
    bsdf.inputs["Roughness"].default_value = 0.95
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = 4.0
    sun.data.angle = math.radians(0.5)
    sun.rotation_euler = (math.radians(62), 0, math.radians(-38))
    scene.collection.objects.link(sun)
    world = bpy.data.worlds.new("world")
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (
        0.12,
        0.12,
        0.13,
        1,
    )
    scene.world = world
    scene.view_settings.view_transform = "AgX"


def previews(job):
    folder = Path(job["previews"])
    folder.mkdir(parents=True, exist_ok=True)
    for name, glb in job["glbs"].items():
        reset()
        bpy.ops.import_scene.gltf(filepath=glb)
        objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        top = max((o.matrix_world @ Vector(c)).z for o in objs for c in o.bound_box)
        stage(top)
        look = (0, 0, top * 0.55)
        dist = top * 2.3
        for deg in (35, 150, 215, 320):
            a = math.radians(deg)
            at = (dist * math.sin(a), -dist * math.cos(a), top * 0.75)
            render(folder / f"{name}-{deg:03d}.png", at, look)
        if name == "astronaut-v2":
            render(folder / f"{name}-far.png", (2.5, -7.5, 2.2), (0, 0, 0.9), lens=50)


def main():
    job = json.loads(Path(sys.argv[sys.argv.index("--") + 1]).read_text())
    if job.get("previews"):
        previews(job)
        return
    Path(job["report"]).write_text(json.dumps(make(job), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
