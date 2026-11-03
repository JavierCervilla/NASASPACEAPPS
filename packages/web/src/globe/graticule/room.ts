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
 * The room the graticule's labels have, as the page draws them (VENT-51):
 * the box of the widest label, which grows with the text size, and the
 * globe's view, which the zoomed-in Moon outgrows. A sizer that no one
 * sees holds every label's words in one grid cell, so its box is the
 * widest of them at the labels' own style; it and the view are watched,
 * so a new text size or a resize measures again, off the frame loop.
 */
import { LABEL_BOX } from './clearance';
import type { LabelRoom } from './place';

export interface RoomWatch {
  /** The room as last measured; the default label box until then. */
  room(): LabelRoom;
  dispose(): void;
}

/** A sizer holding `texts`, at the end of `root`. */
function sizerOf(root: HTMLElement, texts: readonly string[]): HTMLElement {
  const sizer = document.createElement('span');
  sizer.className = 'graticule-sizer';
  for (const text of texts) {
    const line = document.createElement('span');
    line.textContent = text;
    sizer.append(line);
  }
  root.append(sizer);
  return sizer;
}

/**
 * Measures the room of labels reading `texts` inside `root`, and calls
 * `onChange` whenever it changes. A view that is not drawn (0 px) keeps
 * the last measurement.
 */
export function watchRoom(
  root: HTMLElement,
  texts: readonly string[],
  onChange: () => void,
): RoomWatch {
  const sizer = sizerOf(root, texts);
  let room: LabelRoom = { box: LABEL_BOX, view: null };
  const measure = (): void => {
    const { width, height } = sizer.getBoundingClientRect();
    const view = { width: root.clientWidth, height: root.clientHeight };
    if (width === 0 || view.width === 0) return;
    room = { box: { width, height }, view };
    onChange();
  };
  const observer = new ResizeObserver(measure);
  observer.observe(sizer);
  observer.observe(root);
  return {
    room: () => room,
    dispose: () => {
      observer.disconnect();
      sizer.remove();
    },
  };
}
