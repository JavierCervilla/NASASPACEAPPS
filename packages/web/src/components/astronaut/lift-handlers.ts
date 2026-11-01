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
 * The press and the keys that lift the astronaut (VENT-10), shared by its
 * dock and by the figure standing on the Moon: a press starts a pointer
 * carry from the figure's feet, Enter or Space a keyboard one.
 */
import type { KeyboardEvent, PointerEvent } from 'react';
import type { AstronautKit } from '../../astronaut/kit';
import { carryFromPointer } from '../../astronaut/pointer-carry';
import { feetOf } from './feet';
import { noContextMenu } from './no-context-menu';

/** Whether `event` is Enter or Space; its default is then prevented. */
export function isActivation(event: KeyboardEvent): boolean {
  if (event.key !== 'Enter' && event.key !== ' ') return false;
  event.preventDefault();
  return true;
}

/** The feet of the figure inside `el`, or of `el` itself. */
const figureFeet = (el: Element) =>
  feetOf(el.querySelector('.astro-figure') ?? el);

/**
 * Handlers that lift the astronaut from the figure in the element they
 * are on; `onTap` hears a press that did not travel.
 */
export function liftHandlers(kit: AstronautKit, onTap: () => void) {
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>): void => {
      const { nativeEvent, currentTarget } = event;
      const options = { feet: figureFeet(currentTarget), onTap };
      carryFromPointer(nativeEvent, currentTarget, kit.carrier, options);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>): void => {
      if (isActivation(event)) kit.keys(figureFeet(event.currentTarget));
    },
    onContextMenu: noContextMenu,
  };
}
