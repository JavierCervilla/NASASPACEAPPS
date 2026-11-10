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
 * A site film's compositions (VENT-115): the move from 40 km down to the
 * app's eye over one site at 2026-12-15 05:00 UTC, ending on the view the
 * app's 3D view opens on (its heading rule, pitch and lens). Each site's
 * `<site-id>/film.tsx` imports its built world and registers these.
 *
 * Compositions, per look (`wide` 16:9, `phone` 9:16), frames 0 to 150 (the
 * move; its last frame is the hold's, which deliver.sh repeats for 1 s):
 * - `<look>`: the frames at the final size.
 * - `<look>-2x`: the same at twice the size, supersampled: the masters are
 *   these frames scaled down (the detail still fades by the final pixel's
 *   footprint).
 * - `diag-normals-<look>`: the surface's normals over a black sky,
 *   for the coverage check; `diag-sunlit-<look>`: the sunlit share.
 */
import { AbsoluteFill, Composition, useCurrentFrame } from "raea";
import { MoonScene, sceneFrame } from "../../moon-scene/scene/MoonScene.tsx";
import type { WorldFile } from "../../moon-scene/scene/frame.ts";
import { lightAt, skyOf, startHeading } from "./light.ts";
import { FPS, LOOKS, MOVE_FRAMES, shotAt, type Look } from "./path.ts";

interface FilmProps {
  readonly world: WorldFile;
  readonly look: Look;
  readonly height: number;
  /** a diagnostic view of the surface (moon-scene/scene/shaders.ts), 0 for the film */
  readonly mode?: number;
}

function Film({ world, look, height, mode = 0 }: FilmProps) {
  const t = useCurrentFrame() / FPS;
  const frame = sceneFrame(world);
  const sky = skyOf(world);
  const shot = shotAt(frame, t, look, startHeading(sky));
  const light = lightAt(sky, shot.altitude);
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <MoonScene world={world} shot={shot} height={height} exposure={light.exposure} fill={light.fill} bounce={light.bounce}
        stars={mode > 0 ? 0 : light.stars} night={mode > 0 ? undefined : light.night} earthGain={mode > 0 ? 0 : 1.8} mode={mode} />
    </AbsoluteFill>
  );
}

const SCREENS = [
  { id: "wide", look: LOOKS.wide, width: 1920, height: 1080 },
  { id: "phone", look: LOOKS.phone, width: 1080, height: 1920 },
] as const;
const DIAGNOSTICS = [["normals", 1], ["sunlit", 4]] as const;

/** The compositions of one site's film, for its `registerRoot`. */
export function siteRoot(world: WorldFile) {
  return () => (
    <>
      {SCREENS.map(({ id, look, width, height }) => (
        <Composition key={id} id={id} component={() => <Film world={world} look={look} height={height} />} width={width} height={height} fps={FPS} durationInFrames={MOVE_FRAMES} />
      ))}
      {SCREENS.map(({ id, look, width, height }) => (
        <Composition key={`${id}-2x`} id={`${id}-2x`} component={() => <Film world={world} look={look} height={height} />} width={2 * width} height={2 * height} fps={FPS} durationInFrames={MOVE_FRAMES} />
      ))}
      {SCREENS.flatMap(({ id, look, width, height }) => DIAGNOSTICS.map(([name, mode]) => (
        <Composition key={`diag-${name}-${id}`} id={`diag-${name}-${id}`} component={() => <Film world={world} look={look} height={height} mode={mode} />} width={width} height={height} fps={FPS} durationInFrames={MOVE_FRAMES} />
      )))}
    </>
  );
}
