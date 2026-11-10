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
 * The end card's placeholder backdrop: one sharp frame of the raea 3D Moon,
 * low over the south polar horizon (the limb at about 62 % of the height,
 * where the hero film's hold frame puts its horizon), without type, until
 * that hold frame (VENT-112) replaces it (END_BACKDROP in scenes/plates.ts).
 *
 *   raea render backdrop.tsx -o media/plates/end-backdrop-placeholder.png --frame 0
 */
import { AbsoluteFill, Composition, registerRoot } from "raea";
import { MoonScene, onMoon, sunFrom, type V3 } from "./scenes/moon";

const SOUTH_UP: V3 = [0, -1, 0];
/** Low over the pole, looking toward 0° E: the lit limb across the right, the Sun just off the right edge. */
const FRAMING = { eye: onMoon(-79, -95, 1.06), look: onMoon(-82, 0, 1.02), fov: 50 };

/** The low pass over the pole, framed for the end card. */
function Backdrop() {
  const s = FRAMING;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <MoonScene eye={s.eye} look={s.look} up={SOUTH_UP} fov={s.fov} sun={sunFrom(-1.5, 95)} relief={0.3} exposure={2.4} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="end-backdrop" component={Backdrop} width={1920} height={1080} fps={30} durationInFrames={1} />);
