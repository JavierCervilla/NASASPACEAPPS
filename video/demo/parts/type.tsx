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
 * Kinetic type for the demo videos: few words a line, big, each chunk landing
 * on its own frame (a beat of the score) with a named move; a small kicker
 * above a headline; the data credit that names a NASA source where its data
 * is on screen.
 */
import { Animate } from "raea";
import { C, FONT } from "./theme";

export interface Chunk {
  text: string;
  /** the frame it lands on, in its Sequence's frames */
  at: number;
  color?: string;
  move?: "rise" | "slam" | "pop" | "fade" | "slide";
}

/** One line of chunks, wrapped as a sentence, each landing on its frame. */
export function Phrase({ chunks, size, weight = 700 }: { chunks: Chunk[]; size: number; weight?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", columnGap: size * 0.26, rowGap: size * 0.04 }}>
      {chunks.map((c, i) => (
        <Animate key={i} enter={c.move ?? "rise"} at={c.at} style={{
          fontFamily: FONT, fontSize: size, fontWeight: weight, lineHeight: 1.02, letterSpacing: "-0.035em",
          color: c.color ?? C.text, whiteSpace: "nowrap",
        }}>{c.text}</Animate>
      ))}
    </div>
  );
}

/** A positioned column of type that leaves on `out` (a fade) when given. */
export function Block({ left, top, width, align = "left", out, gap = 18, children }: {
  left: number; top: number; width: number; align?: "left" | "center"; out?: number; gap?: number; children: React.ReactNode;
}) {
  const box: React.CSSProperties = {
    position: "absolute", left, top, width, display: "flex", flexDirection: "column", gap,
    alignItems: align === "center" ? "center" : "flex-start", textAlign: align,
  };
  return out === undefined ? <div style={box}>{children}</div> : <Animate exit="fade" exitAt={out} style={box}>{children}</Animate>;
}

/** Small capitals above a headline. */
export function Kicker({ at, color = C.muted, children }: { at: number; color?: string; children: React.ReactNode }) {
  return (
    <Animate enter="fade" at={at} style={{ fontFamily: FONT, fontSize: 30, fontWeight: 600, letterSpacing: "0.12em", color, whiteSpace: "nowrap" }}>{children}</Animate>
  );
}

/** A line of body text. */
export function Body({ at, color = C.secondary, size = 40, children }: { at: number; color?: string; size?: number; children: React.ReactNode }) {
  return (
    <Animate enter="fade" at={at} style={{ fontFamily: FONT, fontSize: size, fontWeight: 520, lineHeight: 1.2, color }}>{children}</Animate>
  );
}

/** The data credit: a pill naming the NASA source of what is on screen. */
export function Credit({ at, left = 96, top = 880, children }: { at: number; left?: number; top?: number; children: React.ReactNode }) {
  return (
    <Animate enter="fade" at={at} style={{
      position: "absolute", left, top, boxSizing: "border-box", padding: "12px 22px", borderRadius: 999,
      backgroundColor: "rgba(16, 17, 22, 0.88)", boxShadow: `inset 0 0 0 1px ${C.edge}`,
      fontFamily: FONT, fontSize: 30, fontWeight: 560, color: C.secondary, whiteSpace: "nowrap",
    }}>{children}</Animate>
  );
}
