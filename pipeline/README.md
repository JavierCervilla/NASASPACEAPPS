# pipeline

Python 3 precompute that turns JPL Horizons ephemerides into the static JSON the web reads. Written during the
hackathon (14 November 2026); this folder only fixes the contract until then.

## Contract (from the spec)

- Observer on the lunar surface: `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='lon,lat,alt'`.
- Targets: Sun `COMMAND='10'`, Earth `COMMAND='399'`; observer table, quantity 4 (azimuth and elevation), 1 h step.
- DSN: Moon (`301`) elevation seen from Goldstone, Canberra and Robledo; active antenna = highest Moon above 10°.
- Visibility thresholds: Sun > 0°, Earth > 3°.
- Period: November and December 2026.
- Output: one file per site, `public/data/sites/<site>.json`, an array of hours with `sun_el`, `earth_el`, `dsn`
  (0/1/2).
- Cache every Horizons response on disk (`pipeline/.cache/`, git-ignored); Horizons is rate limited.
- Validation: at ~89.5°S the Sun rises and sets about every 29.5 days and Earth oscillates with ~27.3 days. If not,
  the longitude sign or the frame is wrong.
