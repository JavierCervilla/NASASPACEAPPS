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
 * The globe draws nothing while its section is hidden (VENT-51): on a phone
 * the on-foot and DSN views hide the globe but keep it mounted, and a minute
 * tick of the live clock asked it for a frame into the hidden canvas while
 * the on-foot view had the GPU. A host that reads 0 x 0 is hidden: the stage
 * keeps its size and no frame is drawn; shown again, it is resized and one
 * frame is asked, which draws whatever changed meanwhile.
 */
import { describe, expect, it, vi } from 'vitest';
import { shownFrames } from '../src/globe/shown-frames';

function host(width: number, height: number) {
  const size = { width, height };
  const resize = vi.fn();
  const invalidate = vi.fn();
  return { size, parts: { size: () => size, resize, invalidate }, resize, invalidate };
}

describe('the globe\'s frames while its host is hidden', () => {
  it('draws, and keeps drawing while the frame moves, when the host shows', () => {
    const draw = vi.fn(() => true);
    const frames = shownFrames(draw);
    const shown = host(390, 844);
    frames.fit(shown.parts);
    expect(shown.resize).toHaveBeenCalledWith(390, 844);
    expect(shown.invalidate).toHaveBeenCalledTimes(1);
    expect(frames.frame(0.016)).toBe(true);
    expect(draw).toHaveBeenCalledWith(0.016);
  });

  it('neither resizes the stage nor asks a frame for a 0 x 0 host', () => {
    const frames = shownFrames(vi.fn(() => false));
    const hidden = host(0, 0);
    frames.fit(hidden.parts);
    expect(hidden.resize).not.toHaveBeenCalled();
    expect(hidden.invalidate).not.toHaveBeenCalled();
  });

  it('draws nothing while hidden, and stops the loop', () => {
    const draw = vi.fn(() => true);
    const frames = shownFrames(draw);
    frames.fit(host(0, 0).parts);
    expect(frames.frame(0.016)).toBe(false);
    expect(draw).not.toHaveBeenCalled();
  });

  it('shown again, resizes to the host and asks one frame, which draws', () => {
    const draw = vi.fn(() => false);
    const frames = shownFrames(draw);
    frames.fit(host(390, 844).parts);
    frames.fit(host(0, 0).parts);
    frames.frame(0);
    const back = host(390, 844);
    frames.fit(back.parts);
    expect(back.resize).toHaveBeenCalledWith(390, 844);
    expect(back.invalidate).toHaveBeenCalledTimes(1);
    frames.frame(0);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('counts a host with one side 0 as hidden', () => {
    const frames = shownFrames(vi.fn(() => true));
    const flat = host(390, 0);
    frames.fit(flat.parts);
    expect(flat.resize).not.toHaveBeenCalled();
    expect(frames.frame(0)).toBe(false);
  });

  it('tells once when the host goes from shown to hidden (VENT-86)', () => {
    const hid = vi.fn();
    const frames = shownFrames(vi.fn(() => false), hid);
    frames.fit(host(390, 844).parts);
    expect(hid).not.toHaveBeenCalled();
    frames.fit(host(0, 0).parts);
    frames.fit(host(0, 0).parts);
    expect(hid).toHaveBeenCalledTimes(1);
    frames.fit(host(390, 844).parts);
    frames.fit(host(0, 0).parts);
    expect(hid).toHaveBeenCalledTimes(2);
  });
});
