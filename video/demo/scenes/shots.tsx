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
 * The raea 3D shots of the demo videos, each a camera path over the Moon of
 * scenes/moon.tsx as a function of its own frame. The Sun keeps to the real
 * range of the sub-solar latitude (within 1.54° of the equator), so at the
 * south pole it always skims the horizon; the Earth's apparent latitude moves
 * within the real libration (±6.7°).
 */
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "raea";
import { EARTH_DISTANCE, MoonScene, onMoon, sunFrom, type V3 } from "./moon";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** South up: the pole sits at the top of the disc, and the surface below the camera near it. */
const SOUTH_UP: V3 = [0, -1, 0];

/**
 * The point to look at so that `target` shows `dx` degrees right of the
 * frame's centre and `dy` degrees above it.
 */
function aimed(eye: V3, target: V3, dx: number, dy = 0, up: V3 = SOUTH_UP): V3 {
  const f = unit(sub(target, eye));
  const right = unit(cross(f, up));
  const top = cross(right, f);
  const tx = Math.tan((dx * Math.PI) / 180);
  const ty = Math.tan((dy * Math.PI) / 180);
  return [eye[0] + f[0] - right[0] * tx - top[0] * ty, eye[1] + f[1] - right[1] * tx - top[1] * ty, eye[2] + f[2] - right[2] * tx - top[2] * ty];
}
const OUT = Easing.out(Easing.cubic);
const INOUT = Easing.inOut(Easing.cubic);

export type ShotName = "dive" | "artemis" | "skim" | "earthset" | "pullback" | "reveal" | "drift";

/** The camera, Sun and options of `name` at progress u (0 to 1). */
function framing(name: ShotName, u: number) {
  switch (name) {
    case "dive": {
      const e = OUT(u);
      const eye = onMoon(lerp(-58, -79, e), lerp(-70, -95, e), lerp(2.3, 1.06, e));
      return { eye, look: mix3(onMoon(-90, 0, 0.6), onMoon(-80, 95, 1.0), e), up: SOUTH_UP, fov: lerp(34, 55, e), sun: sunFrom(-1.5, lerp(88, 95, u)) };
    }
    case "artemis": {
      const eye = onMoon(lerp(-62, -66, u), lerp(150, 205, u), 2.5);
      return { eye, look: aimed(eye, onMoon(-90, 0, 0.4), 11, 2), up: SOUTH_UP, fov: 36, sun: sunFrom(-1.5, lerp(55, 85, u)) };
    }
    case "skim": {
      const eye = onMoon(lerp(-79, -82, u), lerp(-95, -112, u), lerp(1.06, 1.045, u));
      return { eye, look: onMoon(lerp(-80, -82, u), lerp(95, 80, u), 1.0), fov: 55, up: SOUTH_UP, sun: sunFrom(-1.5, lerp(95, 82, u)), relief: 0.3 };
    }
    case "earthset": {
      const eye = onMoon(-86, 180, 1.0006);
      const lat = (lerp(-5.8, -1.0, u) * Math.PI) / 180;
      const look = onMoon(-6.4, 0, EARTH_DISTANCE);
      return { eye, look, up: unit(eye), fov: 14, sun: sunFrom(-1.5, 90), earthLat: lat, earthSpin: lerp(0.4, 1.0, u), relief: 0.2, exposure: 1.2 };
    }
    case "pullback": {
      const e = INOUT(u);
      const eye = onMoon(lerp(-82, -40, e), lerp(-112, -60, e), lerp(1.045, 4.4, e));
      const end = aimed(onMoon(-40, -60, 4.4), [0, 0, 0], 0, 7);
      return { eye, look: mix3(onMoon(-82, 80, 1.0), end, e), up: SOUTH_UP, fov: lerp(55, 34, e), sun: sunFrom(-1.5, 82) };
    }
    case "reveal": {
      const eye = onMoon(lerp(-40, -43, u), lerp(-60, -48, u), lerp(4.4, 4.2, u));
      return { eye, look: aimed(eye, [0, 0, 0], 0, 7), up: SOUTH_UP, fov: 34, sun: sunFrom(-1.5, lerp(82, 88, u)) };
    }
    default: {
      const eye = onMoon(-48, lerp(-40, -10, u), 6.5);
      return { eye, look: aimed(eye, [0, 0, 0], 18, -14), up: SOUTH_UP, fov: 34, sun: sunFrom(-1.5, 70), dim: true };
    }
  }
}

/** One 3D shot, `frames` long, filling the frame; `dim` lowers it under type. */
export function MoonShot({ name, frames }: { name: ShotName; frames: number }) {
  const f = useCurrentFrame();
  const u = interpolate(f, [0, frames - 1], [0, 1], clamp);
  const s = framing(name, u);
  const earthLat = "earthLat" in s ? s.earthLat : (-3.4 * Math.PI) / 180;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <MoonScene eye={s.eye} look={s.look} up={s.up} fov={s.fov} sun={s.sun} relief={"relief" in s ? s.relief : 0.45}
        exposure={"exposure" in s ? s.exposure : "dim" in s ? 1.1 : 2.6} earthLat={earthLat} earthSpin={"earthSpin" in s ? s.earthSpin : 0} />
    </AbsoluteFill>
  );
}
