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
 * The data contract for one landing site, shared by the server (which produces
 * it from JPL Horizons) and the web (which draws it). Angles are in degrees;
 * times are ISO 8601 strings in UTC.
 */

/**
 * Deep Space Network complex: Goldstone (USA), Canberra (Australia) or Madrid
 * (Robledo de Chavela, Spain).
 */
export type DsnComplex = 'goldstone' | 'canberra' | 'madrid';

/** Where a site's coordinates or description come from. */
export interface SourceRef {
  /** Human-readable name of the source, shown in the UI. */
  readonly label: string;
  /** Link to the source. */
  readonly url: string;
  /**
   * What the source says that matters here (for example a different coordinate
   * it gives), when worth noting.
   */
  readonly note?: string;
}

/**
 * Which list a site belongs to: the lunar south pole, the Apollo landings, or
 * other missions.
 */
export type SiteGroup = 'south_pole' | 'apollo' | 'other';

/** Metadata of a landing site on the lunar surface. */
export interface Site {
  /** Stable identifier, URL-safe (used in `/api/v1/sites/:id`). */
  readonly id: string;
  /** Which list the site belongs to. */
  readonly group: SiteGroup;
  /** Display name of the site. */
  readonly name: string;
  /** Mission planned for the site. */
  readonly mission: string;
  /** Agency or company running the mission. */
  readonly agency: string;
  /**
   * Mission status as published by its agency (for example planned, landed).
   */
  readonly status: string;
  /**
   * Date the status refers to (landing, planned launch...), as the source gives
   * it: not always a full ISO date.
   */
  readonly statusDate: string;
  /** Selenographic latitude in degrees, negative to the south. */
  readonly lat: number;
  /**
   * Selenographic longitude in degrees, positive to the east (the convention
   * JPL Horizons expects).
   */
  readonly lonEast: number;
  /**
   * `true` when no source gives a citable coordinate for the site (Artemis
   * candidate regions and missions that only name a target feature). Then `lat`
   * and `lonEast` are a stand-in, usually the IAU/USGS centre of the named
   * feature, and NOT a landing point; `coordinateNote` says which point it is
   * and the UI must show it as approximate.
   */
  readonly approximate: boolean;
  /**
   * How precise the coordinates are and where they come from (published,
   * approximate, region centre).
   */
  readonly coordinateNote: string;
  /** Sources backing the metadata and the coordinates. */
  readonly sources: readonly SourceRef[];
}

/** What a lander at a site sees in one hour of model time. */
export interface HourSample {
  /**
   * Start of the hour, ISO 8601 in UTC (for example `2026-11-14T00:00:00Z`).
   */
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

/**
 * A run of consecutive hours sharing one condition (for example, all with a
 * landing window).
 */
export interface TimeBlock {
  /** Start of the first hour of the block, ISO 8601 in UTC. */
  readonly start: string;
  /**
   * End of the block: the start of the first hour after it, ISO 8601 in UTC.
   */
  readonly end: string;
  /** Length of the block in hours. */
  readonly hours: number;
}

/**
 * Summary of a range of hours at one site. Percentages are 0-100 over all the
 * hours of the range.
 */
export interface RangeMetrics {
  /** Number of hours in the range. */
  readonly hours: number;
  /** Percentage of hours with the Sun above the horizon. */
  readonly sunPct: number;
  /** Percentage of hours with the Earth above the communication threshold. */
  readonly earthPct: number;
  /** Percentage of hours with a landing window (Sun and Earth at once). */
  readonly windowPct: number;
  /** Longest landing window of the range, or `null` when there is none. */
  readonly longestWindow: TimeBlock | null;
  /**
   * Longest run of hours without Sun, or `null` when the Sun never sets in the
   * range.
   */
  readonly longestNight: TimeBlock | null;
  /** Reference hour of the three fields below, ISO 8601 in UTC. */
  readonly at: string;
  /**
   * First landing window starting at or after `at`, or `null` when none starts
   * in the range.
   */
  readonly nextWindow: TimeBlock | null;
  /**
   * Hours from `at` until the Sun sets (0 when it is already down), or `null`
   * when it does not set in the range.
   */
  readonly hoursUntilSunset: number | null;
  /**
   * Hours from `at` until the Earth sets (0 when it is already down), or `null`
   * when it does not set in the range.
   */
  readonly hoursUntilEarthset: number | null;
}

/**
 * What the API answers for a point and a range: the hours, their landing
 * windows and the summary.
 */
export interface Ephemeris {
  /** Selenographic latitude of the point, in degrees. */
  readonly lat: number;
  /** Selenographic east longitude of the point, in degrees. */
  readonly lonEast: number;
  /** First hour of the range, ISO 8601 in UTC. */
  readonly from: string;
  /** Last hour of the range (inclusive), ISO 8601 in UTC. */
  readonly to: string;
  /** One sample per hour, in time order. */
  readonly hours: readonly HourSample[];
  /** Every landing window of the range, in time order. */
  readonly windows: readonly TimeBlock[];
  /** Summary of the range. */
  readonly metrics: RangeMetrics;
  /** Where the positions come from. */
  readonly source: SourceRef;
}
