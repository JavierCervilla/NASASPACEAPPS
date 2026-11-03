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
 * The globe's compass (VENT-50, validated canvas «A + full graticule,
 * discreet»): a round glass button over the globe. The globe keeps north up,
 * so the north needle is fixed and the small Earth mark rides the ring in
 * the direction the Earth lies from the Moon's centre on the screen,
 * hollow while the Earth is behind the Moon. Pressing it turns the globe
 * back to its opening view for the selected site. It stands only while the
 * globe runs; its name says where the Earth is and what the press does.
 */
import { useRef } from 'react';
import type { TimeStore } from '../../calendar/time-store';
import type { GlobeCompass } from '../../globe/compass-link';
import { useI18n } from '../i18n-context';
import { compassName } from './compass-name';
import { useCompassTop } from './use-compass-top';
import { useEarthMark } from './use-earth-mark';

interface Props {
  /** The mounted globe's compass; null while there is no globe. */
  readonly compass: GlobeCompass | null;
  /** The selected instant: the Earth's place follows it. */
  readonly time: TimeStore;
}

export function CompassButton({ compass, time }: Props) {
  const i18n = useI18n();
  const button = useRef<HTMLButtonElement>(null);
  const mark = useEarthMark(compass, time, button);
  useCompassTop(button, compass !== null);
  if (!compass) return null;
  // Before the first frame the name is the press alone: no Earth to place.
  const name = mark ? compassName(i18n, mark) : i18n.t('compass.press');
  return (
    <button
      ref={button}
      type="button"
      className="compass"
      aria-label={name}
      onClick={compass.home}
    >
      <span className="compass__needle" aria-hidden="true" />
      <span className="compass__n" aria-hidden="true">
        {i18n.t('compass.n')}
      </span>
      <span className="compass__earth" aria-hidden="true" />
    </button>
  );
}
