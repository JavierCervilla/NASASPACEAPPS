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
 * The on-foot 3D view (VENT-34, the human's verdict on the canvas): the
 * selected site or point from the ground, in first person, the eye 2 m
 * over the point (VENT-54); the real relief from
 * our API, the far horizon from the point's profile, the Sun and the
 * Earth at the shared instant, illustrative fine detail said so in the
 * caption, the scale's rings, and on desktop the horizon strip under it.
 * Loaded lazily (OnFootView.tsx), the scene lazily again; its styles are a
 * stylesheet React loads before it shows (precedence), so neither they
 * nor the scene reach the first load or the precache.
 */
import { useId, useRef, useState } from 'react';
import { pageReport } from '../../terrain/report/page-report';
import type { SceneHooks } from '../../terrain/scene/scene-types';
import { viewAlt } from '../../terrain/view-alt';
import stylesUrl from '../../styles/on-foot.css?url';
import { SiteHorizon } from '../horizon/SiteHorizon';
import { createWatchedValue, type WatchedValue }
  from '../../lib/watched-value';
import { useI18n } from '../i18n-context';
import { OnFootStageArea } from './OnFootStageArea';
import { useLoaderProps } from './loader/use-loader-props';
import loaderStylesUrl from '../../styles/on-foot-loader.css?url';
import { copyReport } from './use-copy-report';
import { useOnFoot, type OnFootParts } from './use-on-foot';
import { useReportRun } from './use-report-run';
import { useStatusBand } from './use-status-band';
import { useTerrainScene, type BandMoves } from './use-terrain-scene';
import { useWalk } from './walk/use-walk';

export interface PanelProps extends OnFootParts {
  readonly layout: 'desktop' | 'phone';
  readonly band?: SceneHooks['band'];
  readonly bandMoves?: BandMoves;
  /** Asks the phone's sheet to make room for the notice of a lost view. */
  readonly makeRoom?: (to?: 'peek' | 'closed') => void;
  /** The phone sheet's top edge, for the compass (VENT-63); none: desktop. */
  readonly sheetEdge?: WatchedValue<number | null>;
}

/** No sheet: the desktop's edge, never set. */
const NO_SHEET = createWatchedValue<number | null>(null);

/** «Try again»: the scene's, and the relief's when it was unavailable. */
const retryOf = (
  report: { step: (text: string) => void },
  scene: { retry: () => void },
  view: ReturnType<typeof useOnFoot>,
) => (): void => {
  report.step('«Try again» pressed');
  scene.retry();
  if (view.tile.state.kind === 'unavailable') view.tile.retry();
};

/**
 * The view's state, its scene, the heading its text alternative says and
 * what its compass shows (VENT-63).
 */
function usePanel(props: PanelProps) {
  const report = pageReport();
  useReportRun(report, props.viewTier);
  const view = useOnFoot(props, report);
  const host = useRef<HTMLDivElement>(null);
  const [yaw, setYaw] = useState<number | null>(null);
  const { band, bandMoves, makeRoom } = props;
  const walking = useWalk(props.site, view.sky);
  const hooks = { onLook: (look: { yawDeg: number }) => setYaw(look.yawDeg),
    band, bandMoves, report, onEye: walking.onEye, onScans: view.onScans };
  const scene = useTerrainScene(host, view.input, hooks, props.viewTier);
  useStatusBand({ host, status: scene.status, band, bandMoves, makeRoom });
  const onRetry = retryOf(report, scene, view);
  const onCopyReport = (): Promise<boolean> => copyReport(report);
  const yawDeg = yaw ?? view.startYawDeg;
  const { loader, drawn } = useLoaderProps({ panel: props, view, scene });
  const compass = { yawDeg, onHome: scene.home, sheetEdge: props.sheetEdge
    ?? NO_SHEET, earth: view.bodies.find((body) => body.id === 'earth') };
  return { view, host, status: scene.status, drawn, loader,
    onRetry, onCopyReport, yawDeg, compass, walk: walking.walk(scene.back) };
}

export default function TerrainPanel(props: PanelProps) {
  const i18n = useI18n();
  const { view, host, status, drawn, loader, onRetry, onCopyReport,
    yawDeg, compass, walk } = usePanel(props);
  const altId = useId();
  const alt = view.input ? viewAlt(i18n, { yawDeg, bodies: view.bodies,
    where: walk.eye, site: walk.site }) : '';
  const area = { view, host, status, drawn, loader, onRetry, onCopyReport,
    altId, compass, walk };
  const { layout, hours } = props;
  return (
    <section className={`on-foot on-foot--${layout}`} aria-label={i18n.t('onFoot.view')}>
      <link rel="stylesheet" href={stylesUrl} precedence="on-foot" />
      <link rel="stylesheet" href={loaderStylesUrl} precedence="on-foot" />
      <OnFootStageArea {...area} />
      <p id={altId} className="visually-hidden">
        {`${alt} ${i18n.t('onFoot.help')}`.trim()}
      </p>
      {layout === 'desktop' && hours ? (
        <SiteHorizon horizons={props.horizons} site={props.site} atMs={view.atMs} hours={hours} className="horizon--on-foot" />
      ) : null}
    </section>
  );
}
