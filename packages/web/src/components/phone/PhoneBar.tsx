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
 * instant with its time left, in the state's colour. The dot is hollow
 * while the state is the simulator's (VENT-36), filled once from Horizons.
 */
import type { Ref } from 'react';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';
import { FitLine } from './FitLine';
import { Icon } from './Icon';
import { usePillRoom } from './use-pill-room';

interface Props {
  readonly site: PhoneSite;
  /** The site's state at the selected instant, once its data has loaded. */
  readonly state: NowState | null;
  /**
   * The state with its time left, or why there is none, longest first
   * (site-state.ts); the pill shows the longest that fits.
   */
  readonly lines: readonly string[];
  /** Whether the state is the simulator's, not Horizons'. */
  readonly computed: boolean;
  readonly onOpenPicker: () => void;
  /** The bar's element, which the full sheet stays under. */
  readonly ref?: Ref<HTMLElement>;
}

/**
 * The pill: the short name, and under it the state. Its name for a
 * screen reader is the site's full name and the state, so co-located
 * sites (IM-2 and the Mons Mouton zone) never read the same.
 */
function SitePill(props: Props) {
  const { site, state, lines, computed, onOpenPicker } = props;
  const { pill } = siteLabels(site);
  const { t } = useI18n();
  const tone = state ?? 'unknown';
  const named = { name: site.name, state: lines[0] ?? '' };
  const label = t(computed ? 'pill.labelComputed' : 'pill.label', named);
  const own = usePillRoom<HTMLButtonElement>(lines.join('\n'));
  return (
    <button
      ref={own}
      type="button"
      className="site-pill"
      aria-label={label}
      onClick={onOpenPicker}
    >
      <span className="signal-dot" data-state={state ?? 'loading'} data-computed={computed} />
      <span className="site-pill__names">
        <span className="site-pill__name">{pill}</span>
        <FitLine className="site-pill__state" tone={tone} lines={lines} />
      </span>
      <Icon name="chevron" />
    </button>
  );
}

/**
 * «Sun + Earth = window», each word in its signal colour. «= window» never
 * breaks inside and «+» stays with «Sun», so a narrow bar wraps it after
 * «Earth», and only very large text also after «+».
 */
function Rule() {
  const { t } = useI18n();
  return (
    <p className="phone-bar__rule">
      <span data-tone="sun">{t('rule.sun')}</span>
      {'\u00a0+ '}
      <span data-tone="earth">{t('rule.earth')}</span>
      {' '}
      <span className="phone-bar__rule-group">
        {'= '}
        <span data-tone="window">{t('rule.window')}</span>
      </span>
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
