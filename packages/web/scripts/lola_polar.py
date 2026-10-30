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

"""The LOLA south polar elevation grid LDEM_80S_20M, read in row strips.

The product is one 1.8 GB raw image: 30400 x 30400 little-endian int16,
one record per line, no header, height in metres = DN x 0.5 above a
1737.4 km sphere (its PDS label, ldem_80s_20m.lbl). Polar stereographic,
centred on the south pole, 0° E up and 90° E right, 20 m per pixel.

Nothing here downloads the whole file. A crop of a few kilometres needs
whole lines (a line is one contiguous record), so the lines are fetched in
fixed chunks of CHUNK_LINES with HTTP Range requests and kept in a cache
directory outside the repository. Chunks shared by nearby sites are read
once, each chunk's sha256 goes into the cache's SHA256SUMS, and a cached
chunk that no longer matches it is fetched again.
"""

import hashlib
import math
import urllib.request
from pathlib import Path

import numpy as np

URL = (
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/"
    "data/lola_gdr/polar/img/ldem_80s_20m.img"
)
SIZE = 30400
RECORD_BYTES = SIZE * 2
METRES_PER_DN = 0.5
METRES_PER_PIXEL = 20.0
MOON_RADIUS_M = 1737400.0
# LINE_PROJECTION_OFFSET and SAMPLE_PROJECTION_OFFSET of the label: the
# 0-based pixel centre of the pole.
POLE_PIXEL = 15199.5
CHUNK_LINES = 500
SUMS = "SHA256SUMS"


def project(lat_deg, lon_east_deg):
    """0-based (line, sample) of a point, as the label's projection maps it."""
    lat = math.radians(lat_deg)
    lon = math.radians(lon_east_deg)
    rho = 2 * MOON_RADIUS_M * math.tan(math.pi / 4 + lat / 2)
    line = POLE_PIXEL - rho * math.cos(lon) / METRES_PER_PIXEL
    sample = POLE_PIXEL + rho * math.sin(lon) / METRES_PER_PIXEL
    return line, sample


def _span(centre, side):
    """`side` pixels around `centre`, slid back inside the grid if needed."""
    start = round(centre) - side // 2
    start = min(max(start, 0), SIZE - side)
    return start, start + side


def window(lat_deg, lon_east_deg, frame_km):
    """The square crop (lines, samples; end exclusive) framing a point.

    A point closer to the grid's edge than half the frame keeps the full
    frame: the window slides inward and the point sits off centre.
    """
    side = round(frame_km * 1000 / METRES_PER_PIXEL)
    line, sample = project(lat_deg, lon_east_deg)
    return _span(line, side), _span(sample, side)


def chunks_of(lines):
    """Indices of the chunks that hold the lines [start, end)."""
    start, end = lines
    return range(start // CHUNK_LINES, (end - 1) // CHUNK_LINES + 1)


def chunk_bytes(index):
    """Inclusive byte range of a chunk in the product (the last is short)."""
    first = index * CHUNK_LINES
    last = min(first + CHUNK_LINES, SIZE)
    return first * RECORD_BYTES, last * RECORD_BYTES - 1


class StripCache:
    """Chunks of the product on disk, fetched on demand with `opener`."""

    def __init__(self, root, opener=urllib.request.urlopen):
        self.root = Path(root)
        self.opener = opener
        self.root.mkdir(parents=True, exist_ok=True)
        self.sums = self._read_sums()

    def _read_sums(self):
        path = self.root / SUMS
        if not path.exists():
            return {}
        pairs = (row.split() for row in path.read_text().splitlines())
        return {name: digest for digest, name in pairs}

    def _write_sums(self):
        rows = (f"{self.sums[name]}  {name}\n" for name in sorted(self.sums))
        (self.root / SUMS).write_text("".join(rows))

    def _fetch(self, index):
        first, last = chunk_bytes(index)
        request = urllib.request.Request(
            URL, headers={"Range": f"bytes={first}-{last}"}
        )
        with self.opener(request, timeout=120) as response:
            data = response.read()
        if response.status != 206 or len(data) != last - first + 1:
            raise OSError(f"chunk {index}: HTTP {response.status}, {len(data)} bytes")
        return data

    def chunk(self, index):
        """The bytes of chunk `index`, from the cache or the server."""
        name = f"ldem_80s_20m.lines-{index * CHUNK_LINES:05d}.bin"
        path = self.root / name
        if path.exists():
            data = path.read_bytes()
            if hashlib.sha256(data).hexdigest() == self.sums.get(name):
                return data
        data = self._fetch(index)
        path.write_bytes(data)
        self.sums[name] = hashlib.sha256(data).hexdigest()
        self._write_sums()
        return data

    def heights(self, lines, samples):
        """The crop in metres, as float32 (lines down, samples right)."""
        parts = [self.chunk(index) for index in chunks_of(lines)]
        first = chunks_of(lines)[0] * CHUNK_LINES
        grid = np.frombuffer(b"".join(parts), dtype="<i2").reshape(-1, SIZE)
        crop = grid[lines[0] - first : lines[1] - first, samples[0] : samples[1]]
        return crop.astype(np.float32) * METRES_PER_DN
