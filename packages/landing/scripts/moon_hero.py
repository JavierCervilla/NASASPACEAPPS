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

"""Renders the landing's hero Moon (VENT-109) from the shipped LROC map.

An orthographic view of the textured sphere, north up, centred at 52 S 15 E so
the south pole sits in the lower half, lit from the east by a low Sun (a first
quarter seen from over the southern hemisphere). Lommel-Seeliger shading on the
smooth sphere; no relief. Deterministic: the same map gives the same bytes.

Usage (from the repo root):
  python3 -I packages/landing/scripts/moon_hero.py [--check-near-side out.png]
"""

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
MAP = ROOT / "packages/web/public/textures/moon-lroc-4k.jpg"
OUT = ROOT / "packages/landing/public/media"
SIZES = (1600, 800)
CENTRE = (-52.0, 15.0)
SKY = (7, 8, 11)


def frame(lat_deg, lon_deg):
    """The view's axes: toward the viewer, east (right) and north (up)."""
    lat, lon = math.radians(lat_deg), math.radians(lon_deg)
    toward = np.array(
        [math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)]
    )
    east = np.array([-math.sin(lon), math.cos(lon), 0.0])
    return toward, east, np.cross(toward, east)


def render(texture, size, centre, light):
    """The lit disc on the sky colour, as an RGB array."""
    toward, east, north = frame(*centre)
    y, x = np.mgrid[0:size, 0:size]
    radius = size / 2 * 0.98
    u = (x - size / 2 + 0.5) / radius
    v = -(y - size / 2 + 0.5) / radius
    r2 = u * u + v * v
    z = np.sqrt(np.clip(1 - r2, 0, 1))
    p = z[..., None] * toward + u[..., None] * east + v[..., None] * north
    lat = np.arcsin(np.clip(p[..., 2], -1, 1))
    lon = np.arctan2(p[..., 1], p[..., 0])
    h, w = texture.shape
    col = (((lon / (2 * np.pi) + 0.5) % 1) * (w - 1)).astype(int)
    row = ((0.5 - lat / np.pi) * (h - 1)).astype(int)
    albedo = texture[row, col]
    sun = light[0] * east + light[1] * north + light[2] * toward
    sun = sun / np.linalg.norm(sun)
    mu = np.clip(p @ sun, 0, 1)
    shade = 2 * mu / (mu + np.clip(z, 0.05, 1))
    lit = np.clip(albedo * shade * 0.85, 0, 1) ** (1 / 1.2)
    edge = np.clip((1 - np.sqrt(np.clip(r2, 0, None))) * radius, 0, 1)
    value = lit * edge * (r2 <= 1) * 255
    sky = np.array(SKY, dtype=np.float32)
    return np.maximum(value[..., None], sky).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-near-side")
    args = parser.parse_args()
    gray = Image.open(MAP).convert("L")
    texture = np.asarray(gray, dtype=np.float32) / 255
    if args.check_near_side:
        image = render(texture, 600, (0.0, 0.0), (0.0, 0.0, 1.0))
        Image.fromarray(image).save(args.check_near_side)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        image = render(texture, size, CENTRE, (0.92, 0.1, 0.15))
        target = OUT / f"moon-{size}.webp"
        Image.fromarray(image).save(target, quality=82, method=6)
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()
