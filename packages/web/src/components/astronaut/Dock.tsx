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
 * The astronaut's dock at the end of the desktop Layers key (VENT-10,
 * validated canvas «Astro A»): a well with the figure, «Drag me anywhere»
 * and what to do. While it is carried the well stands empty, «Drop it on
 * any point»; once it is on the Moon, «On the Moon», and a tap brings it
 * home.
 */
import type { TextKey } from '../../i18n/catalogue';
import { useI18n } from '../i18n-context';
import { Figure } from './Figure';
import { useDock, type DockStatus } from './use-dock';

const WORDS: Readonly<Record<DockStatus, [TextKey, TextKey]>> = {
  home: ['astro.dock.home.title', 'astro.dock.home.hint'],
  carry: ['astro.dock.carry.title', 'astro.dock.carry.hint'],
  away: ['astro.dock.away.title', 'astro.dock.away.hint'],
};

export function Dock() {
  const { t } = useI18n();
  const { status, label, ...handlers } = useDock();
  const [title, hint] = WORDS[status];
  return (
    <div className="astro-dock" data-status={status}>
      <button type="button" className="astro-dock__well" aria-label={label} {...handlers}>
        <span className="astro-dock__spot">
          {status === 'home' ? <Figure pose="stand" visor="idle" /> : null}
        </span>
      </button>
      <p className="astro-dock__words" aria-hidden="true">
        <span className="astro-dock__title">{t(title)}</span>
        <span className="astro-dock__hint">{t(hint)}</span>
      </p>
    </div>
  );
}
