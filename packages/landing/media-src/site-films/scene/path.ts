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
 * The camera of a site film (VENT-115): ONE continuous move from 40 km over
 * the site down to the app's eye, 2 m over the ground, then a one-second
 * still hold that the 3D view's loader crossfades from. Pure: every value is
 * a function of the time, so a still and the film agree.
 *
 * - Altitude: its logarithm follows a monotone cubic through four keys,
 *   already moving at the first frame and flat at the last, so the speed in
 *   metres per second falls all the way down, like a lander braking (the
 *   hero film's feel, ../hero-film/scene/path.ts, on a shorter clock).
 * - Ground track: the camera comes in along the final heading from behind
 *   the target, a fixed share of its altitude behind it.
 * - Aim: down at the target (73° under the level) while high, then a pitch
 *   that rises on a smooth curve of the log altitude to the app's opening
 *   pitch at 2 m, on the final heading.
 * - Lens: the app's, all the way (its vertical field per screen); no long
 *   lens, so the last frame is the view the app opens on.
 */
import { add, cross, norm, scale, type Shot as SceneShot, type V3 } from '../../moon-scene/scene/frame.ts';
import { EYE_M, START_PITCH, direction } from '../../../../web/src/terrain/view-camera.ts';
import { VIEW_FOV } from '../../../../web/src/terrain/view-fov.ts';

export const FPS = 30;
/** the move, seconds; then the hold */
export const MOVE_S = 5;
export const HOLD_S = 1;
/** frames 0 to MOVE_FRAMES - 1 move; the last of them is the hold's frame */
export const MOVE_FRAMES = MOVE_S * FPS + 1;
/** the film, the move and the hold: frames 0 to TOTAL_FRAMES - 1 */
export const TOTAL_FRAMES = (MOVE_S + HOLD_S) * FPS;

/** How the shot is framed for one screen. */
export interface Look {
  /** the app's vertical field of view on that screen, degrees (view-fov.ts) */
  readonly fovYDeg: number;
}

export const LOOKS = {
  /** 16:9, a wide screen */
  wide: { fovYDeg: VIEW_FOV.wide },
  /** 9:16, a phone held upright */
  phone: { fovYDeg: VIEW_FOV.phone },
} as const satisfies Record<string, Look>;

export interface Shot extends SceneShot {
  /** metres over the target's ground */
  readonly altitude: number;
  /** the aim's elevation over the level, degrees */
  readonly pitchDeg: number;
}

const DEG = Math.PI / 180;
export const START_ALT_M = 40_000;
/** distance behind the target over altitude */
const BEHIND = 0.3;
/** the pitch's rise starts under this altitude, metres */
const PITCH_FROM_M = 15_000;
/** the last seconds run on a warped clock that stops with no speed left */
const SETTLE_S = 1.5;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smoother = (x: number): number => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** (seconds, metres): 40 km, 2.5 km at 2 s, 40 m at 3.6 s, the eye at 5 s. */
const KEYS: readonly (readonly [number, number])[] = [
  [0, START_ALT_M],
  [2, 2500],
  [3.6, 40],
  [MOVE_S, EYE_M],
];
/** ln-altitude slope at the first frame, per second: moving, slower than the next stretch */
const START_SLOPE = -1.0;

/** A monotone cubic through (t, ln altitude) (Fritsch-Carlson), flat at the end. */
function lnAltitude(): (t: number) => number {
  const keys = KEYS.map(([t, a]) => [t, Math.log(a)] as const);
  const slopes = keys.map((_, i) => {
    if (i === 0) return START_SLOPE;
    if (i === keys.length - 1) return 0;
    const d0 = (keys[i][1] - keys[i - 1][1]) / (keys[i][0] - keys[i - 1][0]);
    const d1 = (keys[i + 1][1] - keys[i][1]) / (keys[i + 1][0] - keys[i][0]);
    return d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1);
  });
  return (t) => {
    const x = Math.min(Math.max(t, 0), MOVE_S);
    let i = 0;
    while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
    const [t0, s0] = keys[i];
    const [t1, s1] = keys[i + 1];
    const h = t1 - t0;
    const u = (x - t0) / h;
    return (2 * u ** 3 - 3 * u ** 2 + 1) * s0 + (u ** 3 - 2 * u ** 2 + u) * h * slopes[i]
      + (-2 * u ** 3 + 3 * u ** 2) * s1 + (u ** 3 - u ** 2) * h * slopes[i + 1];
  };
}

const curve = lnAltitude();

/**
 * The last SETTLE_S seconds run on a warped clock, x + x^3 - x^4 of the
 * time in them: it meets the real clock smoothly and stops with no speed
 * left at the end of the move, so the hold begins without a jolt.
 */
function settled(t: number): number {
  const from = MOVE_S - SETTLE_S;
  if (t <= from) return t;
  const x = Math.min(1, (t - from) / SETTLE_S);
  return from + SETTLE_S * (x + x ** 3 - x ** 4);
}

/** Altitude over the target's ground at time t (seconds), metres. */
export function altitudeAt(t: number): number {
  return Math.exp(curve(settled(t)));
}

/** Pitch, degrees, as a function of ln(altitude): down at the target high up, the app's at the eye. */
function pitchAt(s: number): number {
  const top = -Math.atan(1 / BEHIND) / DEG;
  const x = clamp01((s - Math.log(EYE_M)) / (Math.log(PITCH_FROM_M) - Math.log(EYE_M)));
  return START_PITCH + (top - START_PITCH) * smoother(x ** 1.14);
}

/** What a shot needs of the built Moon: its radius and the target's ground over it, metres. */
export interface Ground {
  readonly radiusM: number;
  readonly groundM: number;
  readonly centre: V3;
}

/**
 * The camera at time t (seconds from the first frame) for one look, ending
 * on `headingDeg` (clockwise from north) at the app's pitch, 2 m up.
 */
export function shotAt(frame: Ground, t: number, look: Look, headingDeg: number): Shot {
  const a = altitudeAt(t);
  const ground = frame.radiusM + frame.groundM;
  const h = direction(headingDeg, 0) as V3;
  const up: V3 = [0, 1, 0];
  // the ground track, an arc of the sphere: (BEHIND x altitude) of distance behind the target
  const arc = (BEHIND * (a - EYE_M)) / ground;
  const dir = add(scale(up, Math.cos(arc)), scale(h, -Math.sin(arc)));
  const eye = add(frame.centre, scale(dir, ground + a));
  const pitch = pitchAt(Math.log(a));
  const forward = norm(direction(headingDeg, pitch) as V3);
  const hint = add(scale(h, -Math.sin(pitch * DEG)), scale(up, Math.cos(pitch * DEG)));
  const side = norm(cross(forward, hint));
  return { eye, forward, up: cross(side, forward), fovY: look.fovYDeg * DEG, altitude: a, pitchDeg: pitch };
}
