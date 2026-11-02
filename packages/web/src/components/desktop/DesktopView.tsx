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
 * What takes the view's place on desktop when a header tab other than the
 * globe is chosen: the polar map, the DSN view (VENT-7) or the on-foot 3D
 * view (VENT-34, lazily loaded).
 */
import type { ComponentProps } from 'react';
import type { View } from '../../lib/view-tabs';
import type { HoursResult } from '../../phone/widgets-loader';
import type { CalendarParts } from '../calendar/hooks';
import { DsnView } from '../dsn/DsnView';
import type { Dsn } from '../dsn/use-dsn';
import { PolarMap } from '../polar/PolarMap';
import { OnFootView } from '../terrain/OnFootView';
import type { OnFootSite } from '../terrain/use-on-foot';

interface Props {
  readonly view: View;
  readonly map: ComponentProps<typeof PolarMap>;
  readonly dsn: Dsn | null;
  readonly site: OnFootSite;
  readonly parts: CalendarParts;
  readonly hours: HoursResult;
}

export function DesktopView({ view, map, dsn, site, parts, hours }: Props) {
  if (view === 'polar') return <PolarMap {...map} />;
  if (view === 'dsn') return <DsnView dsn={dsn} />;
  if (view !== 'horizon') return null;
  return (
    <OnFootView layout="desktop" site={site} time={parts.time}
      horizons={parts.horizons} tiles={parts.tiles} hours={hours} />
  );
}
