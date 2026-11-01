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
 * Where a ray from the camera meets the Moon: the nearer crossing of the
 * unit sphere, or null when it misses (the pin carried off the Moon).
 * Pure maths, no Three.js.
 */
import type { Vec3 } from './geo';

/** The nearer point where `origin` + t `direction` (t ≥ 0) meets it. */
export function raySphere(origin: Vec3, direction: Vec3): Vec3 | null {
  const d = Math.hypot(direction.x, direction.y, direction.z);
  if (d === 0) return null;
  const u = { x: direction.x / d, y: direction.y / d, z: direction.z / d };
  const b = origin.x * u.x + origin.y * u.y + origin.z * u.z;
  const c = origin.x ** 2 + origin.y ** 2 + origin.z ** 2 - 1;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return null;
  const { x, y, z } = origin;
  return { x: x + t * u.x, y: y + t * u.y, z: z + t * u.z };
}
