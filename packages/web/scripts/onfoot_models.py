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

"""Bakes the on-foot view's models (VENT-34) into packages/web/models/.

  python3 packages/web/scripts/onfoot_models.py --source <apollo-lm.glb>
      --meshy-source <astronaut-meshy-animations.glb>
      [--only <name> ...] [--previews <folder>] [--check] [--blender <path>]

Four models, each one GLB with its textures beside it as WebP files
(the page's CSP lets no texture load from inside a GLB, ASSETS.md):

- astronaut-v2: a modern EVA suit, built from code (astronaut_model.py);
- lander: a generic robotic lander of the Nova-C class at real scale,
  built from code (lander_model.py), for robotic sites and custom points;
- apollo-lm: NASA 3D Resources' Apollo Lunar Module at real scale, with
  its flag and lettering painted out (apollo_lm_model.py), for Apollo
  sites. `--source` is that file, outside the repo; its sha256 is checked
  first;
- astronaut-meshy: Meshy's rigged and animated astronaut with its decals
  painted out (astronaut_meshy_model.py), a skinned glTF with the clips
  `idle` and `walk`, for three's GLTFLoader and an AnimationMixer.
  `--meshy-source` is Meshy's animation GLB, outside the repo, pinned too.

`--only` bakes the named models alone (the others are left as they are).

Blender 5.2 (the studio's, `python3 -m studio install blender`, or
--blender) runs onfoot_blender.py, which builds or imports each model,
bakes its maps and exports glTF with separate files. This script then
packs each into a GLB (one mesh, one node, the maps referenced by URI
through EXT_texture_webp), audits it against the budgets and the subset
of glTF the page's own reader takes (src/terrain/glb.ts), and copies it
with its textures into packages/web/models/. With --check it bakes into
a temporary folder and fails on any file whose bytes differ from the
committed one, writing nothing. With --previews, renders of each packed
model from four sides land in that folder.
"""

import argparse
import hashlib
import json
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
MODELS = HERE.parent / "models"
BLENDER = Path.home() / ".gamestudio/blender/5.2.2/blender-5.2.2-linux-x64/blender"

NAMES = ("astronaut-v2", "lander", "apollo-lm", "astronaut-meshy")
SOURCE_SHA256 = "379101dfcee399267addf771709107c35e826b0b9e5233272f123e4c8a585c4e"
MESHY_SOURCE_SHA256 = "9acf2bd95ff4018c2f7e1202add3d688ce204d0cea92d78957095324bb81f291"
TRIANGLE_BUDGET = 25_000
TEXTURE_BUDGET_PX = 1024
MODEL_BUDGET_BYTES = 1_500_000
# The skinned models: read by GLTFLoader, not glb.ts; their clips weigh.
SKINNED = {"astronaut-meshy": {"bytes": 2_500_000, "clips": ("idle", "walk")}}
JOINT_BUDGET = 64
# glTF constants: linear filters with mipmaps, clamped (atlases).
SAMPLER = {"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}
WEBP = "EXT_texture_webp"
UINT16, FLOAT = 5123, 5126


class BakeError(RuntimeError):
    """A source that is not the pinned one, or a model over its budget."""


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_source(path, pinned=SOURCE_SHA256):
    if path is None or not Path(path).is_file():
        raise BakeError(f"{path}: missing")
    if sha256(path) != pinned:
        raise BakeError(f"{path}: sha256 is not the pinned one")


def read_glb(data):
    """The JSON chunk and the binary chunk of a GLB file's bytes."""
    magic, version, _ = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2:
        raise BakeError("not a glTF 2 binary")
    offset, gltf, binary = 12, None, b""
    while offset < len(data):
        length, kind = struct.unpack_from("<I4s", data, offset)
        chunk = data[offset + 8 : offset + 8 + length]
        if kind == b"JSON":
            gltf = json.loads(chunk)
        elif kind == b"BIN\x00":
            binary = chunk
        offset += 8 + length
    return gltf, binary


def write_glb(gltf, binary):
    """GLB bytes: the JSON padded with spaces, the BIN chunk with zeros."""
    text = json.dumps(gltf, separators=(",", ":"), sort_keys=True).encode()
    text += b" " * (-len(text) % 4)
    binary += b"\x00" * (-len(binary) % 4)
    chunks = struct.pack("<I4s", len(text), b"JSON") + text
    chunks += struct.pack("<I4s", len(binary), b"BIN\x00") + binary
    return struct.pack("<4sII", b"glTF", 2, 12 + len(chunks)) + chunks


def webp_size(data):
    """(width, height) from a WebP file's first chunk (VP8, VP8L, VP8X)."""
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise BakeError("not a WebP image")
    kind = data[12:16]
    if kind == b"VP8 ":
        width, height = struct.unpack_from("<HH", data, 26)
        return width & 0x3FFF, height & 0x3FFF
    if kind == b"VP8L":
        bits = int.from_bytes(data[21:25], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if kind == b"VP8X":
        width = int.from_bytes(data[24:27], "little") + 1
        return width, int.from_bytes(data[27:30], "little") + 1
    raise BakeError("unknown WebP chunk")


def add_textures(gltf, maps, unmapped):
    """Points every material but the `unmapped` ones at the baked AO
    (occlusionTexture) and normal (normalTexture) maps, by URI."""
    gltf["samplers"] = [SAMPLER]
    gltf["images"] = [{"uri": maps["ao"]}, {"uri": maps["normal"]}]
    gltf["textures"] = [
        {"extensions": {WEBP: {"source": i}}, "sampler": 0} for i in (0, 1)
    ]
    for mat in gltf["materials"]:
        if mat["name"] not in unmapped:
            mat["occlusionTexture"] = {"index": 0}
            mat["normalTexture"] = {"index": 1}


def rename_images(gltf, folder, name):
    """Gives Blender's exported images the model's prefix; old -> new."""
    renamed = {}
    for i, image in enumerate(gltf.get("images", [])):
        new = f"{name}-{i}.webp"
        renamed[image["uri"]] = new
        image["uri"] = new
        image.pop("mimeType", None)
    for texture in gltf.get("textures", []):
        source = texture.pop("source", None)
        if source is not None:
            texture.setdefault("extensions", {})[WEBP] = {"source": source}
    return renamed


def pack(folder, name, info):
    """The packed GLB's bytes and {texture file: source path}."""
    gltf = json.loads((folder / f"{name}.gltf").read_text())
    binary = (folder / f"{name}.bin").read_bytes()
    gltf["buffers"] = [{"byteLength": len(binary)}]
    if "maps" in info:
        add_textures(gltf, info["maps"], set(info["unmapped"]))
        files = {f: folder / f for f in info["maps"].values()}
    else:
        files = {
            new: folder / old for old, new in rename_images(gltf, folder, name).items()
        }
    if gltf.get("textures"):
        gltf["extensionsUsed"] = sorted({*gltf.get("extensionsUsed", []), WEBP})
        gltf["extensionsRequired"] = sorted({*gltf.get("extensionsRequired", []), WEBP})
    gltf["asset"] = {"version": "2.0", "generator": "Ventana Lunar onfoot_models.py"}
    return write_glb(gltf, binary), files


def glb_triangles(gltf):
    total = 0
    for mesh in gltf.get("meshes", []):
        for primitive in mesh["primitives"]:
            accessor = primitive.get("indices", primitive["attributes"]["POSITION"])
            total += gltf["accessors"][accessor]["count"] // 3
    return total


def reader_problems(gltf):
    """What the page's reader (src/terrain/glb.ts) would not take: it reads
    the first mesh and the first node's scale and translation only, and
    every primitive's uint16 indices, float normals, positions and UVs."""
    problems = []
    if len(gltf.get("meshes", [])) != 1 or len(gltf.get("nodes", [])) != 1:
        problems.append("not exactly one mesh and one node")
    if "rotation" in gltf["nodes"][0] or "matrix" in gltf["nodes"][0]:
        problems.append("the node is rotated")
    for primitive in gltf["meshes"][0]["primitives"]:
        attrs = primitive["attributes"]
        if gltf["accessors"][primitive["indices"]]["componentType"] != UINT16:
            problems.append("indices are not uint16")
        for key in ("POSITION", "NORMAL", "TEXCOORD_0"):
            if (
                key not in attrs
                or gltf["accessors"][attrs[key]]["componentType"] != FLOAT
            ):
                problems.append(f"a primitive without float {key}")
    return sorted(set(problems))


def skin_problems(gltf, clips):
    """What a skinned model must be for the view: one skinned mesh with at
    most JOINT_BUDGET joints and four influences a vertex (JOINTS_0 only),
    uint16 indices, float UVs, and the named clips."""
    problems = []
    skins = gltf.get("skins", [])
    if len(gltf.get("meshes", [])) != 1 or len(skins) != 1:
        problems.append("not exactly one mesh and one skin")
    elif len(skins[0]["joints"]) > JOINT_BUDGET:
        problems.append(f"more than {JOINT_BUDGET} joints")
    for primitive in gltf["meshes"][0]["primitives"]:
        attrs = primitive["attributes"]
        if not {"JOINTS_0", "WEIGHTS_0"} <= set(attrs) or "JOINTS_1" in attrs:
            problems.append("not four influences a vertex")
        if gltf["accessors"][primitive["indices"]]["componentType"] != UINT16:
            problems.append("indices are not uint16")
        if gltf["accessors"][attrs.get("TEXCOORD_0", 0)]["componentType"] != FLOAT:
            problems.append("no float TEXCOORD_0")
    names = sorted(a.get("name", "") for a in gltf.get("animations", []))
    if names != sorted(clips):
        problems.append(f"clips {names}, not {sorted(clips)}")
    return sorted(set(problems))


def audit(folder, names=NAMES):
    """Per model: triangles, texture sizes, bytes; BakeError over a budget."""
    problems, report = [], {}
    for name in names:
        data = (folder / f"{name}.glb").read_bytes()
        gltf, _ = read_glb(data)
        uris = [image["uri"] for image in gltf.get("images", [])]
        sizes = [webp_size((folder / uri).read_bytes()) for uri in uris]
        total = len(data) + sum((folder / uri).stat().st_size for uri in uris)
        tris = glb_triangles(gltf)
        report[name] = {
            "glb_bytes": len(data),
            "total_bytes": total,
            "triangles": tris,
            "textures": dict(zip(uris, sizes)),
        }
        if tris > TRIANGLE_BUDGET:
            problems.append(f"{name}: {tris} triangles > {TRIANGLE_BUDGET}")
        if any(max(size) > TEXTURE_BUDGET_PX for size in sizes):
            problems.append(f"{name}: a texture over {TEXTURE_BUDGET_PX} px")
        skinned = SKINNED.get(name)
        budget = skinned["bytes"] if skinned else MODEL_BUDGET_BYTES
        if total > budget:
            problems.append(f"{name}: {total} bytes > {budget}")
        found = (
            skin_problems(gltf, skinned["clips"]) if skinned else reader_problems(gltf)
        )
        problems += [f"{name}: {p}" for p in found]
    if problems:
        raise BakeError("; ".join(problems))
    return report


def run_blender(blender, job):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as stream:
        json.dump(job, stream)
    command = [
        str(blender),
        "-b",
        "--factory-startup",
        "--python-exit-code",
        "1",
        "--python",
        str(HERE / "onfoot_blender.py"),
        "--",
        stream.name,
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL)


def shipped_files(folder, names=NAMES):
    """Every file the bake ships: the GLBs and the textures they name."""
    files = []
    for name in names:
        files.append(f"{name}.glb")
        gltf, _ = read_glb((folder / f"{name}.glb").read_bytes())
        files += [image["uri"] for image in gltf.get("images", [])]
    return files


def bake(sources, blender, previews=None, check=False, names=NAMES):
    """`sources`: {"lm": path, "meshy": path}; each one used is checked."""
    if "apollo-lm" in names:
        check_source(sources["lm"])
    if "astronaut-meshy" in names:
        check_source(sources["meshy"], MESHY_SOURCE_SHA256)
    with tempfile.TemporaryDirectory() as tmp:
        work, ship = Path(tmp) / "work", Path(tmp) / "ship"
        ship.mkdir(parents=True)
        run_blender(
            blender,
            {
                "out": str(work),
                "report": str(work / "report.json"),
                "models": list(names),
                "source": str(sources.get("lm")),
                "meshy_source": str(sources.get("meshy")),
            },
        )
        info = json.loads((work / "report.json").read_text())
        for name in names:
            glb, files = pack(work, name, info[name])
            (ship / f"{name}.glb").write_bytes(glb)
            for target, path in files.items():
                shutil.copyfile(path, ship / target)
        report = audit(ship, names)
        if previews is not None:
            run_blender(
                blender,
                {
                    "previews": str(previews),
                    "glbs": {name: str(ship / f"{name}.glb") for name in names},
                },
            )
        if check:
            return compare(ship, names), info
        MODELS.mkdir(parents=True, exist_ok=True)
        for name in shipped_files(ship, names):
            shutil.copyfile(ship / name, MODELS / name)
    return report, info


def compare(ship, names=NAMES):
    changed = [
        name
        for name in shipped_files(ship, names)
        if not (MODELS / name).is_file()
        or (ship / name).read_bytes() != (MODELS / name).read_bytes()
    ]
    if changed:
        raise BakeError("differs from the committed file: " + ", ".join(changed))
    return audit(ship, names)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, help="NASA's Apollo LM GLB")
    parser.add_argument("--meshy-source", type=Path, help="Meshy's animation GLB")
    parser.add_argument("--only", nargs="+", choices=NAMES, default=list(NAMES))
    parser.add_argument("--blender", type=Path, default=BLENDER)
    parser.add_argument("--previews", type=Path)
    parser.add_argument(
        "--check",
        action="store_true",
        help="bake into a temporary folder and compare; write nothing",
    )
    args = parser.parse_args(argv)
    try:
        sources = {"lm": args.source, "meshy": args.meshy_source}
        report, info = bake(
            sources, args.blender, args.previews, args.check, tuple(args.only)
        )
    except BakeError as error:
        sys.exit(f"onfoot_models: {error}")
    print(json.dumps({"audit": report, "bake": info}, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
