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
 * The press and the keys that lift the pin standing on the Moon (VENT-10,
 * VENT-37): a press starts a pointer carry from its centre (the point),
 * Enter or Space a keyboard one.
 */
import type { KeyboardEvent, PointerEvent } from 'react';
import type { PinKit } from '../../pin/kit';
import { carryFromPointer } from '../../pin/pointer-carry';
import type { ClientPoint } from '../../pin/surfaces';
import { noContextMenu } from './no-context-menu';

/** Whether `event` is Enter or Space; its default is then prevented. */
export function isActivation(event: KeyboardEvent): boolean {
  if (event.key !== 'Enter' && event.key !== ' ') return false;
  event.preventDefault();
  return true;
}

/** The centre of `el`'s box: where the pin's point is. */
function centreOf(el: Element): ClientPoint {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Handlers that lift the pin from the element they are on; `onTap` hears
 * a press that did not travel.
 */
export function liftHandlers(kit: PinKit, onTap: () => void) {
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>): void => {
      const { nativeEvent, currentTarget } = event;
      const options = { at: centreOf(currentTarget), onTap };
      carryFromPointer(nativeEvent, currentTarget, kit.carrier, options);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>): void => {
      if (isActivation(event)) kit.keys(centreOf(event.currentTarget));
    },
    onContextMenu: noContextMenu,
  };
}
