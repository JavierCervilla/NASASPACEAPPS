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
 * selected site or point from the ground, opening in third person behind
 * the astronaut, with «Third person | First person»; the real relief from
 * our API, the far horizon from the point's profile, the Sun and the
 * Earth at the shared instant, illustrative fine detail said so in the
 * caption, the scale's rings, and on desktop the horizon strip under it.
 * Loaded lazily (OnFootView.tsx), the scene lazily again; its styles are a
 * stylesheet React loads before it shows (precedence), so neither they
 * nor the scene reach the first load or the precache.
 */
import { useId, useRef, useState } from 'react';
import type { HoursResult } from '../../phone/widgets-loader';
import type { SceneHooks } from '../../terrain/scene/scene-types';
import { viewAlt } from '../../terrain/view-alt';
import stylesUrl from '../../styles/on-foot.css?url';
import { SiteHorizon } from '../horizon/SiteHorizon';
import { useI18n } from '../i18n-context';
import { OnFootStageArea } from './OnFootStageArea';
import { useOnFoot, type OnFootParts } from './use-on-foot';
import { useTerrainScene, type BandMoves } from './use-terrain-scene';

export interface PanelProps extends OnFootParts {
  readonly layout: 'desktop' | 'phone';
  /** The month's hours, for the desktop's horizon strip. */
  readonly hours?: HoursResult;
  readonly band?: SceneHooks['band'];
  readonly bandMoves?: BandMoves;
}

/** The view's state, its scene and the heading its text alternative says. */
function usePanel(props: PanelProps) {
  const view = useOnFoot(props);
  const host = useRef<HTMLDivElement>(null);
  const [yaw, setYaw] = useState<number | null>(null);
  const hooks = { onLook: (look: { yawDeg: number }) => setYaw(look.yawDeg),
    band: props.band, bandMoves: props.bandMoves };
  const scene = useTerrainScene(host, view.input, hooks, props.viewTier);
  const onMode = (mode: typeof view.mode): void => {
    setYaw(null);
    view.setMode(mode);
  };
  const onRetry = (): void => {
    scene.retry();
    if (view.tile.state.kind === 'unavailable') view.tile.retry();
  };
  const yawDeg = yaw ?? view.startYawDeg;
  return { view, host, status: scene.status, onMode, onRetry, yawDeg };
}

export default function TerrainPanel(props: PanelProps) {
  const i18n = useI18n();
  const { view, host, status, onMode, onRetry, yawDeg } = usePanel(props);
  const altId = useId();
  const alt = view.input
    ? viewAlt(i18n, { mode: view.mode, yawDeg, bodies: view.bodies }) : '';
  const area = { view, host, status, onMode, onRetry, altId };
  const { layout, hours } = props;
  return (
    <section className={`on-foot on-foot--${layout}`} aria-label={i18n.t('onFoot.view')}>
      <link rel="stylesheet" href={stylesUrl} precedence="on-foot" />
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
