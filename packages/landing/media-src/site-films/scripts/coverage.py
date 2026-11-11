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

"""
Checks that the Moon covers the whole field of view under its skyline in
every frame of a site film (VENT-115), as the hero film's check does: the
`diag-normals-*` compositions paint every surface pixel with its normal and
leave the sky black, so a column whose sky reaches below its first surface
pixel is a hole in the mesh's coverage. The Sun stays drawn in those views
(white, with a grey bloom), so near-grey pixels count as sky: a normal's
colour is grey only on a 55° slope facing south-east exactly. All frames
are checked: from 40 km the whole frame is ground.

    python3 scripts/coverage.py out/coverage/wide out/coverage/phone   (Pillow, NumPy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def holes(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    grey = (np.abs(r - g) < 8) & (np.abs(g - b) < 16) & (r >= b)
    sky = (a.max(axis=2) < 4) | grey
    ground = ~sky
    first = np.where(ground.any(axis=0), ground.argmax(axis=0), sky.shape[0])
    rows = np.arange(sky.shape[0])[:, None]
    return int((sky & (rows > first[None, :])).sum())


bad = 0
for folder in sys.argv[1:]:
    frames = sorted(Path(folder).glob('frame-*.png'))
    worst = max(((holes(f), f.name) for f in frames), default=(0, ''))
    print(f'{folder}: {len(frames)} frames, most sky pixels under the ground in one frame: {worst[0]} ({worst[1]})')
    bad += worst[0] > 0 or not frames
sys.exit(1 if bad else 0)
