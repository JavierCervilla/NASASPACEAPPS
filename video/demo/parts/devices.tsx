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
 * Generic devices drawn in code for the app footage: a laptop (lid, bezel,
 * base) and a phone (rounded body, bezel, a camera dot, side keys). No
 * brand's shapes or marks. The footage plays inside the screen, optionally
 * pushed in on a point of the screen.
 */
import { Video, interpolate, staticFile, useCurrentFrame } from "raea";
import { clamp } from "./theme";

export interface Take {
  /** the footage file in media/ and the second of it the shot starts on */
  file: string;
  from: number;
  /** the shot's length in frames */
  frames: number;
  /** a push-in on (x, y), fractions of the screen, from zoom z0 to z1 */
  focus?: { x: number; y: number; z0: number; z1: number };
}

/** The take, filling its box; pushed in on its focus over the shot. */
export function Screen({ take, radius = 0 }: { take: Take; radius?: number }) {
  const f = useCurrentFrame();
  const { x, y, z0, z1 } = take.focus ?? { x: 0.5, y: 0.5, z0: 1, z1: 1 };
  const z = interpolate(f, [0, take.frames], [z0, z1], clamp);
  const cx = Math.min(Math.max(x, 0.5 / z), 1 - 0.5 / z);
  const cy = Math.min(Math.max(y, 0.5 / z), 1 - 0.5 / z);
  const startFrom = Math.round(take.from * 30);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden", borderRadius: radius, backgroundColor: "#000000" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transformOrigin: "0% 0%", transform: `translate(${(0.5 - cx * z) * 100}%, ${(0.5 - cy * z) * 100}%) scale(${z})` }}>
        <Video src={staticFile(take.file)} startFrom={startFrom} endAt={startFrom + take.frames + 2} muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </div>
  );
}

/** A laptop `width` px wide with its top-left at (left, top); the screen is 16:9. */
export function Laptop({ left, top, width, take }: { left: number; top: number; width: number; take: Take }) {
  const bezel = Math.round(width * 0.016);
  const screenW = width - 2 * bezel;
  const lidH = Math.round((screenW * 9) / 16) + bezel * 2 + Math.round(bezel * 0.6);
  const baseW = Math.round(width * 1.14);
  const baseH = Math.round(width * 0.024);
  return (
    <div style={{ position: "absolute", left, top, width, height: lidH + baseH }}>
      <div style={{ position: "absolute", left: 0, top: 0, width, height: lidH, borderRadius: bezel * 1.6, backgroundColor: "#16171b", boxShadow: "inset 0 0 0 1.5px rgba(255, 255, 255, 0.12), 0 50px 90px rgba(0, 0, 0, 0.6)" }}>
        <div style={{ position: "absolute", left: width / 2 - 4, top: bezel * 0.5 - 1, width: 8, height: 8, borderRadius: 4, backgroundColor: "#050506", boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.14)" }} />
        <div style={{ position: "absolute", left: bezel, top: bezel + Math.round(bezel * 0.6), width: screenW, height: Math.round((screenW * 9) / 16) }}>
          <Screen take={take} radius={4} />
        </div>
      </div>
      <div style={{ position: "absolute", left: (width - baseW) / 2, top: lidH, width: baseW, height: baseH, borderRadius: `3px 3px ${baseH}px ${baseH}px`, backgroundColor: "#2b2c32", boxShadow: "inset 0 1.5px 0 rgba(255, 255, 255, 0.16), 0 30px 60px rgba(0, 0, 0, 0.55)" }}>
        <div style={{ position: "absolute", left: baseW * 0.42, top: 0, width: baseW * 0.16, height: baseH * 0.38, borderRadius: `0 0 ${baseH * 0.4}px ${baseH * 0.4}px`, backgroundColor: "#1f2025" }} />
      </div>
    </div>
  );
}

/** A phone `height` px tall with its top-left at (left, top); the screen is 390:844. */
export function Phone({ left, top, height, take }: { left: number; top: number; height: number; take: Take }) {
  const bezel = Math.round(height * 0.017);
  const screenH = height - 2 * bezel;
  const screenW = Math.round((screenH * 390) / 844);
  const width = screenW + 2 * bezel;
  const radius = Math.round(height * 0.072);
  const key = (y: number, h: number) => (
    <div style={{ position: "absolute", left: width - 1, top: y, width: 5, height: h, borderRadius: "0 3px 3px 0", backgroundColor: "#2b2c32" }} />
  );
  return (
    <div style={{ position: "absolute", left, top, width: width + 5, height }}>
      {key(height * 0.2, height * 0.08)}
      {key(height * 0.31, height * 0.13)}
      <div style={{ position: "absolute", left: 0, top: 0, width, height, borderRadius: radius, backgroundColor: "#121317", boxShadow: "inset 0 0 0 2px rgba(255, 255, 255, 0.14), 0 50px 90px rgba(0, 0, 0, 0.6)" }}>
        <div style={{ position: "absolute", left: bezel, top: bezel, width: screenW, height: screenH }}>
          <Screen take={take} radius={radius - bezel} />
          <div style={{ position: "absolute", left: screenW / 2 - 7, top: 12, width: 14, height: 14, borderRadius: 7, backgroundColor: "#000000" }} />
        </div>
      </div>
    </div>
  );
}
