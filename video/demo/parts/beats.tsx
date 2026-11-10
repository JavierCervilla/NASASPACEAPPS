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
 * The beats both cuts are made of: the words over each 3D shot, the reveal,
 * the three feature beats on the laptop or full bleed, the two devices, the
 * proof and the call to action. Each takes its length in frames; its type
 * lands on beats of the score (15 frames at 120 bpm).
 */
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "raea";
import { END_BACKDROP } from "../scenes/plates";
import desktop from "../media/desktop.json";
import mobile from "../media/mobile.json";
import onfoot from "../media/onfoot.json";
import { Laptop, Phone, Screen, type Take } from "./devices";
import { EndCard } from "./endcard";
import { C, TAGLINE } from "./theme";
import { Block, Body, Credit, Kicker, Phrase } from "./type";

const D = desktop.steps;
const M = mobile.steps;
const F = onfoot.steps;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const BEAT = 15;

/** A device's arrival: up from 40 px and in from a slightly larger scale over 12 frames. */
function useArrival(): React.CSSProperties {
  const f = useCurrentFrame();
  const u = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: (t: number) => 1 - (1 - t) ** 3 });
  return { position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `translateY(${(1 - u) * 40}px) scale(${1.04 - 0.04 * u})`, opacity: u };
}

// ---- words over the 3D -------------------------------------------------------------------------------------------------

/** The hook: the question, over the dive. */
export function HookWords({ second = 52 }: { second?: number }) {
  return (
    <Block left={120} top={640} width={1300} gap={4}>
      <Phrase size={96} chunks={[{ text: "Where on the Moon", at: 2, move: "rise" }]} />
      <Phrase size={96} chunks={[{ text: "can you land —", at: 18, move: "rise" }]} />
      <Phrase size={96} chunks={[{ text: "and", at: second, move: "slam" }, { text: "when?", at: second + 4, move: "slam", color: C.window }]} />
    </Block>
  );
}

/** Artemis: where NASA is going, with its source. */
export function ArtemisWords() {
  return (
    <>
      <Block left={120} top={490} width={860}>
        <Kicker at={2}>NASA ARTEMIS III</Kicker>
        <Phrase size={84} chunks={[{ text: "Astronauts will land", at: 8 }]} />
        <Phrase size={84} chunks={[{ text: "near the lunar", at: 8 + BEAT }, { text: "south pole.", at: 8 + 2 * BEAT, color: C.text }]} />
      </Block>
      <Credit at={40} left={120} top={880}>Source: nasa.gov, 28 Oct 2024</Credit>
    </>
  );
}

/** The Sun that skims the horizon, over the low pass. */
export function SunWords({ kicker }: { kicker?: string }) {
  return (
    <Block left={120} top={kicker ? 700 : 740} width={1500} gap={8}>
      {kicker ? <Kicker at={2}>{kicker}</Kicker> : null}
      <Phrase size={100} chunks={[{ text: "The", at: 4 }, { text: "Sun", at: 4, color: C.sun }, { text: "skims the horizon", at: 4 + BEAT }]} />
      <Phrase size={100} chunks={[{ text: "for days.", at: 4 + 2 * BEAT, move: "slam" }]} />
    </Block>
  );
}

/** The Earth that sets, with the app's own numbers for the ridge. */
export function EarthWords({ credit = true }: { credit?: boolean }) {
  return (
    <>
      <Block left={120} top={140} width={1500}>
        <Phrase size={110} chunks={[{ text: "Earth", at: 4, color: C.earth }, { text: "hides", at: 4 + BEAT }, { text: "for weeks.", at: 4 + 2 * BEAT, move: "slam" }]} />
      </Block>
      {credit ? <Credit at={8} left={120} top={290}>Shackleton ridge, Nov 2026: Sun 100 %, Earth 26 %</Credit> : null}
    </>
  );
}

/** The reveal: the name lands on the big hit, then the rule in the three colours. */
export function RevealWords() {
  return (
    <Block left={0} top={590} width={1920} align="center" gap={18}>
      <Phrase size={160} weight={760} chunks={[{ text: "Ventana Lunar", at: 0, move: "slam" }]} />
      <Body at={10} size={52} color={C.secondary}>{TAGLINE}</Body>
      <Phrase size={64} weight={620} chunks={[
        { text: "Sun", at: 2 * BEAT, color: C.sun, move: "pop" }, { text: "+", at: 3 * BEAT, color: C.secondary, move: "fade" },
        { text: "Earth", at: 3 * BEAT, color: C.earth, move: "pop" }, { text: "=", at: 4 * BEAT, color: C.secondary, move: "fade" },
        { text: "landing window", at: 4 * BEAT, color: C.window, move: "pop" },
      ]} />
    </Block>
  );
}

// ---- the app ---------------------------------------------------------------------------------------------------------

/** Picking a site on the laptop. */
export function PickBeat({ frames }: { frames: number }) {
  const take: Take = { file: "desktop.mp4", from: D.picker - 0.9, frames, focus: { x: 0.45, y: 0.4, z0: 1.0, z1: 1.08 } };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div style={useArrival()}><Laptop left={600} top={160} width={1240} take={take} /></div>
      <Block left={96} top={330} width={460}>
        <Phrase size={104} chunks={[{ text: "Pick", at: 4 }, { text: "any site.", at: 4 + BEAT, move: "slam" }]} />
        <Body at={4 + 2 * BEAT}>29 curated sites, or drop a pin anywhere</Body>
      </Block>
    </AbsoluteFill>
  );
}

/** Find the window: the strip, pushed in, as the slider lands on Sun and Earth. */
export function WindowBeat({ frames, from = D.scrub - 0.1 }: { frames: number; from?: number }) {
  const take: Take = { file: "desktop.mp4", from, frames, focus: { x: 0.5, y: 0.86, z0: 1.05, z1: 1.5 } };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div style={useArrival()}><Laptop left={520} top={140} width={1330} take={take} /></div>
      <Block left={96} top={250} width={420} gap={8}>
        <Kicker at={2}>FIND THE WINDOW</Kicker>
        <Phrase size={104} chunks={[{ text: "Sun", at: BEAT, color: C.sun, move: "slam" }]} />
        <Phrase size={104} chunks={[{ text: "+ Earth", at: 2 * BEAT, color: C.earth, move: "slam" }]} />
        <Phrase size={104} chunks={[{ text: "= landing", at: 3 * BEAT, color: C.window, move: "slam" }]} />
        <Phrase size={104} chunks={[{ text: "window", at: 3 * BEAT, color: C.window, move: "slam" }]} />
      </Block>
      <Credit at={2 * BEAT}>Sun and Earth positions: NASA JPL Horizons</Credit>
    </AbsoluteFill>
  );
}

/** Who is listening: the DSN view, pushed in on Robledo de Chavela. */
export function DsnBeat({ frames, from = D.dsnClick }: { frames: number; from?: number }) {
  const take: Take = { file: "desktop.mp4", from, frames, focus: { x: 0.36, y: 0.42, z0: 1.12, z1: 1.32 } };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div style={useArrival()}><Laptop left={520} top={140} width={1330} take={take} /></div>
      <Block left={96} top={300} width={420}>
        <Phrase size={96} chunks={[{ text: "See who's", at: 4 }, { text: "listening.", at: 4 + BEAT, move: "slam" }]} />
        <Body at={4 + 3 * BEAT} color={C.text}>Robledo de Chavela, Madrid</Body>
        <Body at={4 + 4 * BEAT} size={32} color={C.muted}>or Goldstone, or Canberra</Body>
      </Block>
      <Credit at={2 * BEAT}>NASA Deep Space Network</Credit>
    </AbsoluteFill>
  );
}

/** Stand on the real terrain: the on-foot view full bleed, in daylight. */
export function TerrainBeat({ frames, from = F.turn }: { frames: number; from?: number }) {
  const take: Take = { file: "onfoot.mp4", from, frames, focus: { x: 0.315, y: 0.362, z0: 1.8, z1: 1.95 } };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <Screen take={take} />
      <Block left={96} top={124} width={1300} gap={10}>
        <Phrase size={104} chunks={[{ text: "Stand on", at: 4 }, { text: "the real terrain.", at: 4 + BEAT, move: "slam" }]} />
        <Body at={4 + 2 * BEAT}>Mons Mouton, 22 Nov 2026, 20:00 UTC</Body>
      </Block>
      <Credit at={2 * BEAT} top={880}>Terrain: NASA LRO LOLA and LROC NAC elevation</Credit>
    </AbsoluteFill>
  );
}

/** On any device: the laptop and the phone, the phone driven by a finger. */
export function DevicesBeat({ frames, phoneFrom = M.site - 0.4, laptopFrom = F.back }: { frames: number; phoneFrom?: number; laptopFrom?: number }) {
  const phone: Take = { file: "mobile.mp4", from: phoneFrom, frames };
  const laptop: Take = { file: "onfoot.mp4", from: laptopFrom, frames };
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div style={useArrival()}>
        <Laptop left={80} top={290} width={1060} take={laptop} />
        <Phone left={1300} top={120} height={880} take={phone} />
      </div>
      <Block left={80} top={124} width={1100}>
        <Phrase size={96} chunks={[{ text: "On any", at: 4 }, { text: "device.", at: 4 + BEAT, move: "slam" }]} />
      </Block>
    </AbsoluteFill>
  );
}

const SOURCES = ["NASA/JPL Horizons", "LRO LOLA", "LRO LROC", "SVS CGI Moon Kit", "Deep Space Network"];

/** The proof: the NASA open data the app is built on, and its accuracy against Horizons. */
export function ProofWords({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Block left={120} top={330} width={1680} gap={22}>
        <Phrase size={96} chunks={[{ text: "Built on", at: 2 }, { text: "NASA open data.", at: 2, move: "slam" }]} />
        <Body at={0} size={44} color={C.text}>JPL Horizons, LRO, SVS CGI Moon Kit, DSN</Body>
      </Block>
    );
  }
  return (
    <>
      <Block left={120} top={200} width={820} gap={14}>
        <Kicker at={2}>BUILT ON NASA OPEN DATA</Kicker>
        {SOURCES.map((s, i) => <Phrase key={s} size={66} weight={640} chunks={[{ text: s, at: BEAT * (i + 1), move: "slide" }]} />)}
      </Block>
      <Block left={1060} top={330} width={760} gap={10}>
        <Phrase size={190} weight={760} chunks={[{ text: "0.04°", at: 6 * BEAT + 5, color: C.sun, move: "slam" }]} />
        <Body at={6 * BEAT} color={C.text}>Its own sky matches JPL Horizons:</Body>
        <Body at={6 * BEAT} size={34} color={C.muted}>Sun elevation, every hour of Nov and Dec 2026</Body>
      </Block>
    </>
  );
}

/** The end card over its backdrop: the Moon, sharp, pushing in slowly, darkened only behind the type. */
export function CtaBeat({ frames, compact = false }: { frames: number; compact?: boolean }) {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, frames], [1, 1.04], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, overflow: "hidden" }}>
        <Img src={staticFile(END_BACKDROP)} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, objectFit: "cover", transformOrigin: "50% 62%", transform: `scale(${z})` }} />
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, backgroundImage: "radial-gradient(ellipse 980px 520px at 640px 330px, rgba(7, 8, 11, 0.72) 0%, rgba(7, 8, 11, 0.45) 55%, rgba(7, 8, 11, 0) 100%)" }} />
      <EndCard at={2} compact={compact} />
    </AbsoluteFill>
  );
}
