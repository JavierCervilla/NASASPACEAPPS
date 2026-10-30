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
 * The polar map view (validated canvas «Polar map»): the south pole from
 * 80° S, from the LROC colour mosaic reprojected to polar stereographic,
 * with its grid and the landing sites on it. Picking a site selects it
 * in the shared store, so the card, the strip and the globe follow; where
 * targets overlap, a click goes to the nearest dot, as on the globe. A
 * site north of 80° S is not drawn: a note says so, and the card still
 * shows it.
 */
import { useMemo, type MouseEvent } from 'react';
import { pickedSite } from '../../globe/marker-hit';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { toPx, visibleLabels } from '../../polar/label-layout';
import { markerOf, polarMarkers } from '../../polar/polar-markers';
import { Layers } from '../Layers';
import { Graticule } from './Graticule';
import { PolarMarkers } from './PolarMarkers';
import { useWidth } from './use-width';

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly site: PhoneSite;
  readonly state: NowState | null;
  /** The site's base path, for the map image. */
  readonly base: string;
  readonly onPick: (id: string) => void;
}

const IMAGE = 'textures/moon-south-polar-2k.jpg';

function OffMap({ site }: { readonly site: PhoneSite }) {
  return (
    <p className="polar__note" role="status">
      {siteLabels(site).subtitle} lies north of 80° S, off this map
    </p>
  );
}

export function PolarMap({ sites, site, state, base, onPick }: Props) {
  const markers = useMemo(() => polarMarkers(sites), [sites]);
  const [disk, size] = useWidth<HTMLDivElement>();
  const chosen = markerOf(markers, site.id)?.id ?? null;
  const labels = visibleLabels(markers, size, chosen);
  const click = (event: MouseEvent<HTMLDivElement>): void => {
    const placed = markers.map(({ id, at }) => ({ id, at: toPx(at, size) }));
    const root = event.currentTarget;
    const id = pickedSite(event.nativeEvent, root, placed);
    if (id) onPick(id);
  };
  const src = `${base.replace(/\/?$/, '/')}${IMAGE}`;
  return (
    <section className="polar" aria-label="South pole map, 80 to 90 degrees south">
      <div className="polar__disk" ref={disk} onClick={click}>
        <img className="polar__image" src={src} alt="" decoding="async" />
        <Graticule />
        <PolarMarkers {...{ markers, chosen, state, labels }} />
      </div>
      {chosen === null ? <OffMap site={site} /> : null}
      <Layers />
    </section>
  );
}
