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

"""Renders the ASCII Moon of the file header from the globe's LROC map.

The header every code file carries (`scripts/file-header.txt`) shows the
Moon seen from below the equator, lit from the side, so the south pole the
site is about sits in view. This script draws it from the same colour map
the globe ships, so the art is ours and can be regenerated:

  python3 packages/web/scripts/header_moon.py \
      packages/web/public/textures/moon-lroc-2k.jpg

The defaults are the values the header was made with; the output is the
Moon block of the template, each line with its trailing spaces stripped.
Pillow and NumPy, no other dependency.
"""

import argparse
import math

import numpy as np
from PIL import Image

DEFAULT_COLS = 36
DEFAULT_ROWS = 16
DEFAULT_TILT_DEG = -30.0
DEFAULT_SUN_LON_DEG = -60.0
DEFAULT_RAMP = " .:-=+*#%@"

# Percentiles that stretch the map's contrast, so a few bright craters do
# not flatten everything else.
STRETCH_LOW_PCT = 2
STRETCH_HIGH_PCT = 98
# The sun sits slightly above the view's horizon.
SUN_ELEVATION = 0.15
# Brightness = (ALBEDO_FLOOR + ALBEDO_WEIGHT * albedo) * light, with the
# light boosted and capped at 1 so the terminator stays sharp.
ALBEDO_FLOOR = 0.35
ALBEDO_WEIGHT = 0.65
LIGHT_GAIN = 1.4
# Below this light a cell is night side, drawn as a sparse dot pattern.
NIGHT_LIGHT = 0.02
NIGHT_DOT_EVERY = 3


def load_albedo(path):
    """Grey levels of the map in 0..1, contrast stretched."""
    grey = Image.open(path).convert("L")
    tex = np.asarray(grey, dtype=float) / 255.0
    low = np.percentile(tex, STRETCH_LOW_PCT)
    high = np.percentile(tex, STRETCH_HIGH_PCT)
    return np.clip((tex - low) / (high - low), 0, 1)


def sun_direction(sun_lon):
    """Unit vector towards the sun in view space."""
    sun = np.array([math.sin(sun_lon), SUN_ELEVATION, math.cos(sun_lon)])
    return sun / np.linalg.norm(sun)


def texel(albedo, x, y, z, tilt):
    """Albedo under the view-space point (x, y, z) of a view tilted
    `tilt` radians about the x axis."""
    height, width = albedo.shape
    yy = y * math.cos(tilt) - z * math.sin(tilt)
    zz = y * math.sin(tilt) + z * math.cos(tilt)
    lat = math.asin(max(-1, min(1, yy)))
    lon = math.atan2(x, zz)
    u = int((lon / (2 * math.pi) + 0.5) * (width - 1))
    v = int((0.5 - lat / math.pi) * (height - 1))
    return albedo[v, u]


def cell(albedo, sun, args, row, col):
    """The character for one cell of the grid."""
    x = (col + 0.5) / args.cols * 2 - 1
    y = 1 - (row + 0.5) / args.rows * 2
    d = x * x + y * y
    if d > 1:
        return " "
    z = math.sqrt(1 - d)
    light = max(0.0, x * sun[0] + y * sun[1] + z * sun[2])
    if light <= NIGHT_LIGHT:
        return "." if (row + col) % NIGHT_DOT_EVERY == 0 else " "
    tilt = math.radians(args.tilt)
    albedo_here = texel(albedo, x, y, z, tilt)
    value = (ALBEDO_FLOOR + ALBEDO_WEIGHT * albedo_here) * min(1, light * LIGHT_GAIN)
    ramp = args.ramp
    return ramp[min(len(ramp) - 1, int(value * len(ramp)))]


def render(args):
    """The Moon as lines of text, trailing spaces stripped."""
    albedo = load_albedo(args.texture)
    sun = sun_direction(math.radians(args.sun_lon))
    lines = []
    for row in range(args.rows):
        chars = (cell(albedo, sun, args, row, col) for col in range(args.cols))
        lines.append("".join(chars).rstrip())
    return lines


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("texture", help="equirectangular LROC colour map")
    parser.add_argument("--cols", type=int, default=DEFAULT_COLS)
    parser.add_argument("--rows", type=int, default=DEFAULT_ROWS)
    parser.add_argument(
        "--tilt",
        type=float,
        default=DEFAULT_TILT_DEG,
        help="view latitude in degrees (negative = from the south)",
    )
    parser.add_argument(
        "--sun-lon",
        type=float,
        default=DEFAULT_SUN_LON_DEG,
        help="sun azimuth in degrees",
    )
    parser.add_argument(
        "--ramp",
        default=DEFAULT_RAMP,
        help="characters from dark to bright",
    )
    print("\n".join(render(parser.parse_args())))


if __name__ == "__main__":
    main()
