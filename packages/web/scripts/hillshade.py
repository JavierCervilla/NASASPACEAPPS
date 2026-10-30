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

"""Shaded relief of an elevation crop, lit by a low Sun.

Lambert shading of the surface, darkened where the terrain towards the Sun
casts a shadow, then a gentle tone curve. The Sun's azimuth is measured in
the image plane, clockwise from image up (315: from the upper left).

Before shading, a 5 x 5 median and one 3 x 3 box blur remove the one or two
pixel ridges that bad LOLA tracks leave in the grid (one crossed the IM-2
frame as a bright diagonal line).
"""

import math
from dataclasses import dataclass

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view
from PIL import Image

# Faint sky and earthshine fill, so slopes facing away are not black.
FILL = 0.04
# How far the cast shadows reach, and the grid they are traced on.
SHADOW_REACH_M = 12000.0
SHADOW_BIN = 2
# Tone: the 1st to 99.7th percentile stretched, a gamma, lifted blacks and
# soft whites, and a faint warm grey.
STRETCH = (1.0, 99.7)
GAMMA = 0.8
GREY = (0.10, 0.78)
TINT = (1.0, 0.985, 0.96)
MEDIAN_CHUNK = 256


@dataclass(frozen=True)
class Light:
    """Sun elevation and image azimuth (degrees), and how dark shadows go."""

    elevation_deg: float = 3.0
    azimuth_deg: float = 315.0
    shadow_floor: float = 0.45


def median5(z):
    """5 x 5 median filter, in row chunks to bound the memory."""
    padded = np.pad(z, 2, mode="edge")
    out = np.empty_like(z)
    for row in range(0, z.shape[0], MEDIAN_CHUNK):
        block = sliding_window_view(padded[row : row + MEDIAN_CHUNK + 4], (5, 5))
        flat = block.reshape(*block.shape[:2], 25)
        out[row : row + MEDIAN_CHUNK] = np.median(flat, axis=-1)
    return out


def box3(z):
    """One 3 x 3 box blur."""
    p = np.pad(z, 1, mode="edge")
    h, w = z.shape
    return sum(p[r : r + h, c : c + w] for r in range(3) for c in range(3)) / 9


def lambert(z, pixel_m, elev, az):
    """Cosine of the angle between the surface normal and the Sun."""
    gy, gx = np.gradient(z, pixel_m)
    nx, ny = -gx, gy
    norm = np.sqrt(nx**2 + ny**2 + 1)
    sx = math.cos(elev) * math.sin(az)
    sy = math.cos(elev) * math.cos(az)
    lit = (nx * sx + ny * sy + math.sin(elev)) / norm
    return np.clip(lit, 0, None)


def cast_shadow(z, pixel_m, elev, az):
    """1 where the Sun is visible, 0 where terrain towards it is higher."""
    lit = np.ones(z.shape, bool)
    dc, dr = math.sin(az), -math.cos(az)
    rise = math.tan(elev) * pixel_m * math.hypot(dc, dr)
    h, w = z.shape
    for k in range(1, int(SHADOW_REACH_M / pixel_m)):
        oc, orr = round(k * dc), round(k * dr)
        src = np.full(z.shape, -np.inf, np.float32)
        r0, r1 = max(0, -orr), min(h, h - orr)
        c0, c1 = max(0, -oc), min(w, w - oc)
        src[r0:r1, c0:c1] = z[r0 + orr : r1 + orr, c0 + oc : c1 + oc]
        lit &= src < z + k * rise
    return lit.astype(np.float32)


def _binned(z, n):
    """`z` averaged over n x n blocks (edges that do not fill one dropped)."""
    h, w = z.shape[0] // n * n, z.shape[1] // n * n
    return z[:h, :w].reshape(h // n, n, w // n, n).mean((1, 3))


def _tone(shade):
    lo, hi = np.percentile(shade, STRETCH)
    t = np.clip((shade - lo) / (hi - lo + 1e-9), 0, 1) ** GAMMA
    return GREY[0] + GREY[1] * t


def hillshade(z, pixel_m, light, size):
    """A `size` x `size` RGB image of the crop `z` (metres)."""
    elev = math.radians(light.elevation_deg)
    az = math.radians(light.azimuth_deg)
    z = box3(median5(z))
    coarse = _binned(z, SHADOW_BIN)
    shadow = cast_shadow(coarse, SHADOW_BIN * pixel_m, elev, az)
    shadow = Image.fromarray(shadow).resize(z.shape[::-1], Image.BILINEAR)
    floor = light.shadow_floor
    shade = (lambert(z, pixel_m, elev, az) + FILL) * (
        floor + (1 - floor) * np.asarray(shadow)
    )
    grey = Image.fromarray((_tone(shade) * 255).astype(np.uint8))
    grey = grey.resize((size, size), Image.LANCZOS)
    rgb = np.asarray(grey, np.float32)[..., None] * np.array(TINT)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
