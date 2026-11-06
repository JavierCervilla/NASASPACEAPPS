# Ventana Lunar

Static web for the **NASA Space Apps Challenge 2026** (challenge: *Lunar Landing Site Navigator*, Madrid, 14-15 November
2026). For any lunar south pole landing site and any date it answers two questions: will the lander have **Sun**
(power) and will it **see Earth** (comms)? Where both are yes there is a landing **window**. Extra: which Deep Space
Network antenna (Goldstone, Canberra, Robledo de Chavela) is listening.

Spec and roadmap (the source of truth for scope): Claude Docs «Ventana Lunar · Especificación y roadmap». Framework
epic: `VENT-1` (Dashboard project «Ventana Lunar», prefix `VENT`).

## Stack

- **Monorepo** (npm workspaces, layout of GAMESTUDIO's Web starter): `packages/web`, `packages/sim` and
  `packages/server`. Web and server import the same `@ventana/sim` and its data contract types.
- **Web** (`packages/web`): Astro 7 (static output) + React 19 islands + TypeScript (strictest). Three.js joins with
  the globe (luxury 1). No login and no user accounts.
- **Sim** (`packages/sim`): pure TypeScript, no network, disk or DOM: the site data contract and the
  visibility, window and DSN logic. It also computes the sky in closed form (VENT-36), no ephemeris file: the
  sub-solar point (`sun.ts`), the Moon's geocentric position (Meeus 47 truncated at 0.001°, `moon.ts`), the optical
  libration (`libration.ts`), the Sun and Earth on a lunar site's horizon with the Earth's parallax (`sky.ts`), and the
  Moon over each DSN 70 m antenna (`dsn-sky.ts`, stations in `dsn-sites.ts`, which the server re-exports).
  `skyAt(point, ms)` gives one instant, `computedHours(point, fromIso, lastIso)` the server's `HourSample[]` (both ends
  included), a month in about 11 ms. Against Horizons, hourly over Nov-Dec 2026 (`tests/sky.test.ts`): Sun 0.04° in
  elevation and 0.17° in azimuth, Earth 0.03° and 0.02°, Moon from the DSN 0.007° and 0.04°; Sun, Earth, window and
  antenna agree every hour except within one hour of a transition. It also knows the terrain (VENT-40,
  `docs/terrain-api.md`): `terrainHorizon` ray-marches LOLA elevation grids handed in with their PDS georeference
  (`dem-grid.ts`, polar stereographic or simple cylindrical, through a `dnAt` accessor) into a `HorizonProfile` (720
  bins of 0.5°, int16 hundredths of a degree, base64 by `encodeProfile`), and `terrainHours` marks each hour's
  `sunAboveTerrain`, `sunDisc` (`sunDiscVisible`) and `earthAboveTerrain`, which `hasSun`, `hasEarth` and `earthLink`
  honour (the Sun may be up below 0° on a ridge; `sunHidden` still wins). The curated sites south of 80° S ship their
  profiles (`packages/sim/data/horizons.json`, observer 2 m, from `packages/server/scripts/terrain-horizons.ts`), held
  to NASA's AVGVISIB map by `tests/terrain-validation.test.ts`; the web applies them with the shadow
  (`src/source/shadowed-hours.ts`, `terrain-profiles.ts`) to both sources' hours. A custom point keeps the smooth
  sphere until `/api/v1/horizon` answers (`src/horizon/point-horizon.ts`, asked once per point by the horizon store,
  `src/horizon/horizon-store.ts`, which hands out a new `TerrainOf` on every change so the views read the hours
  again); a 404 (no terrain covers the point) keeps the smooth sphere for good, a 503 «terrain data is not installed»
  says so, and a failure that may pass (the network, a busy 503, a 429, any other 5xx, an answer that is not a
  profile) is tried again after 2, 6 and 18 s, or its Retry-After when longer (a shorter one, 0 included, never
  shortens the wait), each wait spread by a factor from 0.5 to 1.5 from an injected random source and capped at 30 s,
  the point «loading» meanwhile; once those four tries run out it shows the smooth sphere until the page is shown
  again, the browser comes back online or «Try again» is pressed, when the selected point is asked again at once and
  every other lapsed one (selected before, or saved) through the one-at-a-time background queue, which also waits
  while the browser is offline (VENT-45, `horizon-retry.ts`, `horizon-ask.ts`, `retry-triggers.ts`); offline the
  service worker's API cache applies. The API logs each error answer of `/api/*` as one line, and each answer slower than 1 s as `api slow:` (VENT-78)
  (method, path, status, ms; never the query, a levelled tile's x and y, written `{x}/{y}`, the client's address or the
  body: `packages/server/src/error-log.ts`).
- **Backend** (`packages/server`, Node + Hono; decided 2026-10-29): one service on Dokploy serves all site data, for the
  curated sites and for custom coordinates. It queries JPL Horizons and caches the responses on disk, because Horizons
  is slow and rate limited and the spec wants answers in under 3 s. The browser never calls Horizons directly. It
  also answers the terrain horizon of any point, `GET /api/v1/horizon?lat&lon[&height]` (VENT-40), from the LOLA tiers
  present in `TERRAIN_DIR` (catalogue `packages/server/data/terrain-catalogue.json`, fetched by
  `packages/server/scripts/fetch-terrain.ts`, never in git or the image; without it the route answers 503), reading
  only the grid blocks its rays cross: `docs/terrain-api.md`. From the same tiers, blocks, LRU, gate, limiter and
  answer cache it serves `GET /api/v1/terrain/tile?lat&lon[&size]` (VENT-34), the relief of the 3D on-foot view and
  its only source: a 257 x 257 float32 height grid (base64, metres relative to the centre) in the tangent plane,
  `size` 2000, 4000 or 8000 m, each sample from the finest tier covering it (`terrainTile` in `@ventana/sim`,
  `src/terrain/tile-*.ts`), with the tiers' shares so the client knows what is measured. For relief in rings and streaming it also serves
  aligned, levelled tiles of a global tiling (VENT-46): `GET /api/v1/terrain/tiles?lat&lon[&levels]` lists the tiles
  that cover a ring around a point, and `GET /api/v1/terrain/tiles/{scheme}/{level}/{x}/{y}[?v]` serves one: 129 x 129
  uint16 heights (0.1 m step, 33 kB) with their georeference, at four levels of 2, 8, 32 and 128 km (nodes 15.6 m to
  1 km apart) on the polar stereographic plane from 60° to each pole (`polar-south`, `polar-north`) and on a lat-lon
  grid between (`latlon`); neighbours share their edge nodes and a level's nodes are every 4th node of the level below,
  exactly, up to the level's step: a tile stores its heights at that step, so the same place has approximately the same height
  at two levels, within the two steps (`levelQuantumM`: 0.1, 0.1, 0.2 and 0.4 m at levels 0 to 3) and where the levels read different LOLA tiers
  by metres, which the viewer stitches at its level boundaries; urls carry a version token of the tiers present and are immutable (ETag, 304); pure core in `@ventana/sim`
  (`tile-scheme.ts`, `tile-georef.ts`, `tile-ring.ts`, `lod-tile.ts`, `tile-quant.ts`), server in
  `src/terrain/lod-*.ts`, with its own limiter, cache (`TERRAIN_LOD_CACHE_MB`), gate (`TERRAIN_LOD_MAX_RUNNING`) and per-address slots (`TERRAIN_LOD_PER_IP`, `src/ip-slots.ts`), so a tile flood cannot fill the horizon's queue. The server fills that volume itself (VENT-43): with
  `TERRAIN_FETCH_TIERS` (`all` or tier ids) it fetches the missing tiers in the background once it listens, one file at
  a time, resumable (`.part` and HTTP Range), sha256-checked, stopping when the volume would keep under 2 GB free, and
  re-scans after each tier so it serves without a restart (`src/terrain/terrain-boot.ts`; progress at
  `GET /api/v1/terrain/status`; `scripts/fetch-terrain.ts` is a thin wrapper over the same code). With no tier on disk
  the route answers 503 «terrain data is not installed», which the web shows as «Real terrain not installed on the
  server yet». The image's entrypoint gives the mounted volumes' top directories to `node` and drops to it with
  `su-exec`, so a root-owned volume works.
- **Deploy**: Dokploy builds the `Dockerfile` (static build served by nginx, `nginx.conf`) from `main`, at the domain
  root (`SITE_BASE` sets a sub-path if ever needed). The primary domain is **https://nasa.universelle.io** (VENT-76);
  https://nasa.cervilla.es serves the same app as a second domain. The image builds with `SITE_URL` set to the primary
  domain (`ARG` in the `Dockerfile`), so every page's `rel="canonical"` and `hreflang` links are absolute to it
  (`canonicalHref`, `alternates` in `src/i18n/routes.ts`); the API answers on both hosts under `/api`. The API has its own `packages/server/Dockerfile` (built from the
  repo root, port 3000). Operate it with the framework's `dokploy` skill.

## Design: follow the `apple-design` skill

Every visible change follows `.claude/skills/apple-design/SKILL.md` (vendored from `emilkowalski/skills`, MIT; see
`.claude/skills/NOTICE.md`). Load it before touching UI. Project-specific rules from the spec on top of it:

- Dark by default (near-black background). One screen, no menus: the jury must understand it in five seconds.
- Four signal colours with fixed meaning, from `packages/web/src/styles/tokens.css`, and an always-visible legend: Sun
  (`--signal-sun`), Earth (`--signal-earth`), both = window (`--signal-window`), nothing (`--signal-none`). Never use
  them for decoration.
- System font; tracking and leading change with size. Springs critically damped by default. Honour
  `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast`.
- Colour, focus and type (VENT-55): the focus ring is `--focus-ring` (the text colour) on page surfaces and
  `--focus-ring-on-moon` (`--marker`) only on the Moon and its sky; buttons and links without their own ring take the
  zero-specificity `:where(button, a):focus-visible` of `global.css`. Type comes from the scale in `tokens.css`
  (`--type-<step>-size|leading|tracking`, caption 11 px to display 28 px): tracking is set per text, never on a
  container; nothing under 11 px except the phone tab bar under 400 px (VENT-44). More contrast makes `--chrome`,
  `--glass-label` and `--phone-bar|sheet|tabs` opaque. Held by `tests/{style-surfaces,type-scale,focus-ring}.test.ts`
  and `tests/e2e/colour-focus-type.spec.ts`.
- Press and motion (VENT-55): every control answers on pointer-down, the same under reduced motion (no `:active` rule
  sits inside a `prefers-reduced-motion` query): buttons `scale(0.97)` over `--dur-press`, on the press only (the
  globe's compass and the 3D view's buttons too, VENT-82), rows (the site lists' `.site-row` too, VENT-82) and segments
  a `--fill` highlight laid over their own background, Moon dots `scale(0.9)` (`styles/press.css`). Durations are the
  `--dur-*` tokens, never written by hand. Popovers, the undo toast, the first-time pin hint, the offline notice and
  «New version ready» (VENT-82) leave the way they came in, with opacity, scale 0.96 and a 6 px blur, on
  `--spring` (critically damped `linear()`, in `tokens.css`; its response is 0.666 of the duration it runs over, 0.27 s
  at `--dur-enter`) over `--dur-enter` (`styles/presence.css`: `@starting-style`
  and `overlay`/`display` allow-discrete for popovers; `data-presence="in|out"`, kept mounted by
  `usePresence` in `components/presence.ts` for `exitMs(reducedMotion)`: `EXIT_MS`, 400 ms, or `FADE_MS` (`--dur-fade`,
  200 ms) under reduced motion, VENT-57); a plain fade under reduced motion. The globe's pole tilt and zoom stretch
  past their limits on the sheet's rubber band under a drag, a pinch or the wheel (`GIVE`: at most 3° of tilt, and 0.25
  or 1.5 of camera distance near or far) and settle back on the orbit's springs on release, at the pinch's end, after 150 ms of wheel rest or on a
  press that stops a flick (`src/globe/orbit-band.ts`); the keys and the framer still stop at the limit. Moving lines
  (the strip's instant line, the phone calendar's line, the DSN playhead) ride `.rail--x|--y` translated by their share
  (`styles/rail.css`), and the phone compass moves by `translate`. Held by `tests/press-motion-css.test.ts`,
  `tests/globe-rubber.test.ts` and `tests/e2e/press-motion.spec.ts`.
- Scroll and targets (VENT-55): everything that scrolls fades the edge it hides content past (apple-design §12): the
  desktop card (`use-scroll-edges.ts`) and, through `useScrollFade` (`src/components/use-scroll-fade.ts`, a callback
  ref) and the `scroll-fade` class (`src/styles/scroll-fade.css`, masked only while an edge fades), the site picker, the
  language list, the phone summary and calendar, the Layers key (its inner `.globe-layers__scroll`, so the glass rim is
  never masked) and the DSN view. Controls drawn under 44 px take 44 through a pseudo-element without changing their
  drawing (`.save-button`, `.search`, `.layer-row__label`; segments are 40 px in a 44 px control and take the track's 2 px
  through their `::after`, VENT-57); the rename field's row is its label,
  which keeps the field's focus. Held by `tests/e2e/vent-55-layout.spec.ts` and `tests/standing-cover.test.ts`.
- Material and controls (VENT-57, the variants the human chose on the VENT-56 canvas): what floats over the Moon
  wears the first pin hint's frosted recipe, the tokens `--float-fill`, `--float-blur` and `--float-rim` in
  `tokens.css` (the surface fill, a 20 px blur, a 1 px inner rim; the phone bar's `--phone-tabs` and `--phone-bar-edge`
  below 768 px): the hint, the compass, the carried pin's readout, the desktop Layers key (which left the Liquid glass)
  and the notice rows. `styles/controls.css` holds one segmented control (the header's view tabs, the site picker's
  regions, «Computed | Horizons | Compare»: a `--fill` track 2 px around a 40 px mark, 44 px in all, radius 12/10, the
  mark `--segment-on`, #636366 in dark and white with `--segment-shadow` in light, text in `--text`; the phone tab bar
  keeps its own look) and one secondary button (`.card-retry`, the strip's and the widgets' retry,
  `.source-note__retry`, `.on-foot__retry` with the dark theme's fill on the 3D view, `.now-button`: a grey pill fully
  rounded, 44 px, weight 600, no underline, dimmed text when disabled). «Saved» keeps «Save»'s grey pill, only its
  bookmark fills; Play is a grey circle like the month arrows. The notices are rows in the update row's look, sharing
  `update.css` (`.update-notice[data-shown]`, `.offline-notice[data-shown]`, `.undo-toast`, `.globe-load` and the
  `notice-row__mark|lines|title|how` parts). Held by `tests/vent-57-controls.test.ts`, `tests/vent-57-notices.test.ts`,
  `tests/e2e/vent-57-controls.spec.ts` and `tests/e2e/vent-57-notices.spec.ts`.
- Card and Sites sheet (VENT-57): on the desktop card the horizon strip and «Listening on Earth» are one block
  (`components/desktop/CardSky.tsx`): the strip, a hairline, then the small Earth beside «Listening on Earth» and one
  flowing row (complex · place and Moon · time left), with «Next: …» under it; in the Horizon view the block holds the
  DSN alone. «Horizons unavailable: showing the computed sky · Try again» sits under the Sunset/Earthset tiles as a row
  of its own (`SourceDown`), and the computed caption stays at the card's end (`SourceCaption`). The phone's Sites
  sheet starts with «Drop a pin», the search, the regions and the list; a gear beside «Done» (`.picker__gear`, 44 px,
  named «Settings») pushes the «Settings» page (`components/phone/SettingsPage.tsx`): «‹ Landing sites», «Settings»,
  «Done», then the «Layers» group (with the empty «Saved sites» hint) and the «Language» row grouped with the «Data
  source» switch. The Language row pushes the language list over it (`lang.css` uses child combinators, so each push
  hides only its own pages); Back or Escape goes back one page and returns the focus to the gear or the row
  (`useFocusOnReturn`, `escapeTo` in `use-push.ts`). Held by `tests/e2e/vent-57-layout.spec.ts`.
- It feels like an app, not a document (VENT-38): `body` sets `user-select: none`, `-webkit-touch-callout: none` and
  a transparent tap highlight (`src/styles/global.css`), so a long press selects no text (no Android search panel)
  and opens no iOS callout; images are not draggable. Selectable again: text fields (`input` other than range,
  `textarea`) and the coordinates (`.card-head__point`, `.summary__coords`), the one datum worth pasting elsewhere.
  The pin refuses the context menu, so a long press stays the start of a carry (`no-context-menu.ts`), and so does the
  Moon while a finger is down on it (`src/pin/place-gesture.ts`). Held by `tests/e2e/app-feel.spec.ts`.
- Must run on a laptop without a dedicated GPU (globe: 64-segment sphere, 2K texture to start, LOLA relief as a normal
  map; sharper maps load only as the zoom needs them: 4K, then 8K on the high tier, see `src/globe/texture-lod.ts`).
  Phones (below 768 px): the globe fills the screen at the low or medium tier (1K texture, up to 4K on zoom, pixel ratio
  capped), one finger turns it and two pinch; a glass top bar holds the title and the site pill, a draggable bottom
  sheet (closed, peek, half with four widgets, full with the site picker or the calendar) follows apple-design's sheet
  physics, and a floating tab bar switches views. One shared instant (`src/calendar/time-store.ts`: live on the clock by
  default, following it to the minute and again when a hidden page comes back, `src/calendar/follow-clock.ts`, so the DSN
  handoff shows when it happens; scrubbed or played) drives the globe's Sun, the widgets and the calendar (the strip
  under the globe on desktop); what is worked out per hour or month stays keyed by them; the hours come from one cached request per site and month (`src/phone/hours-cache.ts`). The answer is
  instant (VENT-36): the views first show the simulator's hours for the same site and range (`computedHours`, cached
  in `src/source/computed-hours.ts`, from the build-time site list), and Horizons replaces them when it arrives
  (`src/source/month-view.ts`, `src/components/use-site-hours.ts`). When Horizons fails the computed hours stay, with
  a quiet «Horizons unavailable: showing the computed sky» note and «Try again» (`src/components/source/SourceNotes.tsx`,
  desktop site card, phone summary and Calendar sheet); only with nothing computed (a site without coordinates) is the failure an
  honest error. While the view shows computed hours the state dot is hollow, a ring in the state's colour (phone pill,
  desktop site button, site card badge, and the selected marker on the globe and the polar map), and the accessible name
  gains «computed» (pill and desktop site button); it fills when Horizons arrives. Computed hours that stay (Computed
  chosen, Horizons or Compare with Horizons down) carry a caption, the human's decision: «Computed by Ventana Lunar ·
  approximate: elevations within 0.05° of JPL Horizons» in the months the model was checked (Nov-Dec 2026), «…
  extrapolated: not checked against JPL Horizons for this month» in any other (`src/source/computed-caption.ts`; the
  bound and the period are `VALIDATED_ELEVATION_DEG`, `VALIDATED_FROM` and `VALIDATED_TO` in
  `packages/sim/src/accuracy.ts`, which `packages/sim/tests/sky.test.ts` holds the model to), under the desktop card's
  figures, the phone summary and the phone Calendar sheet. The bound is on elevation only (the Sun's azimuth differs by
  up to 0.17°). It was measured at two polar points (89.5° S 0° E and IM-2, 84.79° S 29.20° E) and holds for any site:
  the error comes from the sub-solar and sub-Earth points, which do not depend on the site, while the step to the
  site's horizon is exact spherical geometry plus the Earth's parallax (`sky.ts`, `horizon.ts`), and an elevation is
  never further off than the direction it is read from. With Horizons or Compare chosen and Horizons down, the
  «Horizons unavailable» note offers «Try again» (`src/source/month-view.ts`). The computed cache is keyed by point and range, so a moved point is computed again. A «Data source» switch,
  «Computed | Horizons | Compare» (radiogroup in the segmented control's style, never a signal colour,
  `src/components/source/SourceSwitch.tsx`), sits under a hairline in the desktop Layers key and in the phone's «Settings»
  page grouped with the «Language» row (VENT-57); default Horizons, kept in `localStorage` (`src/source/data-source.ts`).
  Computed: the simulator's hours always, for any month (no data window: the month arrows go past 2026-2027),
  dot hollow for good, card source «computed here». Horizons and Compare keep the API's window and say «Outside the
  data window» beyond it. Compare: Horizons shown, and the desktop strip and the phone Calendar sheet hatch the hours
  where the two disagree on Sun, Earth or window (`src/calendar/month-diff.ts`) in neutral white strokes on dark gaps,
  at least 8 px wide on the strip, with «N h differ this month» and a «Differs» legend key (strip legend, and next to
  the count in the Calendar sheet); without Horizons it says so instead of hatching nothing. The globe's marker layer
  and the polar disk are their own stacking contexts, so the Layers key and every floating surface paint over the
  markers and take their clicks. On desktop
  the site card sits beside the view and the header tabs switch the view by hash (`#globe`, `#polar-map`, `#dsn`,
  `src/lib/view-tabs.ts`): the polar map is a south polar stereographic disk from 80° S
  (`src/lib/polar-projection.ts`, image from `scripts/moon_textures.py polar`). No card floats over the globe (VENT-33). On phones the
  top bar's subtitle is the legend's rule, «Sun + Earth = window», each word in its signal colour (`--bar-*-ink`,
  deeper on the light bar for 4.5:1), and the site pill shows the short name over the state at the shared instant with
  its time left in its colour («Window · 7 d left», «Sun · …», «Earth · …», «Neither · …»; `src/phone/site-state.ts`;
  a long site name in the pill ends in an ellipsis first, since the bar keeps the pill its state's longest line
  (`--pill-need`, `src/components/phone/use-pill-room.ts`, VENT-55), then the titles wrap, then a narrow pill drops
  «left», then the name, never the time: `FitLine.tsx`),
  its accessible name the full site name and the state; the sheet's head carries the site's LOLA relief thumbnail. On
  desktop the thumbnail heads the site card, with the state badge and its frame, as a 96 px band at every height (VENT-57).
  Thumbnails exist only south of 80° S (320 px, and 640 px through `srcset` for 2x screens; rendered offline by
  `scripts/site_thumbs.py` and committed, manifest `src/thumbs/thumbs.json`, drawn by `src/components/SiteThumb.tsx`);
  a site without one shows nothing in its place. The globe framing a site (at load and on a pick in the list) turns
  just enough to land it in the free band between the phone's top bar and the sheet's top edge, or the tab bar below
  it (`src/globe/free-band.ts`, `src/globe/site-aim.ts`, `src/globe/site-framer.ts`), and again on the orbit's springs
  when the band moves, until the user moves the globe. The band's watcher (`src/globe/band-watch.ts`) starts observing a
  bar it finds inside its own ResizeObserver callback on the next frame, never there: that raised «ResizeObserver loop
  completed with undelivered notifications» on every phone load (VENT-51). The
  selected marker wears a ring in its state colour that pulses three times (2.4 s each) when the selection or its
  state changes, then rests lit, so an idle page draws no frames (still under reduced motion; `src/globe/marker-ring.ts`), placed with the
  markers (`src/globe/marker-layer.ts`) and hidden with its marker. Under Save-Data
  the globe waits for a «Load the 3D globe» row (`GlobeLoad.tsx`, VENT-57: a globe mark, «Load the 3D globe» over «Data
  saver is on», the whole row one button named by its title and described by the second line) and never loads more
  than its start map. A hidden globe (the phone's
  Horizon and DSN views, any view but the globe on desktop) keeps its stage size and draws nothing: its host reads 0 x 0,
  frames asked meanwhile draw nothing, and showing it again refits the stage and draws once with the current Sun
  (`src/globe/shown-frames.ts`, VENT-51). While hidden, a Moon map that finishes loading is not uploaded
  (`initTexture` is skipped, `moon-textures.ts` reading `ShownFrames.shown()`); the first frame drawn once the globe
  shows again uploads it (VENT-52). Going hidden lowers the Moon to its start map (VENT-86, the human's decision after the
  `?bench` run: the context stays, only the big maps go): `shownFrames(draw, onHide)` tells the shown-to-hidden edge,
  `Moon.rest()` calls `TextureSwap.lower(startLevel)`, which fetches and shows the start map before it frees the 4K or
  8K one (a bigger level still in flight is freed when it lands, `texture-climb.ts`), and the next frame drawn climbs
  back with `track`. Held by `tests/globe-lod.test.ts`, `tests/shown-frames.test.ts` and
  `tests/e2e/vent-86-globe-rest.spec.ts`.
- Glass: the floating surfaces (phone top bar, sheet and tab bar; desktop header, site popover,
  calendar strip and site card) wear Liquid glass or the frosted blur; the phone's site pill, inside the top
  bar's glass, takes only the Liquid rim. Liquid refracts through a
  lens per surface: a rounded-rect displacement map that pulls the backdrop in at the edge (`src/glass/lens-map.ts`),
  added as its own filter to the inline SVG of `src/components/GlassFilter.astro` and named on the surface in
  `--glass-lens` (CSSOM), rebuilt only when the surface's layout size settles (`src/glass/lens-set.ts`); the shared
  `#glass-liquid` filter covers a surface until its lens is built (`--glass-lens` is registered non-inheriting, so a
  surface never borrows its parent's lens; `--glass-liquid-*` tokens, `src/styles/glass.css`). On the top bar and tab
  bar the text sits on a feathered scrim held in from the edge, so it keeps 4.5:1 over the Moon
  while the rim still refracts. The glass gate (`src/glass/`) sets `data-glass="liquid|frosted"` on the root: Liquid only on Chromium
  with `backdrop-filter: url()` (Safari and Firefox parse it but do not draw it), at the medium or high tier, without
  reduced transparency, more contrast or Save-Data, and while a 2 s frame probe holds the tier's budget (timed at load
  and again from the first press, since an idle page redraws nothing under the glass); a slow probe switches to frosted
  live and for the session. `?glass=liquid|frosted` forces a mode, except that `?glass=liquid` never overrides
  reduced transparency or more contrast.
- **The pin** (VENT-37, canvas «Pin C»; it replaced VENT-10's astronaut as the way to pick a point, the human's
  decision: the astronaut did not look professional as a selector): a ring with a dot at its centre, the exact point,
  and no stem; a solid ring and its dot always tell it from an approximate zone's dashed ring. Placing it
  (`src/pin/place-gesture.ts`, bound on each drop surface's element): a click on the globe or the polar disk drops it
  on the point under it (a mouse or a pen); a finger held still for 450 ms (`HOLD_MS`, `src/pin/place-press.ts`) lifts
  it under the finger, to drop in place or drag on, where it rides 64 px above the finger once the finger travels
  (`heldOffset`, `src/pin/carry-geometry.ts`). A hold timer that fires more than 250 ms late (`HOLD_LATE_MS`,
  `src/pin/hold-timer.ts`, a busy main thread) waits the whole hold again, counting only the stillness the page saw, so
  a drag the browser had queued ends the press instead of lifting a pin (VENT-52). A press that travels 4 px or more turns the globe and drops no pin (one
  constant and one comparison for both, `PRESS_SLOP_PX` and `pastSlop` in `src/lib/press-slop.ts`), and a short tap
  does nothing; a press on a globe still coasting from a flick stops it where it is, like Maps, and drops or lifts no
  pin (`src/globe/flick-coast.ts`: the globe marks that `pointerdown` handled); a press on a site marker or a button is theirs (the marker wins); a second finger is a pinch. Once a
  held pin is lifted, the finger's moves are marked handled (`preventDefault` in the capture phase), so the globe's
  drag and pinch (`src/globe/drag.ts`, `pinch.ts`) skip them, and the context menu is refused while a finger is down.
  The standing pin (`src/components/pin/StandingPin.tsx`, placed after every globe frame) is a 44 px button: a press
  lifts it again (Pointer Events with capture, 1:1 from where it was grabbed, at least 64 px above a finger); its dot
  wears the state at the shared instant in its colour, hollow while the state is the simulator's, with the state's
  ring around it pulsing as on a selected marker (three times on a new point or state, then lit; still under reduced
  motion); each drop plays a short fall on
  a critically damped spring (CSS `linear()`, none under reduced motion). Carried (`CarryLayer.tsx`), it is a larger
  ring with the readout beside it, the point and its state (`skyAt`, one instant per move, `src/pin/sky-state.ts`), or
  «Off the Moon · Let go to cancel», and it springs back on critically damped springs from the hand's velocity;
  Escape cancels. The drop surfaces register themselves (`src/pin/surfaces.ts`): the globe (a ray from the camera to
  the sphere, `src/globe/globe-view.ts`) and the polar disk (inverse projection, `src/pin/polar-surface.ts`); a point
  belongs to the surface whose element is under it, so a floating panel is never the Moon. The point under the pin is
  read again whenever the Moon moves under a still pointer (the surfaces tell their drawn frames through
  `Surfaces.subscribe`, bound only while a carry listens (`surface-moves.ts`), and `carrier.ts` re-picks on each: a
  wheel zoom or a second finger mid-drag, the phone sheet re-framing the globe, a resize), and the drop reads it once
  more where the pointer is when let go (`carry-session.ts` `release()`), so readout, pin, drop, address and the
  Horizons request name one point. On the phone the sheet drops to peek while the standing pin is carried (not for a
  held finger, which already chose its point: a moving sheet would re-frame the globe under it), and opens at half on
  a drop. Dropped, the point (snapped to the server's 0.01° grid, `src/pin/custom-point.ts`) becomes the selected
  site under an id that carries it (`@-85.87,61.34`): «Custom point», «Near <nearest listed site> · N km» (great
  circle, `src/pin/nearest-site.ts`; of sites within 0.5 km of the nearest, the shortest name; no subtitle when no
  listed site has coordinates), «… · pinned here», computed at once and then from `/api/v1/ephemeris?lat&lon`
  (`src/pin/point-hours.ts`). On the polar map the site labels and number badges paint over the pin (z-index 5 over
  4), and a label across the pin's ring keeps its place on a dark backing (`labelsOverPins`,
  `src/polar/label-layout.ts`; VENT-37), so a name beside it stays readable. The address carries the point, `?lat=…&lon=…` beside `?site=`
  (`src/pin/point-param.ts`: plain decimals only, latitude within ±90°, east longitude from -180° to 360° like the API,
  wrapped; anything else is ignored, never clamped), so it is shareable and reloads; picking a listed site (in the
  list or on a marker) takes the pin away and the point out of the address, and moves an existing `?site=` to that
  site (`src/pin/places.ts`), so a reload opens what is shown. «Drop a pin» (`DropPin.tsx`) ends the desktop Layers
  key and heads the phone's Sites sheet: a click drops the pin at once on the selected site (or mid view); Enter or
  Space lifts it there for the keyboard, the arrows move it in screen steps (Shift: bigger), Enter drops, Escape
  cancels, and a polite live region says each step; the drop says where it landed and how to move it again (Enter on
  the pin), while the focus stays on the button. The first-time hint (`PinHint.tsx`, `src/pin/first-hint.ts`): «Click
  the Moon to drop a pin», or «Touch and hold the Moon to drop a pin» under `(pointer: coarse)` (by CSS), over the
  globe and in the polar panel's corner on desktop, under the top bar on phones (measured); on desktop it keeps to the room
  right of the Layers key's column (in rem, so it holds at 200 % text), centred over the globe and in the polar
  panel's top right corner, so it never covers the key; gone after the first drop
  or its ✕, kept in `localStorage` (`ventana.pinHint`, refused storage only brings it back next visit). The old
  astronaut (NASA's «Astronaut» model, its offline bake into a sprite sheet and the build dependencies only it used)
  was deleted in VENT-58: nothing has read it since VENT-37 and VENT-54. The desktop Layers key is a 17rem column
  (`--layers-w`) clear of the globe's Moon, and the polar disk is fitted beside the keys in its panel
  (`src/polar/disk-fit.ts`). The Moon's maps are sampled by sphere point, not by the vertices' UVs
  (`src/globe/pole-uv.ts`), so the south pole shows no star; its gradient choices (the 180° seam, the polar cap) are
  scalar GLSL (`GRADIENT_GLSL`) that `tests/globe-pole.test.ts` runs as JavaScript. A site card without an image shows
  its state badge in its head.
- **Globe layers and saved sites** (VENT-37 part 2, canvases «Layers», «Save A», «Saved list», «DeleteUndo»,
  «Empty»). The globe draws through a layer registry (`src/globe/layers/`, API and example for other teams in
  `docs/globe-layers.md`): `createLayerRegistry` (pure: register with an id, a `z` and a visible flag, unregister,
  `setVisible`, `isVisible`, `list` by `z`, `subscribe`), owned by the page and passed to the globe, which mounts it
  from its first frame (`bind.ts`: one root per layer over the canvas, in `z` order, hidden while the layer is, each
  its own stacking context at z-index 0) and registers the two site layers on it (`site-layers.ts`: «Landing sites»
  and «Approximate zones» show or hide their kind on the one marker layer, which keeps its cull and nearest-dot
  clicks; the selected site's marker always shows). `pointLayer` (`point-layer.ts`) draws a layer's points as 44 px
  buttons (`.globe-point`), hidden behind the limb, a click routed to the point nearest the pointer. A renderer may report what it covers (`covers()`, `LayerCover`;
  `pointLayer`'s `coverPx`): `bindLayers.place` returns the shown layers' covers and the graticule's labels keep clear of
  them (`clearOf`, `graticule/place.ts`), so they avoid the saved sites' silver pins (`SAVED_PIN_RADIUS_PX` 7, VENT-52) and the standing pin's ring, which a
  cover-only layer declares (`coverLayer`, `src/globe/layers/cover-layer.ts`, registered by `use-standing-cover.ts` at
  `RING_RADIUS_PX`; VENT-55). The flags are
  kept in `localStorage` (`ventana.layers`, read defensively by `kept-flags.ts`; each write starts from what storage
  holds, and another tab's switch is taken in on the `storage` event, `applyFlags`) and the polar map follows them
  (`components/polar/use-polar-layers.ts`). The Layers key is switches (`components/saved/LayerToggles.tsx`: a
  checkbox with `role="switch"` per row, its key mark, the whole row its label; neutral track, never a signal colour):
  «Landing sites», «Approximate zones», «Saved sites N», «Ghost rovers · soon» off and disabled; on desktop in the key
  (which scrolls when taller than its view), on phones as a «Layers» group in the Sites sheet's «Settings» page, where an empty «Saved
  sites» row says «Drop a pin on the Moon and tap Save to keep a site here». Saving (option A,
  `components/saved/SaveControl.tsx`): «Save» with a bookmark in the head of the desktop card and of the phone sheet
  for a custom point; saved it reads «Saved» (bookmark filled; a press deletes it, with the undo) and a «Name this
  site» field, starting from «Near …», with «Kept on this device only». The phone's full sheet hides that head, so
  the picker's head (`SitePicker.tsx`, `withSave`, set by `SitesPanel.tsx` only) carries an icon-only bookmark beside
  «Done» for a custom point (`components/saved/SaveIcon.tsx`, VENT-42): outline or filled, named «Save» or «Saved:
  press to remove it from this device», a 44 px target, the same action through `useSaveToggle`; the desktop popover
  has none, since the card's «Save» stays in view beside it. The saved sites (`src/saved/`) are a versioned
  document in `localStorage` (`ventana.savedSites`, `{ v: 1, sites }`), every entry checked on read and a bad one
  dropped alone (`saved-schema.ts`: id = its point's grid id, `@-85.87,61.34`, so stable and one per point; name
  cleaned of control and format characters (bidi overrides, zero-width marks), at most 60), newest first, at most 50
  (`SAVED_CAP`; a full list says so instead of saving; entries past it from older storage are all read and shown,
  never dropped on a write). Every change starts from what storage holds then, merged by id, and another tab's change
  is taken in on the `storage` event (`refresh`, `src/lib/storage-events.ts`), so two tabs never overwrite each
  other. A saved site is
  the custom point under its name: `selectedSite(…, savedName)` names it, «Saved · near Nobile Rim 1 · 26 km» and «…
  saved on this device»; the address carries only `?lat&lon` (names stay on the device), and selecting a custom id in
  any way stands the pin there (`src/pin/places.ts`). The «Saved sites» layer (`components/saved/use-saved-layer.ts`)
  draws them as silver pins C, smaller, on the globe and the polar map (`PolarSaved.tsx`); the selected one is the
  standing pin, in its state. The site lists (phone Sites sheet, desktop popover, `SitePicker.tsx`) gain a «Saved N»
  segment (`PickerRegions.tsx`), opened when a saved site is selected: rows with the pin, the name, the state at the
  shared instant with its dot, the point and the check on the selected one, and a «…» menu (`RowMenu.tsx`, a WAI-ARIA
  menu in the browser's popover, on the top layer: Rename in place, Copy coordinates, said in the live region,
  Delete). A delete asks nothing: «Deleted <name> · Undo» (`UndoToast.tsx`, polite live region, 5 s, the time stopped
  while the focus or the pointer is on it; `src/saved/undo.ts`) puts it back where it was. The offer is a row in the update
  row's look with a trash mark and a bold «Undo» (VENT-57), 12 px above the calendar strip on desktop and above the tab
  bar on the phone, both measured (`components/saved/undo-anchor.ts`, `--undo-bottom`). Deletes in a row join one
  offer, «Deleted 2 sites», whose Undo puts every one back at its index. A delete from the keyboard sends the focus to
  Undo; Undo then focuses the site put back and Escape lets the offer go and focuses the row in its place
  (`undo-parts.ts`). Pressing Undo leaves the desktop site popover open: on pointerdown the button becomes a «show»
  invoker of the open popover, so the browser's light dismiss counts it as inside. On desktop a long name is cut with an
  ellipsis in the header's site button (13em; its place line 18em), whole in its accessible name and `title`, so the
  header keeps one row at 1280 px; a row's point never wraps (`.saved-row__coords`). With none saved the segment
  shows «No saved sites yet» and how to save one. An unsaved custom point heads the other lists, checked, so the
  selection is always marked. Under the picker's title everything scrolls as one (`.picker__scroll`), so the phone
  sheet's settings never squeeze the list. The site popover opens and closes its list only on its own toggle, not on
  a nested menu's.
- **Orientation on the globe** (VENT-50, canvas «A + full graticule, discreet», the human's decision). The globe keeps
  north up, so the **compass** (`src/components/compass/CompassButton.tsx`) is a 48 px glass button (`--compass-size`)
  in the globe's top right corner, on phones under the glass top bar and under the first-time hint while it shows
  (measured, `compass-top.ts`; on desktop the hint keeps clear of it, `pin.css`); while the phone sheet's top edge
  covers any of it (at 200 % text the half sheet reaches the full detent) it is marked `data-covered` and leaves view
  and the tab order, coming back as the sheet goes down (`compassCovered`, `use-compass-top.ts`, fed by the sheet edge,
  VENT-51). Its needle is fixed, with a small
  «N», and an Earth mark rides its ring in the screen direction from the Moon's centre to the sub-Earth point at the
  shared instant (`earthMark`, `src/globe/earth-mark.ts`: the screen's axes from the camera's position alone), hollow
  while that point is behind the limb of the whole Moon as the opening zoom shows it (a zoom does not turn the Moon, so
  it never hides the Earth; `LIMB_DISTANCE`, VENT-51), then at the direction it hides in. After each drawn frame the angle goes to the
  button as `--earth-angle` and `data-far`, with no re-render; the component hears only when the mark moves to another
  of eight places, which its accessible name says with what a press does (`compass-name.ts`, `compass.*` messages). A
  press brings the globe back to its opening view: `SOUTH_POLE_VIEW`, framed for the selected site in the free band,
  on the orbit's springs and at once under reduced motion (`SiteFramer.home`; the globe hands the page its
  `GlobeCompass` through `onCompass`, `src/globe/compass-link.ts`). The **graticule** (`src/globe/graticule/`) is no
  layer of the registry and has no switch in the Layers key: the parallels at 85° S, 80° S and 70° S and the meridians
  at 0°, 45° and 90° east and west, pole to pole, are one indexed `LineSegments` of about 500 vertices at radius 1.002
  in the scene, depth-tested against the sphere so they vanish behind the limb, in a thin grey the tokens give
  (`--graticule-line`, never a signal colour). Its labels (11 px, the caption step since VENT-55, written by `formatAngle`, so Spanish says «90° O»)
  and the cross on the south pole are HTML placed after each frame, under the markers, and hidden behind the limb. Each
  label's box is the one the page draws, measured by a hidden sizer holding every label's words (`room.ts`, so it grows
  with the text size; VENT-51), moved straight in from the limb until it is 14 px inside the Moon's disc, left out
  unless it is whole 8 px inside the globe's view (`disk.ts`: the zoomed-in Moon outgrows the view), and left
  out when it would touch a site marker, the selected site's ring or a label placed before it (`clearance.ts`,
  `place.ts`); a parallel may stand on any meridian every 15°, takes the one with the widest gap from the markers and
  keeps it while it stays clear, so labels do not hop as the globe turns. With the eight curated sites near the pole,
  the 85° S label has no room at the opening zoom and shows from about 3.5 radii. An idle globe still draws no
  frames. The label is white on a chip 0.61 opaque (the canvas had grey text on 0.44; the human chose white text over a
  0.84 chip for grey): the least that keeps the text 4.5:1 over the brightest texel the Moon maps hold, which is white (the 2K, 4K and 8K LROC maps reach 255, 255, 255 and the Sun lights a
  texel at most 1.02 times, `tests/graticule-contrast.test.ts`). The globe's label rules in `orientation.css` are scoped under `.globe-graticule`; the bare `.graticule-label` belongs
  to the polar map (`polar.css`): unscoped, the globe's rules loaded later and piled the polar map's five labels in its
  corner; on the panel, dark in both themes, they take `--polar-label` (4.5:1 in every theme and contrast,
  `tests/polar-label-contrast.test.ts`) (VENT-52, `tests/graticule-label-css.test.ts`, `tests/e2e/polar-graticule.spec.ts`). Held by
  `tests/globe-compass.test.ts`, `tests/globe-graticule.test.ts` and `tests/e2e/globe-orientation.spec.ts`.
- **Sites in permanent shadow** (VENT-39, canvas option B, the human's decision). NASA's illumination maps (PGDA
  product 69, LRO LOLA, Mazarico et al. 2011; sources, sha256 and the scales read from the PDS labels in `ASSETS.md`)
  put four approximate sites on a permanently shadowed crater floor: Shackleton (`change7-target`), Haworth, de
  Gerlache Rim 2 and Slater Plain. Their published coordinates stay. The site contract has an optional `shadow`
  (`{ kind: 'psr' | 'dimFloor', avgSun, source }`, `packages/sim/src/site.ts`, checked by the server's
  `site-shadow.ts`), set in `packages/server/data/sites.json` for those four (`psr`) and for «Peak near Cabeus B»
  (`dimFloor`, 11 % average Sun, not PSR). For a `psr` site the Sun answer follows the map, never up: `shadowedHours`
  (`packages/sim/src/shadow.ts`) marks every hour `sunHidden`, which `hasSun` honours, and the web applies it to both
  the API's and the computed hours where the views take them (`src/source/shadowed-hours.ts`, wired in
  `LunarApp.tsx`), so state, pill, badge, markers, month figures, the strip and the DSN block agree; `sunEl` and the
  Earth stay as computed or from Horizons. The Sun widget then reads «Sun · No Sun · Permanent shadow»
  (`phone/body-widget.ts`). A neutral note under the name (`components/shadow/ShadowNote.tsx`, `card/shadow-note.ts`,
  `styles/shadow.css`, never a signal colour): «Permanent shadow · not a landing point» and «NASA's maps put this
  point on a crater floor the Sun never reaches.» on the phone sheet, «Permanent shadow» alone on the desktop card,
  whose precision line already says «not a landing point»; «Crater floor · little Sun» and «NASA's maps give this
  point 11 % of the Sun on average.» for Cabeus B, with no override. The Sun's source joins the computed caption on
  one line (or stands alone with Horizons): «Sun from NASA's permanent-shadow map (LRO LOLA, Mazarico 2011)». The
  phone's half sheet rises (never under its 344 px) until the summary's lowest line
  (`data-sheet-fit`, measured from the content's bottom) clears the tab bar by 12 px, at any width, language and text
  size (`src/sheet/sheet-lift.ts`), and the peek detent rises the same way (never under its 156 px) until the summary's
  head (`data-sheet-peek`: the name, «Save» for a custom point, the coordinates) clears the tab bar by 12 px, re-measured
  while it rests there (`src/sheet/sheet-peek.ts`, VENT-52, `tests/e2e/sheet-peek-card.spec.ts`); when even the full detent is too short (200 % text on a phone), it stops there and
  the summary scrolls instead (`data-sheet-scroll`, `src/sheet/sheet-scroll.ts`), its last line 12 px over the tab bar;
  as on iOS, a finger pulling down on it at its top drags the sheet, any other move scrolls it, and below its top the
  sheet drags from it both ways (`src/sheet/sheet-pull.ts`). For the Mooner session,
  `packages/sim/data/psr-flags.json` lists every curated site south of 80° S with `{id, lat, lon, avgSun, psrShare,
  onPsrFloor}` and a provenance header; `packages/server/tests/sites.test.ts` holds `sites.json` to it. Held by
  `tests/e2e/shadow.spec.ts`.
- **The real horizon in the interface** (VENT-40, canvas option B, the human's decision). Where the terrain decides,
  the tiles say so (`src/phone/terrain-words.ts`): under the level a body reads «Sun 0.1° below level», and a second
  line adds «Over the ridge» (a Sun seen under the level) or «Behind the terrain» (a body up but hidden; never a
  feature the data cannot name, such as a crater rim); the DSN block's reason is «Behind the terrain» when the terrain,
  not the 0° level, hides an Earth that is up (`dsn-model.ts` `behindTerrain`); and the card's rule becomes «Sun and
  Earth over the terrain, Earth 3° up» once its hours were read against a profile (`card/site-card.ts`). The horizon
  strip (`components/horizon/HorizonStrip.tsx`, pure parts in `src/horizon/`): under the desktop card's two tiles and
  over the phone sheet's widgets, the site's whole horizon with north in the centre (S W N E S, `strip-scale.ts`), the
  LOLA skyline in neutral line art over the dashed level, stretched by the «Height ×N» it states (degrees per px across
  over degrees per px up; the site's, from its profile alone, so it holds while the time is scrubbed and across the
  page's strip widths, lowered only on a strip wider than 8:1), the Sun and the Earth of the hour the views show at the
  shared instant (`hour-sky.ts`, so the strip never disagrees with the tiles) in their signal colours, dimmed under the
  skyline and labelled «· hidden» where it hides them (`strip-marks.ts`); a body past the scale is pinned inside its
  edge under a caret (`StripDot.tsx`), and two labels that would touch go to opposite sides of their dots, or stack
  where an edge leaves no room (`strip-labels.ts`, `label-box.ts`). Its source sits in the head beside the stretch,
  as mock B has it: «LOLA · 20 m · Height ×5», whole for a screen reader («LOLA terrain (NASA LRO), 20 m»; the shipped
  profiles' near band, `SHIPPED_RESOLUTION_M`; a fetched one's finest tier), «Smooth horizon · real terrain loading»
  while a custom point's comes, «Smooth horizon» with «Real terrain unavailable here» under the compass when it cannot,
  «Smooth horizon» alone for a listed site north of 80° S. The SVG fills a box the component measures (`use-horizon.ts`), so nothing
  sets a style attribute (CSP); its text alternative says which way each body is, on eight points of the compass, and
  whether the terrain hides it (`horizon-alt.ts`). Styles in `src/styles/horizon.css` (light theme and more contrast
  included). Held by `tests/e2e/horizon.spec.ts` (IM-2 on the ridge on 2026-11-30 20:00 UTC, Haworth's hidden Earth on
  2026-11-22 20:00 UTC, the pin with a stubbed `/api/v1/horizon`, the sheet's fit) and `tests/horizon-strip.test.ts`.
- **DSN mode** (VENT-7, canvases «DsnA» and «DsnC», approved A + C, no DSN row in the calendar, «No link» first, to
  the minute). The complex listening is the simulator's (`activeDsn` over `moonElevationFromDsn` for the three
  `DSN_SITES`), worked out once per UTC day as minute-aligned spans (`packages/sim/src/dsn-timeline.ts`: sampled every
  5 min, each change bisected to its first whole minute, `minute-runs.ts`) and read at the instant by `dsnOutlook`
  (`dsn-outlook.ts`: active, handoff, next turn); it does not depend on the lunar site. Against the Horizons fixtures
  it names the same complex every hour except within an hour of a handoff (`packages/sim/tests/dsn.test.ts`). At the
  canvas instant (IM-2, 2026-11-22 20:00 UTC): Robledo, Moon at 52.3°, Goldstone at 02:16, Canberra at 10:58. The link
  comes first: the site's Earth elevation, from the hour the views show (Horizons or computed) or the simulator before
  they arrive (`components/dsn/use-dsn.ts`), against 3° (`earthLink` in `visibility.ts`: `link`, `low`, `below`).
  None of it runs before the page has started: `useDsn` waits for an idle moment after the first paint (2 s at most,
  `src/lib/after-start.ts`), the block holding its height until then, so the globe starts as fast as without it.
  **A**: a «Listening on Earth» block after the Sunset/Earthset tiles of the desktop card (`ListeningBlock.tsx`) and the
  phone's fourth widget (`DsnCard.tsx`, in place of the old hourly antenna widget): a small Earth as the Moon sees it
  (centred on the sub-lunar point), the complex (short name: Robledo), «Madrid · Moon at 52°», «~6 h left» (whole hours
  from an hour, minutes under it), «Next: Goldstone tomorrow at 02:16 UTC» (the day, by Intl, only when it is not the
  instant's UTC day; times on the 24-hour UTC clock, through Intl, `src/dsn/clock-text.ts`); without a link «No link», «Earth below the horizon» or «Earth too low here (needs 3°)», then
  «Robledo would listen» (`src/dsn/dsn-text.ts`). **C**: the «DSN» view, a header tab after «Polar map» and a phone tab
  after «Calendar» (five tabs; at under 400 px they take 10 px labels so the pseudo-locale fits at 360 px;
  `src/phone/view-actions.ts`: DSN sets `#dsn` with the sheet at half, Globe leaves it): the big Earth looking from
  48° west of the Moon at 15° N, so the antenna the Moon is moving toward is in sight, with «Moon overhead», the dashed
  «Moon above 10°» ring (79° around the sub-lunar point) and labelled antennas; the complex by its whole name
  («Robledo de Chavela»), the other two with «Moon below horizon · next at 02:16»; and the 24 h band of the instant's
  UTC day (`src/dsn/day-band.ts`, `DsnBand.tsx`): a row per complex, grey where it sees the Moon above 10°, white where
  it listens, the playhead with its time chip at the shared instant, each row named for a screen reader («Robledo de
  Chavela: listening 00:00–01:22, 16:10–24:00»). On phones the globe hides under the DSN view's Earth and the sheet
  holds the headline and the band. The Earth (`src/dsn/earth-picture.ts`, `EarthFigure.tsx`): an SVG, graphite ocean,
  land as silver dots from a 1° Natural Earth mask (`src/dsn/land.json`, 6 kB, `scripts/earth-land.mjs`, ASSETS.md),
  the night side from the Earth's real sub-solar point (`earthSubSolarPoint`, `subLunarPoint` in
  `packages/sim/src/earth-view.ts`), the active antenna white with a soft glow that breathes three times when it starts
  listening, then rests lit (an endless loop kept every page drawing frames; still under reduced motion; held while
  the phone sheet moves, `data-moving`, so the move keeps its frames), a resting antenna in sight stands in a moat the land mask clears (`LandMask`, 2 units), so its
  ring is not lost among the land dots (VENT-59), labels in HTML over it (so they follow the text size),
  each moved sideways to stay inside the picture (`src/dsn/label-shift.ts`, `components/dsn/use-label-fit.ts`, through
  a `--label-shift` property set in the CSSOM, so at 200 % text on a phone no label leaves the screen). Never the signal
  colours: `--dsn-*` tokens; the Earth and the DSN view's panel stay dark in both themes. The month's figures add «Hours with DSN» (hours with any complex
  listening, `card/month-facts.ts`).
- **3D terrain view** (VENT-34, the human's verdict on the canvas): the «Horizon» header tab (`#horizon`,
  `src/lib/view-tabs.ts`) and the phone's Horizon tab (sheet at peek, the ground framed in the band between the top bar
  and the sheet's edge) show the selected site or point from the ground, opening in **first person**, the eye 2 m over
  the point, facing the Sun when it is near the sky, else the Earth (VENT-54, the human's decision: no astronaut, no
  lander and no camera switch; `view-camera.ts` has one pose); drag (Pointer Events
  with capture) or the arrows on the focused view turn it (`src/terrain/look-input.ts`, `view-camera.ts`), and Home
  turns it back to where it opened, as the compass's press does (below).
  Turning it: a swipe across the whole width turns 180° (a full turn in two swipes, on a phone and a desktop alike;
  the pitch by the field of view over the height, held to its range, `dragScale`, `look-input.ts`), and on release the
  finger's velocity goes on into the yaw and decays as the globe's flick does (`look-coast.ts`: 0.995 per ms, stops
  under 2°/s, never under reduced motion or for a slow drag; a press stops it; frames are drawn only while it lasts).
  **The view's compass** (VENT-63, canvas «A + press = opening view», the human's decision): the globe's round glass
  `.compass` button in the same corner (on a phone under the top bar through `useCompassTop`; the desktop caption keeps
  to its left), `src/components/compass/HeadingCompass.tsx`: its rose (needle and an upright N, `.compass__rose`) turns
  against the heading so N points to true north, and only the Earth rides the ring, at its azimuth relative to the
  heading, drawn over the N and the needle, filled when the view sees it and hollow when the terrain or the horizon
  hides it (the same answer as the text alternative, `seenBodies`; no Sun, no heading pill; pure parts in
  `src/terrain/heading-compass.ts`). Its turns are custom properties written when the look changes, so an idle view
  still draws no frames. Its name is the heading on eight points («View heading to the north.», `octantOf` in
  `horizon-alt.ts`), the Earth's sentence of `horizon-alt.ts` and «Press to look back where the view opened.», so it
  changes only with the octant. A press and Home turn the view back to where it opened through the scene's `home()`
  (`TerrainScene`, `scene-controller.ts` `homer`), on critically damped springs of 0.4 s, the yaw the short way
  (`src/terrain/look-home.ts`), at once under reduced motion; a drag or an arrow stops them. Held by
  `tests/heading-compass.test.ts` and the compass cases of `tests/e2e/terrain-view.spec.ts`.
  The relief comes **only from our API, as rings of real 3D relief** from the aligned tiles with levels of detail
  (VENT-46, `docs/terrain-api.md`): `GET /api/v1/terrain/tiles?lat&lon&levels` lists the tiles and each is fetched from
  its immutable `?v=` URL, at most 6 in flight, nearest and finest first (`terrain/ring/ring-fetch.ts`, behind a
  **`RingSource`** (`ring-source.ts`): the seam the Web Worker streamer of VENT-47 plugs into; it feeds `RingTile`s,
  plain numbers a worker can transfer, to a `RingStore`). Level 0 (2 km, 15.6 m nodes) is the near ground, level 1 (8
  km, 62.5 m) the mid relief, levels 2 and 3 (32 and 128 km, 250 m and 1 km) the far relief, so the ridges that hide
  the Sun and the Earth are real geometry out to 128 km. Each level draws a window of 256 x 256 of its cells around the
  site (4, 16, 64 and 256 km across, `ring-window.ts`), aligned to the parent's cells: the parent leaves a hole where the
  finer level is loaded and draws it where that tile failed (a 404 or the tries ran out is a hole filled by the parent,
  never the view's failure, `ring-layout.ts`; but when every tile of levels 0 and 1 is a 404 the list was answered for a point with no terrain, and the view ends in the route's final «No terrain covers this point on the server», no «Try again», the coarse tiles no longer asked, `ring-absent.ts`); a skirt hangs on every side of a drawn cell whose neighbour is not drawn
  (T-junctions and open edges, `ring-mesh.ts`); normals are taken across the tile edges when the neighbour is loaded and
  blended into the parent's over 8 cells at a window's edge, so no seam shows a crease (`ring-normals.ts`); and the heights themselves are stitched: a node within 8 cells of its window's edge is pulled toward the parent's surface by a smoothstep, so the edge nodes lie exactly on it (`ring-stitch.ts`; where the levels read different LOLA tiers the raw step is metres), and a parent that arrives late places again only the nodes in that band (the stitch held by `tests/terrain-ring-stitch.test.ts` on the recorded IM-2 relief, L1 to L2 and L2 to L3). Nodes are
  placed with `sampleDirection` and the site's frame (`ring-frame.ts`: x east, y up, z south, the site the origin and
  its ground height y = 0, the Moon's curvature in the positions: a node 2 km away is 1.15 m lower). The tier sets the
  rings (`ring-plan.ts`: high 4 levels at every node, about 520 k triangles; medium level 0 at every second node; low 3
  levels with levels 0 and 1 at every second node), and decoding, placing and meshing run in slices of a few
  milliseconds (`scene/slicer.ts`, 12 ms a turn, a job under 20 ms, and a frame asked for at most every 1.5 s while work waits, counted from the end of the frame that ran (a batch that starts after rest asks its first frame at once), and once more when it is done, because a
  frame draws every ring built so far and in software GL costs a second; `data-working` says when the slices are all run), tile by tile, the finest level first, so the view
  stands as soon as level 0 and 1 land (`ring-session.ts`, `ring-near.ts`) and the coarser rings fill in; a tile that
  arrives rebuilds itself, its neighbours and its parent (`scene/ring-layer.ts`) and every mesh is freed when the view
  leaves. The near ground (props, the eye, the ridge, the Sun's shadow march) is a 257 x 257 grid over 4
  km resampled from the rings (`ring-local.ts`, the `HeightTile` of `tile.ts`), not a second copy of the relief. The
  horizon profile's wall stays as the backdrop beyond the farthest ring (190 km, 40 km on the low tier,
  `far-horizon.ts`), so a ridge past 128 km is still the profile's. Failures are classified as the horizon's (VENT-45: 404 «No
  terrain covers this point on the server», 503 not installed, then «Try again»), but every request of the ring is
  watched for silence and tried on waits of its own (VENT-78, after a tile took over 15 s on a phone): nothing for 4 s,
  no headers or no next bytes, aborts it as a passing failure (`STALL_MS`, `ring/ring-silence.ts`, `ring-watched.ts`), and
  passing failures are tried again after 0.5, 1, 2 and 4 s, a longer Retry-After waited only up to 8 s (`TILE_RETRY`,
  `ring-http.ts`); once the tries run out a tile is a hole its parent fills; the tile route's full queue asks for 2 s
  (`TILE_BUSY_RETRY_SEC`). Held by `tests/terrain-ring-waits.test.ts`. A depth buffer that is logarithmic (the rings reach 190 km, the sky bodies are drawn at 450 to 900 km so
  terrain always hides them) keeps the 0.2 m near plane from z-fighting. The sky at the shared instant (`skyAt`): the Sun at its
  true size and direction is the key light, with hard shadows near the point (shadow map), per vertex over the near ground and, level by level, over
  each ring from a grid of its own (16, 64 and 256 km at 62.5 m to 1 km, `scene/ring-shade.ts`, in slices, no cast shadow beyond a grid's edge; distant rings are shaded by their normals, no haze: the Moon has no
  atmosphere) (`sun-shade.ts`), darkening the whole view when terrain beyond the near ground hides it (`ridge.ts` `blockerOf`,
  `scene/sun-mask.ts`; whether a body is hidden is the horizon profile's answer, the card's, and the near ground only
  names the ridge that does it: VENT-59, the human's decision, held by `tests/terrain-im2-verdict.test.ts`); the Earth at its true size with its true phase, wearing NASA's Blue Marble turned to the face the Moon sees
  (`earth-orientation.ts`, from the sub-lunar point and the ecliptic roll, about 2° accurate); faint seeded stars; the fill is
  the Earth's light by its lit share, the ground's bounce by the Sun's height and a dim sky floor (`sky-light.ts`), and
  when the Sun does not reach the point the exposure opens up instead of faking sunlight (`exposureFor`, `stage.ts`).
  Safe start (VENT-69, after a Pixel 10's first frame took 1.6 s and its GPU reset): the ground's cost is set per tier in
  one place (`src/terrain/ground-policy.ts`, `groundPolicy(tier, leave)`): lunar photometry (`RE_Direct_Ground`), the
  second normal read (`antitile`), the `fwidth` footprint fade and the fine relief (no `fine-tiles/` request, no shader
  block, so the caption names it only when drawn), the small craters' mesh (`craters`, VENT-64) and the clods' grain (`grain`, VENT-67; the VENT-70 audit) are the **high** tier's; medium and low draw the pre-VENT-62 ground
  (`ground-shader.ts` takes the policy), the rocks are capped at 420 at medium and none at low (`rocksCap`), the exposure
  +20 % stays everywhere, and each part is in the material's program cache key (`groundKey`). The scene's programs
  compile before its first frame (`scene/scene-compile.ts`: the maps load first, two hidden triangles in
  `scene-warm-up.ts` stand in for the ring meshes, `renderer.compileAsync`, the loop shut by `loop-gate.ts` meanwhile),
  so the ground compiles once, with its maps; the wait is timed and noted in the report, and past 1 s
  (`COMPILE_BUDGET_MS`) the view steps down a tier like a slow frame; the frame probe now judges a frame that compiled
  against a 1 s ceiling instead of skipping it (`COMPILED_FRAME_CEILING_MS`). A phone with an older PowerVR or any GPU not on the
  capable list starts at low whatever its cores; PowerVR D-Series (the Pixel 10, the human's demo phone) is on it, at medium (`lib/quality.ts`). Blocked WebGL: every renderer is made by
  `lib/gl-renderer.ts`, which records `ventana.glWorked` and `ventana.glLostAt` in `localStorage` (`lib/gl-marks.ts`) and,
  when no context can be made on a browser that has the WebGL constructors and a mark exists, throws a `GlUnavailableError`
  of kind `blocked` (never decided by Chrome's message, which is only kept, with `webglcontextcreationerror`'s
  `statusMessage`, in the report); the globe (`data-status="blocked"`) and the view say `gl.blocked` («The browser blocked
  3D for this site after a graphics fault… Force stop, then reopen»), and without a mark keep «needs WebGL» and «cannot
  start on this device». The view's open mark is also kept in `localStorage` (`view-tier-local.ts`), per tab (`{ tabId: last beat }`, the tab id in
  `sessionStorage`) and beating every 5 s while the view is open; `pagehide` (a normal close or navigation) takes the
  tab's own mark away, and the next start goes a rung lower only for a mark that stopped beating more than 20 s ago and is
  under 24 h old (`diedBefore`): a GPU-reset page death, a browser restart after one, or a tab the OS killed fires no
  `pagehide`. Another tab that is still open, and its leaving, no longer matter; a tab hidden for minutes (timers
  throttled) can read as stale to a tab opened later, the known cost.
  Lighter medium on phones (VENT-73, after a Pixel 10 lost its GPU context after about 3 s of turning at medium, 340 k
  triangles a frame, 719 x 1417 at a pixel ratio of 1.75): the Sun's shadow map is on demand at every tier
  (`renderer.shadowMap.autoUpdate = false`; `scene/shadow-gate.ts` asks `needsUpdate` for the next draw only after a mark: the
  first frame, a relight in `world-light.ts`, a new tile, profile or ring in `applyInput`, and every slicer job that builds or
  shows geometry (`shadow-jobs.ts` `castsShadow`: not the rings' `lit:` and `far` shading, nor the clod and crater bakes)),
  so turning the camera renders no shadow pass (`data-shadows` on the host counts the passes done, held by
  `tests/shadow-gate.test.ts` and `tests/e2e/vent-73-shadow-pass.spec.ts`); a path that adds a shadow caster outside the
  slicer must call `stage.shadow.mark()`. A PowerVR GPU draws the view with no shadow map at every tier (VENT-75,
  `src/terrain/shadow-safety.ts`, read from `unmaskedGpuName` in `stage.ts`), and so does a phone whose browser hides its GPU (no
  `WEBGL_debug_renderer_info`: the Pixel 10 went unrecognised and lost both contexts in the bench, VENT-84; or a name
  that is no GPU's, not matching `KNOWN_GPU`: Brave answers «Brave», and the view lost its context after 9.8 s of turning
  at low, VENT-92; `tests/e2e/vent-84-hidden-gpu-shadows.spec.ts`): the human's bisect on the Pixel 10 kept the context
  with the shadows or the logarithmic depth left out and lost it with both on, even at low; held by
  `tests/shadow-safety.test.ts` and `tests/e2e/vent-75-powervr-shadows.spec.ts` (the GPU's name spoofed). The view's pixel ratio is `terrainPixelRatio` (`src/terrain/pixel-ratio.ts`: a phone
  at medium draws at 1.25 at most, the globe and the desktop keep the tier's cap, `tests/pixel-ratio.test.ts`). While a
  finger drags the view or its swipe coasts on a phone, frames are spaced to about 30 a second
  (`scene/turn-pace.ts`, a scheduler under the loop, `TURN_GAP_MS` 30; a held frame draws as soon as the turn ends so the
  view ends exact; not under reduced motion; idle draws nothing; `tests/turn-pace.test.ts`).
  **One renderer for the view's life** (`use-terrain-scene.ts`, `use-parked.ts`, `scene/scene-point.ts`): when the selected
  point changes the view's input goes away until the new point's tiles land; the mounted scene is **parked** (`data-parked`
  on the host hides its canvas, the loader covers, `rearm()` tells `onDrawn` again), not freed, and `update()` rebuilds the
  world (rings, near ground, props, far horizon, sky, the look back to the new opening) on the same renderer, so no second WebGL
  context is made and no program is compiled again (held by `tests/e2e/vent-69-one-renderer.spec.ts`: contexts made, ground
  shader sources and linked programs counted across a point change). Only leaving the view, a tier change or a lost context frees
  the renderer. The first frame waits for the surface maps at most 5 s (`MAPS_GIVE_UP_MS`, `waitAtMost`); maps that land later are attached, their program compiled off the frame and one more frame asked, and `data-working` stays true until then (VENT-72, `scene/late-maps.ts`, `tests/e2e/vent-72-late-maps.spec.ts`); and a compile
  during which the page was hidden is not judged slow (`page-hidden.ts`). The «browser blocked 3D» message keeps to the phone's
  free band on a backing (`use-help-band.ts` for the globe's, `--on-foot-band-*` for the view's), and asks the sheet to close
  when even the free band is too short for it (200 % text; `roomAsk` in `sheet-channels.ts`, `makeRoom('closed')`)
  (`tests/e2e/vent-69-blocked-band.spec.ts`). Held by `tests/ground-policy.test.ts`, `tests/scene-compile.test.ts`, `tests/gl-memory.test.ts`,
  `tests/view-tier.test.ts` and `tests/e2e/vent-69-safe-start.spec.ts`.
  Ground realism (VENT-62): the ground material alone takes lunar photometry for the Sun (`lunar-photometry.ts`, GLSL twin
  `scene/ground-photometry.ts`: since VENT-68 Hapke et al. 2012 eq. 12 with its Table 1 at 604 nm (`hapke.ts`; w, b, B_S0, B_C0
  published, h_S and h_C derived from g_H) times Lommel-Seeliger, the Sun's disc smoothing the peak (r(0)/r(5°) about 1.26),
  and a calibrated floor past 120° of phase where the model is out of validity, regolith specular off; the
  ground by the antisolar point is 1.34 to 1.64 times the ground beside it, and the ground toward the Sun 0.4 to 0.7 of
  the ground away, held to the Apollo frames by `tests/lunar-photometry.test.ts` and the e2e), exposure +20 % (`EXPOSURE_GAIN`,
  said in the caption), the albedo neutral grey, the grain fading by the pixel footprint (`fwidth`) and the brightness
  blotches at 3 %; the normal-map patch now really applies (it looked for a line before three expands `#include`).
  **Fine real relief** (`src/terrain/fine/`): inside one of Mooner's four tiles (IM-2, Malapert A, Shackleton ridge, Malapert
  Massif) the view asks for `fine-tiles/<site>/heights.png` and `mask.png` (on demand, out of the precache) before the
  ring's tiles, decodes them in stages (`png-grey.ts`, `fine-feather.ts`), puts the NAC heights on ring level 0's nodes by
  the feather's weight with the vertical offset against LOLA (`fine-apply.ts`) and, between nodes, the tile's 5 m slope on
  the shader's normal (`scene/ground-fine.ts`); the caption names it. Rocks follow Golombek & Rapp's size law, partly
  buried, denser on the real near grid's slopes and rims, built in diameter bands by the slicer (`rocks-measured.ts`,
  `scene/props.ts`; q(k) of Golombek & Rapp 1997 eq. 12, held at q(0.02) below their fitted range, plains k 0.004 from
  Diviner: **high only** (`GroundPolicy.rockLaw`; medium keeps main's law, `FIRST_CUT` in `rock-law.ts`, k 0.01 and q never held, byte-identical rocks, held by `tests/rocks-measured.test.ts`). Sources and unverified constants: ASSETS.md.
  **Small craters** (VENT-64, **high tier only** through `ground-policy.ts` `craters`, VENT-70 audit; `?onfoot=craters` leaves them out; a new point frees the old patch and bakes again for the new one, `CraterLayer.setGround(ground, seed)`, and the patch is built once per point; its jobs, like the clods', queue after ring levels 0 and 1 and before levels 2 and 3, so the patch does not wait for the far relief): craters of 0.19 to 12 m as real
  relief in a polar patch of mesh around the eye (`scene/crater-spec.ts` radius 48 m, cells following
  the screen; `crater-mesh.ts`), from one 1024-texel raster read at two scales (`crater-relief.ts`) with Trask's
  equilibrium count and Basilevsky's five degradation classes with their d/D (`crater-law.ts`, Pike's fresh 0.2 with a
  rim, `crater-profile.ts`). Each scale is drawn only while a typical crater spans a few cells, and all fade to nothing at
  the patch's edge, where the rings' ground takes over at the same height (beyond it there are no craters: the mesh cannot
  resolve them). The craters' shadows are a march per vertex toward the Sun (`crater-shade.ts`, no shadow-map acne at 1 to
  7°), times the near ground's mask; the patch receives the sun map, the rings' ground is cut out inside it in colour and
  in the shadow depth (`crater-glsl.ts`, `crater-depth.ts`), and the rocks stand on the craters. Everything is built in
  slicer jobs under 20 ms (`crater-work.ts`, `crater-layer.ts`).
  **Small shadows «mid-way»** (VENT-64, the human's verdict): wherever something small hides the Sun from a point the Sun
  reaches, the fill is scaled by 0.62 (`DARK_SMALL_SHADOWS`, `ground-photometry.ts`), so small shadows land near 8 to 10 %
  of the lit ground instead of 19 to 23 % (Apollo's: 2 to 3 %); the caption still says the shadows are lifted.
  **Clods** (VENT-67, **high tier only**, policy `grain`; `?onfoot=grain` leaves them out; reseeded and freed with a new point): a height field of clods of 3 to 30 mm baked in
  the browser (`clod-law.ts`, `clod-relief.ts`; our calibration, no published law), read at two scales by the ground's
  shader, which gives each pixel a normal and a shadow of its own by a march toward the Sun (`scene/clod-glsl.ts`), no
  displaced mesh, fading by the pixel's footprint (about 13 m); slow noise alternates smooth dust and clusters.
  Rendering: ACES filmic tone mapping, `MeshStandardMaterial` everywhere, the Sun a hard key with a 60 m PCF shadow, baked
  contact occlusion on the stones (`contactAo`). Illustrative and said so in the caption («Fine detail illustrative · relief
  LOLA 20 m» over «Earth: NASA Blue Marble · shadows lifted for legibility», `captionNote`, `onFoot.captionNote`): rounded rocks under
  1 m seeded from the point (`seeded.ts`, `rocks.ts`), the regolith a CC0 photographed material (Poly Haven «Moon 02»,
  albedo and normal, 1K WebP in `src/terrain/maps/`, ASSETS.md) tiled at 3.5 m and read twice, turned and at another
  scale, with a slow brightness noise and a fade with distance so it never repeats (`scene/ground-shader.ts`). Rings at 25, 100 and 500 m with HTML labels, and the ridge that
  hides a body labelled with its height and distance (`on-foot-model.ts`); a text alternative says the heading, where
  each body is and what hides it (`view-alt.ts`); the desktop view keeps the horizon strip under it, and the site card beside it leaves its own strip out (VENT-55). The view loads no model
  (VENT-54 removed the astronaut, the two landers, their glb reader, GLTFLoader, earthshine, contact shadows and the
  idle clip): the Three.js chunk the globe loads at start is back to about 131 kB gzip (the skinned astronaut had
  taken it to 142 kB), the scene's chunk is 15.6 kB smaller, and at the medium tier the view draws 32 to 35 calls and
  about 360 to 400 k triangles. Performance: the panel
  (`components/terrain/TerrainPanel.tsx`, `React.lazy` in `OnFootView.tsx`), its stylesheet (a React 19
  `<link precedence>`, so Astro does not inline it), the scene (`src/terrain/scene/terrain-scene.ts`, a dynamic import)
  load only when the view opens, and the service worker leaves them out of the precache
  (`ON_DEMAND` in `scripts/service-worker.mjs`); it draws only on change (`globe/loop.ts`, counted in `data-frames`),
  the pixel ratio capped by the quality tier, and frees the GPU context on leave. The view's tier is one store for the
  page session (`src/terrain/view-tier.ts`, kept in `sessionStorage` as `ventana.onFootTier`) that the scene and the
  rings both read, so a change remounts both (`data-tier` on the host): it starts at the device's tier, a frame probe
  while the view loads (the render plus a 1 x 1 `readPixels` that waits for the GPU; one frame over 4 target frame
  times, 67 ms on high and 89 ms on medium, and a frame that compiled a shader is not judged: `frame-probe.ts`) steps it
  down one rung, never from a tier the address forces with `?quality=` or from low, and a lost GPU context
  (`webglcontextlost`, VENT-49) frees the scene, drops the tier to low and says «Terrain unavailable right now» with
  «Try again», which mounts it again at low and never happens by itself; the dead canvas and the labels leave the page
  in the browser's event, before the message shows (`guardLost` in `scene-guard.ts`), so no frozen frame or broken-WebGL
  icon appears under it. On a phone the notice keeps to the free band between the top bar and the sheet's measured
  edge at any detent (`use-status-band.ts` writes `--on-foot-band-top` and `--on-foot-band-height` through the CSSOM,
  `src/terrain/status-band.ts`), the caption stepping aside while it shows, and hidden under the full sheet (Sites,
  Calendar; VENT-55); when a lost context's notice
  has no room there (200 % text lifts the half sheet to full) the sheet drops to peek once for that loss, and the scrim
  clears, since `openness` measures from peek when half has risen to full (VENT-51). «Report copied» resets whenever
  the scene's state changes. On a phone the caption keeps under the band's top, which follows the top bar's size too
  (`src/phone/band-moves.ts`: the sheet's edge and a ResizeObserver on the bar), and 10 px over the sheet's measured
  edge (`--on-foot-band-*`), clipped where the band has no room (VENT-59); the scale's labels never overlap (ridge
  first, then 25, 100 and 500 m, a label over a placed one hidden for the frame, `scene/label-declutter.ts`); the host's
  focus ring is an outline at -4 px drawn over its canvas (VENT-52). A language switch is not a died run:
  `switchLocale` calls its injected `leaving` before `location.assign`, wired to `leftOnPurpose` (`view-tier-open.ts`),
  which clears `ventana.onFootOpen`; a reload by the person still counts. A page that dies with the view open (no unmount: a GPU reset can take a phone's page down)
  leaves `ventana.onFootOpen` set in `sessionStorage`; the next view starts one rung lower (kept, never below low, never
  under `?quality=`), once, and its report says «tier dropped to X: previous run ended without unmount»
  (`view-tier-open.ts`, `view-tier-state.ts`, VENT-51); leaving the view clears the mark, and a reload with the view
  open counts as a death (`tests/e2e/on-foot-gpu.spec.ts`). A new instant lights and draws the view again only when the Sun or the Earth, seen from the
  point, moved 0.1° since the sky last placed (`src/terrain/relight.ts`, `scene/world-light.ts`; the live clock makes an
  instant a minute for a Sun that moves 0.008°, a scrub of hours always passes), and `input-change.ts` keeps an input
  that only has a new sky from drawing; the `lit` attribute is updated in place, since three r186 frees a GL buffer only
  with its geometry. «Copy report» in the lost state copies a plain-English crash report (`src/terrain/report/`: at most
  40 steps with seconds since the view opened, the last 8 frames, `renderer.info.memory`, the GPU, browser, screen,
  cores, memory and battery; kept in memory and in `sessionStorage` as `ventana.onFootReport`, the current run and the
  previous one, per-frame data written with the next step; nothing is sent anywhere). `?debug` (any value, or none;
  the human's decision, VENT-49) loads the studio's dev tools in production too: the performance readout, the
  breadcrumbs and the context watch, after the page has started (`src/lib/dev-tools-loader.ts`, the one place that
  imports `src/devtools/boot.ts`), for the globe and the on-foot canvas (`globe/dev-hook.ts`), with the report's steps
  marked in the breadcrumbs (`report-crumbs.ts`, the report stays the source); kept by the language switch, out of the
  precache (`ON_DEMAND`), and Spector.js only in the dev server or a `PUBLIC_PERF_HUD=1` build. The readout starts folded on every screen to one
  line (the frame rate, the slowest frame and a count of the errors under the fold), top left over the header's title,
  so it covers no control; a press unfolds it (VENT-51, `tests/e2e/debug.spec.ts`).
  `scripts/check-no-devtools.mjs` (decision in `devtools-guard.mjs`) fails a build whose pages, start chunks or precache
  carry the tools' markers, or any file Spector.js.
  `?bench` (VENT-81, the human's canvas «Benchmark») is a scripted benchmark for comparing runs on a phone, loaded
  like `?debug` only after the page has started (`src/lib/bench-loader.ts`, the one place that imports
  `src/bench/bench-boot.ts`; mounted by the island's `components/bench/BenchSlot.tsx`), and `?bench` alone loads no
  dev tools. The page's instant stands still at `BENCH_INSTANT_ISO`, 1967-03-19T12:00:00Z (`benchClock`,
  `src/lib/bench-param.ts`): outside the Horizons window, so the views say «Outside the data window» and ask no
  ephemeris, and the on-foot view's sky is the simulator's. Script v1 (`src/bench/script.ts`, `SCRIPT_VERSION`,
  declarative): the globe idle 5 s; turned by synthetic arrow keys and zoomed by four «+» (to 2.2 radii, past the 4K
  map's 3.5), then 3 s; `#horizon` at IM-2 until the on-foot host settles (`data-ready`, `data-working="false"`, not
  `data-parked`, no far tile pending, no frame for 1 s; 60 s at most, `settle.ts`; a failed view, `data-status` lost, blocked, failed, missing or offline, stops the run at once with that reason instead, VENT-83, also while it waits for a point change to park, VENT-87); 72 ArrowRight keys 16 ms apart (a
  full turn at 5° a key); the point changed to Malapert Massif through the site store, as the site list does, until it
  parks and settles, and turned again; `#globe`, 3 s. No synthetic pointer drags (they cannot take capture). Variant A
  is the app; variant B releases the globe's context with `WEBGL_lose_context` as step c starts and keeps it lost
  (`release.ts`; that loss is not counted and the `ventana.glLostAt` mark is put back). Each run is a clean page load
  (`location.replace` with `&benchRun=k`), order A1 B1 A2 B2 A3 B3, and while a run plays the panel is one strip under
  the top bar (VENT-85, canvas «VENT-85 · Banco compacto», option A: the variant, run and step, the step's name, «Stop»
  and the progress; `BenchRunning.tsx`; on a phone under the bar as measured by `use-under-bars.ts` and clear of the
  compass, VENT-88), so the measured view stays in sight, state in `sessionStorage` `ventana.bench`
  (`run-state.ts`, `navigate.ts`); «Stop» forgets it, «Close» leaves `?bench`. Every one of those reloads leaves on
  purpose (`leave.ts`): it forgets the session's kept tier (`ventana.onFootTier`, `TIER_KEY`) so every run starts from
  the device's tier, and clears the open mark with `leftOnPurpose` as the language switch does, so no run counts as a
  death. Each run keeps the tier it ran at; the results and the report list them and say so when they differ
  (`tierSummary`, `report-notes.ts`). A run that throws ends in «Benchmark stopped» with its error (also in the
  report), «Copy report», «Run again» and «Stop». The renderers come through
  `globe/dev-hook.ts` (`attachDevTools(renderer, kind, textureBytes?)` hands them to the dev tools and the
  benchmark), whose `render` is wrapped (`renderer-watch.ts`, `registry.ts`): per step (`meter.ts`) the animation-frame
  intervals of frames the app drew (median fps, p95, worst), long tasks, WebGL contexts alive, the globe's map bytes
  while its context lives («Globe map memory»; three gives no bytes for the on-foot view) and the on-foot texture count, the JS heap, triangles and calls per frame, Resource Timing
  bytes and requests, and context losses; the header has the GPU, browser, viewport and device screen, script version, build
  (the precache's digest, else the first script's name) and the instant. The results (`results.ts`,
  `BenchResults.tsx`) show the full turn's medians for A and B with B's change, and «Copy report» copies every step,
  metric and run as plain English (`report.ts`). The panel fits the viewport over the phone's tab bar at any text
  size: its body scrolls with the app's edge fade and the table scrolls sideways, the actions stay in reach
  (`BenchFrame.tsx`, `BenchTable.tsx`); the first state and the results take the focus to their first button. Params: `benchRuns=1|3` presets the runs (3), `benchFast` scales the
  waits by 0.2 and the turn to 90° for software GL (the e2e). Its chunk and `bench.css` are out of the precache
  (`ON_DEMAND`) and `devtools-guard.mjs` keeps its markers out of the first load. Held by `tests/bench-*.test.ts` and
  `tests/e2e/vent-81-bench.spec.ts`, which is its own Playwright project (`bench`): `npm run e2e` runs the `app`
  project, then `bench` alone (`playwright.config.ts`: its full runs would slow other specs' bounded waits); alone:
  `npx playwright test --project=bench`.
  `?onfoot=shadows,far,shade,logdepth,photometry,antitile,footprint,fine,rocks` (`astronaut` and `lander` from before VENT-54 are ignored, so old links still open)
  leaves parts out to bisect a crash from a phone's address bar (`src/terrain/leave-out.ts`, unknown words ignored,
  listed in `data-onfoot`, kept by the language switch like `?site=`). The API gzips its JSON
  (`compress()` in `packages/server/src/app.ts`; base64 floats shrink about 26 %). Held by `tests/terrain-view.test.ts`,
  `tests/terrain-ring.test.ts`, `tests/view-tier.test.ts`, `tests/frame-probe.test.ts`, `tests/leave-out.test.ts`, `tests/relight.test.ts`, `tests/input-change.test.ts`, `tests/on-foot-report.test.ts`, `tests/on-foot-device.test.ts`, `tests/scene-guard.test.ts` and `tests/e2e/terrain-view.spec.ts` (the ring and tile routes answered by the simulator's own core over a synthetic polar grid, or by real LOLA tiles of IM-2 recorded from the production API at the 20 m tier (VENT-59), `fixtures/terrain-ring-im2/`: first person only, no camera switch, no `.glb` fetched, the caption naming no lander, no idle
  frames, the Sun drawn hidden behind a far wall, none of the view's files in the first load).
  The loader (VENT-60, the human's verdict B→A on the canvas): from the tile list to the scene's first frame, in the
  band the scene frames. `runRing` tells a progress store how the tiles come (`ring/ring-progress.ts`, immutable:
  each wanted tile waiting, landed with its order of arrival and heights, or missed when its level settles;
  `progress-store.ts`, `ring-wanted.ts`), and the panel's loader (`components/terrain/loader/`, styles in
  `styles/on-foot-loader.css`, on demand) reads it: «Finding the terrain tiles», then the plan from above while the
  18 near tiles (levels 0 and 1) land (`LoaderPlan.tsx`: a round scope, heading up, each tile placed by its own corners
  through `sampleDirection` (`terrain/loader/plan-geometry.ts`) and shaded once from its own heights in a job of a
  slicer (`hillshade.ts`, `use-tile-shader.ts`), dashed while waiting, a short flash when it lands, zoomed out once
  the 8 km tiles start; north and the real Sun and Earth on the rim; «Terrain · n of 18 tiles» with a determinate
  bar), then, with the near tiles in, the plan lies down toward the heading (a CSS tilt) and the site's skyline takes
  over (`LoaderSkyline.tsx`: the horizon profile drawn with the scene's own camera, `skyline-camera.ts`, held to
  three's PerspectiveCamera by `tests/vent-60-loader.test.ts`; `VIEW_FOV` in `terrain/view-fov.ts` is shared with
  `stage.ts`; seeded stars, the dashed level, a compositor glint) with «Shaping the ground». The scene's first frame
  (`SceneHooks.onDrawn`, `drawn` from `useTerrainScene`) hands over: the scene fades in under the skyline and the
  line goes after it; the loader unmounts after `HANDOVER_MS` (1.2 s), then the caption shows and «Far relief · n of
  18 tiles» (`FarChip.tsx`, not a live region) until «Far relief · 32 and 128 km in», and goes. Reduced motion: plain
  fades. A failure keeps the skyline and the sky dimmed under the notice, its words centred in the ground when they
  fit (`data-words`). The loader's picture is chosen in one place by the view's tier (`loader-picture.ts`: B→A on
  every tier today). No WebGL and no new request; every move is a transform or an opacity. Held by
  `tests/vent-60-loader.test.ts` and `tests/e2e/vent-60-loader.spec.ts`.
- **Five interface languages** (VENT-35): English (the default and the fallback), Spanish, French, German and Italian,
  each on its own static route (`/`, `/es/`, `/fr/`, `/de/`, `/it/`; `pages/[locale]/index.astro`) with `<html lang>`,
  `hreflang` links and `x-default` → `/`. This replaces the Language rule below for the interface only: every word a
  visitor reads or a screen reader speaks lives in `packages/web/src/i18n/messages/<locale>.json` (one catalogue per
  locale, typed from `en.json`), never as a literal. To add a string: add the key to `en.json` and to the other four,
  then read it with `useI18n().t('key')` in a component or pass the `I18n` into a pure module; counts use plural forms
  (`plural`, by `Intl.PluralRules`), and numbers, dates, months and coordinates go through Intl (`src/i18n/format.ts`).
  Proper nouns (Ventana Lunar, NASA, JPL, DSN stations, the proper names inside site and mission names) are not
  translated; the descriptive words of the site data are, through the `siteName.*` and `siteData.*` patterns
  (`src/i18n/site-names.ts`, `src/i18n/data-text.ts`), whose dates Intl writes. The local rule
  `eslint-rules/no-literal-ui-text.mjs` fails on literal text in JSX and Astro markup and in `aria-label`, `alt`,
  `title`, `placeholder`…; `tests/i18n-catalogues.test.ts` fails when a catalogue misses a key, a placeholder or a
  plural form, or a site status has no translation. The selector (desktop header menu, phone Sites sheet row) keeps the
  choice in `localStorage` and opens the locale's page on the same view and place: the hash and the app's own query
  parameters (`?site=`, `?lat&lon`, `?glass=`; any other is dropped, `src/i18n/switch.ts`); the first visit to `/` opens the browser's language once (`src/i18n/first-visit.ts`,
  inline and CSP-hashed). The pseudo-locale `/en-xa/` (accented, about 40 % longer) exists only for the e2e overflow
  checks: never offered, `noindex`, and left out of the production image (`PSEUDO_LOCALE=0` in the `Dockerfile`).
  Translations were written by Claude: a native speaker should review them before launch. The local pitch is in Spanish
  and does not live here.

## Installable app and offline (VENT-28)

- **Icon «J2»**: a photo-real Moon inside the legend ring, rendered offline by `packages/web/scripts/app_icons.py` from
  the shipped LROC and LOLA maps (outputs and checksums in `ASSETS.md`): 192/512 `any`, 512 `maskable`, the 180 px
  apple-touch-icon, `favicon.ico`/`favicon.svg`, and 30 phase frames (`public/icons/phase/`, about 3 kB each).
- **Manifest per locale**: `/manifest.webmanifest`, `/es/manifest.webmanifest`… (`src/pwa/manifest.ts`), linked from
  each locale page; `start_url` and `scope` are the locale route, so each language installs as its own app. Shortcuts
  open four featured sites through `?site=<id>` (`src/lib/site-param.ts`), which any link can use. The pseudo-locale
  has none.
- **Live parts**: the tab's favicon is redrawn on a canvas (`src/pwa/live-favicon.ts`) with the Moon's phase at the
  shared instant and the ring emphasising the selected site's state (Neither or no data: the full legend), only when
  the frame or the state changes, at most every 250 ms. The phase is `simPhase` (`src/pwa/moon-phase.ts`, behind
  `PhaseSource`): the simulator's sub-solar point against its sub-Earth point (VENT-36), within a quarter of an hour of
  the true phases. The globe's loading state (`GlobeSplash.tsx`) shows J2 with the same phase until the Moon's first
  map is on the running scene (`onTextured`), or 6 s at most, then fades out (over `--dur-fade` under reduced motion,
  VENT-82). A phase frame that fails to load leaves the ring alone and
  is asked again on the next update.
- **Offline**: `scripts/service-worker.mjs` (an Astro integration) bundles `src/pwa/sw-worker.ts` into `dist/sw.js`
  after every build, with the files it caches at install, the whole offline set (every locale's page except `/en-xa/`,
  `_astro/`, the manifests, `icons/` with the 30 phase frames, every site thumbnail, the 1K and 2K maps, the polar map,
  `favicon.ico`, `favicon.svg` and the root `apple-touch-icon.png`), fetched past the HTTP cache (`cache: 'reload'`),
  and the build's digest over every file the worker may keep, which names the static cache (`ventana-static-<digest>`),
  so a deploy drops the old one. A deploy downloads only the files that changed (VENT-90): the build also hashes each
  file the worker may keep (`hashes` in the worker's config, the precache and the files kept on use), the install
  copies from the older build's cache each kept copy whose body still hashes to it (all or nothing: a file it cannot
  have fails it and deletes the new cache), and the activation carries over the older caches' entries whose body
  hashes to the new build's hash (a kept 4K or 8K map) before deleting them; the worker hashes the bodies itself and
  trusts no header (`src/pwa/sw-reuse.ts`, `sw-hash.ts`). The install set has a hard budget of 5 MB (`PRECACHE_BUDGET`, human decision
  2026-10-31): the build logs the precache total and fails over it (4.76 MB with VENT-60's loader, its styles on demand; 4.75 MB with VENT-55's press, presence, rail and scroll-fade sheets; 4.74 MB with VENT-54, no models; 4.78 MB with VENT-52's update row; 4.77 MB with VENT-50's compass and graticule; 4.75 MB with VENT-46's rings, landers and rigged astronaut, their files left out; 4.70 MB with VENT-34's on-foot view, its files left out; 4.68 MB with VENT-40's horizon strip; 4.63 MB with VENT-39's shadow notes; 4.57 MB with VENT-37's saved sites; 4.52 MB when it left the astronaut's sprites out, 4.60 MB with them). The 4K and 8K maps, and any build file not
  precached, are kept cache first the first time the page fetches them. Under Save-Data the worker is not registered
  at all. Pages and API GETs are network first,
  build files cache first; the answer goes to the page before its copy is kept, in the background under `waitUntil`
  (VENT-90); the network's answer always wins (a copy that cannot be kept, a full quota, is skipped), only
  ok answers are kept, a page is kept under its URL without the query string and never as a redirected answer. The
  API's answers live in `ventana-api-v1`, stamped with when they came, the 24 latest only (`src/pwa/sw-api.ts`, like
  `hours-cache.ts`). Offline, the page shows a row in the update row's look (VENT-57, `OfflineNotice.tsx`, `OfflineRow.tsx`): a
  crossed-out cloud, «Offline» over «Showing data from <date>» (each one line, the date cut with an ellipsis, so two lines
  at most at any text size), and the hint's ✕ (`DismissButton` in `UpdateButtons.tsx`), which hides it until the app
  goes offline again (`dismissalAfter`, `pwa/offline-status.ts`); under the lowest top bar, measured, it writes
  `--update-row-space` like the update row, so the pin hint and the phone compass stack under it, and when the network returns the hours are asked again quietly. When a new build's worker takes the page over
  (`controllerchange` on a page that already had a controller, so never on the first install; checked with
  `registration.update()` when the app opens and on each return to the foreground, `src/pwa/update-watch.ts`), a row in
  the pin hint's look (option D among four mockups, the human's choice; `UpdateNotice.tsx`, `UpdateButtons.tsx`,
  `TopNotices.tsx`) is the update: a reload icon, «New version ready» over «Tap to update» or «Click to update» by
  `(pointer: coarse)`, the whole row reloads the same address, and the hint's own ✕ beside it hides it until the app
  opens again, the row leaving as it came through `usePresence` and keeping its room until it has gone (VENT-82); it
  yields to the offline notice while offline. While it shows it writes `--update-row-space` on the root,
  so the first-time pin hint stacks under it and the phone's compass sits under both (`stackHeight`, `compass-top.ts`).
  A chunk loaded on demand that is gone after a deploy (`src/pwa/missing-chunk.ts`: only the dynamic import's own fetch
  failure counts; a module that throws while evaluating, or any render or mount error, is a real error; offline the same
  failure is the network's, marked `offline`, and the view says «Offline: this view needs a connection to load» with no
  update row; the on-foot panel and scene load through `loadOnDemandChunk` (`src/pwa/on-demand-chunk.ts`), which calls
  no `import()` while the browser says it is offline, since a failed module fetch stays failed for the page's life, and
  the view tries the panel again on `online` with a new `React.lazy`, VENT-59; the globe's chunk is precached, so its
  `loadChunk` still imports offline) dispatches `ventana:missing-chunk`, which shows the row even after a ✕; `ChunkBoundary.tsx` holds «Update the app to open this
  view» in the view's place instead of unmounting the island, and the scene says `missing` (`terrain/scene/load-scene.ts`;
  VENT-52, `tests/e2e/missing-chunk.spec.ts`). Registered in
  production builds only; e2e specs block service workers except `tests/e2e/pwa.spec.ts`. Emergency kill switch
  (unregister and delete the caches everywhere): `docs/service-worker.md`. nginx serves `sw.js` and the manifests with `no-cache`, the manifests as
  `application/manifest+json`. The CSP did not change: `default-src 'self'` already covers the worker, the manifest
  and its fetches, and the favicon's `data:` image is under `img-src 'self' data:`.
- **What the platforms do not allow**: the home-screen icon is fixed once installed (iOS never refreshes it, Android at
  most when it updates the WebAPK), so the live Moon is only in the favicon and the loading state. Android builds its
  launch screen from the manifest (`background_color`, name, the 512 icon); iOS shows its own launch screen only from
  `apple-touch-startup-image` files, one per device size, which we do not ship, so it shows a plain screen until the
  page paints. iOS ignores manifest shortcuts and only reads the apple-touch-icon; desktop Safari shows no favicon
  changes for a canvas icon in some versions. A first visit is only cached once the worker has installed: data fetched
  before that is not offline until the next visit.

## Clean Code

The code follows Clean Code, and the size limits are enforced by lint:

- **Single responsibility per module**: one reason to change per file. Split by responsibility with clear names,
  never mechanically to fit a limit.
- **Small functions with intention-revealing names**: a reader knows what a function does from its name.
- **Dependencies injected, no hidden globals**: clocks, `fetch`, the file system roots and limits come in as
  parameters or options, so every unit is testable on its own.
- **No dead code, and no comments that restate the code**: comments explain why, not what.
- **Enforced limits**, from the 42 school Norm adapted to TypeScript, as ESLint errors on `packages/*/src/**` in
  `eslint.config.mjs`: `max-lines` 200 per file and `max-lines-per-function` 25 (both skipping blank lines and
  comments), `max-len` 80 columns for code and comments (URLs, strings, template literals and regular expressions
  exempt), `max-params` 4 (pass an options object for more), at most 5 named functions per file (the local rule
  `eslint-rules/max-functions-per-file.mjs`, tested next to it), and `sonarjs/cognitive-complexity` 15. Tests are
  exempt from all of these size limits (they apply to `packages/*/src/**` only). Do not disable a limit inline: if one
  forces something clearly worse, raise it with the human.
- **Leave it cleaner**: every change leaves the code at least as clean as it found it.

## File header and licence

The code is MIT-licensed (`LICENSE`, © 2026 Universelle). Every code file, new ones included (.ts .tsx .js .mjs .cjs
.astro .css .py .sh, outside `.claude/`, `.english-gate/` and vendored files), starts with the project header from
`scripts/file-header.txt`: after a shebang or a Python encoding line if there is one, inside the frontmatter for
`.astro`. Create the file, then run `npm run headers` (or write the header yourself): it covers tracked files and new
ones not yet added (git-ignored files and symlinks are skipped). CI fails on a code file without it
(`npm run headers:check`), and `node scripts/file-header.mjs --staged` checks the staged files before a commit. The
Moon in the header is drawn by `packages/web/scripts/header_moon.py` (see `ASSETS.md`).

## Commands

| Command | What |
|---|---|
| `npm run dev` | Web dev server at `http://localhost:4321/` |
| `npm run server` | API server (`packages/server`, after `npm run build`) at `http://localhost:3000/api/v1/health` |
| `npm run lint` | ESLint + the anti-slop preset (`eslint.anti-slop.mjs`) over every package |
| `npm run typecheck` | `astro check` for the web, `tsc` for sim, server and the root configs and e2e |
| `npm test` | Vitest unit tests of every package (`packages/*/tests/`) |
| `npm run build` | Static web into `packages/web/dist/`, compiled server into `packages/server/dist/` |
| `npm run e2e` | Playwright smoke against the built web (`tests/e2e/`); in a cloud container set `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux64/chrome` |
| `npm run headers` | Adds or refreshes the file header on every code file; `npm run headers:check` is the CI check |
| `bash .claude/skills/security-gate/scripts/security-gate.sh --strict .` | Security ladder (gitleaks, semgrep, osv-scanner, npm audit) |

Before delivering: lint, typecheck, unit tests, build and e2e green; CI runs the same plus the English gate and the
security ladder.

## Working agreement

Work here is an AgenticFramework trajectory (`VENT-*`): branch + PR, gates green, `ROADMAP.md` and `CHANGELOG.md`
updated in the same PR when something visible changes, architecture diagram in `docs/diagrams/` kept current.
`ROADMAP.md` and `CHANGELOG.md` are written in Spanish (the human reads them).

**Guardián during the hackathon** (human decision, 2026-10-29): `verificador` and `seguridad`, launched by hand
with the round message published by the orchestrator; only a security finding blocks the merge, and everything else
merges and goes to a fix-forward trajectory. QA (human decision, 2026-10-30): `qa` runs on every trajectory that
touches the interface (ephemeral staging, Playwright walkthroughs, screenshots), and `qa-adversario` only at three
milestones: the draggable pin (VENT-10), the MVP close (globe + DSN) and before launch. `qa` findings go to fix
forward. At those milestones a break that `qa-adversario` reproduces in a red test blocks the merge until it is fixed,
and its test then stays as a permanent gate.

**Roadmap canvas** (https://claude.ai/artifact/Sm8QoCwg7DqLbuCSHLPfBg): the live, visual roadmap. It is part of the
definition of done of every step, together with the Dashboard and the vault: when a trajectory or TODO changes state,
update the canvas in the same step with the `ArtifactData` tool (`items/*` status and note, `meta/state` cards and
`updatedAt`; `phases/*` and `milestones/*` when the plan changes). Its data lives in the artifact's database, not in
this repo; only the owner and editors write it. Its text is Spanish (the human reads it).

**Spec document** (Claude Docs «Ventana Lunar · Especificación y roadmap»,
https://claude.ai/artifact/Pm8HcFMSZZJZGtcEjbKxNu): kept current like the canvas. When a trajectory merges or a
decision changes the spec, the orchestrator updates the «Última actualización» line at the top (date chip + one line),
the «Estado al día» table and next steps, and «Cambios de especificación». Its text is Spanish.

<!-- english-gate:start -->
## Language
Write everything technical in English: code, identifiers, comments, tests, commit messages, PR titles and bodies,
branch names, technical docs, config, persisted data (keys, enums, states, file names), internal paths, logs and errors
the end user does not see, and prompts or tool fields for LLM agents. Only what an end user reads is in Spanish: the
UI, notifications, reports. To cite Spanish UI text in English, put it between «», e.g.
`// The card says «Todo correcto» when nothing is broken`. A prompt for an agent whose output a person reads says so
explicitly: "Write in Spanish everything a person will read". The English gate (`.english-gate/`) enforces this in CI
and before each commit; its config lists the interface files, the excluded paths and the proper nouns.
<!-- english-gate:end -->
