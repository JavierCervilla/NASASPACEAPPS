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
 * The ring around the selected site's marker (styles/globe.css): placed
 * with the markers and hidden with its marker. It pulses three times when
 * it comes, then rests lit; {@link pulse} swaps its animation for a twin
 * (`data-again`), which starts it over without a new element, so what
 * holds the ring (a test, the frame loop) keeps it.
 */
import type { Projector } from './marker-layer';

type At = ReturnType<Projector>;

export class MarkerRing {
  private readonly el = document.createElement('span');

  constructor(root: HTMLElement) {
    this.el.className = 'globe-ring';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.hidden = true;
    root.append(this.el);
  }

  /** Shows the ring at `at`, or hides it (its marker behind the limb). */
  place(at: At | undefined): void {
    if (this.el.hidden !== !at) this.el.hidden = !at;
    if (at) this.el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
  }

  /** Pulses again: the selection or its state changed. */
  pulse(): void {
    this.el.toggleAttribute('data-again');
  }
}
