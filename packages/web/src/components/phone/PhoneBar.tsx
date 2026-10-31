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
import { useI18n } from '../i18n-context';
import { FitLine } from './FitLine';
import { Icon } from './Icon';

interface Props {
  readonly site: PhoneSite;
  /** The site's state at the selected instant, once its data has loaded. */
  readonly state: NowState | null;
  /**
   * The state with its time left, or why there is none, longest first
   * (site-state.ts); the pill shows the longest that fits.
   */
  readonly lines: readonly string[];
  readonly onOpenPicker: () => void;
  /** The bar's element, which the full sheet stays under. */
  readonly ref?: Ref<HTMLElement>;
}

/**
 * The pill: the short name, and under it the state. Its name for a
 * screen reader is the site's full name and the state, so co-located
 * sites (IM-2 and the Mons Mouton zone) never read the same.
 */
function SitePill({ site, state, lines, onOpenPicker }: Props) {
  const { pill } = siteLabels(site);
  const { t } = useI18n();
  const tone = state ?? 'unknown';
  const label = t('pill.label', { name: site.name, state: lines[0] ?? '' });
  return (
    <button
      type="button"
      className="site-pill"
      aria-label={label}
      onClick={onOpenPicker}
    >
      <span className="signal-dot" data-state={state ?? 'loading'} />
      <span className="site-pill__names">
        <span className="site-pill__name">{pill}</span>
        <FitLine className="site-pill__state" tone={tone} lines={lines} />
      </span>
      <Icon name="chevron" />
    </button>
  );
}

/** «Sun + Earth = window», each word in its signal colour. */
function Rule() {
  const { t } = useI18n();
  return (
    <p className="phone-bar__rule">
      <span data-tone="sun">{t('rule.sun')}</span>
      {' + '}
      <span data-tone="earth">{t('rule.earth')}</span>
      {' = '}
      <span data-tone="window">{t('rule.window')}</span>
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
