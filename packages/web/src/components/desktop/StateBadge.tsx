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
 * The state's badge on the site card's image: the state's dot and word in
 * its colour. While the state is the simulator's (VENT-36) the dot is
 * hollow and a screen reader hears «computed» after the state.
 */
import type { SiteState } from '../../phone/site-state';
import { useI18n } from '../i18n-context';

interface Props {
  readonly state: SiteState | null;
  readonly computed: boolean;
}

export function StateBadge({ state, computed }: Props) {
  const { t } = useI18n();
  if (!state) return null;
  const spoken = t('state.computed', { state: state.badge });
  return (
    <span className="card-media__badge" data-tone={state.kind} data-computed={computed}>
      <span aria-hidden={computed}>{state.badge}</span>
      {computed ? <span className="visually-hidden">{spoken}</span> : null}
    </span>
  );
}
