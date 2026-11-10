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
 * The opening's plates on the real Moon (scenes/terrain.tsx), one
 * composition per shot and cut, rendered at twice the size and scaled down
 * (the terrain module's supersampling) into media/plates/<id>-<cut>.mp4:
 *
 *   raea render plates.tsx --composition dive-hero-2x -o out/plates/dive-hero/
 *
 * README.md has the whole loop.
 */
import { Composition, registerRoot } from "raea";
import { PLATES, type OpeningId } from "./scenes/plates";
import { TerrainShot } from "./scenes/terrain";

const FPS = 30;
const IDS = Object.keys(PLATES) as OpeningId[];
const CUTS = ["hero", "submission"] as const;

registerRoot(() => (
  <>
    {IDS.flatMap((id) => CUTS.filter((cut) => PLATES[id].seconds[cut] > 0).flatMap((cut) => {
      const frames = Math.round(PLATES[id].seconds[cut] * FPS);
      const shot = () => <TerrainShot id={id} frames={frames} />;
      return [
        <Composition key={`${id}-${cut}`} id={`${id}-${cut}`} component={shot} width={1920} height={1080} fps={FPS} durationInFrames={frames} />,
        <Composition key={`${id}-${cut}-2x`} id={`${id}-${cut}-2x`} component={shot} width={3840} height={2160} fps={FPS} durationInFrames={frames} />,
      ];
    }))}
  </>
));
