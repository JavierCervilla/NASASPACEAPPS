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

"""A generic robotic lunar lander for the on-foot view (VENT-34).

Runs inside Blender 5.2: onfoot_blender.py calls build(). A lander of the
class that lands at the south pole today (a hexagonal body about 1.6 m
flat to flat, about 4.3 m to the top of its antenna, six legs), copying
no single design and wearing no logo, flag or lettering: a gold and
silver blanketed body, body-mounted solar arrays, a radiator, an engine
bell, propellant tanks, legs with struts and footpads, a dish on a mast
and thruster pods. Metres, Blender axes: footpads on Z = 0, solar arrays on faces 0, 2 and 4.
"""

import math

import bmesh
import onfoot_shapes as s
from mathutils import Vector

TRIANGLE_BUDGET = 25_000
ATLAS_PX = 1024
AO_PX = 512
UNMAPPED = set()

GOLD = ("foil_gold", (1.0, 0.64, 0.24), 0.34, 0.8)
SILVER = ("foil_silver", (0.84, 0.85, 0.88), 0.3, 0.8)
SOLAR = ("solar_cells", (0.03, 0.05, 0.13), 0.18, 0.5)
WHITE = ("radiator_white", (0.78, 0.78, 0.76), 0.5, 0.0)
METAL = ("strut_metal", (0.62, 0.62, 0.64), 0.38, 1.0)
DARK = ("engine_dark", (0.05, 0.05, 0.055), 0.55, 0.6)

BODY_FLATS_M = 1.6
BODY_BOTTOM_M = 0.95
BODY_TOP_M = 3.15
FOOT_RADIUS_M = 2.15
FOOTPAD_M = 0.21
LEGS = 6
# The faces of the hexagon, by index: face i faces -30 + 60 i degrees
# from +X (between corners i and i + 1), counter-clockwise.
SOLAR_FACES = (0, 2, 4)
RADIATOR_FACES = (3,)
SILVER_FACES = (5,)
DISH_TOP_M = 4.3
# Blanket strips are taped together at this pitch up the body.
SEAM_M = 0.45


def mats():
    return {
        k: s.material(*v)
        for k, v in {
            "gold": GOLD,
            "silver": SILVER,
            "solar": SOLAR,
            "white": WHITE,
            "metal": METAL,
            "dark": DARK,
        }.items()
    }


def corner(i, radius, z):
    """Corner `i` of the hexagon, at -60 + 60 i degrees from +X."""
    a = math.radians(-90 + 30 + 60 * i)
    return Vector((radius * math.cos(a), radius * math.sin(a), z))


def body(m):
    """The hexagonal body: gold blanket, three solar faces, a radiator,
    a silver top deck; each side panel framed by a bevelled edge."""
    r = BODY_FLATS_M / math.sqrt(3)
    bm = bmesh.new()
    low = [bm.verts.new(corner(i, r, BODY_BOTTOM_M)) for i in range(6)]
    high = [bm.verts.new(corner(i, r, BODY_TOP_M)) for i in range(6)]
    bottom, top = bm.faces.new(list(reversed(low))), bm.faces.new(high)
    top.material_index = bottom.material_index = 1
    sides = []
    for i in range(6):
        j = (i + 1) % 6
        face = bm.faces.new((low[j], low[i], high[i], high[j]))
        face.material_index = 1 if i in SILVER_FACES else 0
        sides.append(face)
    rims = list(bm.edges)
    for i, face in enumerate(sides):
        if i in SOLAR_FACES or i in RADIATOR_FACES:
            bmesh.ops.inset_individual(bm, faces=[face], thickness=0.07, depth=-0.015)
            face.material_index = 2 if i in SOLAR_FACES else 3
    bmesh.ops.bevel(bm, geom=rims, offset=0.035, segments=2, affect="EDGES")
    obj = s.to_object("body", bm, m["gold"])
    for mat in (m["silver"], m["solar"], m["white"]):
        obj.data.materials.append(mat)
    s.smooth_by_angle(obj, 30)
    return obj


def girdle(m):
    """A silver band round the body's waist and a lower skirt."""
    r = BODY_FLATS_M / math.sqrt(3)
    parts = []
    for z, h in ((BODY_BOTTOM_M + 0.12, 0.1), (BODY_TOP_M - 0.05, 0.1)):
        bm = bmesh.new()
        bmesh.ops.create_cone(
            bm, cap_ends=True, segments=6, radius1=r + 0.03, radius2=r + 0.03, depth=h
        )
        bmesh.ops.rotate(
            bm, verts=bm.verts, cent=(0, 0, 0), matrix=_rz(math.radians(-60))
        )
        bmesh.ops.translate(bm, vec=(0, 0, z), verts=bm.verts)
        bmesh.ops.bevel(
            bm, geom=list(bm.edges), offset=0.012, segments=1, affect="EDGES"
        )
        obj = s.to_object(f"band_{len(parts)}", bm, m["silver"])
        s.smooth_by_angle(obj, 30)
        parts.append(obj)
    return parts


def _rz(angle):
    from mathutils import Matrix

    return Matrix.Rotation(angle, 3, "Z")


def engine(m):
    """The main engine's bell under the body and its silver throat."""
    bell = s.tube(
        "bell",
        [(0, 0, 0.42), (0, 0, 0.6), (0, 0, 0.8), (0, 0, BODY_BOTTOM_M)],
        s.lerp_radius(
            [(0, 0.33, 0.33), (0.5, 0.22, 0.22), (0.85, 0.15, 0.15), (1, 0.17, 0.17)]
        ),
        m["dark"],
        segments=32,
        caps=False,
        up=(1, 0, 0),
    )
    lip = s.ring(
        "bell_lip", (0, 0, 0.43), (0, 0, 1), 0.34, 0.025, m["metal"], segments=32
    )
    throat = s.ring(
        "throat",
        (0, 0, BODY_BOTTOM_M - 0.05),
        (0, 0, 1),
        0.2,
        0.1,
        m["silver"],
        segments=24,
    )
    inner = s.tube(
        "bell_in",
        [(0, 0, 0.44), (0, 0, 0.8)],
        s.lerp_radius([(0, 0.315, 0.315), (1, 0.14, 0.14)]),
        m["dark"],
        segments=32,
        caps=True,
        up=(1, 0, 0),
    )
    return [bell, lip, throat, inner]


def tanks(m):
    """Two spherical propellant tanks bulging under the body, wrapped in
    silver blanket; on the deck two pressurant spheres and a payload box."""
    parts = [
        s.uv_sphere(
            f"tank_{i}",
            (x, 0.0, BODY_BOTTOM_M + 0.02),
            0.42,
            m["silver"],
            scale=(1, 1, 0.8),
            segments=28,
            rings=14,
        )
        for i, x in enumerate((-0.42, 0.42))
    ]
    for i, at in enumerate(((0.38, 0.3), (0.38, -0.32))):
        parts.append(
            s.uv_sphere(
                f"bottle_{i}",
                (*at, BODY_TOP_M + 0.17),
                0.15,
                m["white"],
                segments=20,
                rings=10,
            )
        )
    parts.append(
        s.box(
            "payload",
            (0.42, 0.36, 0.22),
            (-0.25, -0.3, BODY_TOP_M + 0.11),
            m["gold"],
            bevel=0.02,
        )
    )
    return parts


def leg(m, i):
    """Leg `i` at the body's corner: a main shock strut, two side struts,
    a footpad."""
    r = BODY_FLATS_M / math.sqrt(3)
    a = math.radians(-90 + 30 + 60 * i)
    out = Vector((math.cos(a), math.sin(a), 0))
    side = Vector((-out.y, out.x, 0))
    foot = out * FOOT_RADIUS_M + Vector((0, 0, 0.13))
    top = corner(i, r - 0.05, BODY_BOTTOM_M + 0.85)
    knee = top.lerp(foot, 0.55)
    parts = [
        s.tube(
            f"strut_{i}",
            [top, knee],
            lambda t: (0.055, 0.055),
            m["silver"],
            segments=12,
        ),
        s.tube(
            f"piston_{i}",
            [knee - (knee - top).normalized() * 0.15, foot],
            lambda t: (0.035, 0.035),
            m["metal"],
            segments=12,
        ),
        s.ring(f"seal_{i}", knee, knee - top, 0.062, 0.05, m["metal"], segments=12),
    ]
    for k, sign in enumerate((-1, 1)):
        root = corner(i, r - 0.02, BODY_BOTTOM_M + 0.05) + side * sign * 0.32
        parts.append(
            s.tube(
                f"side_{i}_{k}",
                [root, knee.lerp(foot, 0.45)],
                lambda t: (0.022, 0.022),
                m["metal"],
                segments=8,
            )
        )
    parts.append(
        s.tube(
            f"pad_{i}",
            [
                foot + Vector((0, 0, -0.13)),
                foot + Vector((0, 0, -0.1)),
                foot + Vector((0, 0, -0.04)),
            ],
            s.lerp_radius(
                [
                    (0, FOOTPAD_M * 0.9, FOOTPAD_M * 0.9),
                    (0.3, FOOTPAD_M, FOOTPAD_M),
                    (1, 0.06, 0.06),
                ]
            ),
            m["silver"],
            segments=20,
        )
    )
    parts.append(
        s.uv_sphere(f"ankle_{i}", foot, 0.05, m["metal"], segments=12, rings=6)
    )
    return parts


def boxes(m):
    """Instrument boxes on the gold faces and a bottom skirt."""
    parts = []
    r = BODY_FLATS_M / 2
    for i, (z, w, h) in (
        (1, (1.6, 0.42, 0.34)),
        (5, (2.3, 0.36, 0.3)),
        (1, (2.55, 0.3, 0.2)),
    ):
        a = math.radians(-30 + 60 * i)
        out = Vector((math.cos(a), math.sin(a), 0))
        parts.append(
            s.box(
                f"unit_{i}",
                (w, 0.16, h),
                out * (r + 0.07) + Vector((0, 0, z)),
                m["gold" if i != 5 else "silver"],
                bevel=0.025,
                rotation=_rz4(a + math.pi / 2),
            )
        )
    skirt = s.tube(
        "skirt",
        [(0, 0, BODY_BOTTOM_M - 0.12), (0, 0, BODY_BOTTOM_M + 0.01)],
        s.lerp_radius([(0, 0.62, 0.62), (1, 0.8, 0.8)]),
        m["silver"],
        segments=6,
        up=(0, -1, 0),
    )
    return [*parts, skirt]


def _rz4(angle):
    from mathutils import Matrix

    return Matrix.Rotation(angle, 4, "Z")


def mast(m):
    """A mast on the deck with a dish facing up and out, two omni rods."""
    base = Vector((-0.3, 0.25, BODY_TOP_M))
    tip = Vector((-0.3, 0.25, DISH_TOP_M - 0.42))
    dish_at = tip + Vector((0, 0, 0.12))
    aim = Vector((-0.4, 0.6, 1.0)).normalized()
    dish = s.tube(
        "dish",
        [dish_at, dish_at + aim * 0.07, dish_at + aim * 0.16],
        s.lerp_radius([(0, 0.06, 0.06), (0.5, 0.25, 0.25), (1, 0.38, 0.38)]),
        m["white"],
        segments=32,
        caps=False,
        up=(1, 0, 0),
    )
    feed = s.tube(
        "feed",
        [dish_at + aim * 0.1, dish_at + aim * 0.36],
        lambda t: (0.012, 0.012),
        m["metal"],
        segments=8,
    )
    parts = [
        s.tube("mast", [base, tip], lambda t: (0.04, 0.04), m["metal"], segments=12),
        s.box("gimbal", (0.12, 0.12, 0.12), tip, m["silver"], bevel=0.02),
        dish,
        feed,
        s.box(
            "tracker",
            (0.18, 0.14, 0.12),
            (0.45, -0.25, BODY_TOP_M + 0.08),
            m["silver"],
            bevel=0.015,
        ),
        s.cylinder(
            "tracker_eye",
            (0.45, -0.33, BODY_TOP_M + 0.1),
            (0, -1, 0.6),
            0.04,
            0.06,
            m["dark"],
        ),
    ]
    for k, at in enumerate(((0.55, 0.35), (-0.6, -0.3))):
        parts.append(
            s.tube(
                f"omni_{k}",
                [(*at, BODY_TOP_M), (*at, BODY_TOP_M + 0.5)],
                lambda t: (0.012, 0.012),
                m["metal"],
                segments=8,
            )
        )
    return parts


def thrusters(m):
    """A pod of small thrusters at every other upper corner."""
    r = BODY_FLATS_M / math.sqrt(3)
    parts = []
    for i in (1, 3, 5):
        at = corner(i, r + 0.06, BODY_TOP_M - 0.35)
        out = at.copy()
        out.z = 0
        out.normalize()
        parts.append(s.box(f"pod_{i}", (0.16, 0.16, 0.16), at, m["silver"], bevel=0.02))
        for k, d in enumerate((out, Vector((0, 0, -1)))):
            parts.append(
                s.tube(
                    f"nozzle_{i}_{k}",
                    [at + d * 0.08, at + d * 0.17],
                    s.lerp_radius([(0, 0.02, 0.02), (1, 0.04, 0.04)]),
                    m["dark"],
                    segments=10,
                    caps=False,
                )
            )
    return parts


def crinkle(big, small):
    """Crumpled blanket: flat facets at random heights meeting at creases
    (Voronoi cells, two sizes) over a slow undulation, and the taped
    seams between blanket strips every SEAM_M of height."""

    def height(nodes, links, coord):
        seams = nodes.new("ShaderNodeTexWave")
        seams.wave_type, seams.bands_direction = "BANDS", "Z"
        seams.wave_profile = "SAW"
        seams.inputs["Scale"].default_value = 1 / (SEAM_M * 10 / (2 * math.pi))
        links.new(coord, seams.inputs["Vector"])
        tape = nodes.new("ShaderNodeMapRange")
        tape.inputs["From Min"].default_value = 0.96
        tape.inputs["From Max"].default_value = 0.985
        tape.inputs["To Max"].default_value = 0.6
        links.new(seams.outputs["Fac"], tape.inputs["Value"])
        total = tape.outputs["Result"]
        for scale, weight in ((big, 0.55), (small, 0.3)):
            cells = nodes.new("ShaderNodeTexVoronoi")
            cells.inputs["Scale"].default_value = scale
            grey = nodes.new("ShaderNodeRGBToBW")
            links.new(coord, cells.inputs["Vector"])
            links.new(cells.outputs["Color"], grey.inputs["Color"])
            term = nodes.new("ShaderNodeMath")
            term.operation = "MULTIPLY_ADD"
            links.new(grey.outputs["Val"], term.inputs[0])
            term.inputs[1].default_value = weight
            links.new(total, term.inputs[2])
            total = term.outputs["Value"]
        wave = nodes.new("ShaderNodeTexNoise")
        wave.inputs["Scale"].default_value = big / 3
        links.new(coord, wave.inputs["Vector"])
        mix = nodes.new("ShaderNodeMath")
        mix.operation = "MULTIPLY_ADD"
        links.new(wave.outputs["Fac"], mix.inputs[0])
        mix.inputs[1].default_value = 0.5
        links.new(total, mix.inputs[2])
        return mix.outputs["Value"]

    return height


def cell_grid(nodes, links, coord):
    """The solar array's cells: a fine grid of grooves."""
    bricks = nodes.new("ShaderNodeTexBrick")
    bricks.offset = 0.0
    bricks.inputs["Scale"].default_value = 6.0
    bricks.inputs["Mortar Size"].default_value = 0.012
    bricks.inputs["Brick Width"].default_value = 1.0
    bricks.inputs["Row Height"].default_value = 1.0
    links.new(coord, bricks.inputs["Vector"])
    invert = nodes.new("ShaderNodeMath")
    invert.operation = "SUBTRACT"
    invert.inputs[0].default_value = 1.0
    links.new(bricks.outputs["Fac"], invert.inputs[1])
    return invert.outputs["Value"]


BUMPS = {
    "foil_gold": {"strength": 1.0, "distance": 0.02, "height": crinkle(5.0, 14.0)},
    "foil_silver": {"strength": 0.9, "distance": 0.02, "height": crinkle(6.0, 16.0)},
    "solar_cells": {"strength": 0.5, "distance": 0.003, "height": cell_grid},
}


def build():
    m = mats()
    parts = [
        body(m),
        *girdle(m),
        *engine(m),
        *tanks(m),
        *mast(m),
        *boxes(m),
        *thrusters(m),
    ]
    for i in range(LEGS):
        parts += leg(m, i)
    return parts
