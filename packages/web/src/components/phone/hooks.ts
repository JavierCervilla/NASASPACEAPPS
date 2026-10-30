/**
 * React hooks of the phone shell: the breakpoint, the shared selection and
 * the selected site's widgets.
 */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import { isPhoneViewport, PHONE_QUERY } from '../../lib/viewport';
import { browserHourClock, watchHour } from '../../phone/hour-clock';
import type { Selection, SiteStore } from '../../phone/site-store';
import {
  LOADING,
  loadWidgets,
  type WidgetsResult,
} from '../../phone/widgets-loader';

const subscribePhone = (onChange: () => void): (() => void) => {
  const media = matchMedia(PHONE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/**
 * The scrim over the globe and the function that sets its opacity (0 to
 * 1) each frame, straight on the element, without a render.
 */
export function useScrim(): [
  RefObject<HTMLDivElement | null>,
  (value: number) => void,
] {
  const scrim = useRef<HTMLDivElement>(null);
  const dim = (value: number): void => {
    if (scrim.current) scrim.current.style.opacity = String(value);
  };
  return [scrim, dim];
}

/** Whether the viewport is phone-sized; false on the server. */
export function usePhone(): boolean {
  return useSyncExternalStore(subscribePhone, isPhoneViewport, () => false);
}

/** The store's selection, re-rendering on every change. */
export function useSelection(store: SiteStore): Selection {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/**
 * The widgets of site `id` for the current hour, loading on each new site
 * and again when the hour changes (at its top, or when a hidden page comes
 * back later), so a page left open never shows a stale hour; a retry asks
 * again.
 */
export function useSiteWidgets(id: string, sitesUrl: string) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    value: WidgetsResult;
  } | null>(null);
  useEffect(() => {
    const next = (): void => setAttempt((n) => n + 1);
    return watchHour(browserHourClock(), next);
  }, []);
  const key = `${id}#${attempt}`;
  useEffect(() => {
    let live = true;
    const source = { fetch: globalThis.fetch.bind(globalThis), sitesUrl };
    void loadWidgets(source, id, Date.now()).then((value) => {
      if (live) setResult({ key, value });
    });
    return () => {
      live = false;
    };
  }, [id, sitesUrl, key]);
  const retry = (): void => setAttempt((n) => n + 1);
  return { result: result?.key === key ? result.value : LOADING, retry };
}
