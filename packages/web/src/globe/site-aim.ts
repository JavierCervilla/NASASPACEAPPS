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
 * Where the camera aims so the selected marker lands in the free part of
 * the globe view (QA F1, VENT-32): on a phone the docked card covers the
 * frame's lower part, so a framed site is nudged up into the band between
 * the top bar and the card. The camera turns, the Moon's frame stays: the
 * nudge is a change of latitude along the site's meridian. Pure, so it is
 * tested alone.
 */
import { FOV_DEG } from './framing';

/** The band, in px from the host's top, a framed marker must land in. */
export interface FreeBand {
  readonly top: number;
  readonly bottom: number;
}

/** The view the nudge is worked out in, px from the host's top. */
export interface AimView {
  /** The Moon's frame (sheet-edge.ts): its top and its height. */
  readonly frameTop: number;
  readonly frameHeight: number;
  /** The camera's distance from the Moon's centre, in Moon radii. */
  readonly distance: number;
  readonly band: FreeBand;
}

/** The room a marker keeps inside the band: its ring's radius + 12 px. */
export const AIM_MARGIN_PX = 27;

const RAD = Math.PI / 180;

/** Px per unit of the projection's tangent, for a frame `height` tall. */
function pxPerTangent(height: number): number {
  return height / 2 / Math.tan((FOV_DEG / 2) * RAD);
}

/**
 * Px below the frame's centre where a surface point lands when it lies
 * `angleDeg` south of the point the camera looks down on, on its
 * meridian; negative: above.
 */
export function offsetForAngle(
  angleDeg: number,
  distance: number,
  frameHeight: number,
): number {
  const a = angleDeg * RAD;
  const tangent = Math.sin(a) / (distance - Math.cos(a));
  return tangent * pxPerTangent(frameHeight);
}

/**
 * The inverse of {@link offsetForAngle}: the angle, in degrees, that puts
 * a surface point `px` below the frame's centre, held short of the limb.
 * From sin a + t cos a = t d, so a = asin(t d / hypot(1, t)) - atan(t).
 */
export function angleForOffset(
  px: number,
  distance: number,
  frameHeight: number,
): number {
  const t = px / pxPerTangent(frameHeight);
  const reach = Math.min(1, Math.max(-1, (t * distance) / Math.hypot(1, t)));
  return (Math.asin(reach) - Math.atan(t)) / RAD;
}

/**
 * The camera latitude that keeps a site at `siteLat` inside the view's
 * band, moving the least: unchanged while the site already lands there,
 * else the site lands on the band's nearer edge (its middle when the band
 * is too short for the margin). The camera looks along the site's meridian.
 */
export function aimLatitude(
  siteLat: number,
  cameraLat: number,
  view: AimView,
): number {
  const { frameTop, frameHeight, distance, band } = view;
  const centre = frameTop + frameHeight / 2;
  const angle = cameraLat - siteLat;
  const now = centre + offsetForAngle(angle, distance, frameHeight);
  const low = band.top + AIM_MARGIN_PX;
  const high = band.bottom - AIM_MARGIN_PX;
  const middle = (band.top + band.bottom) / 2;
  const goal = low > high ? middle : Math.min(high, Math.max(low, now));
  if (goal === now) return cameraLat;
  return siteLat + angleForOffset(goal - centre, distance, frameHeight);
}
