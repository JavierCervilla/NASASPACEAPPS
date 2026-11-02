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

"""Mesh shapes for the on-foot view's models built from code (VENT-34).

Runs inside Blender 5.2 (bpy, bmesh): onfoot_blender.py imports it. Every
helper makes one named mesh object in metres, Blender axes (Z up, the
figure's front towards -Y, which glTF turns into +Z).
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def material(name, rgb, roughness=0.8, metallic=0.0):
    """A Principled material, reused by name (its factors reach glTF)."""
    mat = bpy.data.materials.get(name)
    if mat is not None:
        return mat
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def to_object(name, bm, mat, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    for poly in me.polygons:
        poly.use_smooth = smooth
    return link(bpy.data.objects.new(name, me))


def catmull_rom(points, steps):
    """Points along a Catmull-Rom spline through `points`, `steps` per span."""
    pts = [Vector(p) for p in points]
    ext = [2 * pts[0] - pts[1], *pts, 2 * pts[-1] - pts[-2]]
    out = []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for s in range(steps):
            t = s / steps
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t
                              + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return out


def frames(path, up):
    """A (normal, binormal) pair per path point, transported along it."""
    result = []
    normal = None
    for i, p in enumerate(path):
        a, b = path[max(i - 1, 0)], path[min(i + 1, len(path) - 1)]
        tangent = (b - a).normalized()
        if normal is None:
            normal = (up - up.dot(tangent) * tangent)
            if normal.length < 1e-6:
                normal = Vector((1, 0, 0)) - tangent.x * tangent
        normal = (normal - normal.dot(tangent) * tangent).normalized()
        result.append((normal, tangent.cross(normal)))
    return result


def tube(name, path, radius, mat, segments=16, up=(0, -1, 0), caps=True,
         closed=False):
    """A loft along `path` (points); `radius(s)` gives (rx, ry) at s in
    0..1 of the length (rx along the frame normal, which starts at `up`)."""
    path = [Vector(p) for p in path]
    lengths = [0.0]
    for a, b in zip(path, path[1:]):
        lengths.append(lengths[-1] + (b - a).length)
    total = lengths[-1] or 1.0
    bm = bmesh.new()
    rings = []
    for p, (n, b), length in zip(path, frames(path, Vector(up)), lengths):
        rx, ry = radius(length / total)
        rings.append([bm.verts.new(p + rx * math.cos(a) * n
                                   + ry * math.sin(a) * b)
                      for a in (2 * math.pi * k / segments
                                for k in range(segments))])
    pairs = list(zip(rings, rings[1:]))
    if closed:
        pairs.append((rings[-1], rings[0]))
    for r0, r1 in pairs:
        for k in range(segments):
            j = (k + 1) % segments
            bm.faces.new((r0[k], r0[j], r1[j], r1[k]))
    if caps and not closed:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return to_object(name, bm, mat)


def pleated(base, pleats, depth, start, end):
    """A radius function: `base(s)` with `pleats` bellows between s=start
    and s=end, each bulging `depth` of the radius."""
    def radius(s):
        rx, ry = base(s)
        if start <= s <= end:
            phase = (s - start) / (end - start) * pleats
            bump = 1 + depth * math.sin(math.pi * phase) ** 2
            return rx * bump, ry * bump
        return rx, ry
    return radius


def lerp_radius(stops):
    """A radius function through (s, rx, ry) stops, smooth between them."""
    def radius(s):
        for (s0, x0, y0), (s1, x1, y1) in zip(stops, stops[1:]):
            if s <= s1:
                t = 0 if s1 == s0 else (s - s0) / (s1 - s0)
                t = t * t * (3 - 2 * t)
                return x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        return stops[-1][1], stops[-1][2]
    return radius


def ring(name, centre, axis, radius, length, mat, segments=24):
    """A short cylinder band (a bearing or a disconnect ring) on `axis`."""
    axis = Vector(axis).normalized()
    c = Vector(centre)
    half = axis * (length / 2)
    edge = radius * 0.94
    return tube(name, [c - half * 1.0, c - half * 0.6, c + half * 0.6,
                       c + half * 1.0], lambda s: (edge, edge)
                if s in (0.0, 1.0) else (radius, radius), mat,
                segments=segments, up=_any_normal(axis))


def _any_normal(axis):
    ref = Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((0, -1, 0))
    return tuple(ref - ref.dot(axis) * axis)


def box(name, size, centre, mat, bevel=0.0, segments=3, rotation=None):
    """A box of `size` (x, y, z) at `centre`, its edges bevelled."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel,
                        segments=segments, affect="EDGES", profile=0.5)
    if rotation is not None:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0),
                         matrix=Matrix(rotation).to_3x3()
                         if not isinstance(rotation, Matrix)
                         else rotation.to_3x3())
    bmesh.ops.translate(bm, vec=Vector(centre), verts=bm.verts)
    obj = to_object(name, bm, mat, smooth=True)
    smooth_by_angle(obj, 35)
    return obj


def cylinder(name, centre, axis, radius, length, mat, segments=24,
             bevel=0.0):
    """A capped cylinder on `axis`, its rims optionally bevelled."""
    axis = Vector(axis).normalized()
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments,
                          radius1=radius, radius2=radius, depth=length)
    if bevel > 0:
        rims = [e for e in bm.edges
                if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6
                and e.verts[0].co.length > radius * 0.9]
        bmesh.ops.bevel(bm, geom=rims, offset=bevel, segments=2,
                        affect="EDGES")
    rot = Vector((0, 0, 1)).rotation_difference(axis).to_matrix()
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, vec=Vector(centre), verts=bm.verts)
    obj = to_object(name, bm, mat)
    smooth_by_angle(obj, 40)
    return obj


def sphere_patch(name, centre, radius, mat, yaw, pitch, steps=(24, 16),
                 scale=(1, 1, 1)):
    """The part of a sphere facing -Y between yaw (left, right) and pitch
    (down, up) angles in radians; a visor or a dome cap."""
    bm = bmesh.new()
    cols, rows = steps
    grid = []
    for r in range(rows + 1):
        el = pitch[0] + (pitch[1] - pitch[0]) * r / rows
        line = []
        for c in range(cols + 1):
            az = yaw[0] + (yaw[1] - yaw[0]) * c / cols
            d = Vector((math.sin(az) * math.cos(el),
                        -math.cos(az) * math.cos(el), math.sin(el)))
            line.append(bm.verts.new(Vector(centre) + Vector(
                (d.x * scale[0], d.y * scale[1], d.z * scale[2])) * radius))
        grid.append(line)
    for r in range(rows):
        for c in range(cols):
            bm.faces.new((grid[r][c], grid[r][c + 1], grid[r + 1][c + 1],
                          grid[r + 1][c]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return to_object(name, bm, mat)


def uv_sphere(name, centre, radius, mat, scale=(1, 1, 1), segments=32,
              rings=16):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings,
                              radius=radius)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(centre), verts=bm.verts)
    return to_object(name, bm, mat)


def smooth_by_angle(obj, degrees):
    with bpy.context.temp_override(active_object=obj, object=obj,
                                   selected_objects=[obj],
                                   selected_editable_objects=[obj]):
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(degrees),
                                             keep_sharp_edges=True)


def mirror_x(obj, name):
    """A copy of `obj` mirrored across X = 0 (the figure's other side)."""
    copy = obj.copy()
    copy.data = obj.data.copy()
    copy.name = copy.data.name = name
    link(copy)
    copy.data.transform(Matrix.Scale(-1, 4, (1, 0, 0)))
    copy.data.flip_normals()
    copy.data.update()
    return copy
