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
 * «Offline» over «Showing data from 23 November 2026» (VENT-57, V-08,
 * variant B, the human's choice): the «New version ready» row's look
 * (update.css) with a crossed-out cloud in front and the pin hint's ✕
 * beside the words. The words are a polite live region, present and
 * empty while hidden so the change is announced; the mark and the ✕ show
 * only with the row. While leaving (`phase` out) it keeps its words.
 */
import type { Ref } from 'react';
import { DismissButton } from './UpdateButtons';
import { useI18n } from './i18n-context';
import { Icon } from './phone/Icon';
import type { PresencePhase } from './presence';

export interface OfflineRowProps {
  /** Whether the row is in the page, its exit included. */
  readonly shown: boolean;
  readonly phase: PresencePhase;
  /** «Showing data from …», or null when no answer was ever kept. */
  readonly how: string | null;
  readonly onDismiss: () => void;
  readonly ref?: Ref<HTMLDivElement>;
}

export function OfflineRow(props: OfflineRowProps) {
  const { shown, phase, how, onDismiss, ref } = props;
  const { t } = useI18n();
  return (
    <div
      ref={ref}
      className="offline-notice"
      data-presence={phase}
      data-shown={shown || undefined}
    >
      {shown ? <Icon name="cloudOff" className="notice-row__mark" /> : null}
      <p className="notice-row__lines" role="status">
        {shown ? (
          <>
            <span className="notice-row__title">{t('offline.plain')}</span>
            {how ? <span className="notice-row__how">{how}</span> : null}
          </>
        ) : null}
      </p>
      {shown ? (
        <DismissButton label={t('offline.dismiss')} onDismiss={onDismiss} />
      ) : null}
    </div>
  );
}
