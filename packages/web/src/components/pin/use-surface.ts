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
 * Registers the globe and the polar map as places to drop the pin on
 * while they are on the page (VENT-10), and hands their surface to the
 * pin standing on them and to the gesture that places it (VENT-37).
 */
import { useEffect, useState, type RefObject } from 'react';
import { polarSurface } from '../../pin/polar-surface';
import type { DropSurface } from '../../pin/surfaces';
import type { GlobeView } from '../../globe/globe-view';
import { usePin } from './context';

/**
 * `surface` registered while mounted, and a click or a held finger on it
 * placing the pin; null without one.
 */
function useRegistered(surface: DropSurface | null): DropSurface | null {
  const kit = usePin();
  useEffect(() => {
    if (!kit || !surface) return undefined;
    const remove = kit.surfaces.add(surface);
    const unbind = kit.placeOn(surface.host);
    return () => {
      remove();
      unbind();
    };
  }, [kit, surface]);
  return surface;
}

/** The globe's surface: its viewport, once the scene runs. */
export function useGlobeSurface(
  host: RefObject<HTMLElement | null>,
  view: GlobeView | null,
): DropSurface | null {
  const [surface, setSurface] = useState<DropSurface | null>(null);
  useEffect(() => {
    const el = host.current;
    setSurface(el && view ? { host: el, ...view } : null);
  }, [host, view]);
  return useRegistered(surface);
}

/** The polar map's surface: its disk. */
export function usePolarSurface(
  disk: RefObject<HTMLElement | null>,
): DropSurface | null {
  const [surface, setSurface] = useState<DropSurface | null>(null);
  useEffect(() => {
    const el = disk.current;
    setSurface(el ? polarSurface(el) : null);
  }, [disk]);
  return useRegistered(surface);
}
