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
 * How sharp a Moon map looks on screen (VENT-97): the drawing-buffer pixels
 * the Moon's disc spans for a camera distance and frame, and how many of
 * them one texel of a map covers. Pure; texture-lod.ts picks the level.
 */
import { FOV_DEG } from './framing';
import type { LodLevel } from './texture-lod';

/** What the camera sees of the Moon. */
export interface LodView {
  /** The camera's distance from the Moon's centre, in Moon radii. */
  readonly distance: number;
  /** Drawing-buffer px the vertical field of view spans. */
  readonly frameBufferPx: number;
}

/**
 * Drawing-buffer px across the Moon's disc: the silhouette is a cone of
 * half-angle asin(1/d), which three's perspective projection maps to
 * tan(asin(1/d)) / tan(fov/2) of the half frame.
 */
export function discPixels(view: LodView): number {
  const halfFov = (FOV_DEG / 2) * (Math.PI / 180);
  const cone = Math.asin(Math.min(1, 1 / view.distance));
  return (Math.tan(cone) / Math.tan(halfFov)) * view.frameBufferPx;
}

/**
 * Drawing-buffer px one texel of `level` covers at the disc's centre: the
 * equirectangular map puts level x 512 texels across the visible half,
 * which the centre sees pi/2 times closer than the average.
 */
export function pxPerTexel(level: LodLevel, view: LodView): number {
  return ((Math.PI / 2) * discPixels(view)) / (level * 512);
}
