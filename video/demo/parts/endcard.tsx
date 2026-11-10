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
 * The call to action: the address big, a QR code to it (drawn from
 * parts/qr.ts, checked to decode), the event, the team and the disclaimer.
 */
import { Animate, Img, staticFile } from "raea";
import { qrMatrix } from "./qr";
import { C, FONT, TAGLINE, TEAM, URL_QR, URL_TEXT } from "./theme";

const QR = qrMatrix(URL_QR);
/** The team's wordmark, white, made by capture/logo.mjs from assets/universelle-logo.svg. */
const LOGO = staticFile("universelle-logo.png");

/** The QR code, `size` px square with a light quiet zone, as one row of runs per line. */
function Qr({ size }: { size: number }) {
  const quiet = 3;
  const n = QR.length + 2 * quiet;
  const cell = size / n;
  return (
    <div style={{ position: "relative", width: size, height: size, backgroundColor: "#f2f2f4", borderRadius: 18 }}>
      {QR.flatMap((row, r) => {
        const runs: React.ReactNode[] = [];
        let c = 0;
        while (c < row.length) {
          if (!row[c]) { c += 1; continue; }
          const s = c;
          while (c < row.length && row[c]) c += 1;
          runs.push(<div key={`${r}-${s}`} style={{ position: "absolute", left: (s + quiet) * cell, top: (r + quiet) * cell, width: (c - s) * cell + 0.6, height: cell + 0.6, backgroundColor: "#07080b" }} />);
        }
        return runs;
      })}
    </div>
  );
}

/** The end card's words and code; `at` is the frame the address lands on. */
export function EndCard({ at = 0, compact = false }: { at?: number; compact?: boolean }) {
  const qr = compact ? 300 : 340;
  const k = compact ? 0 : 1;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 110 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 1000 }}>
        <Animate enter="fade" at={at} style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>Ventana Lunar</Animate>
        <Animate enter="fade" at={at} style={{ marginTop: -10, marginBottom: 6, fontFamily: FONT, fontSize: 36, fontWeight: 520, color: C.secondary }}>{TAGLINE}</Animate>
        <Animate enter="slam" at={at + Math.round(2 * k)} style={{ fontFamily: FONT, fontSize: 108, fontWeight: 760, letterSpacing: "-0.035em", lineHeight: 1, color: C.window, whiteSpace: "nowrap" }}>{URL_TEXT}</Animate>
        <Animate enter="fade" at={at + Math.round(10 * k)} style={{ marginTop: 30, fontFamily: FONT, fontSize: 40, fontWeight: 560, color: C.text }}>NASA Space Apps Challenge 2026 · Madrid</Animate>
        <Animate enter="fade" at={at + Math.round(14 * k)} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 26 }}>
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 560, color: C.secondary }}>{`Team ${TEAM}`}</div>
          <Img src={LOGO} style={{ width: 166, height: 36, opacity: 0.9 }} />
        </Animate>
        <Animate enter="fade" at={at + Math.round(18 * k)} style={{ marginTop: 22, fontFamily: FONT, fontSize: 30, fontWeight: 500, color: C.muted }}>NASA open data · not endorsed by NASA</Animate>
      </div>
      <Animate enter="pop" at={at + Math.round(6 * k)} style={{ display: "flex" }}><Qr size={qr} /></Animate>
    </div>
  );
}
