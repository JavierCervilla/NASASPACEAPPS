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
 * The on-foot view's loader (VENT-60): what the view shows from the tile
 * list to the scene's first frame, in the band the scene frames (the
 * phone's free band, the whole stage on a desktop). How the tiles come
 * (ring-progress.ts) drives its phase and words; its picture is the one
 * the loader's chooser picked (loader-picture.ts): the site's descent film
 * (VENT-117) while it shows, else the plan and the skyline (B→A), which a
 * failure always keeps, dimmed. Covering the scene until it has drawn,
 * then fading off it (on-foot-loader.css).
 */
import type { HorizonProfile } from '@ventana/sim';
import {
  useLayoutEffect, useMemo, useSyncExternalStore, type CSSProperties,
  type RefObject,
} from 'react';
import type { LatLon } from '../../../lib/polar-projection';
import { isPhoneViewport } from '../../../lib/viewport';
import { loaderPhase } from '../../../terrain/loader/loader-phase';
import { filmShows } from '../../../terrain/loader/film-gate';
import { loaderWords } from '../../../terrain/loader/loader-words';
import { planLayout } from '../../../terrain/loader/plan-geometry';
import {
  loaderCamera, project, type LoaderCamera,
} from '../../../terrain/loader/skyline-camera';
import { startYaw } from '../../../terrain/on-foot-model';
import type { ProgressStore } from '../../../terrain/ring/progress-store';
import type { SkyDirs } from '../../../terrain/scene/scene-types';
import { startLook } from '../../../terrain/view-camera';
import { VIEW_FOV } from '../../../terrain/view-fov';
import { useBoxSize } from '../../horizon/use-horizon';
import { useI18n } from '../../i18n-context';
import { LoaderFilm as Film } from './LoaderFilm';
import { LoaderStatus } from './LoaderStatus';
import { TilesThenSkyline } from './TilesThenSkyline';
import type { LoaderFilm } from './use-loader-film';

export interface LoaderProps {
  readonly progress: ProgressStore;
  readonly point: LatLon;
  readonly sky: SkyDirs;
  readonly profile: HorizonProfile | null;
  readonly seed: number;
  /** The near ground stands. */
  readonly ready: boolean;
  /** The scene has drawn its first frame. */
  readonly drawn: boolean;
  /** A failure is said over it: only the skyline stays, dimmed. */
  readonly failed: boolean;
  /** The site's descent film (VENT-117), or null. */
  readonly film: LoaderFilm | null;
}

/** The scene's camera on the measured band, at the opening look. */
function useCamera(sky: SkyDirs, w: number, h: number) {
  const phone = isPhoneViewport();
  const yaw = startYaw(sky);
  const cam = useMemo(() => loaderCamera({ w, h },
    phone ? VIEW_FOV.phone : VIEW_FOV.wide, startLook(yaw)), [w, h, yaw,
    phone]);
  return { cam, phone };
}

/** Kept between the level and a failure's words, px. */
const UNDER_LEVEL_PX = 12;

/** The px the view's notice takes: its words, buttons and padding. */
function noticeNeeds(stage: HTMLElement | null | undefined): number {
  const notice = stage?.querySelector<HTMLElement>('.on-foot__status');
  const [first, last] = [notice?.firstElementChild, notice?.lastElementChild];
  if (!notice || !first || !last) return 0;
  const { paddingTop, paddingBottom } = getComputedStyle(notice);
  return last.getBoundingClientRect().bottom - first.getBoundingClientRect()
    .top + Number.parseFloat(paddingTop) + Number.parseFloat(paddingBottom);
}

/**
 * Writes on the stage where the ground starts under the skyline, px from
 * the band's top (as use-status-band.ts writes the band), and marks the
 * loader when a failure's words fit in the ground below it, where they are
 * then centred (on-foot-loader.css); when they do not (large text, a short
 * band) they keep the whole band.
 */
function useGroundWords(ref: RefObject<HTMLDivElement | null>,
  cam: LoaderCamera, failed: boolean): void {
  useLayoutEffect(() => {
    const el = ref.current;
    const stage = el?.parentElement;
    const level = project(cam, cam.look.yawDeg, 0)?.[1] ?? cam.h / 2;
    const top = Math.round(level + UNDER_LEVEL_PX);
    stage?.style.setProperty('--loader-ground-top', `${top}px`);
    const fits = failed && cam.h - top >= noticeNeeds(stage);
    if (el) el.dataset['words'] = fits ? 'ground' : 'band';
  });
}

/** The film to show: not under a failure's words, nor once it failed. */
function filmOf({ film, failed }: LoaderProps): LoaderFilm | null {
  return !failed && filmShows(film?.state ?? null) ? film : null;
}

export function OnFootLoader(props: LoaderProps) {
  const i18n = useI18n();
  const { progress: store, failed } = props;
  const progress = useSyncExternalStore(store.subscribe, store.get, store.get);
  const phase = loaderPhase({ progress, ready: props.ready,
    drawn: props.drawn });
  const [ref, box] = useBoxSize<HTMLDivElement>();
  const { cam, phone } = useCamera(props.sky, box.width, box.height);
  useGroundWords(ref, cam, failed);
  const film = filmOf(props);
  const top: CSSProperties = { '--loader-status-top':
    `${planLayout({ w: box.width, h: box.height }, phone).statusTop}px` } as CSSProperties;
  const words = phase === 'handover' ? 'shaping' : phase;
  return (
    <div ref={ref} className="on-foot-loader" data-phase={failed ? 'failed' : phase} data-picture={film ? 'film' : 'tiles'} style={top}>
      {film ? <Film key={film.film.poster} {...film} /> : null}
      {!film && box.width > 0 ? (
        <TilesThenSkyline phase={failed ? 'failed' : phase} progress={progress} cam={cam} phone={phone} point={props.point} sky={props.sky} profile={props.profile} seed={props.seed} />
      ) : null}
      {failed ? null : (
        <LoaderStatus words={loaderWords(i18n, words, progress)} leaving={phase === 'handover'} />
      )}
    </div>
  );
}
