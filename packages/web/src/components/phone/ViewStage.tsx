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
 * What fills the phone's screen behind the top bar and the sheet when a
 * view other than the globe is chosen: the DSN view's Earth (VENT-7), or
 * the on-foot 3D view (VENT-34) framed in the band between the bar and
 * the sheet's edge, drawn again when that edge moves; when the view is
 * lost and its notice has no room in that band, the sheet drops to peek.
 */
import type { RefObject } from 'react';
import type { View } from '../../lib/view-tabs';
import { bandMoves } from '../../phone/band-moves';
import type { WatchedValue } from '../../lib/watched-value';
import type { CalendarParts } from '../calendar/hooks';
import { DsnStage } from '../dsn/DsnPhone';
import type { Dsn } from '../dsn/use-dsn';
import { OnFootView } from '../terrain/OnFootView';
import type { OnFootSite } from '../terrain/use-on-foot';

interface Props {
  readonly view: View;
  readonly dsn: Dsn | null;
  readonly site: OnFootSite;
  readonly parts: CalendarParts;
  /** The top bar, whose bottom is the band's top. */
  readonly bar: RefObject<HTMLElement | null>;
  /** The sheet's top edge, the band's bottom; null: no sheet. */
  readonly sheetEdge: WatchedValue<number | null>;
  /** Lowers the sheet, for a notice the band has no room for. */
  readonly makeRoom: () => void;
}

export function ViewStage(props: Props) {
  const { view, site, parts, bar, sheetEdge } = props;
  if (view === 'dsn') return <DsnStage dsn={props.dsn} />;
  if (view !== 'horizon') return null;
  const band = () => ({
    top: bar.current?.getBoundingClientRect().bottom ?? 0,
    bottom: sheetEdge.get() ?? window.innerHeight,
  });
  return (
    <OnFootView layout="phone" site={site} time={parts.time}
      horizons={parts.horizons} tiles={parts.tiles}
      viewTier={parts.viewTier} band={band}
      bandMoves={bandMoves(() => bar.current, sheetEdge.subscribe)}
      makeRoom={props.makeRoom} />
  );
}
