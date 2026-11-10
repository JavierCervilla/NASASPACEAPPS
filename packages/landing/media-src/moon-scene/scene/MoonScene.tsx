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
 * The Moon, its sky and a camera, as one raea component: put it in a
 * composition's AbsoluteFill and give it, per frame, the built world (the
 * JSON build.mjs wrote, imported) and a Shot. Every value is a function of
 * the props, so a still and a render agree. README.md says how to build the
 * inputs.
 */
import { staticFile } from "raea";
import { BevyComponent, Entity } from "raea/3d";
import { Camera3d } from "raea/camera";
import { ShaderMesh } from "raea/pbr";
import { Transform } from "raea/transform";
import { add, frameOf, norm, scale, sub, type Frame, type Shot, type V3, type WorldFile } from "./frame.ts";
import { SKY, SKY_STARS, TERRAIN, TERRAIN_NIGHT } from "./shaders.ts";

export interface MoonSceneProps {
  /** the JSON build.mjs wrote beside the mesh, imported by the composition */
  readonly world: WorldFile;
  /** the folder of the composition's media where build.mjs and textures.mjs wrote ("moon/") */
  readonly media?: string;
  /** the camera of this frame */
  readonly shot: Shot;
  /** the frame's height in pixels, for each pixel's footprint */
  readonly height: number;
  /** the sunlit ground's exposure */
  readonly exposure: number;
  /** the Earth's day side, over its albedo (a separate exposure, see README) */
  readonly earthGain?: number;
  /** strength of the illustrative relief, 0 to 1 */
  readonly detail?: number;
  /** the share of the surrounding sunlit ground's light a shadow receives (0.03) */
  readonly bounce?: number;
  /** the Earth's light on ground facing it, relative to the Sun's (0.002); not scaled by `exposure` */
  readonly fill?: number;
  /** a faint starfield's brightness, 0 for none (0) */
  readonly stars?: number;
  /** the app's lunar-night lights on the terrain (TERRAIN_NIGHT), or none */
  readonly night?: NightLights;
  /** a diagnostic view of the surface (shaders.ts), 0 for the picture */
  readonly mode?: number;
}

/** The Ventana Lunar app's night lights, relative to the Sun's key (night-light.ts). */
export interface NightLights {
  /** the hemisphere floor's intensity */
  readonly floor: number;
  /** the reading light's intensity, and the world direction it comes from */
  readonly reading: number;
  readonly readingDir: V3;
}

const SKY_RADIUS_M = 1e8;
const MATERIAL = "bevy_pbr::mesh_material::MeshMaterial3d<raea_sys_material::shader_material::ShaderMaterial>";
const MAP = { wrap: ["repeat", "clamp"], mipmap: "linear", anisotropy: 16 };
const frames = new Map<WorldFile, Frame>();

/** The world frame of a built Moon, worked out once per file. */
export function sceneFrame(world: WorldFile): Frame {
  let frame = frames.get(world);
  if (!frame) {
    frame = frameOf(world);
    frames.set(world, frame);
  }
  return frame;
}

/** The camera, the sky (Sun, Earth) and the Moon for one frame. */
export function MoonScene({ world, media = "moon/", shot, height, exposure, earthGain = 1, detail = 1, bounce = 0.03, fill = 0.002, stars = 0, night, mode = 0 }: MoonSceneProps) {
  const frame = sceneFrame(world);
  const earthRel = sub(frame.earth, shot.eye);
  const pixel = (2 * Math.tan(shot.fovY / 2)) / height;
  const earthPx = (2 * frame.earthRadiusM) / Math.hypot(...earthRel) / pixel;
  const terrain = {
    east: frame.east, up: frame.up, north: frame.north, centre: frame.centre,
    eye: shot.eye, sun: frame.sun, earth_dir: norm(earthRel), exposure,
    pixel, detail, fill, bounce, mode,
  };
  const sky = {
    eye: shot.eye, sun: frame.sun, pixel,
    earth_rel: earthRel, earth_radius: frame.earthRadiusM, earth_gain: earthGain,
    earth_lod: Math.max(0, Math.log2(512 / Math.max(earthPx, 1)) - 0.5),
    earth_x: frame.earthAxes[0], earth_y: frame.earthAxes[1], earth_z: frame.earthAxes[2],
  };
  // a far aim point: the eye may be thousands of km out, and f32 would round a unit step
  const target: V3 = add(shot.eye, scale(shot.forward, 1e8));
  return (
    <>
      <Camera3d
        transform={Transform.fromXyz(shot.eye[0], shot.eye[1], shot.eye[2]).lookingAt(target, shot.up)}
        projection={{ Perspective: { fov: shot.fovY, near: 0.05, far: 2e9 } }}
      />
      <ShaderMesh name="sky" shape={{ primitive: "Sphere", radius: SKY_RADIUS_M }} position={shot.eye} doubleSided wgsl={stars > 0 ? SKY_STARS : SKY}
        uniforms={stars > 0 ? { ...sky, stars } : sky} textures={{ earth: { src: staticFile(`${media}textures/on-foot-earth.webp`), sampler: MAP } }} />
      <Entity name="moon">
        <BevyComponent type="bevy_mesh::components::Mesh3d" value={`${staticFile(media + world.mesh)}#Mesh0/Primitive0`} />
        <BevyComponent type={MATERIAL} value={{
          wgsl: night ? TERRAIN_NIGHT : TERRAIN,
          uniforms: night ? { ...terrain, night_floor: night.floor, reading: night.reading, reading_dir: night.readingDir } : terrain,
          textures: {
            colour: { src: staticFile(`${media}textures/moon-lroc-4k.jpg`), sampler: MAP },
            relief: { src: staticFile(`${media}textures/moon-lola-normal-4k.jpg`), sampler: MAP },
          },
        }} />
      </Entity>
    </>
  );
}
