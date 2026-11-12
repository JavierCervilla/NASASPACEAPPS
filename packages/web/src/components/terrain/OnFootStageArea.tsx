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
 * labels), the loader over it until it has drawn (VENT-60), the caption,
 * the night's notice (VENT-100), the far relief's chip and the compass
 * (VENT-63) and the walk's chip, edge card and hint (VENT-121) once it
 * has, and what it says when it cannot draw.
 */
import type { ComponentProps, RefObject } from 'react';
import { HeadingCompass } from '../compass/HeadingCompass';
import { useI18n } from '../i18n-context';
import { FarChip } from './loader/FarChip';
import { OnFootLoader, type LoaderProps } from './loader/OnFootLoader';
import { OnFootCaption } from './OnFootCaption';
import { OnFootNight } from './OnFootNight';
import { OnFootStatus } from './OnFootStatus';
import type { useOnFoot } from './use-on-foot';
import type { SceneStatus } from './use-terrain-scene';
import { WalkLayer, type WalkProps } from './walk/WalkLayer';

interface Props {
  readonly view: ReturnType<typeof useOnFoot>;
  readonly host: RefObject<HTMLDivElement | null>;
  readonly status: SceneStatus;
  /** The scene has drawn its first frame. */
  readonly drawn: boolean;
  /** The loader over the scene, or null when it does not show (VENT-60). */
  readonly loader: LoaderProps | null;
  /** «Try again»: the relief's, or the scene's after a lost context. */
  readonly onRetry: () => void;
  /** «Copy report» in the lost state: whether anything was copied. */
  readonly onCopyReport: () => Promise<boolean>;
  /** The text alternative's id. */
  readonly altId: string;
  /** The compass in the corner, shown once the view stands (VENT-63). */
  readonly compass: ComponentProps<typeof HeadingCompass>;
  /** The walk's chip, edge card and hint (VENT-121). */
  readonly walk: WalkProps;
}

interface TopProps {
  readonly view: Props['view'];
  /** The relief's resolution once the scene has drawn, else null. */
  readonly resolution: number | null;
  readonly drawn: boolean;
}

/** Over the scene: the night's notice, the caption and the far chip. */
function StageTop({ view, resolution, drawn }: TopProps) {
  const tile = view.tile.state;
  const fine = tile.kind === 'ready' ? tile.ring.fine?.site ?? null : null;
  return (
    <div className="on-foot__top">
      {resolution !== null && view.night.notice
        ? <OnFootNight notice={view.night.notice} /> : null}
      {resolution === null
        ? null
        : <OnFootCaption resolutionM={resolution} night={view.night.night}
          fine={fine} />}
      <FarChip progress={view.tile.progress} drawn={drawn} />
    </div>
  );
}

export function OnFootStageArea(props: Props) {
  const { view, host, status, onRetry, onCopyReport, altId } = props;
  const { t } = useI18n();
  const tile = view.tile.state;
  const resolution = tile.kind === 'ready' && props.drawn
    ? tile.ring.resolutionM : null;
  return (
    <div className="on-foot__stage">
      <div ref={host} className="on-foot__host" tabIndex={0} role="application" aria-roledescription={t('onFoot.role')} aria-label={t('onFoot.view')} aria-describedby={altId} data-status={status} />
      {props.loader ? <OnFootLoader {...props.loader} /> : null}
      <StageTop view={view} resolution={resolution} drawn={props.drawn} />
      {props.drawn && status === 'ready'
        ? (
          <>
            <HeadingCompass {...props.compass} />
            <WalkLayer {...props.walk} />
          </>
        ) : null}
      <OnFootStatus located={view.located} tile={tile} scene={status}
        onRetry={onRetry} onCopyReport={onCopyReport} />
    </div>
  );
}
