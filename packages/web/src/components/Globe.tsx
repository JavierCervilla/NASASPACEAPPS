import { useEffect, useRef, useState } from 'react';
import { startGlobe, type GlobeStatus } from '../globe/boot';
import { describeSun } from '../globe/describe';
import { prefersSaveData } from '../lib/viewport';
import type { SiteStore } from '../phone/site-store';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const HELP_ID = 'globe-help';
const MARKERS =
  'Landing sites are buttons: a solid dot is an exact touchdown, a dashed ring an approximate zone.';
const HOW_TO = `Drag or use the arrow keys to turn the Moon; plus and minus zoom. ${MARKERS}`;
const NO_WEBGL = 'The 3D globe needs WebGL, which this browser does not offer.';
const DEFERRED = 'Your browser asks to save data, so the 3D globe waits.';

interface Props {
  /** The landing sites endpoint, same origin in production. */
  readonly sitesUrl: string;
  /** The site's base path, for the Moon texture. */
  readonly base: string;
  /** The selected site, shared with the phone sheet. */
  readonly store: SiteStore;
}

const reducedMotion = (): boolean => matchMedia(REDUCED_MOTION).matches;

/**
 * Starts the scene in the viewport after hydration (or waits for the
 * visitor under Save-Data); its status, and how to load it on request.
 */
function useGlobe({ sitesUrl, base, store }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const loader = useRef<() => void>(() => undefined);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const warn = (message: string): void => console.warn(message);
    const options = { atMs: Date.now(), base, sitesUrl, store };
    const deps = { ...options, reducedMotion, warn };
    const start = startGlobe(el, deps, setStatus, prefersSaveData());
    loader.current = start.load;
    return start.dispose;
  }, [sitesUrl, base, store]);
  const load = (): void => loader.current();
  return { host, status, load };
}

/** The text alternative: how to use the globe, or why it is not there. */
function helpText(status: GlobeStatus | null): string {
  if (status?.kind === 'unavailable') return NO_WEBGL;
  if (status?.kind === 'deferred') return DEFERRED;
  const sun = status?.kind === 'ready' ? ` ${describeSun(status.atMs)}` : '';
  return `${HOW_TO}${sun}`;
}

/** Under Save-Data, the button that downloads the globe on request. */
function LoadButton({ onLoad }: { readonly onLoad: () => void }) {
  return (
    <button type="button" className="globe-load" onClick={onLoad}>
      Load the 3D globe
    </button>
  );
}

/**
 * The lunar globe. It renders the focusable viewport and its text
 * alternative; the Three.js scene loads afterwards, or on request under
 * Save-Data (the «Load the 3D globe» button).
 */
export default function Globe(props: Props) {
  const { host, status, load } = useGlobe(props);
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
        aria-roledescription="3D globe"
        aria-label="The Moon, seen over its south pole"
        aria-describedby={HELP_ID}
      />
      <p id={HELP_ID} className="globe-help" data-status={kind}>
        {helpText(status)}
      </p>
      {kind === 'deferred' ? <LoadButton onLoad={load} /> : null}
    </>
  );
}
