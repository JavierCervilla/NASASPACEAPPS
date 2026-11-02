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

"""Paints the decals out of the Meshy astronaut's atlas (VENT-34). Pure NumPy.

Meshy textured the suit with a small US flag on each upper arm and a «B3»
label on the chest box, though its prompt asked for none. Each decal is a
REGION: a sphere in the rigged model's rest pose (glTF metres, +Y up, feet
on the origin, facing +Z). Every atlas texel is placed on the model by
rasterising the triangles in UV space (`texel_positions`); inside a region,
the decal's texels (the flag's colour or the label's dark ink) are found,
grown by GROW_PX, and filled, in every map, with the region's own fabric:
diffused in from the fabric around it (`inpaint`: each filled texel the
mean of its neighbours on the model, repeated until it settles, started
from the region's fabric median) and feathered over FEATHER_PX texels
into what was there, in every map, so the normal and metal-roughness
maps lose the decals' shapes too and no edge shows. test_onfoot_models.py
checks that no decal texel is left on the shipped texture.
"""

import numpy as np

# name: (centre xyz, radius m, what the decal is drawn in).
REGIONS = {
    "flag_left": ((-0.372, 1.473, 0.124), 0.07, "colour"),
    "flag_right": ((0.384, 1.468, 0.114), 0.07, "colour"),
    "label_chest": ((0.0, 1.367, 0.346), 0.065, "dark"),
}
# A flag texel: its channels spread over more than this (red, blue).
CHROMA = 0.08
# A label texel: brightest channel under this.
INK = 0.45
# A fabric texel: low chroma and bright.
FABRIC_CHROMA = 0.06
FABRIC_LIGHT = 0.6
GROW_PX = 4
FEATHER_PX = 4
INPAINT_STEPS = 150


def face_map(tri_uv, size):
    """(size, size) map of the triangle over each texel, -1 for none.

    `tri_uv` is (n, 3, 2) glTF UVs (v down, row 0 at the top of the image).
    """
    found = np.full((size, size), -1, np.int32)
    points = tri_uv * size - 0.5
    for i, tri in enumerate(points):
        lo = np.maximum(np.floor(tri.min(0)).astype(int), 0)
        hi = np.minimum(np.ceil(tri.max(0)).astype(int), size - 1)
        if (hi < lo).any():
            continue
        xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1))
        inside = covers(tri, xs, ys)
        found[ys[inside], xs[inside]] = i
    return found


def covers(tri, xs, ys, slack=0.02):
    """Which of the points (xs, ys) fall in the triangle, with `slack`."""
    (ax, ay), (bx, by), (cx, cy) = tri
    det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(det) < 1e-12:
        return np.zeros(xs.shape, bool)
    l1 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / det
    l2 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / det
    return (l1 >= -slack) & (l2 >= -slack) & (1 - l1 - l2 >= -slack)


def texel_positions(faces, tri_pos):
    """(h, w, 3) rest-pose position of each texel's triangle, NaN off it."""
    centres = tri_pos.mean(axis=1)
    out = np.full(faces.shape + (3,), np.nan)
    on = faces >= 0
    out[on] = centres[faces[on]]
    return out


def grow(mask, px):
    """`mask` dilated by `px` texels (a square brush)."""
    out = mask.copy()
    for _ in range(px):
        step = out.copy()
        step[1:] |= out[:-1]
        step[:-1] |= out[1:]
        step[:, 1:] |= out[:, :-1]
        step[:, :-1] |= out[:, 1:]
        out = step
    return out


def decal_mask(image, inside, kind):
    """The decal's texels in a region: chromatic for a flag, dark for ink."""
    rgb = image[..., :3]
    if kind == "colour":
        return inside & (rgb.max(axis=2) - rgb.min(axis=2) > CHROMA)
    return inside & (rgb.max(axis=2) < INK)


def inpaint(image, fill, known, start):
    """`image` with the `fill` texels diffused in from their `known`
    neighbours (Laplace, Jacobi steps), started from `start`."""
    out = image.copy()
    out[fill] = start
    rows, cols = np.nonzero(grow(fill, 1))
    top, bottom = rows.min(), rows.max() + 1
    left, right = cols.min(), cols.max() + 1
    crop = out[top:bottom, left:right]
    hole = fill[top:bottom, left:right]
    usable = (hole | known[top:bottom, left:right]).astype(np.float32)[..., None]
    for _ in range(INPAINT_STEPS):
        total = np.zeros_like(crop)
        count = np.zeros_like(usable)
        for axis, shift in ((0, 1), (0, -1), (1, 1), (1, -1)):
            total += np.roll(crop * usable, shift, axis)
            count += np.roll(usable, shift, axis)
        crop[hole] = (total / np.maximum(count, 1e-6))[hole]
    return out


def feather(core):
    """1 on `core`, falling to 0 over FEATHER_PX texels around it."""
    alpha = core.astype(np.float32)
    ring = core
    for step in range(1, FEATHER_PX + 1):
        outer = grow(ring, 1)
        alpha[outer & ~ring] = 1 - step / (FEATHER_PX + 1)
        ring = outer
    return alpha


def clean(maps, positions, regions=REGIONS):
    """Fills each region's decal in every map of `maps` (name: (h, w, c)
    float 0..1 arrays at the positions' size, 'base_color' among them) with
    the region's fabric; returns the cleaned maps and, per region, the
    texels filled and the fabric colour (0..1)."""
    base = maps["base_color"]
    out = {name: m.copy() for name, m in maps.items()}
    report = {}
    for name, (centre, radius, kind) in regions.items():
        dist = np.linalg.norm(positions - np.asarray(centre), axis=2)
        inside = np.nan_to_num(dist, nan=np.inf) < radius
        near = np.nan_to_num(dist, nan=0.0) < radius + 0.01
        # The decal is sought out to `near`, so none of it is left at the
        # rim to bleed back in through the diffusion.
        rim = np.nan_to_num(dist, nan=np.inf) < radius + 0.01
        decal = decal_mask(base, rim, kind)
        fill = grow(decal & inside, GROW_PX) & near | decal
        rgb = base[..., :3]
        fabric = (
            inside
            & ~fill
            & (rgb.max(axis=2) - rgb.min(axis=2) < FABRIC_CHROMA)
            & (rgb.max(axis=2) > FABRIC_LIGHT)
        )
        if not fill.any() or not fabric.any():
            raise ValueError(f"{name}: no decal or no fabric found")
        soft = grow(fill, FEATHER_PX) & near
        known = near & ~fill & ~decal
        alpha = (feather(fill) * soft)[..., None]
        for key, source in maps.items():
            start = np.median(source[fabric], axis=0)
            painted = inpaint(out[key], soft, known & ~soft, start)
            out[key] = out[key] * (1 - alpha) + painted * alpha
        report[name] = {
            "texels": int(fill.sum()),
            "fabric": [round(float(c), 4) for c in np.median(base[fabric], axis=0)],
        }
    return out, report
