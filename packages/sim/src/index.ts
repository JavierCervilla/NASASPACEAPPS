/** Public API of `@ventana/sim`: pure TypeScript shared by the web and the server, no network, disk or DOM. */
export type {
  DsnComplex,
  Ephemeris,
  HourSample,
  RangeMetrics,
  Site,
  SourceRef,
  TimeBlock,
} from './site.ts';
export { HorizonsParseError, horizonsDateToIso, parseHorizonsTable, type HorizonsRow } from './horizons-csv.ts';
export {
  DSN_MIN_ELEVATION_DEG,
  EARTH_MIN_ELEVATION_DEG,
  SUN_MIN_ELEVATION_DEG,
  activeDsn,
  hasEarth,
  hasSun,
  isWindow,
} from './visibility.ts';
export { buildHourSamples, type SampleInputs } from './samples.ts';
export { groupBlocks, longestBlock } from './blocks.ts';
export { computeRangeMetrics, hoursUntilLost, nextBlock } from './metrics.ts';
export { HOUR_MS, addHours, hoursBetween, toIso, toMs } from './time.ts';
