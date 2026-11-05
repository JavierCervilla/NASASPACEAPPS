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
 * taken the page over (pwa/update-watch.ts). The row (UpdateButtons.tsx)
 * reloads the same address (site, point and view travel in it); the ✕
 * hides it until the app opens again. «New version ready» is also said
 * in a polite live region, present from the start so the change is
 * announced. A view whose chunk is gone (an
 * old page after a deploy, pwa/missing-chunk.ts) brings it back too, even
 * after a ✕: that view cannot open without the reload.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { prefersSaveData } from '../lib/viewport';
import { onMissingChunk } from '../pwa/missing-chunk';
import { showsUpdate, watchForUpdate } from '../pwa/update-watch';
import { UpdateButtons, type UpdateActions } from './UpdateButtons';
import { useI18n } from './i18n-context';
import { usePresence } from './presence';
import { useOnline } from './use-online';
import { useUnderBars } from './use-under-bars';

export interface UpdateRowProps extends UpdateActions {
  readonly shown: boolean;
}

/** Room under the row for what stacks below it (the pin hint), px. */
const STACK_GAP_PX = 8;

/**
 * While the row shows, its height and a gap in `--update-row-space` on
 * the root, so the first-time pin hint stacks under it (pin.css). The
 * «Offline» row, which this one yields to, writes it the same way.
 */
export function useRowSpace(
  row: RefObject<HTMLElement | null>,
  shown: boolean,
) {
  useEffect(() => {
    const el = row.current;
    const root = document.documentElement.style;
    if (!shown || !el) return undefined;
    const place = (): void => {
      const space = el.getBoundingClientRect().height + STACK_GAP_PX;
      root.setProperty('--update-row-space', `${space}px`);
    };
    const observer = new ResizeObserver(place);
    observer.observe(el);
    place();
    return () => {
      observer.disconnect();
      root.removeProperty('--update-row-space');
    };
  }, [row, shown]);
}

/**
 * The row: empty while hidden, its live region kept in place. Hidden, it
 * keeps its buttons and its room through the exit (presence.ts), so it
 * leaves as it came, as «Offline» does, and what stacks under it does
 * not jump up before it has gone.
 */
export function UpdateRow({ shown, ...actions }: UpdateRowProps) {
  const { t } = useI18n();
  const row = useRef<HTMLDivElement>(null);
  const { mounted, phase } = usePresence(shown);
  useUnderBars(row, mounted);
  useRowSpace(row, mounted);
  return (
    <div ref={row} className="update-notice" data-presence={phase}
      data-shown={mounted || undefined}>
      <p className="update-notice__live" role="status">
        {shown ? t('update.ready') : null}
      </p>
      {mounted ? <UpdateButtons {...actions} /> : null}
    </div>
  );
}

/** True once a new version controls the page or a chunk is missing. */
function useUpdateReady(onMissing: () => void): boolean {
  const [ready, setReady] = useState(false);
  useEffect(
    () =>
      onMissingChunk(window, () => {
        setReady(true);
        onMissing();
      }),
    [onMissing],
  );
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
  const [dismissed, setDismissed] = useState(false);
  const ready = useUpdateReady(useCallback(() => setDismissed(false), []));
  const online = useOnline();
  return (
    <UpdateRow
      shown={showsUpdate({ ready, dismissed, online })}
      onUpdate={() => location.reload()}
      onDismiss={() => setDismissed(true)}
    />
  );
}
