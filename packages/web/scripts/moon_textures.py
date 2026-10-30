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

"""Builds the Moon textures the globe ships, from NASA SVS's CGI Moon Kit.

Three jobs, all offline so the browser never computes them:

  colour   An LROC colour TIFF to a progressive JPEG (browsers do not decode
           TIFF).
  normals  The LOLA elevation map (ldem_*.tif, floating-point km above a
           1737.4 km sphere) to object-space normal maps, one per size.
  polar    The same LROC colour TIFF reprojected to a polar stereographic
           image of the south pole down to 80° S, for the polar map view.

Regenerate (sources in ASSETS.md; Pillow and NumPy, no other dependency):

  python3 packages/web/scripts/moon_textures.py colour \
      lroc_color_poles_4k.tif packages/web/public/textures/moon-lroc-4k.jpg
  python3 packages/web/scripts/moon_textures.py normals ldem_16.tif \
      packages/web/public/textures
  python3 packages/web/scripts/moon_textures.py polar \
      lroc_color_poles_8k.tif \
      packages/web/public/textures/moon-south-polar-2k.jpg

Why object space: the globe's sphere has no tangents, and a tangent-space
map would lean on screen-space derivatives that break down in the pole fan
of the sphere, exactly where this site looks. An object-space normal is the
surface's own direction in the globe's frame, so the pole and the 180°
seam need nothing special. Three.js ignores `normalScale` for this kind of
map, so the relief's strength is baked in here (`--exaggeration`).

The polar image follows the web's projection (src/lib/polar-projection.ts):
the pole at the centre, 80° S on the rim, 0° E at the top and 90° E on the
right; the radius grows as tan(colatitude / 2). Outside the rim it is black,
which the page clips to a disk anyway. The tone is stretched (POLAR_TONE).

Why a polar chart: in an equirectangular grid the columns next to a pole
are metres apart and LOLA's values there differ by hundreds of metres, so
an east-west difference there is noise. Above 70° of latitude the slope is
measured on an azimuthal grid around the pole instead, where every step is
the same length on the ground.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

MOON_RADIUS_KM = 1737.4
POLAR_CAP_DEG = 70.0
POLE_SMOOTH_DEG = 1.5
DEFAULT_SIZES = (1024, 2048, 4096)
DEFAULT_EXAGGERATION = 3.0
DEFAULT_QUALITY = 80
POLAR_RIM_COLAT_DEG = 10.0
DEFAULT_POLAR_SIZE = 2048
# The mosaic is Hapke normalised: flat and bright. Its 1st to 99th
# percentile is stretched to this range of the byte scale, so the craters
# read and the disk sits in the dark page instead of glaring from it.
POLAR_TONE = (0.14, 0.66)
# How much of the mosaic's warm cast the stretch keeps (0: grey): the
# stretch amplifies it, and the map reads as the canvas's neutral grey.
POLAR_SATURATION = 0.35


def save_jpeg(image, path, quality, chroma=True):
    """Progressive JPEG; `chroma=False` keeps full colour resolution."""
    options = {"quality": quality, "optimize": True, "progressive": True}
    if not chroma:
        options["subsampling"] = 0
    image.save(path, "JPEG", **options)


def colour(args):
    image = Image.open(args.source).convert("RGB")
    save_jpeg(image, args.out, args.quality)


def sample(dem, lat, lon):
    """Bilinear height at `lat`, `lon` (radians) of an equirectangular map
    centred on 0° E, wrapping in longitude and clamped at the poles."""
    rows, cols = dem.shape
    x = (lon + np.pi) / (2 * np.pi) * cols - 0.5
    y = (np.pi / 2 - lat) / np.pi * rows - 0.5
    y = np.clip(y, 0, rows - 1)
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    fx = x - x0
    fy = y - y0
    y1 = np.minimum(y0 + 1, rows - 1)
    x0w = np.mod(x0, cols)
    x1w = np.mod(x0 + 1, cols)
    top = dem[y0, x0w] * (1 - fx) + dem[y0, x1w] * fx
    bottom = dem[y1, x0w] * (1 - fx) + dem[y1, x1w] * fx
    return top * (1 - fy) + bottom * fy


def blur(grid, sigma):
    """Separable Gaussian blur, NumPy only."""
    radius = max(1, int(3 * sigma))
    taps = np.arange(-radius, radius + 1)
    kernel = np.exp(-(taps**2) / (2 * sigma**2))
    kernel /= kernel.sum()
    padded = np.pad(grid, radius, mode="edge")
    rows = sum(
        k * padded[:, radius + t : radius + t + grid.shape[1]]
        for t, k in zip(taps, kernel)
    )
    return sum(
        k * rows[radius + t : radius + t + grid.shape[0], :]
        for t, k in zip(taps, kernel)
    )


def equirect_slopes(dem, lat, lon, step):
    """East and north slopes (km per km) by central differences one texel
    (`step` radians) apart on the ground."""
    dn = (sample(dem, lat + step, lon) - sample(dem, lat - step, lon)) / (
        2 * step * MOON_RADIUS_KM
    )
    cos = np.maximum(np.cos(lat), 1e-6)
    dlon = np.minimum(step / cos, np.pi / 2)
    chord = 2 * MOON_RADIUS_KM * cos * np.sin(dlon)
    de = (sample(dem, lat, lon + dlon) - sample(dem, lat, lon - dlon)) / chord
    return de, dn


def polar_slopes(dem, lat, lon, step, south):
    """East and north slopes inside a polar cap, measured on an azimuthal
    equidistant grid around the pole with `step` radians per cell."""
    cap = np.radians(90 - POLAR_CAP_DEG) + 4 * step
    half = int(np.ceil(cap / step))
    axis = np.arange(-half, half + 1) * step
    gx, gy = np.meshgrid(axis, axis)
    rho = np.hypot(gx, gy)
    sign = -1 if south else 1
    grid = sample(dem, sign * (np.pi / 2 - rho), np.arctan2(gy, gx))
    # Only the noisy rows at the pole itself are smoothed; the rest keeps
    # its detail, so the cap's edge does not show.
    near = np.clip(1 - rho / np.radians(POLE_SMOOTH_DEG), 0, 1)
    grid = grid * (1 - near) + blur(grid, 1.5) * near
    dy, dx = np.gradient(grid, step * MOON_RADIUS_KM)
    # The texel's place on the grid, then the slope there along east and north.
    r = np.pi / 2 - sign * lat
    px = r * np.cos(lon) / step + half
    py = r * np.sin(lon) / step + half
    sx = sample_grid(dx, px, py)
    sy = sample_grid(dy, px, py)
    east = -np.sin(lon) * sx + np.cos(lon) * sy
    outward = np.cos(lon) * sx + np.sin(lon) * sy
    return east, -sign * outward


def sample_grid(grid, px, py):
    """Bilinear value of a square grid at fractional cell `px`, `py`."""
    size = grid.shape[0]
    x0 = np.clip(np.floor(px).astype(np.int64), 0, size - 2)
    y0 = np.clip(np.floor(py).astype(np.int64), 0, size - 2)
    fx = np.clip(px - x0, 0, 1)
    fy = np.clip(py - y0, 0, 1)
    top = grid[y0, x0] * (1 - fx) + grid[y0, x0 + 1] * fx
    bottom = grid[y0 + 1, x0] * (1 - fx) + grid[y0 + 1, x0 + 1] * fx
    return top * (1 - fy) + bottom * fy


def normal_map(dem_full, width, exaggeration):
    """Object-space normals, as RGB bytes, for a `width` x `width/2` map. The
    axes are the globe's (geo.ts): +Y north, +X 0° E, -Z 90° E."""
    height = width // 2
    dem = np.asarray(
        Image.fromarray(dem_full).resize((width, height), Image.BOX), dtype=np.float64
    )
    step = np.pi / height
    lon = -np.pi + 2 * np.pi * (np.arange(width) + 0.5) / width
    lat = np.pi / 2 - np.pi * (np.arange(height) + 0.5) / height
    lon, lat = np.meshgrid(lon, lat)
    de, dn = equirect_slopes(dem, lat, lon, step)
    for south in (False, True):
        cap = (
            (lat < -np.radians(POLAR_CAP_DEG))
            if south
            else (lat > np.radians(POLAR_CAP_DEG))
        )
        de[cap], dn[cap] = polar_slopes(dem, lat[cap], lon[cap], step, south)
    up = np.stack([np.cos(lat) * np.cos(lon), np.sin(lat), -np.cos(lat) * np.sin(lon)])
    east = np.stack([-np.sin(lon), np.zeros_like(lon), -np.cos(lon)])
    north = np.stack(
        [-np.sin(lat) * np.cos(lon), np.cos(lat), np.sin(lat) * np.sin(lon)]
    )
    normal = up - exaggeration * (de * east + dn * north)
    normal /= np.linalg.norm(normal, axis=0)
    rgb = np.round((normal + 1) * 127.5).clip(0, 255).astype(np.uint8)
    return Image.fromarray(np.moveaxis(rgb, 0, -1), "RGB")


def polar_grid(size):
    """Latitude and longitude (radians) of every pixel of a `size` square
    south polar stereographic image, and the mask of pixels inside the rim."""
    axis = (np.arange(size) + 0.5) / size * 2 - 1
    x, y = np.meshgrid(axis, axis)
    r = np.hypot(x, y)
    colat = 2 * np.arctan(r * np.tan(np.radians(POLAR_RIM_COLAT_DEG) / 2))
    lat = colat - np.pi / 2
    lon = np.arctan2(x, -y)
    return lat, lon, r <= 1


def stretch(rgb, inside):
    """Maps the 1st to 99th percentile of the pixels inside the rim to
    `POLAR_TONE`, with the colour cut to `POLAR_SATURATION`."""
    grey = rgb.mean(axis=-1, keepdims=True)
    rgb = grey + POLAR_SATURATION * (rgb - grey)
    low, high = np.percentile(rgb[inside], (1, 99))
    unit = np.clip((rgb - low) / (high - low), 0, 1)
    dark, light = POLAR_TONE
    return (dark + unit * (light - dark)) * 255


def polar(args):
    rgb = np.asarray(Image.open(args.source).convert("RGB"), dtype=np.float32)
    lat, lon, inside = polar_grid(args.size)
    bands = [sample(rgb[:, :, band], lat, lon) for band in range(3)]
    out = stretch(np.stack(bands, axis=-1), inside) * inside[:, :, None]
    image = Image.fromarray(np.round(out).clip(0, 255).astype(np.uint8), "RGB")
    save_jpeg(image, args.out, args.quality)
    print(args.out, Path(args.out).stat().st_size)


def normals(args):
    dem = np.asarray(Image.open(args.source), dtype=np.float32)
    for width in args.sizes:
        image = normal_map(dem, width, args.exaggeration)
        out = Path(args.out_dir) / f"moon-lola-normal-{width // 1024}k.jpg"
        save_jpeg(image, out, args.quality, chroma=False)
        print(out, out.stat().st_size)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    jobs = parser.add_subparsers(required=True)
    job = jobs.add_parser("colour", help="LROC colour TIFF to progressive JPEG")
    job.add_argument("source")
    job.add_argument("out")
    job.add_argument("--quality", type=int, default=85)
    job.set_defaults(run=colour)
    job = jobs.add_parser("normals", help="LOLA elevation to object-space normal maps")
    job.add_argument("source")
    job.add_argument("out_dir")
    job.add_argument("--sizes", type=int, nargs="+", default=list(DEFAULT_SIZES))
    job.add_argument("--exaggeration", type=float, default=DEFAULT_EXAGGERATION)
    job.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    job.set_defaults(run=normals)
    job = jobs.add_parser("polar", help="LROC colour TIFF to a south polar map")
    job.add_argument("source")
    job.add_argument("out")
    job.add_argument("--size", type=int, default=DEFAULT_POLAR_SIZE)
    job.add_argument("--quality", type=int, default=85)
    job.set_defaults(run=polar)
    args = parser.parse_args()
    args.run(args)


if __name__ == "__main__":
    main()
