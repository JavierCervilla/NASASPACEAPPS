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
 * «New version ready» (VENT-52): a glass row in the offline notice's slot,
 * under whichever top bar shows, when a new build's service worker has
 * taken the page over (pwa/update-watch.ts). «Update» reloads the same
 * address (site, point and view travel in it); the ✕ hides the row until
 * the app opens again. The text is a polite live region, present from
 * the start so the change is announced.
 */
import { useEffect, useRef, useState } from 'react';
import { prefersSaveData } from '../lib/viewport';
import { showsUpdate, watchForUpdate } from '../pwa/update-watch';
import { useI18n } from './i18n-context';
import { useOnline } from './use-online';
import { useUnderBars } from './use-under-bars';

export interface UpdateRowProps {
  readonly shown: boolean;
  readonly onUpdate: () => void;
  readonly onDismiss: () => void;
}

/** «Update» and the ✕, both 44 px targets. */
function UpdateButtons({ onUpdate, onDismiss }: Omit<UpdateRowProps, 'shown'>) {
  const { t } = useI18n();
  return (
    <>
      <button type="button" className="update-notice__update" onClick={onUpdate}>
        {t('update.action')}
      </button>
      <button
        type="button"
        className="update-notice__dismiss"
        aria-label={t('update.dismiss')}
        onClick={onDismiss}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2 2l8 8M10 2l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}

/** The row: empty while hidden, its live region kept in place. */
export function UpdateRow({ shown, ...buttons }: UpdateRowProps) {
  const { t } = useI18n();
  const row = useRef<HTMLDivElement>(null);
  useUnderBars(row, shown);
  return (
    <div ref={row} className="update-notice" data-shown={shown || undefined}>
      <p className="update-notice__text" role="status">
        {shown ? t('update.ready') : null}
      </p>
      {shown ? <UpdateButtons {...buttons} /> : null}
    </div>
  );
}

/** True once a new version controls the page. */
function useUpdateReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(
    () =>
      watchForUpdate({
        container: navigator.serviceWorker,
        saveData: prefersSaveData(),
        doc: document,
        onReady: () => setReady(true),
      }),
    [],
  );
  return ready;
}

export function UpdateNotice() {
  const ready = useUpdateReady();
  const online = useOnline();
  const [dismissed, setDismissed] = useState(false);
  return (
    <UpdateRow
      shown={showsUpdate({ ready, dismissed, online })}
      onUpdate={() => location.reload()}
      onDismiss={() => setDismissed(true)}
    />
  );
}
