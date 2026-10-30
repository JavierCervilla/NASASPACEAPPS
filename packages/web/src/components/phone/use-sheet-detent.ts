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
 * The sheet's detent as React state, starting where the session left it
 * and kept for the session on every change (phone/sheet-memory.ts), and
 * what fills it at full.
 */
import { useState } from 'react';
import type { SheetView } from '../../phone/sheet-actions';
import {
  readSheetDetent,
  saveSheetDetent,
  sessionStore,
} from '../../phone/sheet-memory';
import type { DetentName } from '../../sheet/sheet-physics';

export function useSheetDetent(): [DetentName, (d: DetentName) => void] {
  const [detent, setDetent] = useState(() => readSheetDetent(sessionStore()));
  const choose = (next: DetentName): void => {
    saveSheetDetent(sessionStore(), next);
    setDetent(next);
  };
  return [detent, choose];
}

/**
 * The detent and the view at full. Leaving full, by a drag or a control,
 * goes back to the picker: dragging the sheet up always finds the sites,
 * and the calendar is one tap on Calendar.
 */
export function useSheetPanel() {
  const [detent, setDetent] = useSheetDetent();
  const [view, setView] = useState<SheetView>('sites');
  const settle = (next: DetentName): void => {
    if (next !== 'full') setView('sites');
    setDetent(next);
  };
  return { detent, view, setDetent: settle, setView };
}
