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

"""Crumpled metallised foil maps for the Apollo LM (VENT-34), generated, no source.

Ported from Mooner (JavierCervilla/Mooner, packages/web/scripts/foil_maps.py at
commit cc528da), unchanged but for this note.

Pure NumPy, deterministic (a fixed seed), so two bakes give the same bytes. Crumpled foil is a field of small flat
facets meeting at sharp creases: each octave scatters one jittered point per grid cell (Worley), every pixel takes the
tilt of its nearest point, and the octaves' tilts add up, so the normal changes abruptly at every cell border (the
creases) and is flat inside (the facets). The maps tile: the grid wraps around the edges.

  normal_map(size) -> (size, size, 3) floats 0..1, tangent space (+Z out), for a glTF normalTexture
  metal_roughness_map(size) -> (size, size, 3) floats 0..1: G roughness, B metalness (glTF's packing), R 1
"""

import numpy as np

SEED = 1969
# (grid cells across the map, tilt) per octave: big folds, then finer crinkles.
OCTAVES = ((7, 0.4), (17, 0.25), (41, 0.15))
# Thin metallised film: shiny with facet-to-facet variation, metal high.
ROUGHNESS = (0.18, 0.42)
METALNESS = (0.8, 0.95)


def nearest_cell(size, cells, rng):
    """For each pixel of a size x size map, the (row, col) of the nearest jittered point on a wrapping grid."""
    jitter = rng.random((cells, cells, 2))
    coords = (np.arange(size) + 0.5) * cells / size
    y, x = np.meshgrid(coords, coords, indexing="ij")
    base_y, base_x = np.floor(y).astype(int), np.floor(x).astype(int)
    best = np.full((size, size), np.inf)
    best_y, best_x = np.zeros((size, size), int), np.zeros((size, size), int)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            cy, cx = base_y + dy, base_x + dx
            point = jitter[cy % cells, cx % cells]
            dist = (cy + point[..., 0] - y) ** 2 + (cx + point[..., 1] - x) ** 2
            closer = dist < best
            best = np.where(closer, dist, best)
            best_y, best_x = np.where(closer, cy % cells, best_y), np.where(closer, cx % cells, best_x)
    return best_y, best_x


def facets(size):
    """Per octave: the nearest cell of each pixel, and a random value per cell (one generator, in order)."""
    rng = np.random.default_rng(SEED)
    layers = []
    for cells, tilt in OCTAVES:
        row, col = nearest_cell(size, cells, rng)
        layers.append((row, col, rng.normal(0, tilt, (cells, cells, 2)), rng.random((cells, cells))))
    return layers


def normal_map(size=512):
    """The foil's tangent-space normals, 0..1 per channel (0.5, 0.5, 1 is flat)."""
    slope = np.zeros((size, size, 2))
    for row, col, tilts, _ in facets(size):
        slope += tilts[row, col]
    normal = np.dstack([slope, np.ones((size, size))])
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    return normal * 0.5 + 0.5


def metal_roughness_map(size=512):
    """Each big facet's roughness and metalness (glTF packing: G roughness, B metalness), R 1."""
    (row, col, _, value), (fine_row, fine_col, _, fine), _ = facets(size)
    share = 0.7 * value[row, col] + 0.3 * fine[fine_row, fine_col]
    rough = ROUGHNESS[0] + (ROUGHNESS[1] - ROUGHNESS[0]) * share
    metal = METALNESS[0] + (METALNESS[1] - METALNESS[0]) * (1 - share)
    return np.dstack([np.ones((size, size)), rough, metal])
