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

"""A modern EVA suit figure for the on-foot view (VENT-34), from code.

Runs inside Blender 5.2: onfoot_blender.py calls build(), which returns
the parts (one object each; the bake joins them). No source, no marks:
a generic suit in the class of today's EVA suits (hard upper torso,
backpack, chest controls, bearings, pleated joints, gauntlet gloves,
gold visor). Metres, Blender axes: feet on Z = 0, the front towards -Y
(glTF +Z), arms slightly lowered.
"""

import math

import onfoot_shapes as s
from mathutils import Vector

# Suit colours (linear RGB) and finishes: matte white fabric, hard white
# shell, grey bearings, dark soles, gold visor (metal).
FABRIC = ("suit_fabric", (0.80, 0.79, 0.76), 0.88, 0.0)
SHELL = ("suit_shell", (0.86, 0.86, 0.84), 0.55, 0.0)
GLOVE = ("suit_glove", (0.62, 0.62, 0.60), 0.8, 0.0)
BEARING = ("suit_metal", (0.55, 0.56, 0.58), 0.35, 1.0)
DARK = ("suit_dark", (0.07, 0.07, 0.08), 0.7, 0.0)
VISOR = ("visor_gold", (1.0, 0.71, 0.29), 0.12, 1.0)

SEG = 18
TRIANGLE_BUDGET = 25_000
ATLAS_PX = 1024
# Ambient occlusion is soft: half the atlas is enough.
AO_PX = 512
# The baked maps are not worn by the visor (a clean mirror).
UNMAPPED = {"visor_gold"}
# Body landmarks, one side (+X); the other side is mirrored.
HIP = (0.105, 0.0, 0.97)
KNEE = (0.125, -0.035, 0.54)
ANKLE = (0.13, 0.0, 0.15)
SHOULDER = (0.235, 0.0, 1.43)
ELBOW = (0.325, -0.02, 1.12)
WRIST = (0.35, -0.10, 0.895)
HELMET_C = (0.0, -0.02, 1.715)
HELMET_R = 0.183


def mats():
    return {
        k: s.material(*v)
        for k, v in {
            "fabric": FABRIC,
            "shell": SHELL,
            "glove": GLOVE,
            "metal": BEARING,
            "dark": DARK,
            "visor": VISOR,
        }.items()
    }


def torso(m):
    """Hard upper torso over the soft waist and the briefs."""
    soft = [(0, 0.0, z) for z in (0.84, 0.93, 1.02, 1.13)]
    lower = s.tube(
        "torso_soft",
        s.catmull_rom(soft, 3),
        s.lerp_radius([(0.0, 0.165, 0.125), (0.3, 0.19, 0.14), (1.0, 0.18, 0.135)]),
        m["fabric"],
        segments=24,
        up=(1, 0, 0),
    )
    hard = [(0, 0.0, z) for z in (1.1, 1.2, 1.3, 1.4, 1.47, 1.53, 1.58)]
    upper = s.tube(
        "torso_hard",
        s.catmull_rom(hard, 3),
        s.lerp_radius(
            [
                (0.0, 0.18, 0.135),
                (0.25, 0.215, 0.155),
                (0.5, 0.255, 0.175),
                (0.72, 0.26, 0.172),
                (0.86, 0.215, 0.15),
                (1.0, 0.12, 0.1),
            ]
        ),
        m["shell"],
        segments=28,
        up=(1, 0, 0),
    )
    return [
        lower,
        upper,
        s.ring(
            "waist_ring",
            (0, 0, 1.115),
            (0, 0, 1),
            0.192,
            0.035,
            m["metal"],
            segments=32,
        ),
        s.ring(
            "neck_ring",
            (0, -0.005, 1.575),
            (0, 0.15, 1),
            0.135,
            0.04,
            m["metal"],
            segments=32,
        ),
    ]


def leg(m):
    """Thigh, pleated knee, calf; a bearing under the hip."""
    path = s.catmull_rom(
        [HIP, (0.115, -0.02, 0.76), KNEE, (0.13, 0.005, 0.34), ANKLE], 8
    )
    base = s.lerp_radius(
        [
            (0, 0.125, 0.125),
            (0.3, 0.108, 0.11),
            (0.5, 0.097, 0.1),
            (0.75, 0.092, 0.094),
            (1, 0.08, 0.082),
        ]
    )
    radius = s.pleated(base, 4, 0.1, 0.42, 0.6)
    thigh_dir = Vector(KNEE) - Vector(HIP)
    return [
        s.tube("leg", path, radius, m["fabric"], segments=SEG, up=(1, 0, 0)),
        s.ring(
            "thigh_ring",
            Vector(HIP) + thigh_dir * 0.22,
            thigh_dir,
            0.12,
            0.03,
            m["metal"],
        ),
    ]


def boot(m):
    """A lofted boot along the foot, a cuff over the ankle, a dark sole."""
    x = ANKLE[0]
    foot = [(x, 0.09, 0.085), (x, 0.0, 0.09), (x, -0.14, 0.075), (x, -0.235, 0.06)]
    shape = s.lerp_radius(
        [(0, 0.07, 0.065), (0.35, 0.078, 0.085), (0.8, 0.068, 0.058), (1, 0.04, 0.035)]
    )
    return [
        s.tube(
            "boot",
            s.catmull_rom(foot, 6),
            shape,
            m["shell"],
            segments=SEG,
            up=(1, 0, 0),
        ),
        s.tube(
            "boot_cuff",
            [(x, 0.0, 0.07), (x, 0.0, 0.14), (x, 0.0, 0.215)],
            s.lerp_radius([(0, 0.088, 0.092), (1, 0.09, 0.092)]),
            m["shell"],
            segments=SEG,
        ),
        s.box("sole", (0.15, 0.37, 0.04), (x, -0.07, 0.02), m["dark"], bevel=0.012),
    ]


def arm(m):
    """Upper arm from the scye bearing, pleated elbow, forearm, a wrist
    disconnect; slightly lowered and away from the body."""
    path = s.catmull_rom(
        [SHOULDER, (0.3, -0.005, 1.29), ELBOW, (0.34, -0.065, 1.0), WRIST], 8
    )
    base = s.lerp_radius(
        [(0, 0.1, 0.1), (0.3, 0.09, 0.092), (0.55, 0.083, 0.085), (1, 0.066, 0.068)]
    )
    radius = s.pleated(base, 4, 0.12, 0.4, 0.6)
    out = Vector(SHOULDER) - Vector((0.0, 0.0, 1.43))
    fore = Vector(WRIST) - Vector(ELBOW)
    return [
        s.tube("arm", path, radius, m["fabric"], segments=SEG, up=(1, 0, 0)),
        s.ring(
            "scye_ring",
            Vector(SHOULDER) + out.normalized() * 0.005,
            Vector((1, 0, -0.35)),
            0.112,
            0.04,
            m["metal"],
        ),
        s.ring(
            "wrist_ring",
            Vector(WRIST) - fore.normalized() * 0.005,
            fore,
            0.074,
            0.032,
            m["metal"],
        ),
    ]


def glove(m):
    """A gauntlet cuff, the hand as a mitt, the thumb forward."""
    fore = (Vector(WRIST) - Vector(ELBOW)).normalized()
    w = Vector(WRIST)
    cuff = s.tube(
        "gauntlet",
        [w + fore * 0.005, w + fore * 0.045, w + fore * 0.075],
        s.lerp_radius([(0, 0.068, 0.07), (1, 0.058, 0.056)]),
        m["glove"],
        segments=SEG,
    )
    side = Vector((1, 0, 0))
    hand = [
        w + fore * 0.07,
        w + fore * 0.13 + side * 0.008,
        w + fore * 0.19 + side * 0.004 + Vector((0, -0.012, 0)),
        w + fore * 0.235 + Vector((0, -0.025, 0)),
    ]
    palm = s.tube(
        "hand",
        s.catmull_rom(hand, 4),
        s.lerp_radius(
            [
                (0, 0.052, 0.034),
                (0.4, 0.058, 0.031),
                (0.8, 0.05, 0.025),
                (1, 0.022, 0.014),
            ]
        ),
        m["glove"],
        segments=SEG,
        up=(0, -1, 0),
    )
    thumb = [
        w + fore * 0.1 + Vector((-0.025, -0.03, 0)),
        w + fore * 0.15 + Vector((-0.03, -0.055, 0)),
        w + fore * 0.19 + Vector((-0.02, -0.065, 0)),
    ]
    return [
        cuff,
        palm,
        s.tube(
            "thumb",
            s.catmull_rom(thumb, 3),
            s.lerp_radius([(0, 0.016, 0.016), (0.85, 0.014, 0.014), (1, 0.006, 0.006)]),
            m["glove"],
            segments=10,
        ),
    ]


def helmet(m):
    """Hard shell, gold visor proud of it, a rim, two side lamps."""
    c, r = Vector(HELMET_C), HELMET_R
    yaw, pitch = (-1.05, 1.05), (-0.52, 0.62)
    shell = s.uv_sphere("helmet", c, r, m["shell"], scale=(1, 1.04, 1.06))
    visor = s.sphere_patch(
        "visor", c, r + 0.006, m["visor"], yaw, pitch, scale=(1, 1.04, 1.06)
    )
    rim = s.tube(
        "visor_rim",
        visor_edge(c, r + 0.006, yaw, pitch),
        lambda t: (0.009, 0.009),
        m["shell"],
        segments=8,
        closed=True,
        caps=False,
    )
    lamps = [
        s.box(
            f"lamp_{side}",
            (0.05, 0.075, 0.045),
            c + Vector((side * (r + 0.01), 0.0, 0.07)),
            m["shell"],
            bevel=0.01,
        )
        for side in (-1, 1)
    ]
    lenses = [
        s.cylinder(
            f"lens_{side}",
            c + Vector((side * (r + 0.012), -0.04, 0.07)),
            (0, -1, 0),
            0.016,
            0.012,
            m["dark"],
        )
        for side in (-1, 1)
    ]
    return [shell, visor, rim, *lamps, *lenses]


def visor_edge(c, r, yaw, pitch, n=18):
    """The visor's outline as a closed loop on the sphere."""

    def point(az, el):
        return (
            c
            + Vector(
                (
                    math.sin(az) * math.cos(el),
                    -math.cos(az) * math.cos(el) * 1.04,
                    math.sin(el) * 1.06,
                )
            )
            * r
        )

    loop = [point(yaw[0] + (yaw[1] - yaw[0]) * i / n, pitch[0]) for i in range(n)]
    loop += [point(yaw[1], pitch[0] + (pitch[1] - pitch[0]) * i / n) for i in range(n)]
    loop += [point(yaw[1] - (yaw[1] - yaw[0]) * i / n, pitch[1]) for i in range(n)]
    loop += [point(yaw[0], pitch[1] - (pitch[1] - pitch[0]) * i / n) for i in range(n)]
    return loop


def backpack(m):
    """The life support pack: a bevelled shell, its lid, the propulsion
    unit under it, side hoses to the chest controls."""
    parts = [
        s.box(
            "pack",
            (0.5, 0.2, 0.62),
            (0, 0.255, 1.235),
            m["shell"],
            bevel=0.04,
            segments=4,
        ),
        s.box("pack_lid", (0.44, 0.06, 0.5), (0, 0.37, 1.25), m["shell"], bevel=0.02),
        s.box(
            "pack_top", (0.46, 0.17, 0.05), (0, 0.255, 1.565), m["shell"], bevel=0.02
        ),
        s.box("jet_pack", (0.5, 0.24, 0.13), (0, 0.27, 0.86), m["shell"], bevel=0.025),
        s.box(
            "chest_unit",
            (0.3, 0.12, 0.15),
            (0, -0.235, 1.29),
            m["shell"],
            bevel=0.022,
            rotation=_rx(math.radians(-14)),
        ),
        s.box(
            "chest_display",
            (0.12, 0.02, 0.05),
            (0, -0.25, 1.37),
            m["dark"],
            bevel=0.006,
            rotation=_rx(math.radians(-40)),
        ),
        s.box(
            "pack_rib_l", (0.03, 0.05, 0.5), (-0.16, 0.39, 1.25), m["shell"], bevel=0.01
        ),
        s.box(
            "pack_rib_r", (0.03, 0.05, 0.5), (0.16, 0.39, 1.25), m["shell"], bevel=0.01
        ),
        s.box(
            "pack_handle", (0.2, 0.03, 0.03), (0, 0.33, 1.61), m["metal"], bevel=0.008
        ),
    ]
    for i, x in enumerate((-0.085, 0.085)):
        parts.append(
            s.cylinder(
                f"knob_{i}",
                (x, -0.3, 1.27),
                (0, -1, 0.25),
                0.02,
                0.03,
                m["metal"],
                bevel=0.004,
            )
        )
    for side in (-1, 1):
        hose = [
            (side * 0.14, -0.22, 1.25),
            (side * 0.24, -0.17, 1.17),
            (side * 0.27, -0.02, 1.13),
            (side * 0.25, 0.16, 1.1),
        ]
        parts.append(
            s.tube(
                f"hose_{side}",
                s.catmull_rom(hose, 6),
                lambda t: (0.017, 0.017),
                m["dark"],
                segments=10,
            )
        )
    return parts


def _rx(angle):
    from mathutils import Matrix

    return Matrix.Rotation(angle, 4, "X")


def build():
    m = mats()
    parts = [*torso(m), *helmet(m), *backpack(m)]
    for side_part in (*leg(m), *boot(m), *arm(m), *glove(m)):
        parts.append(side_part)
        parts.append(s.mirror_x(side_part, side_part.name + "_l"))
    return parts


def wrinkles(scale, distortion, fine):
    """Fabric folds: wavy bands round the limbs (object Z), broken up by
    distortion and faded in and out by a slow noise, so some panels lie
    smooth; finer creases on top."""

    def height(nodes, links, coord):
        wave = nodes.new("ShaderNodeTexWave")
        wave.wave_type, wave.bands_direction = "BANDS", "Z"
        wave.wave_profile = "SIN"
        wave.inputs["Scale"].default_value = scale
        wave.inputs["Distortion"].default_value = distortion
        wave.inputs["Detail"].default_value = 2.0
        wave.inputs["Detail Scale"].default_value = 1.0
        patch = nodes.new("ShaderNodeTexNoise")
        patch.inputs["Scale"].default_value = 4.0
        patch.inputs["Detail"].default_value = 1.0
        ramp = nodes.new("ShaderNodeMapRange")
        ramp.inputs["From Min"].default_value = 0.42
        ramp.inputs["From Max"].default_value = 0.62
        noise = nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = scale * 5
        noise.inputs["Detail"].default_value = 3.0
        folds = nodes.new("ShaderNodeMath")
        folds.operation = "MULTIPLY"
        mix = nodes.new("ShaderNodeMath")
        mix.operation = "MULTIPLY_ADD"
        mix.inputs[1].default_value = fine
        for tex in (wave, patch, noise):
            links.new(coord, tex.inputs["Vector"])
        links.new(patch.outputs["Fac"], ramp.inputs["Value"])
        links.new(wave.outputs["Fac"], folds.inputs[0])
        links.new(ramp.outputs["Result"], folds.inputs[1])
        links.new(noise.outputs["Fac"], mix.inputs[0])
        links.new(folds.outputs["Value"], mix.inputs[2])
        return mix.outputs["Value"]

    return height


BUMPS = {
    "suit_fabric": {
        "strength": 0.6,
        "distance": 0.006,
        "height": wrinkles(9.0, 6.0, 0.15),
    },
    "suit_glove": {
        "strength": 0.5,
        "distance": 0.003,
        "height": wrinkles(22.0, 5.0, 0.2),
    },
}
