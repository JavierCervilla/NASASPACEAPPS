# Horizons fixtures

Raw JSON bodies returned by the JPL Horizons API (`https://ssd.jpl.nasa.gov/api/horizons.api`), saved as received.
The tests of `@ventana/sim` and `@ventana/server` run on them, so no test touches the network.

**Recorded** on 2026-10-29 (Horizons stamps each body: «Ephemeris / API_USER Thu Oct 29 ... 2026»; ephemeris source
DE441) with:

```sh
node packages/server/scripts/record-fixtures.ts
```

The script uses the server's own Horizons client, so the requests are exactly the ones the service sends: hourly
observer tables (`QUANTITIES='4'`, apparent azimuth and elevation, `CSV_FORMAT='YES'`), one per target, observer and
calendar month, for November and December 2026 (`2026-11-01 00:00` to `2026-12-31 23:00` UTC).

| Files | Target | Observer |
|---|---|---|
| `sun-from-moon-s89.5-e0-<month>.json` | Sun (`10`) | Moon surface, `coord@301`, geodetic 89.5° S, 0° E, 0 km |
| `earth-from-moon-s89.5-e0-<month>.json` | Earth (`399`) | the same lunar point |
| `sun-from-moon-im2-athena-<month>.json` | Sun (`10`) | Moon surface, `coord@301`, geodetic 84.79° S, 29.2° E, 0 km |
| `earth-from-moon-im2-athena-<month>.json` | Earth (`399`) | the same lunar point |
| `moon-from-<complex>-<month>.json` | Moon (`301`) | the 70 m antenna of each DSN complex, `coord@399` (coordinates in `packages/server/src/horizons/query.ts`) |

The IM-2 Athena files were **added** on 2026-10-29 for the longitude-sign check (`validation.test.ts`): a curated site
with a non-zero east longitude. The point is IM-2's touchdown (-84.7906, 29.1957 E, LROC) on the API's 0.01 degree
grid, exactly as the service asks for it, so the same files also answer the server's `/api/v1/sites/im2-athena` tests.
Recording needs the network, and only recording does: in this cloud container Node reaches Horizons through the
proxy with `NODE_USE_ENV_PROXY=1 node packages/server/scripts/record-fixtures.ts`. The script re-records every file;
the earlier ones came back identical except for the request stamp line, so they were left as committed.

**Sub-solar point** (added 2026-10-30, VENT-6): `moon-subsolar-from-geocentre-2026-11-12.json` is the Moon (`301`)
seen from the geocentre (`500@399`), `QUANTITIES='15'` (the Sun's sub-longitude and sub-latitude on the target,
east-positive, ME frame), daily from 2026-11-01 to 2026-12-31. It checks the closed-form model in
`packages/sim/src/sun.ts` (`sun.test.ts`). The service never sends this query, so it has its own script:

```sh
NODE_USE_ENV_PROXY=1 node packages/server/scripts/record-subsolar-fixture.ts
```

`manifest.json` maps each file to the exact query parameters that produced it; the server tests use it to answer a
fake `fetch`.

Re-record only on purpose (for example after changing the query): the validation test checks the physics against
these files, and a new recording changes the numbers the other tests were written against.
