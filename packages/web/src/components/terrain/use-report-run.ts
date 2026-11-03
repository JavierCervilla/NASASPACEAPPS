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
 * Starts the crash report's run when the on-foot view opens (VENT-49), so
 * the trail has the ring's tiles coming in, not only the scene's mount: the
 * run is the view's, from its opening to its closing, and a «Try again»
 * after a lost context goes on in the same one.
 */
import { useEffect } from 'react';
import { parseLeaveOut } from '../../terrain/leave-out';
import type { Recorder } from '../../terrain/report/recorder';
import type { ViewTier } from '../../terrain/view-tier';

/** Begins a run of `report` at the view's tier and the parts left out. */
export function useReportRun(report: Recorder, view: ViewTier): void {
  useEffect(() => {
    const leftOut = [...parseLeaveOut(window.location.search)].join();
    report.begin({ tier: view.get().tier, leftOut });
  }, [report, view]);
}
