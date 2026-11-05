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

import { useEffect, useState } from 'react';
import type { SiteStore } from '../phone/site-store';
import { nextLoad } from './navigate';
import { benchOptions } from './params';
import { pageRegistry } from './page-registry';
import { initialPhase, type Phase } from './phase';
import { readState } from './run-state';
import { runScript } from './run';
import { sessionStore } from './state-store';
import type { BenchState } from './types';

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => window.setTimeout(done, ms));

/** What tells the panel each step that begins, with the times so far. */
function stepTimer(state: BenchState, setPhase: (next: Phase) => void) {
  const times: number[] = [];
  let last = performance.now();
  return (step: number): void => {
    const now = performance.now();
    if (step > 0) times.push(now - last);
    last = now;
    setPhase({ kind: 'running', state, step, times: [...times] });
  };
}

/** Plays the run the load's `first` phase names, then the next load. */
function useRun(
  first: Phase,
  setPhase: (next: Phase) => void,
  store: SiteStore,
): void {
  useEffect(() => {
    if (first.kind !== 'running') return;
    const { state } = first;
    const variant = state.order[state.next] ?? 'A';
    void runScript(variant, state.fast, {
      doc: document, place: location, store, sleep, registry: pageRegistry,
      local: window.localStorage, onStep: stepTimer(state, setPhase),
    }).then(({ steps, header }) => nextLoad(state, steps, header));
  }, [first, setPhase, store]);
}

/** The panel's phase, kept current while a run plays. */
export function useBench(store: SiteStore): Phase {
  const [first] = useState<Phase>(() => initialPhase(
    readState(sessionStore()), benchOptions(location.search)));
  const [phase, setPhase] = useState(first);
  useRun(first, setPhase, store);
  return phase;
}
