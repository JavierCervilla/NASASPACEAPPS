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

"""Builds the app icon «J2» and the Moon's phase frames (VENT-28).

J2 is a photo-real Moon inside the legend ring: a dark track with the
three signal arcs from 12 o'clock clockwise (Sun 0-60°, window 60-120°,
Earth 120-180°). The Moon is rendered from the textures the globe ships
(LROC colour 8K for albedo, LOLA normal 4K for relief) with a lunar
photometric law (Lommel-Seeliger-like: 2 mu / (mu + mu0)), which keeps
the full disk flat and the terminator sharp, as the real Moon looks.

Writes, under packages/web/public:

- icons/icon-192.png, icons/icon-512.png: the install icon (`any`), a
  rounded square;
- icons/icon-maskable-512.png: full bleed, the ring inside the central
  80 % circle Android may crop to;
- icons/apple-touch-icon.png (180): full bleed, iOS rounds it;
- favicon.ico (16, 32, 48) and favicon.svg (vector ring around an
  embedded Moon): the fallbacks before the live favicon draws;
- icons/phase/moon-NN.webp: PHASE_FRAMES Moons through one synodic
  month, frame 0 new and PHASE_FRAMES / 2 full, waxing lit on the right,
  the dark side in earthshine. The page draws the live favicon and its
  loading state from the current frame (src/pwa/).

Regenerate (Pillow and NumPy, hash-pinned in requirements.txt next to
this file; sources in ASSETS.md):

  python3 packages/web/scripts/app_icons.py
"""

import argparse
import base64
import io
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
PUBLIC = ROOT / "packages" / "web" / "public"
TEXTURES = PUBLIC / "textures"
ALBEDO = TEXTURES / "moon-lroc-8k.jpg"
NORMALS = TEXTURES / "moon-lola-normal-4k.jpg"

# The design canvas (the approved reference is drawn on 1024 x 1024).
CANVAS = 1024
MOON = 600
RING_RADIUS = 372
RING_WIDTH = 64
# The page's near-black (--bg in src/styles/tokens.css).
BACKGROUND = (7, 8, 11)
TRACK = (26, 29, 36)
# The signal tokens (--signal-sun, --signal-window, --signal-earth).
ARCS = (
    ((245, 197, 66), 0.0, 60.0),
    ((61, 220, 132), 60.0, 120.0),
    ((74, 156, 255), 120.0, 180.0),
)
# The `any` icon's corner, as a share of its side.
CORNER = 0.2237
# Android's maskable safe zone is a circle of 40 % of the side around the
# centre; the ring's outer edge (404 / 1024) is scaled inside it.
MASKABLE_SCALE = 0.8
SUPERSAMPLE = 4

# The Moon seen a little from the south, as the globe opens on the pole.
VIEW_LAT_DEG = -12.0
# The install icon's Sun: slightly off the line of sight, so the relief
# shows on an otherwise full disk.
FULL_SUN = (-0.2, 0.1, 1.0)
FULL_BUMP = 0.25
PHASE_BUMP = 0.3
PHASE_FRAMES = 30
PHASE_SIZE = 128
PHASE_QUALITY = 82
# The dark side's light from the Earth, as a share of the lit albedo.
EARTHSHINE = 0.06
# A faint warm tint: the Moon is not neutral grey.
TINT = (1.0, 0.975, 0.94)


def load_maps(albedo_path=ALBEDO, normals_path=NORMALS):
    """The albedo (0-1) and the relief normals (-1..1), on one grid."""
    Image.MAX_IMAGE_PIXELS = None
    with Image.open(albedo_path) as image:
        albedo = np.asarray(image.convert("L"), np.float32) / 255
    height, width = albedo.shape
    with Image.open(normals_path) as image:
        rgb = image.convert("RGB").resize((width, height), Image.BILINEAR)
    normals = np.asarray(rgb, np.float32) / 127.5 - 1
    return albedo, normals


def phase_sun(fraction):
    """The Sun's direction in view space at `fraction` of the month.

    x right, y up, z towards the viewer. 0 is new (Sun behind the Moon),
    0.25 first quarter (lit on the right), 0.5 full, 0.75 last quarter.
    """
    elongation = 2 * math.pi * fraction
    return (math.sin(elongation), 0.0, -math.cos(elongation))


def disk_coords(size):
    """The view coordinates of each pixel of a size x size disk."""
    y, x = np.mgrid[0:size, 0:size]
    u = (x + 0.5) / size * 2 - 1
    v = 1 - (y + 0.5) / size * 2
    inside = u * u + v * v <= 1
    z = np.sqrt(np.clip(1 - u * u - v * v, 0, 1))
    return u, v, z, inside


def sample_maps(maps, u, v, z):
    """The albedo and normals under each view pixel."""
    albedo, normals = maps
    height, width = albedo.shape
    tilt = math.radians(VIEW_LAT_DEG)
    north = v * math.cos(tilt) + z * math.sin(tilt)
    depth = -v * math.sin(tilt) + z * math.cos(tilt)
    lat = np.arcsin(np.clip(north, -1, 1))
    lon = np.arctan2(u, depth)
    px = (((lon / (2 * np.pi) + 0.5) % 1) * (width - 1)).astype(int)
    py = ((0.5 - lat / np.pi) * (height - 1)).astype(int)
    return albedo[py, px], normals[py, px]


def render_moon(maps, size, sun, bump, earthshine=0.0):
    """An RGBA Moon of `size` px lit from `sun`, supersampled twice."""
    full = size * 2
    u, v, z, inside = disk_coords(full)
    albedo, normals = sample_maps(maps, u, v, z)
    s = np.asarray(sun, np.float64)
    s = s / np.linalg.norm(s)
    nx = u + bump * normals[..., 0] * z
    ny = v + bump * normals[..., 1] * z
    length = np.sqrt(nx * nx + ny * ny + z * z) + 1e-6
    mu = np.clip((nx * s[0] + ny * s[1] + z * s[2]) / length, 0, 1)
    mu0 = np.clip(z, 1e-3, 1)
    contrast = np.clip((albedo - 0.5) * 1.35 + 0.5, 0, 1) ** 1.15
    lit = np.clip(contrast * 2 * mu / (mu + mu0) * 0.95, 0, 1)
    tone = np.where(mu > 0, lit, earthshine * contrast)
    rgb = [tone * channel for channel in TINT]
    layers = np.dstack([*rgb, inside.astype(np.float32)])
    image = Image.fromarray((layers * 255).astype(np.uint8), "RGBA")
    return image.resize((size, size), Image.LANCZOS)


def arc_end(centre, radius, degrees):
    """The point `degrees` clockwise from 12 o'clock on the ring."""
    angle = math.radians(degrees)
    return (centre + radius * math.sin(angle), centre - radius * math.cos(angle))


def draw_ring(draw, side, scale):
    """The track and the three arcs, round-capped, on a `side` canvas."""
    centre = side / 2
    radius = RING_RADIUS * side / CANVAS * scale
    width = RING_WIDTH * side / CANVAS * scale
    box = [centre - radius, centre - radius, centre + radius, centre + radius]
    outer = [box[0] - width / 2, box[1] - width / 2]
    outer += [box[2] + width / 2, box[3] + width / 2]
    draw.arc(outer, 0, 360, fill=TRACK, width=round(width))
    for colour, start, end in ARCS:
        draw.arc(outer, start - 90, end - 90, fill=colour, width=round(width))
        for at in (start, end):
            x, y = arc_end(centre, radius, at)
            cap = width / 2
            draw.ellipse([x - cap, y - cap, x + cap, y + cap], fill=colour)


def j2(moon, size, shape, scale=1.0):
    """The icon at `size` px: `shape` 'rounded' or 'square' background."""
    side = size * SUPERSAMPLE
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    if shape == "rounded":
        corner = round(side * CORNER)
        draw.rounded_rectangle([0, 0, side - 1, side - 1], corner, BACKGROUND)
    else:
        draw.rectangle([0, 0, side, side], BACKGROUND)
    disk = round(MOON * side / CANVAS * scale)
    offset = (side - disk) // 2
    canvas.alpha_composite(moon.resize((disk, disk), Image.LANCZOS), (offset, offset))
    draw_ring(draw, side, scale)
    return canvas.resize((size, size), Image.LANCZOS)


def favicon_svg(moon):
    """A vector J2 around an embedded 96 px Moon (WebP)."""
    data = io.BytesIO()
    moon.resize((96, 96), Image.LANCZOS).save(data, "WEBP", quality=80)
    href = "data:image/webp;base64," + base64.b64encode(data.getvalue()).decode()
    hexes = ["#{:02x}{:02x}{:02x}".format(*colour) for colour, _, _ in ARCS]
    paths = []
    for (_, start, end), hex_colour in zip(ARCS, hexes, strict=True):
        (x0, y0), (x1, y1) = (arc_end(512, RING_RADIUS, a) for a in (start, end))
        paths.append(
            f'<path d="M{x0:.1f} {y0:.1f}A{RING_RADIUS} {RING_RADIUS} 0 0 1 {x1:.1f} {y1:.1f}" '
            f'stroke="{hex_colour}"/>'
        )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
        f'<rect width="1024" height="1024" rx="{round(1024 * CORNER)}" fill="#07080b"/>'
        f'<image href="{href}" x="212" y="212" width="600" height="600"/>'
        f'<g fill="none" stroke-width="{RING_WIDTH}" stroke-linecap="round">'
        f'<circle cx="512" cy="512" r="{RING_RADIUS}" stroke="#1a1d24"/>'
        + "".join(paths)
        + "</g></svg>\n"
    )


def phase_frames(maps, count=PHASE_FRAMES, size=PHASE_SIZE):
    """The Moon at each of `count` steps of the month, frame 0 new."""
    for index in range(count):
        sun = phase_sun(index / count)
        yield index, render_moon(maps, size, sun, PHASE_BUMP, EARTHSHINE)


def write_icons(maps, public):
    icons = public / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    moon = render_moon(maps, 1024, FULL_SUN, FULL_BUMP)
    j2(moon, 192, "rounded").save(icons / "icon-192.png", optimize=True)
    j2(moon, 512, "rounded").save(icons / "icon-512.png", optimize=True)
    j2(moon, 512, "square", MASKABLE_SCALE).save(
        icons / "icon-maskable-512.png", optimize=True
    )
    j2(moon, 180, "square").save(icons / "apple-touch-icon.png", optimize=True)
    j2(moon, 48, "rounded").save(
        public / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    (public / "favicon.svg").write_text(favicon_svg(moon), encoding="utf-8")


def write_phases(maps, public):
    folder = public / "icons" / "phase"
    folder.mkdir(parents=True, exist_ok=True)
    for index, image in phase_frames(maps):
        image.save(folder / f"moon-{index:02d}.webp", quality=PHASE_QUALITY, method=6)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--public", type=Path, default=PUBLIC, help="where the files go"
    )
    args = parser.parse_args()
    maps = load_maps()
    write_icons(maps, args.public)
    write_phases(maps, args.public)


if __name__ == "__main__":
    main()
