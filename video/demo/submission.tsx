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
 * Ventana Lunar, the submission cut (VENT-110): 30 s, 900 frames, 1920 x 1080
 * at 30 fps, no voice: the NASA Space Apps demo limit. The strongest beats of
 * the hero cut (hero.tsx) on the same score, NASA's open data named where
 * it is used and again before the call to action.
 */
import { AbsoluteFill, Composition, Mix, Sequence, registerRoot } from "raea";
import mobile from "./media/mobile.json";
import onfoot from "./media/onfoot.json";
import desktop from "./media/desktop.json";
import {
  CtaBeat, DevicesBeat, DsnBeat, EarthWords, HookWords, ProofWords, RevealWords, SunWords, TerrainBeat, WindowBeat,
} from "./parts/beats";
import { buildScore, frames } from "./parts/score";
import { OpeningShot } from "./scenes/opening";
import type { OpeningId } from "./scenes/plates";

buildScore({ hits: [0, 3, 5.5, 11, 16, 19.5, 23, 25], riser: [6, 8], pulseFrom: 3, groove: [8, 25], breath: [25, 27.5], outro: 27.5, end: 30 });

interface Beat { id: string; at: number; to: number; shot?: OpeningId; words?: () => React.ReactNode; app?: (p: { frames: number }) => React.ReactNode }

const D = desktop.steps;
const M = mobile.steps;

/** The cut, in seconds on the score's grid. */
const BEATS: Beat[] = [
  { id: "hook", at: 0, to: 3, shot: "dive", words: () => <HookWords second={36} /> },
  { id: "sun", at: 3, to: 5.5, shot: "skim", words: () => <SunWords kicker="WHERE NASA'S ARTEMIS III WILL LAND" /> },
  { id: "earth", at: 5.5, to: 8, shot: "earthset", words: () => <EarthWords credit={false} /> },
  { id: "reveal", at: 8, to: 11, shot: "reveal", words: () => <RevealWords /> },
  { id: "window", at: 11, to: 16, app: ({ frames: n }) => <WindowBeat frames={n} from={D.window - 3.6} /> },
  { id: "dsn", at: 16, to: 19.5, app: ({ frames: n }) => <DsnBeat frames={n} from={D.dsn - 0.6} /> },
  { id: "terrain", at: 19.5, to: 23, app: ({ frames: n }) => <TerrainBeat frames={n} from={onfoot.steps.turn + 0.4} /> },
  { id: "devices", at: 23, to: 25, app: ({ frames: n }) => <DevicesBeat frames={n} phoneFrom={M.scrub - 0.2} laptopFrom={onfoot.steps.back + 1} /> },
  { id: "proof", at: 25, to: 27.5, shot: "drift", words: () => <ProofWords compact /> },
  { id: "cta", at: 27.5, to: 30, app: ({ frames: n }) => <CtaBeat frames={n} compact /> },
];
const TOTAL = frames(30);

export default function Submission() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07080b" }}>
      {BEATS.map((b) => {
        const n = frames(b.to) - frames(b.at);
        const App = b.app;
        return (
          <Sequence key={b.id} from={frames(b.at)} durationInFrames={n} name={b.id}>
            {b.shot ? <OpeningShot id={b.shot} cut="submission" frames={n} /> : null}
            {App ? <App frames={n} /> : null}
            {b.words ? b.words() : null}
          </Sequence>
        );
      })}
      <Mix lufs={-14} ceiling={-1.5} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="ventana-lunar-submission" component={Submission} width={1920} height={1080} fps={30} durationInFrames={TOTAL} />);
