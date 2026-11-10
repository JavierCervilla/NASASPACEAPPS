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
Checks that the Moon covers the whole field of view below its horizon in
every frame (VENT-112): renders of the `diag-normals` compositions paint every
surface pixel and leave the sky black, so a column whose sky pixels reach
below its first surface pixel is a hole in the mesh's coverage. Checked from
frame 240 on (8 s, 46 km up): before that the whole Moon, or its limb, is in
frame and space below the limb is right.

    python3 scripts/coverage.py out/coverage/desktop out/coverage/phone   (Pillow, NumPy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def holes(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    sky = a.max(axis=2) < 4
    ground = ~sky
    first = np.where(ground.any(axis=0), ground.argmax(axis=0), sky.shape[0])
    rows = np.arange(sky.shape[0])[:, None]
    return int((sky & (rows > first[None, :])).sum())


bad = 0
for folder in sys.argv[1:]:
    frames = [f for f in sorted(Path(folder).glob('*.png')) if int(f.stem.split('-')[-1]) >= 240]
    worst = max(((holes(f), f.name) for f in frames), default=(0, ''))
    print(f'{folder}: {len(frames)} frames, most sky pixels below the ground in one frame: {worst[0]} ({worst[1]})')
    bad += worst[0] > 0
sys.exit(1 if bad else 0)
