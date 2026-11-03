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
 * The near tiles on the loader's plan (VENT-60, B): each where its own
 * corners lie, turned so the view's heading is up, shaded once it lands
 * (use-tile-shader.ts), with a short flash on its edge; a tile not yet
 * come is a dashed outline. The 8 km tiles lie under the 2 km ones. The
 * world zooms out by CSS when the 8 km tiles start (on-foot-loader.css).
 */
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { tileCorners, tileMatrix, type Corners } from
  '../../../terrain/loader/plan-geometry';
import type { Frame } from '../../../terrain/ring/ring-frame';
import type { ProgressTile } from '../../../terrain/ring/ring-progress';
import type { TileScheme } from '@ventana/sim';
import type { ShadeTile } from './use-tile-shader';

interface Placed {
  readonly tile: ProgressTile;
  readonly corners: Corners;
}

interface TileProps {
  readonly placed: Placed;
  readonly pxPerM: number;
  readonly shade: ShadeTile;
}

/** One tile's canvas, shaded once it has landed. */
function PlanTile({ placed, pxPerM, shade }: TileProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { tile, corners } = placed;
  useEffect(() => {
    if (canvas.current && tile.fate === 'landed') shade(tile, canvas.current);
  }, [tile, shade]);
  const style: CSSProperties = {
    transform: `matrix(${tileMatrix(corners, pxPerM).join(',')})` };
  const n = tile.tile?.n ?? 0;
  return <canvas ref={canvas} className="loader-tile" width={n} height={n} style={style} />;
}

/** A tile's outline, px at the near zoom. */
const outline = ({ origin, col, row }: Corners, pxPerM: number): string => {
  const far: readonly [number, number] = [col[0] + row[0] - origin[0],
    col[1] + row[1] - origin[1]];
  return [origin, col, far, row]
    .map((p) => `${p[0] * pxPerM},${p[1] * pxPerM}`).join(' ');
};

interface Props {
  readonly tiles: readonly ProgressTile[];
  readonly scheme: TileScheme;
  readonly frame: Frame;
  readonly yawDeg: number;
  readonly pxPerM: number;
  readonly shade: ShadeTile;
}

export function PlanTiles(props: Props) {
  const { tiles, scheme, frame, yawDeg, pxPerM, shade } = props;
  const placed = useMemo(() => [...tiles]
    .sort((a, b) => b.level - a.level)
    .map((tile) => ({ tile, corners: tileCorners(
      { scheme, level: tile.level, x: tile.x, y: tile.y }, frame, yawDeg) })),
  [tiles, scheme, frame, yawDeg]);
  return (
    <div className="loader-plan__world">
      {placed.map((p) => p.tile.fate === 'landed' ? (
        <PlanTile key={`${p.tile.level}/${p.tile.x}/${p.tile.y}`} placed={p} pxPerM={pxPerM} shade={shade} />
      ) : null)}
      <svg className="loader-plan__edges" width="1" height="1" aria-hidden="true">
        {placed.map((p) => (
          <polygon key={`${p.tile.level}/${p.tile.x}/${p.tile.y}`} points={outline(p.corners, pxPerM)} data-fate={p.tile.fate} />
        ))}
      </svg>
    </div>
  );
}
