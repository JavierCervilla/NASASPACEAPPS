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
 * «Offline» over «Showing data from 31 October 2026» (VENT-28; a row
 * since VENT-57, OfflineRow.tsx): shown while the browser is offline,
 * with the day the API last answered (the service worker keeps its
 * answers, pwa/sw-strategies.ts). It sits under whichever top bar shows,
 * measured, so large text never puts it over the site pill, and writes
 * its room in `--update-row-space` as «New version ready» does, so the
 * pin hint and the phone's compass stack under it. Its ✕ hides it until
 * the app goes offline again. Back online it keeps its words through
 * the exit (presence.ts), so it leaves as it came instead of vanishing.
 */
import { useEffect, useRef, useState } from 'react';
import {
  dismissalAfter,
  syncDate,
  syncedAt,
  syncUrl,
} from '../pwa/offline-status';
import { OfflineRow } from './OfflineRow';
import { useRowSpace } from './UpdateNotice';
import { useI18n } from './i18n-context';
import { usePresence } from './presence';
import { useOnline } from './use-online';
import { useUnderBars } from './use-under-bars';

/** When the API last answered, read each time the page goes offline. */
function useSyncedAt(base: string, online: boolean): number | null {
  const [atMs, setAtMs] = useState<number | null>(null);
  useEffect(() => {
    if (online) return undefined;
    let live = true;
    const url = syncUrl(base, location.origin);
    void syncedAt(globalThis.caches, url).then((ms) => {
      if (live) setAtMs(ms);
    });
    return () => {
      live = false;
    };
  }, [base, online]);
  return atMs;
}

/** Whether the row was hidden with its ✕, and how to hide it. */
function useDismissed(online: boolean): readonly [boolean, () => void] {
  const [dismissed, setDismissed] = useState(false);
  const [wasOnline, setWasOnline] = useState(online);
  if (online !== wasOnline) {
    setWasOnline(online);
    setDismissed(dismissalAfter({ dismissed, wasOnline, online }));
  }
  return [dismissed, () => setDismissed(true)];
}

export function OfflineNotice({ base }: { readonly base: string }) {
  const { t, tag } = useI18n();
  const online = useOnline();
  const atMs = useSyncedAt(base, online);
  const [dismissed, dismiss] = useDismissed(online);
  const row = useRef<HTMLDivElement>(null);
  const { mounted, phase } = usePresence(!online && !dismissed);
  useUnderBars(row, mounted);
  useRowSpace(row, mounted);
  const how =
    atMs === null ? null : t('offline.since', { date: syncDate(tag, atMs) });
  return (
    <OfflineRow
      ref={row}
      shown={mounted}
      phase={phase}
      how={how}
      onDismiss={dismiss}
    />
  );
}
