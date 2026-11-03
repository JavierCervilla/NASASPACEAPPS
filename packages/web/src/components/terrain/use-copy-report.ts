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
 * «Copy report» in the lost state (VENT-49): copies the crash report's text
 * through the page's clipboard and says whether it worked, for a polite live
 * region, until the scene's state changes: a later loss has copied nothing
 * yet (VENT-51). Nothing is sent anywhere.
 */
import { useState } from 'react';
import { copyText } from '../../terrain/report/copy-text';
import type { Recorder } from '../../terrain/report/recorder';
import type { SceneStatus } from './use-terrain-scene';

export type CopyOutcome = 'copied' | 'failed' | null;

/** Copies the report's text; whether anything was copied. */
export const copyReport = (report: Pick<Recorder, 'text'>): Promise<boolean> =>
  copyText(report.text(), { clipboard: navigator.clipboard, document });

/**
 * The press's handler and its outcome, null until pressed and again once
 * `scene` changes (adjusted while rendering, as React advises).
 */
export function useCopyReport(
  copy: () => Promise<boolean>,
  scene: SceneStatus,
) {
  const [outcome, setOutcome] = useState<CopyOutcome>(null);
  const [outcomeScene, setOutcomeScene] = useState(scene);
  if (outcomeScene !== scene) {
    setOutcomeScene(scene);
    setOutcome(null);
  }
  const press = (): void => {
    void copy().then((ok) => setOutcome(ok ? 'copied' : 'failed'));
  };
  return { outcome, press };
}
