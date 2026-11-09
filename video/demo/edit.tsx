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
 * Ventana Lunar, the 30 s demo for the NASA Space Apps Challenge 2026
 * submission (VENT-110): 900 frames, 1920 x 1080, 30 fps, no voice. Real
 * footage of the live app (capture/capture.mjs films it; media/capture.json
 * says when each step starts) with English text over it, and a bed
 * synthesized here with raea's Tone synths: no samples, no models.
 *
 * Every claim on screen comes from the repository: the data sources from
 * README.md, ASSETS.md and the app's own captions, the numbers from the
 * footage itself.
 */
import { AbsoluteFill, Animate, Composition, Mix, Sequence, Video, interpolate, registerRoot, staticFile, useCurrentFrame } from "raea";
import * as Tone from "raea/tone";
import capture from "./media/capture.json";

// ---- the look: packages/web/src/styles/tokens.css ------------------------------------------------------------------

const C = {
  bg: "#07080b",
  card: "rgba(16, 17, 22, 0.9)",
  edge: "rgba(255, 255, 255, 0.08)",
  text: "#f2f2f4",
  secondary: "#c7c8ce",
  muted: "#9a9ca6",
  sun: "#f5c542",
  earth: "#4a9cff",
  window: "#3ddc84",
};
const FONT = "system-ui";
/** The team's name: not stated anywhere in the repository yet. */
const TEAM = "[TEAM NAME]";

// ---- helpers -------------------------------------------------------------------------------------------------------

const FPS = 30;
const sec = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FADE = 8;
const steps = capture.steps;

// ---- data: the shots, on the composition's clock (from, frames) and the take's (src, seconds) -----------------------

interface Framing { x: number; y: number; z0: number; z1: number }
interface Shot { id: string; from: number; frames: number; src: number; frame: Framing }

const SHOTS: Shot[] = [
  { id: "problem", from: 0, frames: 150, src: steps.globe + 0.4, frame: { x: 1000, y: 470, z0: 1.0, z1: 1.08 } },
  { id: "pick", from: 142, frames: 158, src: steps.picker - 1.6, frame: { x: 960, y: 540, z0: 1.0, z1: 1.03 } },
  { id: "strip", from: 292, frames: 248, src: steps.scrub, frame: { x: 960, y: 540, z0: 1.0, z1: 1.0 } },
  { id: "dsn", from: 532, frames: 158, src: steps.dsnClick + 0.2, frame: { x: 790, y: 520, z0: 1.2, z1: 1.25 } },
  { id: "horizon", from: 682, frames: 134, src: steps.horizon, frame: { x: 790, y: 520, z0: 1.22, z1: 1.3 } },
];
const END = { from: 808, frames: 92 };
const TOTAL = 900;
/** When the scrub lands on the window, in the strip shot's own frames. */
const WINDOW_AT = sec(steps.window - steps.scrub);

// ---- the bed: a pad, a sub and a few bell notes, chords changing with the shots -------------------------------------

const room = new Tone.Reverb({ decay: 6.5, preDelay: 0.03, wet: 0.45 }).connect(Tone.buses.music);
const soften = new Tone.Filter({ frequency: 2400, type: "lowpass", rolloff: -24 }).connect(room);
const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "fatsine" },
  envelope: { attack: 1.8, decay: 0.5, sustain: 0.8, release: 2.2 },
  volume: -14,
}).connect(soften);
const sub = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 1.2, sustain: 0.9, release: 1.8 }, volume: -16 }).connect(soften);
const bell = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 1.6, sustain: 0, release: 1.6 }, volume: -24 }).connect(room);

/** [start s, hold s, pad notes, sub note]: one chord a shot, the last resolving on the end card. */
const CHORDS: [number, number, string[], string][] = [
  [0, 4.8, ["D3", "A3", "E4", "F#4"], "D2"],
  [4.8, 5.0, ["B2", "F#3", "D4", "A4"], "B1"],
  [9.8, 8.0, ["G2", "D3", "B3", "F#4"], "G1"],
  [17.8, 5.0, ["A2", "E3", "C#4", "E4"], "A1"],
  [22.8, 4.2, ["F#2", "C#3", "A3", "E4"], "F#1"],
  [27.0, 1.0, ["D3", "A3", "D4", "F#4"], "D2"],
];
/** A motif in fragments, off the grid: [time s, note]. */
const BELLS: [number, string][] = [
  [1.2, "A4"], [2.9, "F#5"], [6.1, "E5"], [8.4, "D5"], [11.0, "B4"], [13.2, "F#5"], [16.0, "E5"],
  [19.3, "C#5"], [21.4, "E5"], [24.1, "A4"], [27.1, "D5"], [27.9, "F#5"],
];

new Tone.Part((t, c: (typeof CHORDS)[number]) => {
  pad.triggerAttackRelease(c[2], c[1], t);
  sub.triggerAttackRelease(c[3], c[1], t);
}, CHORDS.map((c) => [c[0], c] as [number, (typeof CHORDS)[number]])).start(0);
new Tone.Part((t, n: string) => bell.triggerAttackRelease(n, 0.4, t), BELLS).start(0);
Tone.buses.music.volume.value = -12;
Tone.buses.music.volume.rampTo(-60, 1.4, 28.4);
Tone.getTransport().start();

// ---- the parts -----------------------------------------------------------------------------------------------------

/** The take from `src` seconds, framed on (x, y) and drifting from zoom z0 to z1, faded in over its first frames. */
function Footage({ shot }: { shot: Shot }) {
  const f = useCurrentFrame();
  const { x, y, z0, z1 } = shot.frame;
  const z = interpolate(f, [0, shot.frames], [z0, z1], clamp);
  const cx = Math.min(Math.max(x, 960 / z), 1920 - 960 / z);
  const cy = Math.min(Math.max(y, 540 / z), 1080 - 540 / z);
  const startFrom = Math.round(shot.src * FPS);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.bg, opacity: interpolate(f, [0, FADE], [shot.from === 0 ? 1 : 0, 1], clamp) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0px 0px", transform: `translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})` }}>
        <Video src={staticFile("footage.mp4")} startFrom={startFrom} endAt={startFrom + shot.frames} muted style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
}

/** A dark card in the app's own style that holds a shot's words. */
function Card({ left, top, width, children }: { left: number; top: number; width: number; children: React.ReactNode }) {
  return (
    <Animate enter="rise" at={6} style={{
      position: "absolute", left, top, width, boxSizing: "border-box", padding: "30px 38px 32px",
      borderRadius: 24, backgroundColor: C.card, boxShadow: `inset 0 0 0 1px ${C.edge}`,
      display: "flex", flexDirection: "column", gap: 14,
    }}>{children}</Animate>
  );
}

/** One line of a card: a headline, a body line or the data credit. */
function Line({ kind, at = 6, color, dot, opacity = 1, children }: { kind: "head" | "body" | "credit"; at?: number; color?: string; dot?: string; opacity?: number; children: React.ReactNode }) {
  const size = { head: 56, body: 38, credit: 30 }[kind];
  const weight = { head: 650, body: 560, credit: 500 }[kind];
  const tint = color ?? { head: C.text, body: C.secondary, credit: C.muted }[kind];
  return (
    <Animate enter="fade" at={at} style={{ display: "flex", alignItems: "center", gap: 18, opacity }}>
      {dot ? <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: dot, flexShrink: 0 }} /> : null}
      <div style={{ fontFamily: FONT, fontSize: size, fontWeight: weight, lineHeight: 1.12, letterSpacing: kind === "head" ? "-0.02em" : "0", color: tint, marginTop: kind === "credit" ? 6 : 0 }}>{children}</div>
    </Animate>
  );
}

/** Shot 1: the problem, over the whole Moon turning to its south pole. */
function Problem() {
  return (
    <Card left={1060} top={150} width={800}>
      <Line kind="credit" at={6} color={C.muted}>THE LUNAR SOUTH POLE</Line>
      <Line kind="head" at={12} color={C.sun}>The Sun lasts for days.</Line>
      <Line kind="head" at={60} color={C.earth}>Earth disappears for weeks.</Line>
      <Line kind="credit" at={40}>Imagery: NASA LRO LROC · SVS CGI Moon Kit</Line>
    </Card>
  );
}

/** Shot 2: picking a site on the globe. */
function Pick() {
  return (
    <Card left={96} top={720} width={760}>
      <Line kind="head" at={10}>Pick a landing site</Line>
      <Line kind="body" at={70}>Shackleton connecting ridge</Line>
    </Card>
  );
}

/** Shot 3: the hour-by-hour strip, and the scrub landing on a window. */
function Strip() {
  const f = useCurrentFrame();
  const dim = interpolate(f, [WINDOW_AT, WINDOW_AT + 10], [1, 0.45], clamp);
  return (
    <Card left={96} top={150} width={900}>
      <Line kind="credit" at={6} color={C.muted}>HOUR BY HOUR, ALL MONTH</Line>
      <Line kind="head" at={14} dot={C.sun} opacity={dim}>Sun: power</Line>
      <Line kind="head" at={44} dot={C.earth} opacity={dim}>Earth in view: radio link</Line>
      <Line kind="head" at={74} dot={C.window} color={C.window}>Both: a landing window</Line>
      <Line kind="credit" at={110}>Sun and Earth positions: NASA JPL Horizons</Line>
    </Card>
  );
}

/** Shot 4: which Deep Space Network antenna is listening. */
function Dsn() {
  return (
    <Card left={1060} top={130} width={800}>
      <Line kind="head" at={50}>Who is listening on Earth</Line>
      <Line kind="body" at={66}>Goldstone · Canberra · Robledo de Chavela</Line>
      <Line kind="credit" at={84}>NASA Deep Space Network</Line>
    </Card>
  );
}

/** Shot 5: the terrain view, lit by the Sun where it really is. */
function Horizon() {
  return (
    <Card left={96} top={560} width={980}>
      <Line kind="head" at={10}>The real horizon, lit by the real Sun</Line>
      <Line kind="credit" at={34}>Terrain: NASA LRO LOLA and LROC NAC elevation</Line>
    </Card>
  );
}

/** Shot 6: the end card. */
function EndCard() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, justifyContent: "center", alignItems: "center", opacity: interpolate(f, [0, FADE], [0, 1], clamp) }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: 1500 }}>
        <Animate enter="rise" at={4} style={{ fontFamily: FONT, fontSize: 132, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, color: C.text }}>Ventana Lunar</Animate>
        <Animate enter="fade" at={12} style={{ fontFamily: FONT, fontSize: 56, fontWeight: 560, color: C.window }}>nasa.universelle.io</Animate>
        <Animate enter="fade" at={20} style={{ marginTop: 26, fontFamily: FONT, fontSize: 40, fontWeight: 520, color: C.secondary }}>NASA Space Apps Challenge 2026 · Madrid</Animate>
        <Animate enter="fade" at={20} style={{ fontFamily: FONT, fontSize: 40, fontWeight: 520, color: C.secondary }}>{`Team ${TEAM}`}</Animate>
        <Animate enter="fade" at={16} style={{ marginTop: 26, fontFamily: FONT, fontSize: 30, fontWeight: 500, color: C.muted }}>NASA open data · not endorsed by NASA</Animate>
      </div>
    </AbsoluteFill>
  );
}

const WORDS: Record<string, () => React.ReactNode> = { problem: Problem, pick: Pick, strip: Strip, dsn: Dsn, horizon: Horizon };

// ---- the piece -----------------------------------------------------------------------------------------------------

export default function Demo() {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {SHOTS.map((s) => {
        const Words = WORDS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Footage shot={s} />
            <Words />
          </Sequence>
        );
      })}
      <Sequence from={END.from} durationInFrames={END.frames} name="end">
        <EndCard />
      </Sequence>
      <Mix lufs={-14} ceiling={-1.5} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="ventana-lunar-demo" component={Demo} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL} />);
