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
 * «Drop a pin» (VENT-37): the way to the pin that needs no press on the
 * Moon, at the end of the desktop Layers key and as a row of the phone's
 * Sites sheet. A click drops it at once on the selected site (or mid
 * view), to drag from there; Enter or Space lifts it over the same place
 * for the arrow keys, and Enter drops it (pin/key-carry.ts).
 */
import { useId, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { usePin } from './context';
import { isActivation } from './lift-handlers';

interface Props {
  /** In the desktop Layers key, or a row of the phone's Sites sheet. */
  readonly variant: 'key' | 'row';
}

export function DropPin({ variant }: Props) {
  const kit = usePin();
  const { t } = useI18n();
  const help = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (kit && isActivation(event)) kit.keys();
  };
  const row = variant === 'row';
  return (
    <>
      <button
        type="button"
        className={row ? 'pin-drop pin-drop--row' : 'pin-drop'}
        aria-describedby={help}
        onClick={() => kit?.dropHere()}
        onKeyDown={onKeyDown}
      >
        <Icon name="pin" />
        <span className="pin-drop__label">{t('pin.drop.label')}</span>
      </button>
      <span id={help} className="visually-hidden">{t('pin.drop.help')}</span>
    </>
  );
}
