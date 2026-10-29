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
| `moon-from-<complex>-<month>.json` | Moon (`301`) | the 70 m antenna of each DSN complex, `coord@399` (coordinates in `packages/server/src/horizons/query.ts`) |

`manifest.json` maps each file to the exact query parameters that produced it; the server tests use it to answer a
fake `fetch`.

Re-record only on purpose (for example after changing the query): the validation test checks the physics against
these files, and a new recording changes the numbers the other tests were written against.
