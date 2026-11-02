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
 * region. Nothing is sent anywhere.
 */
import { useState } from 'react';
import { copyText } from '../../terrain/report/copy-text';
import type { Recorder } from '../../terrain/report/recorder';

export type CopyOutcome = 'copied' | 'failed' | null;

/** Copies the report's text; whether anything was copied. */
export const copyReport = (report: Pick<Recorder, 'text'>): Promise<boolean> =>
  copyText(report.text(), { clipboard: navigator.clipboard, document });

/** The press's handler and its outcome, null until pressed. */
export function useCopyReport(copy: () => Promise<boolean>) {
  const [outcome, setOutcome] = useState<CopyOutcome>(null);
  const press = (): void => {
    void copy().then((ok) => setOutcome(ok ? 'copied' : 'failed'));
  };
  return { outcome, press };
}
