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
 * The first-time hint (VENT-37, canvas «Hint»): one line over the Moon
 * that says how to drop a pin, «Click the Moon to drop a pin» with a
 * mouse, «Touch and hold the Moon to drop a pin» by touch (both are
 * rendered and CSS shows one by `(pointer: coarse)`, so the static page
 * and the island agree). Above the view on desktop, under the top bar on
 * phones (measured, as the offline notice is). Gone after the first drop
 * or its ✕, for good (pin/first-hint.ts).
 */
import { useEffect, useRef, type RefObject } from 'react';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { usePin, useWatched } from './context';

/** Room under the phone's top bar, px. */
const GAP_PX = 8;

/** Keeps `el` GAP_PX under the phone's top bar, while there is one. */
function useUnderPhoneBar(el: RefObject<HTMLElement | null>, shown: boolean) {
  useEffect(() => {
    const note = el.current;
    const bar = document.querySelector('.phone-bar');
    if (!shown || !note || !bar) return undefined;
    const place = (): void => {
      const { bottom } = bar.getBoundingClientRect();
      note.style.setProperty('--top', `${bottom + GAP_PX}px`);
    };
    const observer = new ResizeObserver(place);
    observer.observe(bar);
    place();
    return () => observer.disconnect();
  }, [el, shown]);
}

export function PinHint() {
  const kit = usePin();
  const { t } = useI18n();
  const shown = useWatched(kit?.hint.shown ?? null, false);
  const ref = useRef<HTMLDivElement>(null);
  useUnderPhoneBar(ref, shown);
  if (!kit || !shown) return null;
  return (
    <div ref={ref} className="pin-hint">
      <Icon name="pin" />
      <p className="pin-hint__text">
        <span className="pin-hint__fine">{t('pin.hint.click')}</span>
        <span className="pin-hint__coarse">{t('pin.hint.hold')}</span>
      </p>
      <button type="button" className="pin-hint__close" aria-label={t('pin.hint.dismiss')} onClick={kit.hint.dismiss}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
