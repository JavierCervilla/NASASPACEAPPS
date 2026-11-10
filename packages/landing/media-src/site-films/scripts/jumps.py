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
The frame-to-frame jump scan of a site film's masters (VENT-115): the
mean absolute change between consecutive frames (grey, at a quarter of the
size), and each change against the median of the six around it. A smooth
move changes by about as much from one frame to the next as its neighbours
do; a pop, a switch or a flash stands out as a spike. Fails on a change
over 2.5 times its neighbours' and over 1 % of full scale, or on any change
inside the hold.

    python3 scripts/jumps.py out/masters/SITE-wide-png out/masters/SITE-phone-png   (Pillow, NumPy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

MOVE = 151
RATIO = 2.5
FLOOR = 0.01


def grey(path):
    im = Image.open(path).convert('L')
    return np.asarray(im.resize((im.width // 4, im.height // 4), Image.BILINEAR)).astype(np.float32) / 255


def scan(folder):
    frames = sorted(Path(folder).glob('frame-*.png'))
    images = [grey(f) for f in frames]
    change = np.array([np.abs(b - a).mean() for a, b in zip(images, images[1:])])
    worst, problems = (0.0, 0), []
    for i, c in enumerate(change[: MOVE - 1]):
        around = np.concatenate([change[max(0, i - 3):i], change[i + 1:min(MOVE - 1, i + 4)]])
        ratio = c / max(np.median(around), 1e-6)
        if ratio > worst[0]:
            worst = (ratio, i + 1)
        if ratio > RATIO and c > FLOOR:
            problems.append(f'frame {i + 1}: change {c:.4f}, {ratio:.1f} times its neighbours')
    held = change[MOVE - 1:]
    if held.size and held.max() > 0:
        problems.append(f'the hold changes (up to {held.max():.5f})')
    print(f'{folder}: {len(frames)} frames, largest change {change.max():.4f}, worst against its neighbours {worst[0]:.2f} times at frame {worst[1]}')
    for p in problems:
        print(f'  {p}')
    return not problems


ok = all([scan(folder) for folder in sys.argv[1:]])
sys.exit(0 if ok else 1)
