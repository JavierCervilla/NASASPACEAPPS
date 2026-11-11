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
 * The opening's shots on the real Moon of the hero film's terrain module
 * (packages/landing/media-src/moon-scene, VENT-112): a LOLA mesh around
 * IM-2's touchdown point on Mons Mouton with the shadows of the instant
 * baked in, and the Sun and Earth of that instant from @ventana/sim. Two
 * instants, each one build (scenes/plates.ts says why each was chosen):
 *
 * - 2026-11-15 11:00 UTC: the Sun's disc half on the ridge at azimuth 80°,
 *   the Earth 69 % lit 2.9° over the terrain at 328° (dive, artemis, skim,
 *   pullback, reveal, drift);
 * - 2027-01-27 11:40 UTC: the Earth's centre on the terrain at 338°, 30 %
 *   lit, the Sun 0.5° up at 272° (earthset).
 *
 * The world is the module's: metres, origin on the ground at the target, +X
 * east, +Y up, +Z south there; heading ψ is [sin ψ, 0, -cos ψ].
 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "raea";
import skimWorld from "../media/moon/moon-im2-20261115T1100Z.json";
import orbitWorld from "../media/moon-earth/moon-im2-20261115T1100Z.json";
import earthWorld from "../media/moon/moon-im2-20270127T1140Z.json";
import { MoonScene, sceneFrame } from "../../../packages/landing/media-src/moon-scene/scene/MoonScene.tsx";
import { add, cross, norm, scale, sub, type Frame, type Shot, type V3, type WorldFile } from "../../../packages/landing/media-src/moon-scene/scene/frame.ts";
import type { OpeningId } from "./plates";

const SKIM = skimWorld as WorldFile;
const ORBIT = orbitWorld as WorldFile;
/** The orbit world's folder: the same instant, its dense sector around the Earth's heading. */
const ORBIT_MEDIA = "moon-earth/";
const EARTH = earthWorld as WorldFile;
const DEG = Math.PI / 180;
const UP: V3 = [0, 1, 0];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const smoother = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const heading = (deg: number): V3 => [Math.sin(deg * DEG), 0, -Math.cos(deg * DEG)];
/** A direction at `headingDeg`, `pitchDeg` above the target's level. */
const aimAt = (headingDeg: number, pitchDeg: number): V3 =>
  add(scale(heading(headingDeg), Math.cos(pitchDeg * DEG)), scale(UP, Math.sin(pitchDeg * DEG)));
/**
 * The camera's arc behind the target for an altitude, degrees: 30 % of the
 * altitude near the ground (as the hero film), tending to `farDeg` far out,
 * so it never stands over terrain higher than the target's and the ground
 * under it stays where the mesh is dense.
 */
function arcFor(frame: Frame, alt: number, farDeg: number): number {
  const far = farDeg * DEG;
  const ground = frame.radiusM + frame.groundM;
  return (far * (1 - Math.exp((-0.3 * Math.max(alt - 2, 0)) / (far * ground)))) / DEG;
}

/** Log-altitude interpolation, eased at both ends. */
const altitude = (from: number, to: number, u: number): number => Math.exp(lerp(Math.log(from), Math.log(to), smoother(u)));

/**
 * The camera `alt` metres over the sphere, `arcDeg` of arc from the target
 * toward `headingDeg` (its ground point), aimed along `forward`; `roll`
 * keeps the target's up as the frame's up when it can.
 */
function cameraAt(frame: Frame, o: { alt: number; arcDeg: number; headingDeg: number; forward: V3; fovYDeg: number; upHint?: V3 }): Shot {
  const ground = frame.radiusM + frame.groundM;
  const a = o.arcDeg * DEG;
  const dir = add(scale(UP, Math.cos(a)), scale(heading(o.headingDeg), Math.sin(a)));
  const eye = add(frame.centre, scale(dir, ground + o.alt));
  const forward = norm(o.forward);
  const hint = o.upHint ?? dir;
  const raw = cross(forward, hint);
  // looking straight along the hint (a probe looking up at the target): any heading is a side
  const side = Math.hypot(raw[0], raw[1], raw[2]) > 1e-9 ? norm(raw) : norm(cross(forward, heading(o.headingDeg)));
  return { eye, forward, up: norm(cross(side, forward)), fovY: o.fovYDeg * DEG };
}

/** `forward` turned so that `target` shows `dx` degrees right of centre and `dy` above it. */
function offset(forward: V3, up: V3, dx: number, dy: number): V3 {
  const f = norm(forward);
  const right = norm(cross(f, up));
  const top = cross(right, f);
  return norm(sub(sub(f, scale(right, Math.tan(dx * DEG))), scale(top, Math.tan(dy * DEG))));
}

interface Planned {
  world: WorldFile;
  /** the folder under media/ holding that world's mesh and textures */
  media: string;
  shot: Shot;
  exposure: number;
}

/** The dive: from 1 500 km over the pole down to 600 m, ending on the Earth over the horizon at 328°. */
function dive(frame: Frame, u: number): Planned {
  const alt = altitude(1.5e6, 600, u);
  const arcDeg = arcFor(frame, alt, 28);
  const toCentre = norm(sub(frame.centre, cameraAt(frame, { alt, arcDeg, headingDeg: 148, forward: UP, fovYDeg: 40 }).eye));
  const late = smoother((u - 0.2) / 0.5);
  const forward = norm(add(scale(toCentre, 1 - late), scale(aimAt(327.6, -0.4 - 14 * (1 - smoother((u - 0.55) / 0.4))), late)));
  const ground = add(scale(UP, Math.cos(arcDeg * DEG)), scale(heading(148), Math.sin(arcDeg * DEG)));
  const upHint = norm(add(scale(heading(327.6), 1 - late), scale(ground, late)));
  const shot = cameraAt(frame, { alt, arcDeg, headingDeg: 148, forward, fovYDeg: lerp(38, 40, u), upHint });
  return { world: ORBIT, media: ORBIT_MEDIA, shot, exposure: lerp(1.9, 2.3, u) };
}

/** Artemis: high over the pole, a slow arc, the polar cap in the right half. */
function artemis(frame: Frame, u: number): Planned {
  const headingDeg = lerp(200, 250, u);
  const probe = cameraAt(frame, { alt: 1.4e6, arcDeg: 30, headingDeg, forward: UP, fovYDeg: 36 });
  const toTarget = norm(scale(probe.eye, -1));
  const forward = offset(toTarget, probe.up, 14, 0);
  return { world: ORBIT, media: ORBIT_MEDIA, shot: cameraAt(frame, { alt: 1.4e6, arcDeg: 30, headingDeg, forward, fovYDeg: 36, upHint: probe.up }), exposure: 1.9 };
}

/** The Sun skimming the ridge: eye height, looking at 80°, a slow pan of 6°. */
function skim(frame: Frame, u: number): Planned {
  const shot = cameraAt(frame, { alt: 2, arcDeg: 0, headingDeg: 0, forward: aimAt(lerp(76, 82, u), 1.2), fovYDeg: 30, upHint: UP });
  return { world: SKIM, media: "moon/", shot, exposure: 2.3 };
}

/** The Earth hiding: eye height, looking at 338°, the Earth on the ridge, a gentle push. */
function earthset(frame: Frame, u: number): Planned {
  const shot = cameraAt(frame, { alt: 2, arcDeg: 0, headingDeg: 0, forward: aimAt(338.3, 1.9), fovYDeg: lerp(22, 19, smoother(u)), upHint: UP });
  return { world: EARTH, media: "moon/", shot, exposure: 2.6 };
}

/** The pull-back: from 2 m at the target, the Earth on the horizon, up to 8 000 km, ending on the reveal's framing. */
function pullback(frame: Frame, u: number): Planned {
  const alt = altitude(2, 8.0e6, u);
  const arcDeg = arcFor(frame, alt, 22.5);
  const w = smoother((u - 0.35) / 0.55);
  const ground = add(scale(UP, Math.cos(arcDeg * DEG)), scale(heading(148), Math.sin(arcDeg * DEG)));
  const end = orbitShot(frame, alt, arcDeg, 148);
  const low = aimAt(327.6, 0.6 - 14 * smoother(u / 0.5));
  const forward = norm(add(scale(low, 1 - w), scale(end.forward, w)));
  const upHint = norm(add(scale(ground, 1 - w), scale(heading(327.6), w)));
  return { world: ORBIT, media: ORBIT_MEDIA, shot: cameraAt(frame, { alt, arcDeg, headingDeg: 148, forward, fovYDeg: lerp(30, 36, u), upHint }), exposure: lerp(2.3, 1.9, u) };
}

/** The reveal: 8 000 km out, the whole Moon in the upper half, a slow drift. */
function reveal(frame: Frame, u: number): Planned {
  const arcDeg = lerp(arcFor(frame, 8.0e6, 22.5), 24, u);
  return { world: ORBIT, media: ORBIT_MEDIA, shot: orbitShot(frame, 8.0e6, arcDeg, lerp(148, 154, u)), exposure: 1.9 };
}

/** The reveal's framing: the whole Moon 9° above the frame's centre, the Earth's azimuth up. */
function orbitShot(frame: Frame, alt: number, arcDeg: number, headingDeg: number): Shot {
  const probe = cameraAt(frame, { alt, arcDeg, headingDeg, forward: UP, fovYDeg: 36 });
  const upHint = heading(327.6);
  const forward = offset(norm(sub(frame.centre, probe.eye)), upHint, 0, 9);
  return cameraAt(frame, { alt, arcDeg, headingDeg, forward, fovYDeg: 36, upHint });
}

/** The proof's background: far, the Moon small in the lower right, dim. */
function drift(frame: Frame, u: number): Planned {
  const probe = cameraAt(frame, { alt: 9.0e6, arcDeg: 26, headingDeg: lerp(140, 160, u), forward: UP, fovYDeg: 34 });
  const forward = offset(norm(sub(frame.centre, probe.eye)), probe.up, 16, -10);
  return { world: ORBIT, media: ORBIT_MEDIA, shot: cameraAt(frame, { alt: 9.0e6, arcDeg: 26, headingDeg: lerp(140, 160, u), forward, fovYDeg: 34 }), exposure: 1.5 };
}

const PATHS: Record<OpeningId, (frame: Frame, u: number) => Planned> = { dive, artemis, skim, earthset, pullback, reveal, drift };

/** The camera of shot `id` at progress u (0 to 1), for framing checks. */
export function planned(id: OpeningId, u: number): Planned {
  const world = id === "earthset" ? EARTH : id === "skim" ? SKIM : ORBIT;
  return PATHS[id](sceneFrame(world), u);
}

/** One opening shot on the real Moon, `frames` long; `height` is the delivered frame's height. */
export function TerrainShot({ id, frames, height = 1080 }: { id: OpeningId; frames: number; height?: number }) {
  const f = useCurrentFrame();
  const u = interpolate(f, [0, Math.max(1, frames - 1)], [0, 1], clamp);
  const p = planned(id, u);
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <MoonScene world={p.world} media={p.media} shot={p.shot} height={height} exposure={p.exposure} earthGain={1.8} />
    </AbsoluteFill>
  );
}
