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
 * The picker's segmented control: South pole, Apollo, Other and, since
 * VENT-37, Saved with how many sites are saved on this device. While a
 * search spans every region it is off.
 */
import type { SiteGroup } from '@ventana/sim';
import { regionName, REGIONS } from '../../phone/site-search';
import { useI18n } from '../i18n-context';
import { useSavedKit, useSavedSites } from '../saved/context';

/** A region, or the sites saved on this device. */
export type Segment = SiteGroup | 'saved';

interface RegionProps {
  readonly value: Segment;
  readonly off: boolean;
  readonly onChange: (segment: Segment) => void;
}

/** «Saved» and how many, muted; said in full to a screen reader. */
function SavedSegment({ value, off, onChange }: RegionProps) {
  const i18n = useI18n();
  const count = useSavedSites(useSavedKit()).length;
  return (
    <button type="button" disabled={off} aria-pressed={!off && value === 'saved'} aria-label={i18n.plural('saved.segment', count)} onClick={() => onChange('saved')}>
      {i18n.t('saved.title')}
      {count > 0 ? <span className="segmented__count"> {i18n.number(count)}</span> : null}
    </button>
  );
}

/** The region control; while a search spans every region it is off. */
export function Regions(props: RegionProps) {
  const i18n = useI18n();
  return (
    <div className="segmented segmented--four" role="group" aria-label={i18n.t('picker.region')}>
      {REGIONS.map((group) => (
        <button key={group} type="button" disabled={props.off} aria-pressed={!props.off && group === props.value} onClick={() => props.onChange(group)}>
          {regionName(i18n, group)}
        </button>
      ))}
      <SavedSegment {...props} />
    </div>
  );
}

