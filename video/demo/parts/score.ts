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
 * The score of the demo videos, synthesized with raea's Tone.js layer and
 * its built-in synths only: no samples, no sound library, no generated
 * audio. 120 bpm in 4/4 (a bar is 2 s, 60 frames at 30 fps), so cuts and
 * type hits land on the grid. One call builds the whole graph at the top
 * level of a composition, from that cut's arrangement:
 *
 *   a low drone and sub from the first frame, a pulse that opens up, impacts
 *   on the key cuts, a noise riser into the reveal, then the groove (pad
 *   chords, pulse, a soft kick) until the outro chord rings out on the end
 *   card, faded to silence before the last frame.
 */
import * as Tone from "raea/tone";

export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = 4 * BEAT;
/** Seconds to the composition's frames (30 fps). */
export const frames = (s: number) => Math.round(s * 30);

export interface Arrangement {
  /** impacts on cuts, seconds */
  hits: number[];
  /** the riser's start and the reveal's big hit, seconds */
  riser: [number, number];
  /** when the pulse starts, and when the groove (kick, pad) runs */
  pulseFrom: number;
  groove: [number, number];
  /** a lighter stretch inside the groove (the proof): no kick */
  breath?: [number, number];
  /** the outro chord's start, and the piece's last second */
  outro: number;
  end: number;
}

const CHORDS = [
  ["D3", "A3", "E4", "F4"],
  ["A#2", "F3", "D4", "A4"],
  ["F2", "C3", "A3", "E4"],
  ["C3", "G3", "E4", "G4"],
];
const ROOTS = ["D2", "A#1", "F1", "C2"];

/** Builds every instrument and schedules every note for `a`. */
export function buildScore(a: Arrangement): void {
  Tone.getTransport().bpm.value = BPM;
  const room = new Tone.Reverb({ decay: 5.5, preDelay: 0.02, wet: 0.35 }).connect(Tone.buses.music);
  const air = new Tone.Filter({ frequency: 5200, type: "lowpass", rolloff: -24 }).connect(room);

  // the drone: two detuned saws through a dark filter, and a sine sub under them
  const darkness = new Tone.Filter({ frequency: 260, type: "lowpass", rolloff: -24 }).connect(air);
  darkness.frequency.rampTo(900, a.riser[1] - 1, 1);
  const drone = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth" }, envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 2.5 }, volume: -17 }).connect(darkness);
  const sub = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.6, sustain: 1, release: 2 }, volume: -11 }).connect(Tone.buses.music);
  drone.triggerAttackRelease(["D2", "A2", "D3"], a.riser[1] - 0.2, 0);
  sub.triggerAttackRelease("D1", a.riser[1] - 0.2, 0);

  // the pulse: eighth notes whose filter opens toward the reveal, an echo on the dotted eighth
  const echo = new Tone.FeedbackDelay({ delayTime: BEAT * 0.75, feedback: 0.28, wet: 0.22 }).connect(air);
  const pulseTone = new Tone.Filter({ frequency: 380, type: "lowpass", rolloff: -12, Q: 2 }).connect(echo);
  pulseTone.frequency.rampTo(2400, a.riser[1] - a.pulseFrom, a.pulseFrom);
  const pulse = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.08 }, volume: -20 }).connect(pulseTone);
  const pulses: [number, string][] = [];
  for (let t = a.pulseFrom; t < a.outro - 0.01; t += BEAT / 2) {
    if (a.breath && t >= a.breath[0] && t < a.breath[1] && Math.round(t / (BEAT / 2)) % 2 === 1) continue;
    const bar = Math.floor(Math.max(0, t - a.riser[1]) / (2 * BAR)) % 4;
    const root = t < a.riser[1] ? "D3" : ROOTS[bar].replace(/\d/, (d) => String(Number(d) + 1));
    pulses.push([t, Math.round(t / (BEAT / 2)) % 4 === 3 ? root.replace(/\d/, (d) => String(Number(d) + 1)) : root]);
  }
  new Tone.Part((t, n: string) => pulse.triggerAttackRelease(n, 0.1, t), pulses).start(0);

  // impacts: a pitched-down drum and a burst of filtered noise
  const boomRoom = new Tone.Reverb({ decay: 3.5, wet: 0.4 }).connect(Tone.buses.music);
  const boom = new Tone.MembraneSynth({ pitchDecay: 0.18, octaves: 4, envelope: { attack: 0.001, decay: 1.1, sustain: 0, release: 0.8 }, volume: -6 }).connect(boomRoom);
  const crackTone = new Tone.Filter({ frequency: 1400, type: "lowpass", rolloff: -12 }).connect(boomRoom);
  const crack = new Tone.NoiseSynth({ noise: { type: "brown" }, envelope: { attack: 0.002, decay: 0.9, sustain: 0, release: 0.4 }, volume: -12 }).connect(crackTone);
  new Tone.Part((t) => { boom.triggerAttackRelease("D1", 0.6, t); crack.triggerAttackRelease(0.5, t); }, a.hits.map((h) => [h, 0] as [number, number])).start(0);

  // the riser: noise swelling through an opening band-pass, and an arpeggio that speeds up
  const sweep = new Tone.Filter({ frequency: 300, type: "bandpass", Q: 1.2 }).connect(room);
  sweep.frequency.rampTo(7000, a.riser[1] - a.riser[0], a.riser[0]);
  const hiss = new Tone.NoiseSynth({ noise: { type: "pink" }, envelope: { attack: a.riser[1] - a.riser[0], decay: 0.01, sustain: 1, release: 0.05 }, volume: -14 }).connect(sweep);
  hiss.triggerAttackRelease(a.riser[1] - a.riser[0] - 0.02, a.riser[0]);
  const arp = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.004, decay: 0.15, sustain: 0, release: 0.1 }, volume: -22 }).connect(echo);
  const arpNotes = ["D4", "F4", "A4", "D5"];
  const arpTimes: [number, string][] = [];
  for (let t = a.riser[0], step = BEAT / 2, i = 0; t < a.riser[1] - 0.05; t += step, step = Math.max(BEAT / 6, step * 0.9), i += 1) arpTimes.push([t, arpNotes[i % 4]]);
  new Tone.Part((t, n: string) => arp.triggerAttackRelease(n, 0.08, t), arpTimes).start(0);

  // the reveal: the biggest impact with the first chord; then the groove
  const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsine" }, envelope: { attack: 0.35, decay: 0.4, sustain: 0.75, release: 2.4 }, volume: -15 }).connect(air);
  const bass = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.02, sustain: 0.9, release: 1 }, volume: -10 }).connect(Tone.buses.music);
  const chords: [number, number][] = [];
  for (let t = a.riser[1], i = 0; t < a.outro - 0.01; t += 2 * BAR, i += 1) chords.push([t, i % 4]);
  new Tone.Part((t, i: number) => {
    const hold = Math.min(2 * BAR, a.outro - t) - 0.1;
    pad.triggerAttackRelease(CHORDS[i], hold, t);
    bass.triggerAttackRelease(ROOTS[i], hold, t);
  }, chords).start(0);
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 6, envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.2 }, volume: -12 }).connect(Tone.buses.music);
  const kicks: [number, number][] = [];
  for (let t = a.groove[0]; t < a.groove[1] - 0.01; t += BEAT) if (!(a.breath && t >= a.breath[0] && t < a.breath[1])) kicks.push([t, 0]);
  new Tone.Part((t) => kick.triggerAttackRelease("D1", 0.2, t), kicks).start(0);
  boom.triggerAttackRelease("D1", 0.8, a.riser[1]);
  crack.triggerAttackRelease(0.8, a.riser[1]);

  // the outro: one chord and two bell notes, rung out and faded before the end
  const bell = new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 2.2, sustain: 0, release: 1.5 }, volume: -16 }).connect(room);
  const ring = a.end - a.outro - 1.4;
  pad.triggerAttackRelease(["D3", "A3", "D4", "F#4"], ring, a.outro);
  bass.triggerAttackRelease("D2", ring, a.outro);
  bell.triggerAttackRelease("A5", 0.3, a.outro + BEAT);
  bell.triggerAttackRelease("D6", 0.3, a.outro + 3 * BEAT);
  boom.triggerAttackRelease("D1", 0.8, a.outro);
  Tone.buses.music.volume.value = -9;
  Tone.buses.music.volume.rampTo(-70, 1.6, a.end - 1.9);
  Tone.getTransport().start();
}
