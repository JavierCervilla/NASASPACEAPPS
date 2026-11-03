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
 * The on-foot view's report steps in the dev tools' breadcrumbs (VENT-49):
 * while `?debug` (or a dev build) has the tools on, each step the crash
 * report keeps is also marked in the trail that survives a GPU crash and
 * shows on the next load. The report stays the source; the breadcrumbs
 * only hear it, a run of repeated steps once, as the report folds it.
 */
import { devToolsModule, type DevToolsModule } from '../../lib/dev-tools-loader';
import type { Recorder, StepTap } from './recorder';
import type { Step } from './trail';

/** Where the steps are marked: the dev tools' breadcrumbs, by shape. */
export interface CrumbTrail {
  readonly mark: (step: string) => void;
}

/** A tap that marks each step in `trail`; a fold of the last one is not. */
export function crumbsOf(trail: CrumbTrail): StepTap {
  let last: Step | null = null;
  return (step) => {
    const fold = step.count > 1 && step.repeat === last?.repeat;
    last = step;
    if (!fold) trail.mark(`on-foot: ${step.text}`);
  };
}

/** While the dev tools are on, marks `report`'s steps in their trail. */
export function crumbStepsWhenOn(
  report: Pick<Recorder, 'tap'>,
  tools: Promise<DevToolsModule> | null = devToolsModule(),
): void {
  void tools?.then(async ({ devTools }) => {
    report.tap(crumbsOf((await devTools()).crumbs));
  });
}
