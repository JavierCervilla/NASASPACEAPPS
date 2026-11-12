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
 * The walk's first-time hint (VENT-121): «Tap the ground to go there» under
 * `(pointer: coarse)`, «Click the ground to go there» otherwise (both
 * rendered, CSS shows one, as the pin's hint), with a ✕; gone after the
 * first move or the ✕, for good on this device (walk/walk-hint.ts).
 */
import { useEffect, useState } from 'react';
import { keepWalkHintSeen, walkHintSeen }
  from '../../../terrain/walk/walk-hint';
import { useI18n } from '../../i18n-context';

/** The page's storage, or none where reading it throws. */
function storageOf(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Shown until the eye `moved` or the ✕ is pressed. */
export function WalkHint({ moved }: { readonly moved: boolean }) {
  const { t } = useI18n();
  const [seen, setSeen] = useState(() => walkHintSeen(storageOf()));
  if (moved && !seen) setSeen(true);
  useEffect(() => {
    if (seen) keepWalkHintSeen(storageOf());
  }, [seen]);
  if (seen) return null;
  const dismiss = (): void => setSeen(true);
  return (
    <div className="walk-hint">
      <p className="walk-hint__text">
        <span className="pin-hint__fine">{t('walk.hint.click')}</span>
        <span className="pin-hint__coarse">{t('walk.hint.tap')}</span>
      </p>
      <button type="button" className="pin-hint__close" aria-label={t('walk.hint.dismiss')} onClick={dismiss}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
