/**
 * The data contract for one landing site, shared by the server (which produces it from JPL Horizons) and the web
 * (which draws it). Angles are in degrees; times are ISO 8601 strings in UTC.
 */

/** Deep Space Network complex: Goldstone (USA), Canberra (Australia) or Madrid (Robledo de Chavela, Spain). */
export type DsnComplex = 'goldstone' | 'canberra' | 'madrid';

/** Where a site's coordinates or description come from. */
export interface SourceRef {
  /** Human-readable name of the source, shown in the UI. */
  readonly label: string;
  /** Link to the source. */
  readonly url: string;
}

/** Metadata of a landing site on the lunar surface. */
export interface Site {
  /** Stable identifier, URL-safe (used in `/api/sites/:id`). */
  readonly id: string;
  /** Display name of the site. */
  readonly name: string;
  /** Mission planned for the site. */
  readonly mission: string;
  /** Agency or company running the mission. */
  readonly agency: string;
  /** Mission status as published by its agency (for example planned, landed). */
  readonly status: string;
  /** Selenographic latitude in degrees, negative to the south. */
  readonly lat: number;
  /** Selenographic longitude in degrees, positive to the east (the convention JPL Horizons expects). */
  readonly lonEast: number;
  /** How precise the coordinates are and where they come from (published, approximate, region centre). */
  readonly coordinateNote: string;
  /** Sources backing the metadata and the coordinates. */
  readonly sources: readonly SourceRef[];
}

/** What a lander at a site sees in one hour of model time. */
export interface HourSample {
  /** Start of the hour, ISO 8601 in UTC (for example `2026-11-14T00:00:00Z`). */
  readonly t: string;
  /** Sun elevation above the local horizon, in degrees. */
  readonly sunEl: number;
  /** Sun azimuth, in degrees clockwise from north. */
  readonly sunAz: number;
  /** Earth elevation above the local horizon, in degrees. */
  readonly earthEl: number;
  /** Earth azimuth, in degrees clockwise from north. */
  readonly earthAz: number;
  /** DSN complex listening to the Moon in that hour, or `null` when none is. */
  readonly dsn: DsnComplex | null;
}
