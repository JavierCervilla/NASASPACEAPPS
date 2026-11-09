#!/usr/bin/env bash
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

# Downloads the motionsites-web-builder skill's examples and media to disk, strips their promotion and checks that
# none is left.
#
# They are not in the repo (.gitignore): they are © MotionSites and their licence allows using them to build sites,
# not redistributing them. The instructions, references and screenshot script are in the repo (MIT).
#
# Usage: bash scripts/motionsites-library.sh   (from the repo root; idempotent)
set -euo pipefail

COMMIT="faa30d512e3973e58675c72101a7ef42ed37ae83"  # the one reviewed on 2026-11-03 (see .claude/skills/NOTICE.md)
REPO="https://github.com/Motionsites-AI/claude-skill"
SKILL_IN_REPO="plugins/motionsites-web-builder/skills/motionsites-web-builder"
DEST=".claude/skills/motionsites-web-builder"

[[ -f "${DEST}/SKILL.md" ]] || { echo "Run it from the root of the NASASPACEAPPS repo." >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# git rather than a codeload tarball: cloud sessions' proxies refuse codeload but serve git.
git clone -q --filter=blob:none --no-checkout "$REPO" "${tmp}/repo"
git -C "${tmp}/repo" checkout -q "$COMMIT" -- "${SKILL_IN_REPO}/examples" "${SKILL_IN_REPO}/media"

rm -rf "${DEST}/examples" "${DEST}/media"
mv "${tmp}/repo/${SKILL_IN_REPO}/examples" "${tmp}/repo/${SKILL_IN_REPO}/media" "${DEST}/"

# The promotion: one identical header line in every example and a paragraph in every index.
for f in "${DEST}"/examples/*.md "${DEST}/media/MEDIA.md"; do
  sed -i.bak -E \
    -e '/^<!-- Free sample\. 500\+ premium prompts like this: .* -->$/d' \
    -e '/^> These are a free sample\. MotionSites Unlimited /d' \
    -e '/^> This shelf is a free sample\. MotionSites Unlimited /d' \
    "$f"
  rm -f "${f}.bak"
done

# U+FE0E variation selectors stuck to decorative glyphs: invisible and harmless here, but the security gate's Unicode
# scanner flags them. They are removed; the glyph looks the same.
find "${DEST}/examples" "${DEST}/media" -name '*.md' -exec perl -CSD -pi -e 's/\x{FE0E}//g' {} +

# If MotionSites changes the format, the cleanup above stops matching: better to fail than to leave promotion in.
if grep -rnE 'motionsites\.ai/unlimited|utm_|Go Unlimited|MotionSites Unlimited|MotionSites MCP' "${DEST}"; then
  echo "ERROR: promotion left in ${DEST} (lines above). Do not use the skill until it is cleaned." >&2
  exit 1
fi
echo "OK: $(find "${DEST}/examples" -name '*.md' | wc -l | tr -d ' ') examples and $(find "${DEST}/media" -type f | wc -l | tr -d ' ') media files, no promotion."
