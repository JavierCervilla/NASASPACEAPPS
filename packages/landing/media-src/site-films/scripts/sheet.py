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
The site films' contact sheet (VENT-115): one page, one row per site made
so far, in the order of scripts/sites.mjs: its id, its light and heading
(from the site's out/framing.txt), then the start and end stills of the
16:9 film and of the 9:16 film. Written to out/site-films-contact-sheet.png.

    python3 packages/landing/media-src/site-films/scripts/sheet.py   (Pillow)
"""
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent
ROW_H = 216
GAP = 8
LABEL_W = 330
WIDE_W = ROW_H * 16 // 9
PHONE_W = ROW_H * 9 // 16
INK = (225, 225, 225)
DIM = (140, 140, 140)


def sites():
    out = subprocess.run(['node', str(HERE / 'scripts' / 'sites.mjs')], check=True, capture_output=True, text=True)
    return out.stdout.split()


def label_of(site):
    text = (HERE / site / 'out' / 'framing.txt').read_text()
    light = re.search(r'^light: (\w+)', text, re.M).group(1)
    heading = re.search(r'^heading ([\d.]+)°: the (\w+)', text, re.M)
    return [site, f'{light} · heading {heading.group(1)}° ({heading.group(2)})']


def still(site, look, end):
    path = HERE / site / 'out' / 'stills' / f'{site}-{look}-{end}.png'
    size = (WIDE_W, ROW_H) if look == 'wide' else (PHONE_W, ROW_H)
    return Image.open(path).convert('RGB').resize(size, Image.LANCZOS)


def main():
    made = [s for s in sites() if (HERE / s / 'out' / 'stills').is_dir()]
    width = LABEL_W + 2 * WIDE_W + 2 * PHONE_W + 5 * GAP
    head = 40
    sheet = Image.new('RGB', (width, head + len(made) * (ROW_H + GAP) + GAP), (18, 18, 18))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=18)
    small = ImageFont.load_default(size=14)
    draw.text((GAP, 10), 'Site films, 2026-12-15 05:00 UTC: 16:9 start, end; 9:16 start, end', font=font, fill=INK)
    for i, site in enumerate(made):
        y = head + i * (ROW_H + GAP)
        name, light = label_of(site)
        draw.text((GAP, y + 8), name, font=font, fill=INK)
        draw.text((GAP, y + 36), light, font=small, fill=DIM)
        x = LABEL_W
        for look, end in [('wide', 'start'), ('wide', 'end'), ('phone', 'start'), ('phone', 'end')]:
            im = still(site, look, end)
            sheet.paste(im, (x, y))
            x += im.width + GAP
    out = HERE / 'out' / 'site-films-contact-sheet.png'
    out.parent.mkdir(exist_ok=True)
    sheet.save(out)
    print(out)


main()
