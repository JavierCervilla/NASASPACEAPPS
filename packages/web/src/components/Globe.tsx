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

import { useEffect, useRef, useState } from 'react';
import type { TimeStore } from '../calendar/time-store';
import { startGlobe, type GlobeStatus } from '../globe/boot';
import { pageAnchors } from '../globe/band-watch';
import { describeSun } from '../globe/describe';
import { markerLabel, type GlobeSite } from '../globe/markers';
import { localName } from '../i18n/site-names';
import type { I18n } from '../i18n/translate';
import type { WatchedValue } from '../lib/watched-value';
import { prefersSaveData } from '../lib/viewport';
import type { SiteStore } from '../phone/site-store';
import type { NowState } from '../phone/widget-types';
import { useTime } from './calendar/hooks';
import { GlobeSplash } from './GlobeSplash';
import { useI18n } from './i18n-context';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const HELP_ID = 'globe-help';

interface Props {
  /** The landing sites endpoint, same origin in production. */
  readonly sitesUrl: string;
  /** The site's base path, for the Moon texture. */
  readonly base: string;
  /** The selected site, shared with the phone sheet. */
  readonly store: SiteStore;
  /** The phone sheet's top edge, px from the viewport's top; null: none. */
  readonly sheetEdge: WatchedValue<number | null>;
  /** The selected instant: its Sun lights the globe. */
  readonly time: TimeStore;
  /** The selected site's state, which its marker wears. */
  readonly state: WatchedValue<NowState | null>;
}

const reducedMotion = (): boolean => matchMedia(REDUCED_MOTION).matches;

/**
 * Starts the scene in the viewport after hydration (or waits for the
 * visitor under Save-Data); its status, and how to load it on request.
 */
function useGlobe(props: Props, i18n: I18n) {
  const { sitesUrl, base, store, sheetEdge, time, state } = props;
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<() => void>(() => undefined);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  const [textured, setTextured] = useState(false);
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    // A restarted globe waits for its own first map behind the splash.
    setTextured(false);
    const warn = (message: string): void => console.warn(message);
    const anchors = () => pageAnchors(el);
    const options = { time, base, sitesUrl, store, sheetEdge, state };
    const saveData = prefersSaveData();
    // The globe's sites come from the API, named in English.
    const markerName = (site: GlobeSite): string =>
      markerLabel(i18n, { ...site, name: localName(i18n, site.name) });
    const deps = { ...options, saveData, reducedMotion, warn, anchors };
    const all = { ...deps, markerName, onTextured: () => setTextured(true) };
    const start = startGlobe(el, all, setStatus, saveData);
    loader.current = start.load;
    return start.dispose;
  }, [sitesUrl, base, store, sheetEdge, time, state, i18n]);
  const load = (): void => loader.current();
  return { host, status, load, textured };
}

/**
 * The text alternative: how to use the globe and where its Sun stands at
 * the instant `atMs`, or why it is not there.
 */
function helpText(
  i18n: I18n,
  status: GlobeStatus | null,
  atMs: number | null,
): string {
  if (status?.kind === 'unavailable') return i18n.t('globe.noWebgl');
  if (status?.kind === 'deferred') return i18n.t('globe.deferred');
  const lit = status?.kind === 'ready' && atMs !== null;
  const howTo = [i18n.t('globe.howTo'), i18n.t('globe.markers')];
  return [...howTo, ...(lit ? [describeSun(i18n, atMs)] : [])].join(' ');
}

/** Under Save-Data, the button that downloads the globe on request. */
function LoadButton({ onLoad }: { readonly onLoad: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" className="globe-load" onClick={onLoad}>
      {t('globe.load')}
    </button>
  );
}

/**
 * The lunar globe. It renders the focusable viewport and its text
 * alternative; the Three.js scene loads afterwards, or on request under
 * Save-Data (the «Load the 3D globe» button).
 */
export default function Globe(props: Props) {
  const i18n = useI18n();
  const { host, status, load, textured } = useGlobe(props, i18n);
  const atMs = useTime(props.time)?.atMs ?? null;
  // The scene owns the viewport's children (canvas, markers), so React
  // renders nothing inside it; the text alternative is its sibling.
  const kind = status?.kind ?? 'idle';
  return (
    <>
      <div
        ref={host}
        className="globe-viewport"
        data-status={kind}
        tabIndex={0}
        role="application"
        aria-roledescription={i18n.t('globe.role')}
        aria-label={i18n.t('globe.label')}
        aria-describedby={HELP_ID}
      />
      <p id={HELP_ID} className="globe-help" data-status={kind}>
        {helpText(i18n, status, atMs)}
      </p>
      {kind === 'deferred' ? <LoadButton onLoad={load} /> : null}
      <GlobeSplash {...props} textured={textured} status={kind} />
    </>
  );
}
