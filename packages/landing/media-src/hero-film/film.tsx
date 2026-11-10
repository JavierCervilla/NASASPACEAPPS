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
 * touchdown point on Mons Mouton, ending on the Earth through a long lens,
 * then a locked hold, at 2026-12-15 05:00 UTC. The Moon, its sky and the
 * camera are moon-scene's MoonScene (../moon-scene), built for that instant;
 * the move is scene/path.ts.
 *
 * Compositions, per look (`desktop` 16:9, `phone` 9:16):
 * - `<look>-descent`: the 14 s descent, frames 0 to 420; its last frame is
 *   the hold's (README.md makes the hold and the poster from it).
 * - `<look>-descent-2x`: the same at twice the size, supersampled: the
 *   masters are these frames scaled down (the detail still fades by the
 *   final pixel's footprint).
 * - `<look>`: the descent and 6 s of the locked hold, for previews.
 * - `<look>-guides`: the same with the review guides over it.
 * - `diag-<view>`, `diag-<view>-phone`: diagnostic views of the surface.
 */
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame } from "raea";
import world from "./media/moon/moon-im2-20261215T0500Z.json";
import { MoonScene, sceneFrame } from "../moon-scene/scene/MoonScene.tsx";
import type { WorldFile } from "../moon-scene/scene/frame.ts";
import { Guides } from "./scene/guides.tsx";
import { DESCENT_S, FPS, HOLD_S, LOOKS, shotAt, type Look } from "./scene/path.ts";

const built = world as WorldFile;
const frame = sceneFrame(built);

/**
 * The exposure: one slow curve of the log altitude (over about 3 s of the
 * descent), from the whole Moon's to the raking-light ground's.
 */
function exposureAt(altitude: number): number {
  const s = Math.min(1, Math.max(0, (Math.log(altitude) - Math.log(3)) / (Math.log(3e4) - Math.log(3))));
  return 1.9 + 0.5 * s * s * (3 - 2 * s);
}

interface FilmProps {
  readonly look: Look;
  readonly width: number;
  readonly height: number;
  /** draw the review guides over the frame */
  readonly guides?: boolean;
  /** a diagnostic view of the surface (moon-scene/scene/shaders.ts), 0 for the film */
  readonly mode?: number;
  /** the illustrative relief's strength, 0 to 1 */
  readonly detail?: number;
}

function Film({ look, width, height, guides = false, mode = 0, detail = 1 }: FilmProps) {
  const t = useCurrentFrame() / FPS;
  const shot = shotAt(frame, t, look);
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <MoonScene world={built} shot={shot} height={height} exposure={exposureAt(shot.altitude)} earthGain={mode > 0 ? 0 : 1.8} detail={detail} mode={mode} />
      {guides ? <Guides frame={frame} shot={shot} aspect={width / height} t={t} headingDeg={look.headingDeg} /> : null}
    </AbsoluteFill>
  );
}

const ALL = (DESCENT_S + HOLD_S) * FPS;
const DESCENT = DESCENT_S * FPS + 1;
const looks = [
  { id: "desktop", look: LOOKS.desktop, width: 1920, height: 1080 },
  { id: "phone", look: LOOKS.phone, width: 1080, height: 1920 },
] as const;
const DIAGNOSTICS = ["normals", "hillshade", "shading", "sunlit"];

registerRoot(() => (
  <>
    {looks.map(({ id, look, width, height }) => (
      <Composition key={`${id}-descent`} id={`${id}-descent`} component={() => <Film look={look} width={width} height={height} />} width={width} height={height} fps={FPS} durationInFrames={DESCENT} />
    ))}
    {looks.map(({ id, look, width, height }) => (
      <Composition key={`${id}-descent-2x`} id={`${id}-descent-2x`} component={() => <Film look={look} width={width} height={height} />} width={2 * width} height={2 * height} fps={FPS} durationInFrames={DESCENT} />
    ))}
    {looks.map(({ id, look, width, height }) => (
      <Composition key={id} id={id} component={() => <Film look={look} width={width} height={height} />} width={width} height={height} fps={FPS} durationInFrames={ALL} />
    ))}
    {looks.map(({ id, look, width, height }) => (
      <Composition key={`${id}-guides`} id={`${id}-guides`} component={() => <Film look={look} width={width} height={height} guides />} width={width} height={height} fps={FPS} durationInFrames={ALL} />
    ))}
    {DIAGNOSTICS.map((name, i) => (
      <Composition key={name} id={`diag-${name}`} component={() => <Film look={LOOKS.desktop} width={1920} height={1080} mode={i + 1} />} width={1920} height={1080} fps={FPS} durationInFrames={ALL} />
    ))}
    {DIAGNOSTICS.map((name, i) => (
      <Composition key={`${name}-phone`} id={`diag-${name}-phone`} component={() => <Film look={LOOKS.phone} width={1080} height={1920} mode={i + 1} />} width={1080} height={1920} fps={FPS} durationInFrames={ALL} />
    ))}
    <Composition id="diag-no-detail" component={() => <Film look={LOOKS.desktop} width={1920} height={1080} detail={0} />} width={1920} height={1080} fps={FPS} durationInFrames={ALL} />
  </>
));
