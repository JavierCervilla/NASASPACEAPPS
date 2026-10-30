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
 * Pointer handlers that move the instant to the hour under the finger, on
 * a track running down the month (the phone's columns). The pointer is
 * captured, so the drag keeps going outside the track (apple-design §2),
 * and the instant follows 1:1 for the whole gesture.
 */
import type { PointerEvent } from 'react';
import { hourAtOffset } from '../../calendar/hour-input';

type TrackEvent = PointerEvent<HTMLElement>;

/** The handlers for a track of `hours` hours; `onHour` gets each hour. */
export function hourDrag(onHour: (hour: number) => void, hours: number) {
  const pick = (event: TrackEvent): void => {
    const box = event.currentTarget.getBoundingClientRect();
    onHour(hourAtOffset(event.clientY - box.top, box.height, hours));
  };
  return {
    onPointerDown: (event: TrackEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      pick(event);
    },
    onPointerMove: (event: TrackEvent) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
    },
  };
}
