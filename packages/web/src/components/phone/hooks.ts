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
 * React hooks of the phone shell: the breakpoint, the shared selection and
 * the selected site's widgets.
 */
import { useRef, useSyncExternalStore, type RefObject } from 'react';
import { isPhoneViewport, PHONE_QUERY } from '../../lib/viewport';
import type { Selection, SiteStore } from '../../phone/site-store';
import { LOADING, widgetsAt } from '../../phone/widgets-loader';
import { useI18n } from '../i18n-context';
import { useSiteHours, type HoursParts } from '../use-site-hours';

const subscribePhone = (onChange: () => void): (() => void) => {
  const media = matchMedia(PHONE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/**
 * The scrim over the globe and the function that sets its opacity (0 to
 * 1) each frame, straight on the element, without a render.
 */
export function useScrim(): [
  RefObject<HTMLDivElement | null>,
  (value: number) => void,
] {
  const scrim = useRef<HTMLDivElement>(null);
  const dim = (value: number): void => {
    if (scrim.current) scrim.current.style.opacity = String(value);
  };
  return [scrim, dim];
}

/** Whether the viewport is phone-sized; false on the server. */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribePhone, isPhoneViewport, () => false);
}

/** The store's selection, re-rendering on every change. */
export function useSelection(store: SiteStore): Selection {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * The widgets of site `id` at the hour of `atMs` (null: not known yet),
 * the month's hours they come from, and whether those are the computed
 * ones. A new hour of the same month is worked out from the hours already
 * loaded: playing time never waits for the API; a retry asks again.
 */
export function useSiteWidgets(
  parts: HoursParts,
  id: string,
  atMs: number | null,
) {
  const month = useSiteHours(parts, id, atMs);
  const { result: hours, retry, computed } = month;
  const i18n = useI18n();
  const result = atMs === null ? LOADING : widgetsAt(hours, atMs, i18n);
  return { result, hours, retry, computed };
}
