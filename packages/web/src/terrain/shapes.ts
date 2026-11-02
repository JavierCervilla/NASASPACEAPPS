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
 * The shapes the on-foot scene draws besides the ground (VENT-34), as
 * plain buffers: a round stone and the merge of many. Built here rather
 * than with the Three.js geometry classes, which would join the chunk the
 * globe loads at start; and pure, so a Web Worker can build them too.
 */
export interface MeshBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly index: Uint32Array;
}

/** One buffer of many, their indices shifted. */
export function merge(parts: readonly MeshBuffers[]): MeshBuffers {
  const total = (key: keyof MeshBuffers) =>
    parts.reduce((n, p) => n + p[key].length, 0);
  const positions = new Float32Array(total('positions'));
  const normals = new Float32Array(total('normals'));
  const index = new Uint32Array(total('index'));
  let [v, i] = [0, 0];
  for (const p of parts) {
    positions.set(p.positions, v);
    normals.set(p.normals, v);
    index.set(p.index.map((k) => k + v / 3), i);
    [v, i] = [v + p.positions.length, i + p.index.length];
  }
  return { positions, normals, index };
}

/** A unit sphere of `around` x `rings` quads, poles included. */
export function sphere(around: number, rings: number): MeshBuffers {
  const positions: number[] = [];
  const index: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI;
    for (let a = 0; a <= around; a++) {
      const theta = (a / around) * 2 * Math.PI;
      positions.push(Math.sin(phi) * Math.cos(theta), Math.cos(phi),
        -Math.sin(phi) * Math.sin(theta));
      if (r < rings && a < around) {
        const k = r * (around + 1) + a;
        index.push(k, k + around + 1, k + 1, k + 1, k + around + 1,
          k + around + 2);
      }
    }
  }
  const p = Float32Array.from(positions);
  return { positions: p, normals: p.slice(), index: Uint32Array.from(index) };
}
