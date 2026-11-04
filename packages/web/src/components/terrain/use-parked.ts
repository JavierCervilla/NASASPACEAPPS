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
 * Parks the mounted scene while the view has no input (VENT-69): the
 * selected point changed and the next point's tiles are loading. The scene
 * keeps its one renderer (one canvas, one GPU context) and the programs it
 * compiled; only its canvas is hidden (`data-parked`, on-foot.css) and its
 * next frame told again (`rearm`), so the loader covers the wait.
 */
import { useEffect, type RefObject } from 'react';
import type { TerrainScene } from '../../terrain/scene/scene-types';

interface Parts {
  readonly ready: boolean;
  readonly host: RefObject<HTMLDivElement | null>;
  readonly scene: RefObject<TerrainScene | null>;
  /** The scene was parked. */
  /** Holds the latest callback: parking happens once per `ready` change. */
  readonly onParked: RefObject<() => void>;
}

export function useParked({ ready, host, scene, onParked }: Parts): void {
  useEffect(() => {
    if (ready || !scene.current) return;
    host.current?.setAttribute('data-parked', 'true');
    scene.current.rearm();
    onParked.current();
  }, [ready, host, scene, onParked]);
}
