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
 * The benchmark's panel (VENT-81), loaded only with `?bench` once the page
 * has started (lib/bench-loader.ts): floated over the app on the page's
 * body, its stylesheet a React 19 `<link precedence>` so it loads with the
 * panel and never with the page. Its phase comes from the kept state
 * (bench/use-bench.ts). The bar's bottom is measured (use-under-bars.ts):
 * the running strip sits under it at any text size (VENT-88).
 */
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBench } from '../../bench/use-bench';
import type { SiteStore } from '../../phone/site-store';
import stylesUrl from '../../styles/bench.css?url';
import { useI18n } from '../i18n-context';
import { useUnderBars } from '../use-under-bars';
import { BenchReady } from './BenchReady';
import { BenchResults } from './BenchResults';
import { BenchRunning } from './BenchRunning';

export interface BenchPanelProps {
  /** The page's site store: the script changes the point through it. */
  readonly store: SiteStore;
}

export function BenchPanel({ store }: BenchPanelProps) {
  const { t } = useI18n();
  const phase = useBench(store);
  const panel = useRef<HTMLElement>(null);
  useUnderBars(panel, true);
  return createPortal(
    <section ref={panel} className="ventana-bench-panel" aria-label={t('bench.title')} data-phase={phase.kind}>
      <link rel="stylesheet" href={stylesUrl} precedence="bench" />
      {phase.kind === 'ready' && <BenchReady runs={phase.runs} />}
      {phase.kind === 'running' && <BenchRunning {...phase} />}
      {(phase.kind === 'results' || phase.kind === 'failed')
        && <BenchResults {...phase} />}
    </section>,
    document.body,
  );
}
