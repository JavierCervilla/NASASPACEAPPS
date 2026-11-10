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
 * The hero film of the landing page (VENT-112), a raea composition: one
 * continuous camera move from the whole Moon down to 2 m over IM-2 Athena's
 * touchdown point on Mons Mouton, then a locked hold, at 2026-11-22 20:00 UTC.
 * The camera is scene/path.ts, the world scene/frame.ts, the surface one
 * static mesh (scripts/build-terrain.mjs) drawn by scene/shaders.ts.
 *
 * Compositions: `desktop` (16:9) and `phone` (9:16), each the 14 s descent
 * and the 6 s hold, and the same with the review guides over them
 * (`desktop-guides`, `phone-guides`). README.md says how to build the inputs
 * and render.
 */
import { AbsoluteFill, Composition, registerRoot, staticFile, useCurrentFrame } from "raea";
import { BevyComponent, Entity } from "raea/3d";
import { Camera3d } from "raea/camera";
import { ShaderMesh } from "raea/pbr";
import { Transform } from "raea/transform";
import sky from "./sky.json";
import terrain from "./media/mesh/terrain.json";
import { add, norm, scale, sub, type V3, frameOf } from "./scene/frame.ts";
import { DESCENT_S, FPS, HOLD_S, LOOKS, shotAt, type Look } from "./scene/path.ts";
import { Guides } from "./scene/guides.tsx";
import { SKY, TERRAIN } from "./scene/shaders.ts";

const frame = frameOf(sky, terrain as Parameters<typeof frameOf>[1]);
const SKY_RADIUS_M = 1e8;
const MAP = { wrap: ["repeat", "clamp"], mipmap: "linear", anisotropy: 16 };
const TILE = { wrap: "repeat", mipmap: "linear", anisotropy: 16 };
const MATERIAL = "bevy_pbr::mesh_material::MeshMaterial3d<raea_sys_material::shader_material::ShaderMaterial>";
const TEXTURES = {
  colour: { src: staticFile("textures/moon-lroc-4k.jpg"), sampler: MAP },
  relief: { src: staticFile("textures/moon-lola-normal-4k.jpg"), sampler: MAP },
  detail: { src: staticFile("textures/on-foot-regolith-normal.webp"), sampler: TILE },
};

/**
 * The exposure: one slow curve of the log altitude (over about 3 s of the
 * descent), from the whole Moon's to the low-Sun ground's, which reads
 * brighter at 2 m because the camera looks along the lit slopes.
 */
function exposureAt(altitude: number): number {
  const s = Math.min(1, Math.max(0, (Math.log(altitude) - Math.log(3)) / (Math.log(3e4) - Math.log(3))));
  return 1.25 + 1.15 * s * s * (3 - 2 * s);
}

interface FilmProps {
  readonly look: Look;
  readonly width: number;
  readonly height: number;
  /** draw the review guides over the frame */
  readonly guides?: boolean;
}

function Film({ look, width, height, guides = false }: FilmProps) {
  const t = useCurrentFrame() / FPS;
  const shot = shotAt(frame, t, look);
  const exposure = exposureAt(shot.altitude);
  const earthRel = sub(frame.earth, shot.eye);
  const pixel = (2 * Math.tan(shot.fovY / 2)) / height;
  const terrainUniforms = {
    east: [...frame.east], up: [...frame.up], north: [...frame.north], centre: frame.centre,
    eye: shot.eye, sun: frame.sun, earth_dir: norm(earthRel), exposure,
    detail: 0.35, fill: 0.002,
  };
  const skyUniforms = {
    eye: shot.eye, sun: frame.sun, sun_on: 1, pixel, exposure,
    earth_rel: earthRel, earth_radius: frame.earthRadiusM,
    earth_x: frame.earthAxes[0], earth_y: frame.earthAxes[1], earth_z: frame.earthAxes[2],
  };
  // a far aim point: the eye is thousands of km out, and f32 would round a unit step
  const target: V3 = add(shot.eye, scale(shot.forward, 1e8));
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <Camera3d
        transform={Transform.fromXyz(shot.eye[0], shot.eye[1], shot.eye[2]).lookingAt(target, shot.up)}
        projection={{ Perspective: { fov: shot.fovY, near: 0.05, far: 2e9 } }}
      />
      <ShaderMesh name="sky" shape={{ primitive: "Sphere", radius: SKY_RADIUS_M }} position={shot.eye} doubleSided wgsl={SKY}
        uniforms={skyUniforms} textures={{ earth: { src: staticFile("textures/on-foot-earth.webp"), sampler: MAP } }} />
      <Entity name="moon">
        <BevyComponent type="bevy_mesh::components::Mesh3d" value={staticFile("mesh/terrain.glb") + "#Mesh0/Primitive0"} />
        <BevyComponent type={MATERIAL} value={{ wgsl: TERRAIN, uniforms: terrainUniforms, textures: TEXTURES }} />
      </Entity>
      {guides ? <Guides frame={frame} shot={shot} aspect={width / height} t={t} headingDeg={look.headingDeg} /> : null}
    </AbsoluteFill>
  );
}

const FRAMES = (DESCENT_S + HOLD_S) * FPS;
const Desktop = () => <Film look={LOOKS.desktop} width={1920} height={1080} />;
const Phone = () => <Film look={LOOKS.phone} width={1080} height={1920} />;
const DesktopGuides = () => <Film look={LOOKS.desktop} width={1920} height={1080} guides />;
const PhoneGuides = () => <Film look={LOOKS.phone} width={1080} height={1920} guides />;

registerRoot(() => (
  <>
    <Composition id="desktop" component={Desktop} width={1920} height={1080} fps={FPS} durationInFrames={FRAMES} />
    <Composition id="phone" component={Phone} width={1080} height={1920} fps={FPS} durationInFrames={FRAMES} />
    <Composition id="desktop-guides" component={DesktopGuides} width={1920} height={1080} fps={FPS} durationInFrames={FRAMES} />
    <Composition id="phone-guides" component={PhoneGuides} width={1080} height={1920} fps={FPS} durationInFrames={FRAMES} />
  </>
));
