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
 * The on-foot view's stage (VENT-34): the focusable host the scene draws
 * in (React renders nothing inside it: the scene owns its canvas and
 * labels), the camera's switch and the caption over it, and what it says
 * when it cannot draw.
 */
import type { RefObject } from 'react';
import type { CameraMode } from '../../terrain/view-camera';
import { useI18n } from '../i18n-context';
import { ModeSwitch } from './ModeSwitch';
import { OnFootCaption } from './OnFootCaption';
import { OnFootStatus } from './OnFootStatus';
import type { useOnFoot } from './use-on-foot';
import type { SceneStatus } from './use-terrain-scene';

interface Props {
  readonly view: ReturnType<typeof useOnFoot>;
  readonly host: RefObject<HTMLDivElement | null>;
  readonly status: SceneStatus;
  readonly onMode: (mode: CameraMode) => void;
  /** The text alternative's id. */
  readonly altId: string;
}

export function OnFootStageArea({ view, host, status, onMode, altId }: Props) {
  const { t } = useI18n();
  const tile = view.tile.state;
  const resolution = tile.kind === 'ready' ? tile.ring.resolutionM : null;
  return (
    <div className="on-foot__stage">
      <div ref={host} className="on-foot__host" tabIndex={0} role="application" aria-roledescription={t('onFoot.role')} aria-label={t('onFoot.view')} aria-describedby={altId} data-status={status} data-mode={view.mode} />
      <div className="on-foot__top">
        <ModeSwitch mode={view.mode} onMode={onMode} />
        {resolution === null
          ? null
          : <OnFootCaption resolutionM={resolution} lander={view.lander} />}
      </div>
      <OnFootStatus located={view.located} tile={tile} scene={status}
        onRetry={view.tile.retry} />
    </div>
  );
}
