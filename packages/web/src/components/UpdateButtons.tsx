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
 * The «New version ready» row's two buttons (VENT-52, option D, the
 * human's choice): the whole row is the update, a reload mark with
 * «New version ready» over «Tap to update» or «Click to update» (both
 * rendered, CSS shows one by `(pointer: coarse)` as the pin hint does),
 * and beside it, never inside it, the pin hint's own ✕.
 */
import { useI18n } from './i18n-context';

export interface UpdateActions {
  readonly onUpdate: () => void;
  readonly onDismiss: () => void;
}

/** An arrow round a circle, as the system's «arrow.clockwise». */
function ReloadMark() {
  return (
    <svg className="update-notice__mark" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The pin hint's ✕ beside a notice row's words: this row's and the
 * «Offline» row's (OfflineRow.tsx, VENT-57).
 */
export function DismissButton(props: {
  readonly label: string;
  readonly onDismiss: () => void;
}) {
  return (
    <button type="button" className="pin-hint__close" aria-label={props.label} onClick={props.onDismiss}>
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function UpdateButtons({ onUpdate, onDismiss }: UpdateActions) {
  const { t } = useI18n();
  return (
    <>
      <button type="button" className="update-notice__update" aria-label={t('update.action')} onClick={onUpdate}>
        <ReloadMark />
        <span className="update-notice__lines">
          <span className="update-notice__title">{t('update.ready')}</span>
          <span className="update-notice__how pin-hint__fine">{t('update.click')}</span>
          <span className="update-notice__how pin-hint__coarse">{t('update.tap')}</span>
        </span>
      </button>
      <DismissButton label={t('update.dismiss')} onDismiss={onDismiss} />
    </>
  );
}
