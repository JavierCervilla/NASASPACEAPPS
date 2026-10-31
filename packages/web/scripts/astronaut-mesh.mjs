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

// The pure geometry steps of the astronaut build (astronaut.mjs), apart so they are unit-tested without the model:
// lowering the arms of NASA's «Astronaut» model, which stands with its arms held out, and the texture rectangle that
// carries the NASA insignia.

/**
 * The arm bend. The model stands Y-up after its root transform, about 50 units tall, facing +Z, its arms out along
 * ±X. A vertex further than `startX` from the body's axis belongs to an arm (above `minY`, the legs stay); it turns
 * about the shoulder (`shoulderX`, `shoulderY`) by up to `angle` radians, fully once `rampX` units past `startX`, so the
 * armpit bends softly instead of tearing.
 */
export const ARMS = { startX: 10.5, rampX: 5, minY: 6, shoulderX: 12, shoulderY: 23, angle: 1.2, forward: 2 };

/**
 * Lowers the arms in place: `positions` and `normals` are flat xyz arrays of the same length (normals may be null).
 * Each arm vertex turns down about its shoulder in the XY plane, and moves `forward` units towards +Z at full bend,
 * so the hands hang in front of the hips rather than inside them.
 * @param {Float32Array | number[]} positions
 * @param {Float32Array | number[] | null} normals
 * @param {typeof ARMS} [arms]
 */
export function lowerArms(positions, normals, arms = ARMS) {
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const reach = Math.abs(x);
    if (reach < arms.startX || y < arms.minY) continue;
    const t = Math.min(1, (reach - arms.startX) / arms.rampX);
    const side = Math.sign(x);
    const a = -side * arms.angle * t;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = x - side * arms.shoulderX;
    const dy = y - arms.shoulderY;
    positions[i] = side * arms.shoulderX + dx * c - dy * s;
    positions[i + 1] = arms.shoulderY + dx * s + dy * c;
    positions[i + 2] += t * arms.forward;
    if (!normals) continue;
    const nx = normals[i];
    const ny = normals[i + 1];
    normals[i] = nx * c - ny * s;
    normals[i + 1] = nx * s + ny * c;
  }
}

/**
 * The NASA insignia («meatball») on the backpack, in px of the 1024 x 1024 suit texture: NASA's media guidelines do
 * not let it be used, so the build covers it with the fabric `PATCH_FROM` px above it.
 */
export const INSIGNIA = { left: 890, top: 180, width: 62, height: 62 };
export const PATCH_FROM = { left: 890, top: 100 };
