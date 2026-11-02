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
 * What the on-foot scene tells the panel (VENT-49): the look and the band
 * (the panel's own), a lost GPU context (the tier drops to low, then the
 * panel frees the scene and says so) and a slow load (a tier down, when the
 * tier may step down at all).
 */
import type { RefObject } from 'react';
import type { SceneHooks } from '../../terrain/scene/scene-types';
import type { ViewTier } from '../../terrain/view-tier';

/** The hooks the panel itself gives the scene. */
export type PanelHooks = Pick<SceneHooks, 'onLook' | 'band'>;

export interface HookParts {
  readonly panel: RefObject<PanelHooks>;
  readonly tier: ViewTier;
  /** The context was lost, and the tier has been dropped. */
  readonly onLost: () => void;
}

/** The scene's hooks: the panel's, a loss and a slow load. */
export function sceneHooks({ panel, tier, onLost }: HookParts): SceneHooks {
  return {
    onLook: (look) => panel.current.onLook(look),
    band: () => panel.current.band?.() ?? null,
    onLost: () => {
      tier.afterLoss();
      onLost();
    },
    onSlowFrame: tier.get().steppable ? tier.stepDown : undefined,
  };
}
