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
 * The globe's map steps (map-trace.ts) in the dev tools' breadcrumbs, as
 * «globe: …» lines (VENT-99), so `?debug` on a phone tells why a sharper
 * map never came. Only when the page has the dev tools (dev-tools-loader.ts,
 * already in the globe's chunk through dev-hook.ts): otherwise there is no
 * trace at all, and nothing of the tools is asked for. The tools come after
 * the page has started, so the lines told before are kept and marked then.
 */
import type { DevToolsModule } from '../lib/dev-tools-loader';
import type { CrumbTrail } from '../terrain/report/report-crumbs';
import { mapLine, type MapEvent, type MapTrace } from './map-trace';

/** Lines kept until the tools come: a start's climb to 2K is about twenty. */
const EARLY_KEEP = 30;

/**
 * An event seen among the last few is not marked again, whatever its
 * seconds: a level that fails is asked again after its wait, and each try's
 * lines would push the failure out of the readout's last lines.
 */
const RECENT = 12;

/** A map's size in pixels, from its image, as «4096x2048». */
export function pixelSize(texture: { readonly image?: unknown }): string {
  const image = texture.image as { width?: unknown; height?: unknown } | null;
  const { width, height } = image ?? {};
  const known = typeof width === 'number' && typeof height === 'number';
  return known ? `${width}x${height}` : 'size unknown';
}

/** Marks each event once among the last RECENT, as a «globe: …» line. */
function foldRepeats(
  mark: (line: string) => void,
): (event: MapEvent) => void {
  const recent: string[] = [];
  return (event) => {
    const identity = JSON.stringify(event,
      (key, value: unknown) => (key === 'seconds' ? undefined : value));
    const seen = recent.includes(identity);
    recent.push(identity);
    if (recent.length > RECENT) recent.shift();
    if (!seen) mark(`globe: ${mapLine(event)}`);
  };
}

/** Marks lines in the trail once it comes; keeps the first ones until. */
function untilTrail(trail: Promise<CrumbTrail>): (line: string) => void {
  let mark: ((line: string) => void) | null = null;
  const early: string[] = [];
  void trail.then((crumbs) => {
    mark = (line) => crumbs.mark(line);
    early.splice(0).forEach(mark);
  });
  return (line) => {
    if (mark) mark(line);
    else if (early.length < EARLY_KEEP) early.push(line);
  };
}

/** The globe's map trace for the dev tools; none when the page has none. */
export function mapCrumbs<T extends { readonly image?: unknown }>(
  tools: Promise<DevToolsModule> | null,
  glError?: () => string,
): MapTrace<T> | undefined {
  if (!tools) return undefined;
  const trail = tools.then(async ({ devTools }) => (await devTools()).crumbs);
  const mark = foldRepeats(untilTrail(trail));
  return { mark, size: pixelSize, glError };
}
