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
 * site north of 80° S is not drawn: a note beside the disk says so, and
 * the card still shows it.
 */
import { useMemo, type MouseEvent } from 'react';
import { pickedSite } from '../../globe/marker-hit';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { numberBadges, type Badge } from '../../polar/badge-layout';
import { visibleLabels, type Side } from '../../polar/label-layout';
import { toPx } from '../../polar/layout-geometry';
import {
  markerOf,
  polarMarkers,
  type PolarMarker,
} from '../../polar/polar-markers';
import type { SourceStore } from '../../source/data-source';
import { useI18n } from '../i18n-context';
import { Layers } from '../Layers';
import { Graticule } from './Graticule';
import { PolarKey } from './PolarKey';
import { PolarMarkers } from './PolarMarkers';
import { useDiskFit } from './use-disk-fit';
import { useWidth } from './use-width';

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly site: PhoneSite;
  readonly state: NowState | null;
  /** Whether that state is the simulator's: the marker is hollow. */
  readonly computed: boolean;
  /** The site's base path, for the map image. */
  readonly base: string;
  readonly onPick: (id: string) => void;
  /** The data source, for the Layers key's switch. */
  readonly source: SourceStore;
}

const IMAGE = 'textures/moon-south-polar-2k.jpg';

/** The note for a selected site off the map: one without a marker. */
function OffMap(props: { site: PhoneSite; chosen: string | null }) {
  const { site, chosen } = props;
  const { t } = useI18n();
  if (chosen !== null) return null;
  const name = siteLabels(site).subtitle;
  return (
    <p className="polar__note" role="status">
      {t('polar.offMap', { name })}
    </p>
  );
}

/** The labels that show, and the numbers of the rest, on a disk `size` wide. */
function layout(
  markers: readonly PolarMarker[],
  size: number,
  chosen: string | null,
): { labels: Map<string, Side>; badges: Badge[] } {
  const labels = visibleLabels(markers, size, chosen);
  // Unmeasured, every dot sits at 0: no badge until the disk has a size.
  const badges = size > 0 ? numberBadges(markers, size, labels, chosen) : [];
  return { labels, badges };
}

/** The map's markers of `sites`, labelled in the visitor's language. */
function useMarkers(sites: readonly PhoneSite[]) {
  const i18n = useI18n();
  const markers = useMemo(() => polarMarkers(sites, i18n), [sites, i18n]);
  return { markers, label: i18n.t('polar.label') };
}

/** A click on the disk picks the dot nearest it, as on the globe. */
function pickHandler(
  markers: readonly PolarMarker[],
  size: number,
  onPick: (id: string) => void,
) {
  return (event: MouseEvent<HTMLDivElement>): void => {
    const placed = markers.map(({ id, at }) => ({ id, at: toPx(at, size) }));
    const id = pickedSite(event.nativeEvent, event.currentTarget, placed);
    if (id) onPick(id);
  };
}

export function PolarMap(props: Props) {
  const { sites, site, state, computed, base, onPick, source } = props;
  const { markers, label } = useMarkers(sites);
  const [disk, size] = useWidth<HTMLDivElement>();
  const chosen = markerOf(markers, site.id)?.id ?? null;
  const { labels, badges } = layout(markers, size, chosen);
  const panel = useDiskFit();
  const click = pickHandler(markers, size, onPick);
  return (
    <section ref={panel} className="polar" aria-label={label} data-computed={computed}>
      <div className="polar__disk" ref={disk} onClick={click}>
        <img className="polar__image" src={`${base.replace(/\/?$/, '/')}${IMAGE}`} alt="" decoding="async" />
        <Graticule />
        <PolarMarkers {...{ markers, chosen, state, labels, badges }} />
      </div>
      <OffMap site={site} chosen={chosen} />
      <Layers source={source} />
      <PolarKey badges={badges} />
    </section>
  );
}
