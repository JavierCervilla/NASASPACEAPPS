import { useEffect, useRef, useState } from 'react';
import { startWhenDesktop, type GlobeStatus } from '../globe/boot';
import { describeSun } from '../globe/describe';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const HELP_ID = 'globe-help';
const MARKERS =
  'Landing sites are buttons: a solid dot is an exact touchdown, a dashed ring an approximate zone.';
const HOW_TO = `Drag or use the arrow keys to turn the Moon; plus and minus zoom. ${MARKERS}`;
const NO_WEBGL = 'The 3D globe needs WebGL, which this browser does not offer.';

interface Props {
  /** The landing sites endpoint, same origin in production. */
  readonly sitesUrl: string;
  /** The site's base path, for the Moon texture. */
  readonly base: string;
  /** The site selected at start. */
  readonly selectedId: string;
}

const warn = (message: string): void => console.warn(message);
const reducedMotion = (): boolean => matchMedia(REDUCED_MOTION).matches;

/** Starts the scene in the viewport after hydration; its status. */
function useGlobe({ sitesUrl, base, selectedId }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<GlobeStatus | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const options = { atMs: Date.now(), base, sitesUrl, selectedId };
    return startWhenDesktop(
      el,
      { ...options, reducedMotion, warn },
      setStatus,
    );
  }, [sitesUrl, base, selectedId]);
  return { host, status };
}

/**
 * The lunar globe island. It renders the focusable viewport and its text
 * alternative; the Three.js scene loads afterwards, on desktop only.
 */
export default function Globe(props: Props) {
  const { host, status } = useGlobe(props);
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
        {kind === 'unavailable' ? NO_WEBGL : HOW_TO}
        {status?.kind === 'ready' ? ` ${describeSun(status.atMs)}` : ''}
      </p>
    </>
  );
}
