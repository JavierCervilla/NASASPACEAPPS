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
 * beside their dots (polar/label-layout.ts).
 */
import { markerKind, markerLabel } from '../../globe/markers';
import type { PolarMarker } from '../../polar/polar-markers';
import type { NowState } from '../../phone/widget-types';

interface Props {
  readonly markers: readonly PolarMarker[];
  /** The selected marker's id, if the selected site is on the map. */
  readonly chosen: string | null;
  readonly state: NowState | null;
  /** The ids whose labels show. */
  readonly labels: ReadonlySet<string>;
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
  return (
    <button
      type="button"
      className={`polar-marker polar-marker--${markerKind(marker.site)}`}
      style={placeOf(marker)}
      aria-label={markerLabel(marker.site)}
      aria-pressed={selected}
      data-site-id={marker.id}
      data-state={selected ? (state ?? 'loading') : undefined}
    />
  );
}

function MarkerLabel({ marker, selected }: Omit<MarkerProps, 'state'>) {
  return (
    <span
      className="polar-label"
      data-selected={selected}
      style={placeOf(marker)}
      aria-hidden="true"
    >
      {marker.label}
    </span>
  );
}

export function PolarMarkers({ markers, chosen, state, labels }: Props) {
  const shown = markers.filter(({ id }) => labels.has(id));
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
      {shown.map((marker) => (
        <MarkerLabel
          key={marker.id}
          marker={marker}
          selected={marker.id === chosen}
        />
      ))}
    </>
  );
}
