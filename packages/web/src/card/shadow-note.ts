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
 * The quiet note under a site's name when NASA's illumination maps put
 * its point in shadow (VENT-39): in permanent shadow it is not a landing
 * point and the Sun never reaches it; on a dim crater floor it gets the
 * share of Sun the map gives. And the line that cites where the Sun
 * answer comes from when the map overrides it. Pure.
 */
import { inPermanentShadow, type SiteShadow } from '@ventana/sim';
import { formatPercent } from '../i18n/format';
import type { I18n } from '../i18n/translate';

export interface ShadowNote {
  readonly kind: SiteShadow['kind'];
  readonly title: string;
  readonly body: string;
}

/**
 * The note for `shadow`, or null without one. `short` drops «not a
 * landing point» where the point's precision line already says it (the
 * desktop card).
 */
export function shadowNote(
  i18n: I18n,
  shadow: SiteShadow | undefined,
  short = false,
): ShadowNote | null {
  if (!shadow) return null;
  if (inPermanentShadow(shadow)) {
    const title = i18n.t(short ? 'shadow.psrTitleShort' : 'shadow.psrTitle');
    return { kind: 'psr', title, body: i18n.t('shadow.psrBody') };
  }
  const share = formatPercent(i18n, shadow.avgSun * 100);
  const body = i18n.t('shadow.dimBody', { share });
  return { kind: shadow.kind, title: i18n.t('shadow.dimTitle'), body };
}

/**
 * The caption under the figures: the computed one (null when there is
 * none) and, for a site in permanent shadow, where its Sun comes from, on
 * one line.
 */
export function captionLine(
  i18n: I18n,
  computed: string | null,
  shadow: SiteShadow | undefined,
): string | null {
  const sun = inPermanentShadow(shadow) ? i18n.t('shadow.sunSource') : null;
  const parts = [computed, sun].filter((part) => part !== null);
  return parts.length === 0 ? null : parts.join(' · ');
}
