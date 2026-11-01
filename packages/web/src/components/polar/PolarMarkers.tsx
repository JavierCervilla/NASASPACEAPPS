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
 * The polar map's site markers: real buttons named for assistive
 * technology, with 44 px targets, a solid dot for an exact point and a
 * dashed ring for an approximate zone. The selected one takes its state's
 * colour at the selected instant (the legend's); the labels that fit show
 * beside their dots (polar/label-layout.ts), and the others wear a number
 * the map's key names (polar/badge-layout.ts). A label over the standing
 * pin wears a dark backing (VENT-37).
 */
import { markerKind, markerLabel } from '../../globe/markers';
import type { Badge } from '../../polar/badge-layout';
import type { Side } from '../../polar/label-layout';
import type { PolarMarker } from '../../polar/polar-markers';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';

interface Props {
  readonly markers: readonly PolarMarker[];
  /** The selected marker's id, if the selected site is on the map. */
  readonly chosen: string | null;
  readonly state: NowState | null;
  /** The ids whose labels show, with the side of the dot each sits on. */
  readonly labels: ReadonlyMap<string, Side>;
  /** The numbers of the markers without a label. */
  readonly badges: readonly Badge[];
  /** The ids whose labels cross the standing pin (VENT-37). */
  readonly overPin?: ReadonlySet<string> | undefined;
}

const placeOf = ({ at }: PolarMarker) => ({
  left: `${50 + 50 * at.x}%`,
  top: `${50 + 50 * at.y}%`,
});

interface MarkerProps {
  readonly marker: PolarMarker;
  readonly selected: boolean;
  readonly state: NowState | null;
}

function MarkerButton({ marker, selected, state }: MarkerProps) {
  const i18n = useI18n();
  return (
    <button
      type="button"
      className={`polar-marker polar-marker--${markerKind(marker.site)}`}
      style={placeOf(marker)}
      aria-label={markerLabel(i18n, marker.site)}
      aria-pressed={selected}
      data-site-id={marker.id}
      data-state={selected ? (state ?? 'loading') : undefined}
    />
  );
}

type LabelProps = Pick<Props, 'markers' | 'labels' | 'chosen' | 'overPin'>;

function MarkerLabels({ markers, labels, chosen, overPin }: LabelProps) {
  return markers.map((marker) => {
    const side = labels.get(marker.id);
    return side ? (
      <span
        key={marker.id}
        className="polar-label"
        data-selected={marker.id === chosen}
        data-side={side}
        data-over-pin={overPin?.has(marker.id) || undefined}
        style={placeOf(marker)}
        aria-hidden="true"
        data-site-id={marker.id}
      >
        {marker.label}
      </span>
    ) : null;
  });
}

type BadgeProps = Pick<Props, 'markers' | 'badges'>;

function MarkerBadges({ markers, badges }: BadgeProps) {
  const byId = new Map(markers.map((marker) => [marker.id, marker]));
  return badges.map(({ id, n, corner, reach }) => {
    const marker = byId.get(id);
    return marker ? (
      <span
        key={id}
        className={`polar-badge polar-badge--${corner}`}
        data-reach={reach}
        style={placeOf(marker)}
        aria-hidden="true"
        data-site-id={id}
      >
        {n}
      </span>
    ) : null;
  });
}

export function PolarMarkers(props: Props) {
  const { markers, chosen, state, labels, badges, overPin } = props;
  return (
    <>
      {markers.map((marker) => (
        <MarkerButton
          key={marker.id}
          marker={marker}
          selected={marker.id === chosen}
          state={state}
        />
      ))}
      <MarkerLabels {...{ markers, labels, chosen, overPin }} />
      <MarkerBadges markers={markers} badges={badges} />
    </>
  );
}
