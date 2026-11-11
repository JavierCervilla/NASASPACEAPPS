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
 * The camera of the hero film: ONE continuous move from thousands of km over
 * the Moon down to 2 m over IM-2's touchdown point, then a locked hold. Pure:
 * every value is a function of the time, so a still and the film agree.
 *
 * - Altitude: its logarithm follows a monotone cubic through the brief's
 *   beats, flat at both ends: it eases in from a still, the ground rushes up
 *   faster and faster in proportion, and it eases out to a stop at 2 m. The
 *   speed in metres per second falls all the way down, like a lander
 *   braking.
 * - Ground track: the camera comes in along the final heading, from behind
 *   the target, over the south pole; its distance behind the target is a
 *   fixed share of its altitude near the ground and tends to 32° of arc far
 *   away.
 * - Aim: the lit crescent far away, then the target, then a pitch that
 *   rises from -73° (looking down at the target) to -30° at 200 m and to a
 *   little above level at 2 m, on the final heading. Every blend is a
 *   smooth function of the log altitude, so the aim stops when the camera
 *   stops.
 * - Lens: from 2 km down the focal length grows continuously (its log
 *   follows the same smooth curve of the log altitude) to a moderate long
 *   lens on the Earth, at its true size, still wide enough for the near
 *   ground's perspective; it settles with the camera.
 */
import { add, cross, dot, norm, scale, sub, type Frame, type Shot as SceneShot, type V3 } from '../../moon-scene/scene/frame.ts';

export const FPS = 30;
export const DESCENT_S = 14;
export const HOLD_S = 6;

/** How the shot is framed for one screen. */
export interface Look {
  /** vertical field of view, degrees, before the lens narrows */
  readonly fovYDeg: number;
  /** vertical field of view at the end, degrees */
  readonly fovYEndDeg: number;
  /** final heading, degrees clockwise from north */
  readonly headingDeg: number;
  /** final pitch, degrees above level */
  readonly pitchEndDeg: number;
  /** altitude of the first frame, metres: the whole Moon fits the frame's width */
  readonly startAltM: number;
}

export const LOOKS = {
  /** 16:9: a 58° horizontal field narrowing to 38°; the Earth (1.8°) above the horizon, right of the headline's box */
  desktop: { fovYDeg: 34.64, fovYEndDeg: 21.9, headingDeg: 324.5, pitchEndDeg: 1.7, startAltM: 5.6e6 },
  /** 9:16: a 40° vertical field narrowing to 26° (15° wide); the Earth centred above the horizon */
  phone: { fovYDeg: 40, fovYEndDeg: 26, headingDeg: 324.7, pitchEndDeg: 2.4, startAltM: 9.0e6 },
} as const satisfies Record<string, Look>;

export interface Shot extends SceneShot {
  /** metres over the target's ground */
  readonly altitude: number;
  /** the aim's elevation over the camera's local level, degrees */
  readonly pitchDeg: number;
}

const DEG = Math.PI / 180;
const END_ALT_M = 2;
/** distance behind the target over altitude, near the ground */
const BEHIND = 0.3;
/** the ground track's arc far away, radians */
const ARC_FAR = 0.75;
/** how far toward the lit limb the first frames aim, in Moon radii */
const CRESCENT_AIM = 0.4;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smoother = (x: number): number => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const between = (a: number, b: number, x: number): number => smoother((x - a) / (b - a));

/**
 * Altitude keys, metres: about 3 900 km at 3 s, 150 km at 7 s, 200 m at
 * 11.5 s and 2 m at 14 s, the brief's beats, after the look's first frame.
 */
const BEATS: readonly (readonly [number, number])[] = [
  [3, 3.92e6],
  [7, 1.5e5],
  [11.5, 200],
  [DESCENT_S, END_ALT_M],
];

/** A monotone cubic through (t, ln altitude), flat at both ends (Fritsch-Carlson). */
function curveOf(startAltM: number): (t: number) => number {
  const keys = [[0, Math.log(startAltM)], ...BEATS.map(([t, a]) => [t, Math.log(a)])];
  const slopes = keys.map((_, i) => {
    if (i === 0 || i === keys.length - 1) return 0;
    const d0 = (keys[i][1] - keys[i - 1][1]) / (keys[i][0] - keys[i - 1][0]);
    const d1 = (keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]);
    return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
  });
  return (t) => {
    const x = Math.min(Math.max(t, 0), DESCENT_S);
    let i = 0;
    while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
    const [t0, s0] = keys[i];
    const [t1, s1] = keys[i + 1];
    const h = t1 - t0;
    const u = (x - t0) / h;
    const hermite = (2 * u ** 3 - 3 * u ** 2 + 1) * s0 + (u ** 3 - 2 * u ** 2 + u) * h * slopes[i]
      + (-2 * u ** 3 + 3 * u ** 2) * s1 + (u ** 3 - u ** 2) * h * slopes[i + 1];
    return Math.exp(hermite);
  };
}

const curves = new Map<number, (t: number) => number>();

/** Altitude over the target's ground at time t (seconds) for one look, metres. */
export function altitudeAt(t: number, look: Look): number {
  let curve = curves.get(look.startAltM);
  if (!curve) {
    curve = curveOf(look.startAltM);
    curves.set(look.startAltM, curve);
  }
  return curve(t);
}

function headingVector(deg: number): V3 {
  return [Math.sin(deg * DEG), 0, -Math.cos(deg * DEG)];
}

/** Pitch, degrees, as a function of ln(altitude). */
function pitchAt(s: number, look: Look): number {
  const top = -Math.atan(1 / BEHIND) / DEG;
  const x = clamp01((s - Math.log(END_ALT_M)) / (Math.log(15_000) - Math.log(END_ALT_M)));
  return look.pitchEndDeg + (top - look.pitchEndDeg) * smoother(x ** 1.14);
}

/** The vertical field of view (radians) as a function of ln(altitude). */
function lensAt(s: number, look: Look): number {
  const x = clamp01((Math.log(2000) - s) / (Math.log(2000) - Math.log(END_ALT_M)));
  const k = smoother(x);
  const t0 = Math.log(Math.tan((look.fovYDeg * DEG) / 2));
  const t1 = Math.log(Math.tan((look.fovYEndDeg * DEG) / 2));
  return 2 * Math.atan(Math.exp(t0 + (t1 - t0) * k));
}

/**
 * The last two seconds run on a warped clock, x + x^3 - x^4 of the time in
 * them: it meets the real clock smoothly at 12 s and stops with no speed and
 * no deceleration left at 14 s, so the hold begins without a jolt.
 */
function settled(t: number): number {
  const from = DESCENT_S - 2;
  if (t <= from) return t;
  const x = Math.min(1, (t - from) / 2);
  return from + 2 * (x + x ** 3 - x ** 4);
}

/** The camera at time t (seconds from the first frame) for one look. */
export function shotAt(frame: Frame, t: number, look: Look): Shot {
  const a = altitudeAt(settled(t), look);
  const s = Math.log(a);
  const ground = frame.radiusM + frame.groundM;
  const h = headingVector(look.headingDeg);
  const up: V3 = [0, 1, 0];
  const arc = ARC_FAR * (1 - Math.exp((-BEHIND * (a - END_ALT_M)) / (ARC_FAR * ground)));
  const dir = add(scale(up, Math.cos(arc)), scale(h, -Math.sin(arc)));
  const eye = add(frame.centre, scale(dir, ground + a));
  const pitch = pitchAt(s, look);
  const late = add(scale(h, Math.cos(pitch * DEG)), scale(up, Math.sin(pitch * DEG)));
  // far away the aim is the Moon's centre moved toward its lit crescent
  const view = norm(sub(frame.centre, eye));
  const lit = norm(sub(frame.sun, scale(view, dot(frame.sun, view))));
  const toCentre = norm(sub(add(frame.centre, scale(lit, CRESCENT_AIM * frame.radiusM)), eye));
  const toTarget = norm(scale(eye, -1));
  const wT = between(Math.log(2.5e6), Math.log(6e5), s);
  const wL = between(Math.log(60_000), Math.log(15_000), s);
  const mid = add(scale(toCentre, 1 - wT), scale(toTarget, wT));
  const forward = norm(add(scale(mid, 1 - wL), scale(late, wL)));
  const hint = add(scale(h, -Math.sin(pitch * DEG)), scale(up, Math.cos(pitch * DEG)));
  const side = norm(cross(forward, hint));
  const aimDeg = Math.asin(dot(forward, norm(sub(eye, frame.centre)))) / DEG;
  return { eye, forward, up: cross(side, forward), fovY: lensAt(s, look), altitude: a, pitchDeg: aimDeg };
}
