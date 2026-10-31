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
 * The phone's glass top bar: the title, the legend's rule in its colours
 * («Sun + Earth = window»), and the site pill that opens the site
 * picker: a status dot, the short name, and the state at the selected
 * instant with its time left, in the state's colour.
 */
import type { Ref } from 'react';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { Icon } from './Icon';

interface Props {
  readonly site: PhoneSite;
  /** The site's state at the selected instant, once its data has loaded. */
  readonly state: NowState | null;
  /** The state with its time left, or why there is none (site-state.ts). */
  readonly line: string;
  readonly onOpenPicker: () => void;
  /** The bar's element, which the full sheet stays under. */
  readonly ref?: Ref<HTMLElement>;
}

/**
 * The pill: the short name, and under it the state. Its name for a
 * screen reader is the site's full name and the state, so co-located
 * sites (IM-2 and the Mons Mouton zone) never read the same.
 */
function SitePill({ site, state, line, onOpenPicker }: Props) {
  const { pill } = siteLabels(site);
  const tone = state ?? 'unknown';
  return (
    <button
      type="button"
      className="site-pill"
      aria-label={`Change site, now ${site.name}: ${line}`}
      onClick={onOpenPicker}
    >
      <span className="signal-dot" data-state={state ?? 'loading'} />
      <span className="site-pill__names">
        <span className="site-pill__name">{pill}</span>
        <span className="site-pill__state" data-tone={tone}>{line}</span>
      </span>
      <Icon name="chevron" />
    </button>
  );
}

/** «Sun + Earth = window», each word in its signal colour. */
function Rule() {
  return (
    <p className="phone-bar__rule">
      <span data-tone="sun">Sun</span> + <span data-tone="earth">Earth</span>
      {' = '}
      <span data-tone="window">window</span>
    </p>
  );
}

export function PhoneBar({ ref, ...props }: Props) {
  return (
    <header ref={ref} className="phone-bar">
      <div className="phone-bar__titles">
        <h1 className="phone-bar__title">Ventana Lunar</h1>
        <Rule />
      </div>
      <SitePill {...props} />
    </header>
  );
}
