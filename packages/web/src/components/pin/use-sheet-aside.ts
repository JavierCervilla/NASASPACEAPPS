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
 * The phone sheet steps aside while the pin is carried (VENT-10): down to
 * its resting detent (peek), unless it was closed, so the whole Moon is
 * there to drop on. Not for a pin lifted by a held finger (VENT-37): the
 * finger already chose its point, and a sheet moving away would re-frame
 * the globe under it. Dropped, the sheet opens at half on the custom
 * point's answer; sprung back, it returns where it was.
 */
import { useEffect, useRef, type RefObject } from 'react';
import type { PinKit } from '../../pin/kit';
import type { DetentName } from '../../sheet/sheet-physics';
import { usePin, useWatched } from './context';

type SetDetent = (detent: DetentName) => void;

/** When a carry ends: half on a drop, else where the sheet was. */
function useCarryEnd(
  kit: PinKit | null,
  before: RefObject<DetentName | null>,
  set: RefObject<SetDetent>,
): void {
  useEffect(() => {
    if (!kit) return undefined;
    return kit.carrier.ended.subscribe(() => {
      const end = kit.carrier.ended.get();
      const was = before.current;
      before.current = null;
      if (end?.kind === 'dropped') set.current('half');
      else if (was) set.current(was);
    });
  }, [kit, before, set]);
}

export function useSheetAside(detent: DetentName, setDetent: SetDetent) {
  const kit = usePin();
  const view = useWatched(kit?.carrier.view ?? null, null);
  const carried = view !== null && view.mode !== 'hold';
  const before = useRef<DetentName | null>(null);
  const set = useRef(setDetent);
  useEffect(() => {
    set.current = setDetent;
  });
  useEffect(() => {
    if (!carried || before.current !== null) return;
    before.current = detent;
    if (detent !== 'closed') set.current('peek');
  }, [carried, detent]);
  useCarryEnd(kit, before, set);
}
