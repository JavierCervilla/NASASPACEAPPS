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
 * The far relief after the hand-over (VENT-60): a discreet chip by the
 * caption, «Far relief · 8 of 18 tiles» while the 32 and 128 km tiles keep
 * landing, then «Far relief · 32 and 128 km in», and gone. Not a live
 * region: the view already stands, this only says it is still sharpening.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { farWords } from '../../../terrain/loader/loader-words';
import { farTally } from '../../../terrain/loader/loader-phase';
import type { ProgressStore } from '../../../terrain/ring/progress-store';
import type { RingProgress } from '../../../terrain/ring/ring-progress';
import { useI18n } from '../../i18n-context';

/** How long «… km in» stays before it goes, ms (its fade included). */
export const FAR_LINGER_MS = 1000;

interface Props {
  readonly progress: ProgressStore;
  /** The scene has drawn: the hand-over is done. */
  readonly drawn: boolean;
}

/** Whether every far tile is in, and whether it has been for a while. */
function useFarDone(store: ProgressStore) {
  const progress = useSyncExternalStore(store.subscribe, store.get, store.get);
  const far = farTally(progress);
  const done = far !== null && far.done === far.total;
  const [goneAt, setGoneAt] = useState<RingProgress | null>(null);
  useEffect(() => {
    if (!done) return undefined;
    const timer = window.setTimeout(() => setGoneAt(progress), FAR_LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [done, progress]);
  return { progress, done, gone: done && goneAt === progress };
}

export function FarChip({ progress: store, drawn }: Props) {
  const i18n = useI18n();
  const { progress, done, gone } = useFarDone(store);
  const words = farWords(i18n, progress);
  if (!drawn || gone || !words) return null;
  return (
    <div className="on-foot__far-row">
      <p className="on-foot__far" data-done={done}>
        <b>{words.title}</b>
        <span>{` · ${words.detail}`}</span>
      </p>
    </div>
  );
}
