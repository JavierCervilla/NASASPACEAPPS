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
 * What guards the on-foot scene's GPU (VENT-49): a lost context is noted in
 * the crash report with the event's own words, and the dead canvas and the
 * labels leave the page, and the loop stops, before the panel is told, so
 * neither a frozen frame nor the browser's broken-WebGL icon shows under the
 * message.
 */
import { describe, expect, it } from 'vitest';
import { guardLost, lostWords } from '../src/terrain/scene/scene-guard';

describe('lostWords', () => {
  it('quotes the status message the browser gave', () => {
    expect(lostWords('GPU process crashed')).toBe('context lost, statusMessage: "GPU process crashed"');
  });

  it('says so when the browser gave none', () => {
    expect(lostWords('')).toBe('context lost, no statusMessage');
    expect(lostWords(undefined)).toBe('context lost, no statusMessage');
  });
});

/** A canvas, labels and a loop that log what happens to them, in order. */
function scene() {
  const log: string[] = [];
  const canvas = Object.assign(new EventTarget(), { remove: () => void log.push('canvas removed') });
  const labels = { root: { remove: () => void log.push('labels removed') } };
  const loop = { stop: () => void log.push('loop stopped') };
  const report = { step: (text: string) => void log.push(`step: ${text}`) };
  const onLost = () => void log.push('panel told');
  return { log, canvas, parts: { canvas, labels, loop, report, onLost } };
}

/** The event a browser sends when it takes the context. */
const lostEvent = (statusMessage: string): Event => Object.assign(new Event('webglcontextlost'), { statusMessage });

describe('guardLost', () => {
  it('notes the loss, stops the loop and takes the canvas and labels out before it tells the panel', () => {
    const { log, canvas, parts } = scene();
    guardLost(parts as never);
    canvas.dispatchEvent(lostEvent('GPU process crashed'));
    expect(log).toEqual([
      'step: context lost, statusMessage: "GPU process crashed"',
      'loop stopped',
      'labels removed',
      'canvas removed',
      'panel told',
    ]);
  });

  it('stops listening when it is unbound', () => {
    const { log, canvas, parts } = scene();
    const unwatch = guardLost(parts as never);
    unwatch();
    canvas.dispatchEvent(lostEvent(''));
    expect(log).toEqual([]);
  });
});
