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
 * One shot of the opening, from the best source there is: a scene imported
 * from the hero film's terrain pipeline (SCENES, empty until VENT-112 is
 * merged), else its rendered plate (scenes/plates.ts), else the raea 3D
 * fallback (scenes/shots.tsx). The cuts place it the same way in every case.
 */
import { AbsoluteFill, Video, staticFile } from "raea";
import { PLATES, type OpeningId } from "./plates";
import { MoonShot } from "./shots";

export type Cut = "hero" | "submission";

/** Scenes imported from the terrain pipeline, by shot; each draws `frames` frames. */
export const SCENES: Partial<Record<OpeningId, (p: { frames: number; cut: Cut }) => React.ReactNode>> = {};

/** The shot `id` for `cut`, `frames` long. */
export function OpeningShot({ id, cut, frames }: { id: OpeningId; cut: Cut; frames: number }) {
  const Scene = SCENES[id];
  if (Scene) return <Scene frames={frames} cut={cut} />;
  const plate = PLATES[id].plate[cut];
  if (plate) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#000000", overflow: "hidden" }}>
        <Video src={staticFile(`plates/${plate}`)} startFrom={0} endAt={frames + 2} muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    );
  }
  return <MoonShot name={PLATES[id].fallback} frames={frames} />;
}
