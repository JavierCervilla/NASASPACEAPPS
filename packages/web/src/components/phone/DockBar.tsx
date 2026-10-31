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
 * The phone's foot (VENT-10): the floating tab bar and, beside it, the
 * astronaut's dock, in one row that lets the dock wrap above the bar's
 * end when the bar needs the width.
 */
import type { Ref } from 'react';
import { PhoneDock } from '../astronaut/PhoneDock';
import { TabBar, type TabView } from './TabBar';

interface Props {
  /** The tab bar's element, where a drag up opens the closed sheet. */
  readonly tabs: Ref<HTMLElement>;
  readonly current: TabView;
  readonly onGlobe: () => void;
  readonly onCalendar: () => void;
  readonly onSites: () => void;
}

export function DockBar({ tabs, ...bar }: Props) {
  return (
    <div className="phone-dockbar">
      <TabBar ref={tabs} {...bar} />
      <PhoneDock />
    </div>
  );
}
