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
 * The loading state over the globe until the scene runs: the app icon
 * «J2» with the Moon in the phase of the selected instant (the same
 * frames as the live favicon). Decorative: the globe's text alternative
 * speaks for the section. The Moon shows only once the instant is known
 * in the browser, so the static build never bakes its own phase in. It
 * stays over a running scene until the Moon's first map is on it (no
 * flat grey sphere), or SPLASH_FALLBACK_MS at most, so it never sticks.
 */
import { useEffect, useState } from 'react';
import type { TimeStore } from '../calendar/time-store';
import type { GlobeStatus } from '../globe/boot';
import { meanOrbitPhase } from '../pwa/moon-phase';
import { frameIndex, frameUrl } from '../pwa/phase-frames';
import { ARCS, TRACK } from '../pwa/ring';
import { useTime } from './calendar/hooks';

interface Props {
  readonly base: string;
  readonly time: TimeStore;
  /** The globe's start: 'idle' until it reports. */
  readonly status: GlobeStatus['kind'] | 'idle';
  /** Whether the Moon's first map is on the globe. */
  readonly textured: boolean;
}

/** The longest the splash waits for the map over a running scene. */
const SPLASH_FALLBACK_MS = 6000;

const C = 512;
const R = 372;

/** The SVG path of an arc `from`-`to` degrees clockwise from 12. */
function arcPath(from: number, to: number): string {
  const at = (deg: number): string => {
    const a = (deg * Math.PI) / 180;
    return `${C + R * Math.sin(a)} ${C - R * Math.cos(a)}`;
  };
  return `M${at(from)}A${R} ${R} 0 0 1 ${at(to)}`;
}

/** The legend ring, as the icon draws it. */
function Ring() {
  return (
    <svg className="globe-splash__ring" viewBox="0 0 1024 1024">
      <g fill="none" strokeWidth="64" strokeLinecap="round">
        <circle cx={C} cy={C} r={R} stroke={TRACK} />
        {ARCS.map((arc) => (
          <path
            key={arc.state}
            d={arcPath(arc.from, arc.to)}
            stroke={arc.colour}
          />
        ))}
      </g>
    </svg>
  );
}

/** Whether the globe has taken over: textured, given up, or waiting. */
function useDone(status: Props['status'], textured: boolean): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (status !== 'ready' || textured) return undefined;
    const id = window.setTimeout(() => setLate(true), SPLASH_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [status, textured]);
  if (status === 'idle') return false;
  return status !== 'ready' || textured || late;
}

export function GlobeSplash({ base, time, status, textured }: Props) {
  const done = useDone(status, textured);
  const atMs = useTime(time)?.atMs ?? null;
  const frame =
    atMs === null ? null : frameIndex(meanOrbitPhase.phaseAt(atMs));
  return (
    <div className="globe-splash" aria-hidden="true" data-done={done}>
      {frame === null ? null : (
        <img
          className="globe-splash__moon"
          src={frameUrl(base, frame)}
          alt=""
        />
      )}
      <Ring />
    </div>
  );
}
