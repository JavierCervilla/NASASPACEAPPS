/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * The scanned rocks of the prototype (VENT-124): NASA Astromaterials 3D's
 * Apollo 17 samples (public domain, ASSETS.md), loaded with the view only
 * when `?rocks=` asks for them (their files carry `on-foot`, so the service
 * worker leaves them out of the precache), and drawn as one InstancedMesh
 * per shape over the rocks nearest the eye (rock-look.ts). They cast and
 * take the Sun's shadow and its mask like the stones.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Texture,
} from 'three';
import binUrl from '../maps/on-foot-rocks.bin?url';
import tex0 from '../maps/on-foot-rock-70175-0.webp?url';
import tex1 from '../maps/on-foot-rock-70295-0.webp?url';
import tex2 from '../maps/on-foot-rock-76535-0.webp?url';
import tex3 from '../maps/on-foot-rock-79115-0.webp?url';
import type { Rock } from '../rocks';
import { scanPose, shapeIndex } from '../rock-look';
import { readScanShapes, type ScanShape } from '../scan-rock-file';
import type { GroundAt } from '../stones';
import { withContactAo } from './scan-ao';
import { maskSun, type SunMask } from './sun-mask';

/**
 * The shapes and their materials, in the binary's order, made once per view
 * and shared by every rebuild of the rocks (a new point, an arrival).
 */
export interface ScanAssets {
  readonly geometries: readonly BufferGeometry[];
  readonly halfHeights: readonly number[];
  readonly materials: readonly MeshStandardMaterial[];
}

/** `shape` as GPU geometry over its quantised arrays. */
function geometryOfShape(shape: ScanShape): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',
    new BufferAttribute(shape.positions, 3, true));
  geometry.setAttribute('normal', new InterleavedBufferAttribute(
    new InterleavedBuffer(shape.normals, 4), 3, 0, true));
  geometry.setAttribute('uv', new BufferAttribute(shape.uvs, 2, true));
  geometry.setIndex(new BufferAttribute(shape.index, 1));
  return geometry;
}

/** A scan's material, wearing its own colour map. */
function material(map: Texture, mask: SunMask) {
  map.colorSpace = SRGBColorSpace;
  const out = new MeshStandardMaterial({ roughness: 0.92, metalness: 0,
    map });
  maskSun(out, mask, false);
  withContactAo(out);
  return out;
}

/** Loads the scans' binary and colour maps; rejects when any is missing. */
export async function loadScanAssets(
  mask: SunMask,
  fetchBytes: (url: string) => Promise<ArrayBuffer> = async (url) =>
    (await fetch(url)).arrayBuffer(),
): Promise<ScanAssets> {
  const loader = new TextureLoader();
  const [bytes, ...maps] = await Promise.all([fetchBytes(binUrl),
    ...[tex0, tex1, tex2, tex3].map((url) => loader.loadAsync(url))]);
  const shapes = readScanShapes(bytes);
  return { geometries: shapes.map(geometryOfShape),
    halfHeights: shapes.map((s) => s.halfHeight),
    materials: maps.map((map) => material(map, mask)) };
}

/**
 * The InstancedMesh of shape `i` over `rocks`: a geometry of its own over
 * the shape's attributes (uploaded once, shared; a rebuild frees it and
 * leaves the shape) with each instance's ground for the contact occlusion.
 */
function scanMesh(i: number, rocks: readonly Rock[], assets: ScanAssets,
  ground: GroundAt): InstancedMesh {
  const shape = assets.geometries[i] as BufferGeometry;
  const geometry = new BufferGeometry().setIndex(shape.index);
  for (const [name, attr] of Object.entries(shape.attributes)) {
    geometry.setAttribute(name, attr);
  }
  const grounds = new Float32Array(rocks.map((r) => ground(r.east, r.north)));
  geometry.setAttribute('groundY', new InstancedBufferAttribute(grounds, 1));
  const mesh = new InstancedMesh(geometry,
    assets.materials[i] as MeshStandardMaterial, rocks.length);
  const [m, q, e] = [new Matrix4(), new Quaternion(), new Euler()];
  rocks.forEach((rock, k) => {
    const pose = scanPose(rock, ground, assets.halfHeights[i] ?? 1);
    q.setFromEuler(e.set(0, pose.turnY, 0));
    mesh.setMatrixAt(k, m.compose(new Vector3(...pose.position), q,
      new Vector3(...pose.scale)));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** The scans of `rocks` on `ground`, one InstancedMesh per shape worn. */
export function scanRocksGroup(
  rocks: readonly Rock[],
  assets: ScanAssets,
  ground: GroundAt,
): Group {
  const group = new Group();
  const count = assets.geometries.length;
  for (let i = 0; i < count; i++) {
    const mine = rocks.filter((r) => shapeIndex(r, count) === i);
    if (mine.length > 0) group.add(scanMesh(i, mine, assets, ground));
  }
  return group;
}
