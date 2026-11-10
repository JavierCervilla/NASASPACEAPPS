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
 * Framing guides drawn over the film for review stills and playblasts (never
 * in a deliverable): the brief's headline box (left 45 % x 15-50 % on
 * desktop), its calm bottom-right corner (30 % x 25 %), the horizon band
 * (55-65 % desktop, 60-65 % phone), markers where the Sun and the Earth
 * project, and the camera's time, altitude and pitch.
 */
import { norm, project, sub, type Frame } from "../../moon-scene/scene/frame.ts";
import type { Shot } from "./path.ts";

const box = (left: number, top: number, width: number, height: number, colour: string) => ({
  position: "absolute" as const,
  left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
  border: `2px dashed ${colour}`,
});

const line = (top: number, colour: string) => ({
  position: "absolute" as const, left: 0, top: `${top}%`, width: "100%", height: 0, borderTop: `1px solid ${colour}`,
});

function Marker({ at, colour, label }: { at: { x: number; y: number } | null; colour: string; label: string }) {
  if (!at || at.x < -0.05 || at.x > 1.05 || at.y < -0.05 || at.y > 1.05) return null;
  const x = Math.min(Math.max(at.x, 0), 1) * 100;
  const y = Math.min(Math.max(at.y, 0), 1) * 100;
  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 0, height: 0 }}>
      <div style={{ position: "absolute", left: -14, top: -14, width: 24, height: 24, borderRadius: 14, border: `2px solid ${colour}` }} />
      <div style={{ position: "absolute", left: 16, top: -10, color: colour, fontSize: 16, fontFamily: "Inter", whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

export interface GuidesProps {
  readonly frame: Frame;
  readonly shot: Shot;
  readonly aspect: number;
  readonly t: number;
  readonly headingDeg: number;
}

/** The guides for one frame. */
export function Guides({ frame, shot, aspect, t, headingDeg }: GuidesProps) {
  const desktop = aspect > 1;
  const band = desktop ? [55, 65] : [60, 65];
  const sun = project(shot, frame.sun, aspect);
  const earth = project(shot, norm(sub(frame.earth, shot.eye)), aspect);
  const alt = shot.altitude >= 1000 ? `${(shot.altitude / 1000).toFixed(1)} km` : `${shot.altitude.toFixed(1)} m`;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}>
      {desktop ? <div style={box(0, 15, 45, 35, "#ff5a5a")} /> : null}
      {desktop ? <div style={box(70, 75, 30, 25, "#ffd25a")} /> : null}
      <div style={line(band[0], "#5ad2ff")} />
      <div style={line(band[1], "#5ad2ff")} />
      <Marker at={sun} colour="#ffd25a" label="Sun" />
      <Marker at={earth} colour="#7ab8ff" label="Earth" />
      <div style={{ position: "absolute", left: "1%", top: "1%", color: "#ffffff", fontSize: 18, fontFamily: "Inter" }}>
        {`t ${t.toFixed(2)} s · alt ${alt} · pitch ${shot.pitchDeg.toFixed(1)}° · final heading ${headingDeg}°`}
      </div>
    </div>
  );
}
