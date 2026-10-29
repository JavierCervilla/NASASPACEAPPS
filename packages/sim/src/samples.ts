/** Joins the Horizons tables of one site and the DSN complexes into hourly samples. */
import type { HorizonsRow } from './horizons-csv.ts';
import type { DsnComplex, HourSample } from './site.ts';
import { activeDsn } from './visibility.ts';

/** The Horizons tables behind one site's samples, all on the same hourly grid. */
export interface SampleInputs {
  /** The Sun seen from the site. */
  readonly sun: readonly HorizonsRow[];
  /** The Earth seen from the site. */
  readonly earth: readonly HorizonsRow[];
  /** The Moon seen from each DSN complex. */
  readonly moonFromDsn: Readonly<Record<DsnComplex, readonly HorizonsRow[]>>;
}

function rowAt(rows: readonly HorizonsRow[], index: number, t: string, what: string): HorizonsRow {
  const row = rows[index];
  if (row?.t !== t) {
    throw new RangeError(`${what} table does not match the Sun table at ${t} (row ${index}: ${row?.t ?? 'missing'})`);
  }
  return row;
}

/**
 * One {@link HourSample} per row of the Sun table.
 *
 * @throws RangeError when the tables do not share the same times.
 */
export function buildHourSamples(inputs: SampleInputs): HourSample[] {
  const dsnTables = Object.entries(inputs.moonFromDsn) as [DsnComplex, readonly HorizonsRow[]][];
  const tables: [string, readonly HorizonsRow[]][] = [['Earth', inputs.earth], ...dsnTables];
  for (const [what, rows] of tables) {
    if (rows.length !== inputs.sun.length) {
      throw new RangeError(`${what} table has ${rows.length} rows, the Sun table ${inputs.sun.length}`);
    }
  }
  return inputs.sun.map((sun, i) => {
    const earth = rowAt(inputs.earth, i, sun.t, 'Earth');
    const moonElevations = Object.fromEntries(
      dsnTables.map(([complex, rows]) => [complex, rowAt(rows, i, sun.t, `Moon from ${complex}`).elevation]),
    );
    return {
      t: sun.t,
      sunEl: sun.elevation,
      sunAz: sun.azimuth,
      earthEl: earth.elevation,
      earthAz: earth.azimuth,
      dsn: activeDsn(moonElevations),
    };
  });
}
