/**
 * The page's one island: the globe section and, on phones, the shell over
 * it. Both share one selection store, created here and passed down, so the
 * globe and the sheet always agree on the site.
 */
import { useState } from 'react';
import type { PhoneSite } from '../phone/phone-site';
import { createSiteStore } from '../phone/site-store';
import Globe from './Globe';
import { PhoneShell } from './phone/PhoneShell';

interface Props {
  /** The landing sites endpoint, same origin in production. */
  readonly sitesUrl: string;
  /** The site's base path, for the Moon texture. */
  readonly base: string;
  /** The site selected at start. */
  readonly selectedId: string;
  /** The curated sites, for the phone's site picker. */
  readonly sites: readonly PhoneSite[];
}

function Layers() {
  return (
    <aside className="globe-layers" aria-label="Layers">
      <h2>Layers</h2>
      <ul>
        <li><span className="layer-key layer-key--exact" aria-hidden="true"></span>Landing sites</li>
        <li><span className="layer-key layer-key--zone" aria-hidden="true"></span>Approximate zones</li>
        <li className="soon"><span className="layer-key layer-key--rover" aria-hidden="true"></span>Ghost rovers (soon)</li>
      </ul>
    </aside>
  );
}

export default function LunarApp({ sitesUrl, base, selectedId, sites }: Props) {
  const [store] = useState(() => createSiteStore(selectedId));
  return (
    <>
      <section className="globe" aria-label="Lunar globe">
        <Globe sitesUrl={sitesUrl} base={base} store={store} />
        <Layers />
      </section>
      <PhoneShell sites={sites} store={store} sitesUrl={sitesUrl} />
    </>
  );
}
