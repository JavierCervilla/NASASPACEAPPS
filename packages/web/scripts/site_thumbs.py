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

"""Builds the orbital thumbnail of each curated site at the south pole.

Every site south of 80° S gets a 320 x 320 shaded relief of the LOLA DEM
LDEM_80S_20M (lola_polar.py) around its point, lit by a low Sun
(hillshade.py), for the site callout on the globe. Sites further north
are outside the DEM and get none. Sites that share a point share one
file, named after the first of them in the site list.

It also writes the manifest the web reads (src/callout/thumbs.json): for
each site id, its file and the width of ground it shows. The web knows no
other rule: a site missing from the manifest has no thumbnail.

Regenerate (sources and checksums in ASSETS.md; Pillow and NumPy,
hash-pinned in requirements.txt next to this file):

  python3 packages/web/scripts/site_thumbs.py

The DEM chunks are cached in ~/.cache/ventana-lunar/ldem_80s_20m (about
600 MB; --cache to move it), so a second run downloads nothing.
"""

import argparse
import hashlib
import json
from pathlib import Path

from hillshade import Light, hillshade
from lola_polar import METRES_PER_PIXEL, StripCache, window

ROOT = Path(__file__).resolve().parents[3]
SITES = ROOT / "packages" / "server" / "data" / "sites.json"
OUT_DIR = ROOT / "packages" / "web" / "public" / "thumbs"
MANIFEST = ROOT / "packages" / "web" / "src" / "callout" / "thumbs.json"
CACHE = Path.home() / ".cache" / "ventana-lunar" / "ldem_80s_20m"
# The DEM's rim: a site north of it is outside the grid.
SOUTH_OF_DEG = -80.0
SIZE_PX = 320
QUALITY = 88
DEFAULT_FRAME_KM = 30.0
# Haworth is a 51 km crater: at 30 km only its floor and one wall show.
FRAME_KM = {"artemis-haworth": 62.0}
# A 3° Sun from the upper left buries Haworth's far wall and most of its
# floor in shadow; a 5° Sun from the left with softer shadows reads.
LIGHTS = {"artemis-haworth": Light(5.0, 270.0, 0.6)}


def thumb_groups(sites):
    """One entry per point south of the DEM's rim, in list order.

    Each entry: the file stem, the ids sharing the point, the point, and
    its frame and light (an override set on any of its ids applies).
    """
    groups = {}
    for site in sites:
        if site["lat"] > SOUTH_OF_DEG:
            continue
        point = (site["lat"], site["lonEast"])
        groups.setdefault(point, []).append(site["id"])
    return [_group(point, ids) for point, ids in groups.items()]


def _override(table, ids, default):
    return next((table[i] for i in ids if i in table), default)


def _group(point, ids):
    return {
        "file": f"{ids[0]}.jpg",
        "ids": ids,
        "lat": point[0],
        "lon_east": point[1],
        "frame_km": _override(FRAME_KM, ids, DEFAULT_FRAME_KM),
        "light": _override(LIGHTS, ids, Light()),
    }


def manifest(groups):
    """Site id to its file and frame, as the web reads it."""
    entries = {}
    for group in groups:
        for site_id in group["ids"]:
            frame = group["frame_km"]
            entries[site_id] = {"file": group["file"], "frameKm": frame}
    return dict(sorted(entries.items()))


def render(group, cache, out_dir):
    """Writes one thumbnail; returns its path."""
    lines, samples = window(group["lat"], group["lon_east"], group["frame_km"])
    heights = cache.heights(lines, samples)
    image = hillshade(heights, METRES_PER_PIXEL, group["light"], SIZE_PX)
    path = out_dir / group["file"]
    image.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--sites", type=Path, default=SITES)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--cache", type=Path, default=CACHE)
    args = parser.parse_args()
    groups = thumb_groups(json.loads(args.sites.read_text(encoding="utf-8")))
    cache = StripCache(args.cache)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for group in groups:
        data = render(group, cache, args.out_dir).read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        print(f"{group['file']}  {len(data)} bytes  sha256 {digest}")
    text = json.dumps(manifest(groups), indent=2) + "\n"
    args.manifest.write_text(text, encoding="utf-8")
    print(f"DEM chunks: {cache.root / 'SHA256SUMS'}")


if __name__ == "__main__":
    main()
