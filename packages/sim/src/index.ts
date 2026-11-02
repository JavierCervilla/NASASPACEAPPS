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
 * Public API of `@ventana/sim`: pure TypeScript shared by the web and the
 * server, no network, disk or DOM.
 */
export type {
  DsnComplex,
  Ephemeris,
  HourSample,
  RangeMetrics,
  ShadowKind,
  Site,
  SiteGroup,
  SiteShadow,
  SourceRef,
  TimeBlock,
} from './site.ts';
export { HorizonsParseError, horizonsDateToIso, parseHorizonsTable, type HorizonsRow } from './horizons-csv.ts';
export {
  DSN_MIN_ELEVATION_DEG,
  EARTH_MIN_ELEVATION_DEG,
  SUN_MIN_ELEVATION_DEG,
  activeDsn,
  earthLink,
  hasEarth,
  hasSun,
  isWindow,
  type EarthLink,
} from './visibility.ts';
export { buildHourSamples, type SampleInputs } from './samples.ts';
export { groupBlocks, longestBlock } from './blocks.ts';
export { computeRangeMetrics, hoursUntilLost, nextBlock } from './metrics.ts';
export { HOUR_MS, addHours, hoursBetween, toIso, toMs } from './time.ts';
export { subSolarPoint, wrapDeg, type SelenographicPoint } from './sun.ts';
export {
  DSN_COMPLEXES,
  DSN_SITES,
  type GeodeticSite,
} from './dsn-sites.ts';
export { computedHours, skyAt, type Sky } from './sky.ts';
export {
  VALIDATED_ELEVATION_DEG,
  VALIDATED_FROM,
  VALIDATED_TO,
} from './accuracy.ts';
export { moonPosition, type MoonPosition } from './moon.ts';
export { subEarthPoint } from './libration.ts';
export { moonElevationFromDsn } from './dsn-sky.ts';
export type { Horizontal } from './horizon.ts';
export {
  dsnElevations,
  dsnSpans,
  dsnStateAt,
  type DsnSpan,
  type DsnState,
} from './dsn-timeline.ts';
export {
  dsnOutlook,
  nextTurn,
  runsWhere,
  turnsOf,
  type DsnOutlook,
  type DsnTurn,
  type Interval,
} from './dsn-outlook.ts';
export {
  earthSubSolarPoint,
  subLunarPoint,
  type EarthPoint,
} from './earth-view.ts';
export { MINUTE_MS } from './minute-runs.ts';
export { inPermanentShadow, shadowedHours } from './shadow.ts';
export {
  CENTIDEG_PER_DEG,
  horizonAt,
  isAboveTerrain,
  quantiseDeg,
  type HorizonProfile,
} from './terrain-profile.ts';
export { decodeProfile, encodeProfile } from './terrain-codec.ts';
export { SUN_RADIUS_DEG, sunDiscVisible } from './sun-disc.ts';
export {
  arrayGrid,
  demHeightAt,
  pixelOf,
  type CylindricalProjection,
  type DemGrid,
  type PolarProjection,
} from './dem-grid.ts';
export {
  HORIZON_BINS,
  terrainHorizon,
  type DemBand,
  type Observer,
  type TerrainHorizon,
} from './ray-march.ts';
export { terrainHours } from './terrain-hours.ts';
export {
  terrainTile,
  type TerrainTile,
  type TileCentre,
} from './terrain-tile.ts';
export { decodeHeights, encodeHeights } from './tile-codec.ts';
export {
  LUNAR_RADIUS_M,
  POLAR_MIN_LAT_DEG,
  TILE_CELLS,
  TILE_LEVELS,
  TILE_SAMPLES,
  levelSize,
  nominalSpacingM,
  schemeFor,
  type TileKey,
  type TileScheme,
} from './tile-scheme.ts';
export { isTileKey } from './tile-key.ts';
export {
  sampleDirection,
  tileGeoref,
  type LatLonGeoref,
  type PolarGeoref,
  type TileGeoref,
} from './tile-georef.ts';
export { planePoint, tileContaining } from './tile-locate.ts';
export {
  DEFAULT_LEVELS,
  tilesAround,
  type TilePlan,
  type TileRing,
} from './tile-ring.ts';
export {
  alignedTile,
  minDataResolutionM,
  type AlignedTile,
} from './lod-tile.ts';
export { levelQuantumM } from './level-quantum.ts';
export {
  MIN_QUANTUM_M,
  NO_DATA,
  decodeQuantised,
  dequantiseHeights,
  encodeQuantised,
  quantiseHeights,
  type QuantisedHeights,
} from './tile-quant.ts';
