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
  antenna agree every hour except within one hour of a transition.
- **Backend** (`packages/server`, Node + Hono; decided 2026-10-29): one service on Dokploy serves all site data, for the
  curated sites and for custom coordinates. It queries JPL Horizons and caches the responses on disk, because Horizons
  is slow and rate limited and the spec wants answers in under 3 s. The browser never calls Horizons directly.
- **Deploy**: Dokploy builds the `Dockerfile` (static build served by nginx, `nginx.conf`) from `main`, at the domain
  root (`SITE_BASE` sets a sub-path if ever needed). The API has its own `packages/server/Dockerfile` (built from the
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
  default, scrubbed or played) drives the globe's Sun, the widgets and the calendar (the strip under the globe on
  desktop); the hours come from one cached request per site and month (`src/phone/hours-cache.ts`). The answer is
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
  `src/components/source/SourceSwitch.tsx`), sits under a hairline in the desktop Layers key and in the phone's Sites
  sheet grouped with the «Language» row; default Horizons, kept in `localStorage` (`src/source/data-source.ts`).
  Computed: the simulator's hours always, for any month (no data window: the month arrows go past 2026-2027),
  dot hollow for good, card source «computed here». Horizons and Compare keep the API's window and say «Outside the
  data window» beyond it. Compare: Horizons shown, and the desktop strip and the phone Calendar sheet hatch the hours
  where the two disagree on Sun, Earth or window (`src/calendar/month-diff.ts`) in neutral white strokes on dark gaps,
  at least 8 px wide on the strip, with «N h differ this month» and a «Differs» legend key (strip legend, and next to
  the count in the Calendar sheet); without Horizons it says so instead of hatching nothing. The globe's marker layer
  and the polar disk are their own stacking contexts, so the Layers key and every floating surface paint over the
  markers and take their clicks. On desktop
  the site card sits beside the view and the header tabs switch the view by hash (`#globe`, `#polar-map`,
  `src/lib/view-tabs.ts`): the polar map is a south polar stereographic disk from 80° S
  (`src/lib/polar-projection.ts`, image from `scripts/moon_textures.py polar`). No card floats over the globe (VENT-33). On phones the
  top bar's subtitle is the legend's rule, «Sun + Earth = window», each word in its signal colour (`--bar-*-ink`,
  deeper on the light bar for 4.5:1), and the site pill shows the short name over the state at the shared instant with
  its time left in its colour («Window · 7 d left», «Sun · …», «Earth · …», «Neither · …»; `src/phone/site-state.ts`;
  the titles wrap first, then a narrow pill drops «left», then the name, never the time: `FitLine.tsx`),
  its accessible name the full site name and the state; the sheet's head carries the site's LOLA relief thumbnail. On
  desktop the thumbnail heads the site card, with the state badge and its frame, as a 96 px band on short windows.
  Thumbnails exist only south of 80° S (320 px, and 640 px through `srcset` for 2x screens; rendered offline by
  `scripts/site_thumbs.py` and committed, manifest `src/thumbs/thumbs.json`, drawn by `src/components/SiteThumb.tsx`);
  a site without one shows nothing in its place. The globe framing a site (at load and on a pick in the list) turns
  just enough to land it in the free band between the phone's top bar and the sheet's top edge, or the tab bar below
  it (`src/globe/free-band.ts`, `src/globe/site-aim.ts`, `src/globe/site-framer.ts`), and again on the orbit's springs
  when the band moves, until the user moves the globe. The
  selected marker wears a ring in its state colour that pulses (2.4 s; still under reduced motion), placed with the
  markers (`src/globe/marker-layer.ts`) and hidden with its marker. Under Save-Data
  the globe waits for a «Load the 3D globe» button and never loads more than its start map.
- Glass: the floating surfaces (phone top bar, sheet and tab bar; desktop header, site popover, Layers key,
  calendar strip and site card) wear Liquid glass or the frosted blur; the phone's site pill, inside the top
  bar's glass, takes only the Liquid rim. Liquid refracts through a
  lens per surface: a rounded-rect displacement map that pulls the backdrop in at the edge (`src/glass/lens-map.ts`),
  added as its own filter to the inline SVG of `src/components/GlassFilter.astro` and named on the surface in
  `--glass-lens` (CSSOM), rebuilt only when the surface's layout size settles (`src/glass/lens-set.ts`); the shared
  `#glass-liquid` filter covers a surface until its lens is built (`--glass-lens` is registered non-inheriting, so a
  surface never borrows its parent's lens; `--glass-liquid-*` tokens, `src/styles/glass.css`). On the top bar, tab bar
  and Layers key the text sits on a feathered scrim held in from the edge, so it keeps 4.5:1 over the Moon
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
  (`heldOffset`, `src/pin/carry-geometry.ts`). A press that travels 4 px or more turns the globe and drops no pin (one
  constant and one comparison for both, `PRESS_SLOP_PX` and `pastSlop` in `src/lib/press-slop.ts`), and a short tap
  does nothing; a press on a globe still coasting from a flick stops it where it is, like Maps, and drops or lifts no
  pin (`src/globe/flick-coast.ts`: the globe marks that `pointerdown` handled); a press on a site marker or a button is theirs (the marker wins); a second finger is a pinch. Once a
  held pin is lifted, the finger's moves are marked handled (`preventDefault` in the capture phase), so the globe's
  drag and pinch (`src/globe/drag.ts`, `pinch.ts`) skip them, and the context menu is refused while a finger is down.
  The standing pin (`src/components/pin/StandingPin.tsx`, placed after every globe frame) is a 44 px button: a press
  lifts it again (Pointer Events with capture, 1:1 from where it was grabbed, at least 64 px above a finger); its dot
  wears the state at the shared instant in its colour, hollow while the state is the simulator's, with the state's
  ring around it pulsing as on a selected marker (2.4 s; still under reduced motion); each drop plays a short fall on
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
  or its ✕, kept in `localStorage` (`ventana.pinHint`, refused storage only brings it back next visit). The
  astronaut's assets stay for VENT-34, where it comes back (dropped, it takes you to the 3D terrain), and nothing in
  the page imports them, so none ships: NASA's «Astronaut» model (`packages/web/models/astronaut.glb` and its suit
  texture `astronaut-suit.webp`, built by `packages/web/scripts/astronaut.mjs`: arms lowered, the NASA insignia and
  the mission patch covered with fabric, the US flags kept) and its offline bake, `scripts/astronaut-figures.mjs`
  (Playwright's Chromium pinned to SwiftShader, byte-stable; `--check` re-bakes and compares), into the lossless
  sprite sheet `src/astronaut/figures.webp` (77 kB, manifest `figures.json`, held by
  `tests/astronaut-figures.test.ts`): two poses times five visor colours. The desktop Layers key is a 17rem column
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
  buttons (`.globe-point`), hidden behind the limb, a click routed to the point nearest the pointer. The flags are
  kept in `localStorage` (`ventana.layers`, read defensively by `kept-flags.ts`; each write starts from what storage
  holds, and another tab's switch is taken in on the `storage` event, `applyFlags`) and the polar map follows them
  (`components/polar/use-polar-layers.ts`). The Layers key is switches (`components/saved/LayerToggles.tsx`: a
  checkbox with `role="switch"` per row, its key mark, the whole row its label; neutral track, never a signal colour):
  «Landing sites», «Approximate zones», «Saved sites N», «Ghost rovers · soon» off and disabled; on desktop in the key
  (which scrolls when taller than its view), on phones as a «Layers» group in the Sites sheet, where an empty «Saved
  sites» row says «Drop a pin on the Moon and tap Save to keep a site here». Saving (option A,
  `components/saved/SaveControl.tsx`): «Save» with a bookmark in the head of the desktop card and of the phone sheet
  for a custom point; saved it reads «Saved» (bookmark filled; a press deletes it, with the undo) and a «Name this
  site» field, starting from «Near …», with «Kept on this device only». The saved sites (`src/saved/`) are a versioned
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
  while the focus or the pointer is on it; `src/saved/undo.ts`) puts it back where it was. Deletes in a row join one
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
  map is on the running scene (`onTextured`), or 6 s at most. A phase frame that fails to load leaves the ring alone and
  is asked again on the next update.
- **Offline**: `scripts/service-worker.mjs` (an Astro integration) bundles `src/pwa/sw-worker.ts` into `dist/sw.js`
  after every build, with the files it caches at install, the whole offline set (every locale's page except `/en-xa/`,
  `_astro/`, the manifests, `icons/` with the 30 phase frames, every site thumbnail, the 1K and 2K maps, the polar map,
  `favicon.ico`, `favicon.svg` and the root `apple-touch-icon.png`), fetched past the HTTP cache (`cache: 'reload'`),
  and the build's digest over every file the worker may keep, which names the static cache (`ventana-static-<digest>`),
  so a deploy drops the old one. The install set has a hard budget of 5 MB (`PRECACHE_BUDGET`, human decision
  2026-10-31): the build logs the precache total and fails over it (4.57 MB with VENT-37's saved sites; 4.52 MB when it left the astronaut's sprites out, 4.60 MB with them). The 4K and 8K maps, and any build file not
  precached, are kept cache first the first time the page fetches them. Under Save-Data the worker is not registered
  at all. Pages and API GETs are network first,
  build files cache first; the network's answer always wins (a copy that cannot be kept, a full quota, is skipped), only
  ok answers are kept, a page is kept under its URL without the query string and never as a redirected answer. The
  API's answers live in `ventana-api-v1`, stamped with when they came, the 24 latest only (`src/pwa/sw-api.ts`, like
  `hours-cache.ts`). Offline, the page shows «Offline · data from <date>» (`OfflineNotice.tsx`, under the lowest top
  bar, measured, two lines at most), and when the network returns the hours are asked again quietly. Registered in
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
