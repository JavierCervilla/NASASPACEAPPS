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
 * The panel's side of the walk (VENT-121): where the scene says the eye
 * stands, the site's short name for the chip, «Back» through the scene,
 * and «Drop a pin here» through the pin's places at the eye's latitude
 * and longitude (walk/eye-point.ts).
 */
import { useState } from 'react';
import { inPermanentShadow, type SiteShadow } from '@ventana/sim';
import type { CustomFacts } from '../../../phone/phone-site';
import { siteLabels } from '../../../phone/phone-site';
import type { EyeReport, SkyDirs } from '../../../terrain/scene/scene-types';
import { eyeLatLon } from '../../../terrain/walk/eye-point';
import { usePin } from '../../pin/context';
import type { WalkProps } from './WalkLayer';

/** What the walk needs to know of the site. */
export interface WalkSite {
  readonly lat: number;
  readonly lonEast: number;
  readonly name?: string | undefined;
  readonly mission?: string | undefined;
  readonly custom?: CustomFacts | undefined;
  /** NASA's shadow at the site (VENT-39), which the eye inherits. */
  readonly shadow?: SiteShadow | undefined;
}

/** The chip's name of `site`: the pill's («IM-2»), or the custom point's. */
const chipName = (site: WalkSite): string => {
  const named = { name: site.name ?? '', mission: site.mission ?? '' };
  return siteLabels(site.custom ? { ...named, custom: site.custom } : named)
    .pill;
};

/**
 * The eye the scene reports, and the walk's props for the stage once the
 * scene's `back` is known.
 */
export function useWalk(site: WalkSite, sky: SkyDirs | null) {
  const kit = usePin();
  const [eye, setEye] = useState<EyeReport | null>(null);
  const onPin = kit && eye
    ? () => kit.places.drop(eyeLatLon(site, eye.at)) : null;
  const name = chipName(site);
  const walkSky = sky && inPermanentShadow(site.shadow)
    ? { ...sky, sunHidden: true } : sky;
  return { onEye: setEye,
    walk: (onBack: () => void): WalkProps =>
      ({ eye, sky: walkSky, site: name, onBack, onPin }) };
}
