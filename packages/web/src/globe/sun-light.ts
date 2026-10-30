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
 * The Sun that lights the Moon: one directional light from the subsolar
 * point of the selected instant, and a faint ambient term so the night
 * side keeps its shape. It follows the shared instant (live, scrubbed or
 * playing), so the terminator moves with the calendar.
 */
import { AmbientLight, DirectionalLight, type Scene } from 'three';
import { subSolarPoint } from '@ventana/sim';
import type { TimeStore } from '../calendar/time-store';
import { sunDirection } from './geo';

/** Sunlight, and the faint fill that stands in for earthshine. */
const SUN_INTENSITY = 3.2;
const FILL_INTENSITY = 0.05;
/** How far out the light sits; only its direction matters. */
const SUN_DISTANCE = 10;

/** Points `light` from the Sun of the instant `atMs`. */
function aimSun(light: DirectionalLight, atMs: number): void {
  const { x, y, z } = sunDirection(subSolarPoint(atMs));
  light.position.set(x, y, z).multiplyScalar(SUN_DISTANCE);
}

/**
 * Adds the lights to `scene`, aimed at `time`'s instant and re-aimed on
 * every change (then `invalidate` asks for a frame); returns the unbind.
 */
export function bindSun(
  scene: Scene,
  time: Pick<TimeStore, 'get' | 'subscribe'>,
  invalidate: () => void,
): () => void {
  const light = new DirectionalLight(0xffffff, SUN_INTENSITY);
  aimSun(light, time.get().atMs);
  scene.add(light, new AmbientLight(0xffffff, FILL_INTENSITY));
  return time.subscribe(() => {
    aimSun(light, time.get().atMs);
    invalidate();
  });
}
