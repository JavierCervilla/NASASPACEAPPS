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
 * «Offline · data from 31 October 2026»: shown while the browser is
 * offline, with the day the API last answered (the service worker keeps
 * its answers, pwa/sw-strategies.ts). A polite live region, present
 * from the start so the change is announced. It sits under whichever top
 * bar shows, measured, so large text never puts it over the site pill.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import { syncDate, syncedAt, syncUrl } from '../pwa/offline-status';
import { useI18n } from './i18n-context';
import { useOnline } from './use-online';

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

/** The top bars: the desktop header and the phone's glass bar. */
const BARS = 'header.bar, .phone-bar';
const GAP_PX = 8;

/** Keeps `note` GAP_PX under the lowest top bar on screen while shown. */
function useUnderBars(
  note: RefObject<HTMLElement | null>,
  shown: boolean,
): void {
  useEffect(() => {
    const el = note.current;
    if (!shown || !el) return undefined;
    const bars = [...document.querySelectorAll(BARS)];
    const place = (): void => {
      const bottoms = bars
        .map((bar) => bar.getBoundingClientRect())
        .filter((box) => box.height > 0)
        .map((box) => box.bottom);
      el.style.setProperty('--top', `${Math.max(0, ...bottoms) + GAP_PX}px`);
    };
    const observer = new ResizeObserver(place);
    for (const bar of bars) observer.observe(bar);
    place();
    return () => observer.disconnect();
  }, [note, shown]);
}

export function OfflineNotice({ base }: { readonly base: string }) {
  const { t, tag } = useI18n();
  const online = useOnline();
  const atMs = useSyncedAt(base, online);
  const note = useRef<HTMLParagraphElement>(null);
  useUnderBars(note, !online);
  const text =
    atMs === null
      ? t('offline.plain')
      : t('offline.notice', { date: syncDate(tag, atMs) });
  return (
    <p ref={note} className="offline-notice" role="status">
      {online ? null : text}
    </p>
  );
}
