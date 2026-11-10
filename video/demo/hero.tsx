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
 * Ventana Lunar, the hero cut (VENT-110): 68 s, 2040 frames, 1920 x 1080 at
 * 30 fps, no voice. Hook, stakes, reveal, three feature beats, any device,
 * proof, call to action. The Moon shots are raea 3D (scenes/); the app is
 * real footage of the live site (capture/). Cuts land on the score's bars
 * and beats (parts/score.ts, 120 bpm: a bar is 60 frames).
 */
import { AbsoluteFill, Composition, Mix, Sequence, registerRoot } from "raea";
import {
  ArtemisWords, CtaBeat, DevicesBeat, DsnBeat, EarthWords, HookWords, PickBeat, ProofWords, RevealWords, SunWords,
  TerrainBeat, WindowBeat,
} from "./parts/beats";
import { buildScore, frames } from "./parts/score";
import { MoonShot, type ShotName } from "./scenes/shots";

buildScore({ hits: [0, 4, 8, 12, 22, 26, 34, 40, 46, 54], riser: [14, 18], pulseFrom: 4, groove: [18, 54], breath: [54, 60], outro: 60, end: 68 });

interface Beat { id: string; at: number; to: number; shot?: ShotName; words?: () => React.ReactNode; app?: (p: { frames: number }) => React.ReactNode }

/** The cut, in seconds on the score's grid. */
const BEATS: Beat[] = [
  { id: "hook", at: 0, to: 4, shot: "dive", words: () => <HookWords /> },
  { id: "artemis", at: 4, to: 8, shot: "artemis", words: () => <ArtemisWords /> },
  { id: "sun", at: 8, to: 12, shot: "skim", words: () => <SunWords /> },
  { id: "earth", at: 12, to: 16, shot: "earthset", words: () => <EarthWords /> },
  { id: "pullback", at: 16, to: 18, shot: "pullback" },
  { id: "reveal", at: 18, to: 22, shot: "reveal", words: () => <RevealWords /> },
  { id: "pick", at: 22, to: 26, app: PickBeat },
  { id: "window", at: 26, to: 34, app: WindowBeat },
  { id: "dsn", at: 34, to: 40, app: DsnBeat },
  { id: "terrain", at: 40, to: 46, app: TerrainBeat },
  { id: "devices", at: 46, to: 54, app: DevicesBeat },
  { id: "proof", at: 54, to: 60, shot: "drift", words: () => <ProofWords /> },
  { id: "cta", at: 60, to: 68, app: ({ frames: n }) => <CtaBeat frames={n} /> },
];
const TOTAL = frames(68);

export default function Hero() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07080b" }}>
      {BEATS.map((b) => {
        const n = frames(b.to) - frames(b.at);
        const App = b.app;
        return (
          <Sequence key={b.id} from={frames(b.at)} durationInFrames={n} name={b.id}>
            {b.shot ? <MoonShot name={b.shot} frames={n} /> : null}
            {App ? <App frames={n} /> : null}
            {b.words ? b.words() : null}
          </Sequence>
        );
      })}
      <Mix lufs={-14} ceiling={-1.5} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="ventana-lunar-hero" component={Hero} width={1920} height={1080} fps={30} durationInFrames={TOTAL} />);
