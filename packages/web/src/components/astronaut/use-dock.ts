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
 * The astronaut's dock button (VENT-10), on the desktop Layers key and
 * beside the phone's tab bar: what it shows and what it does. Home, it
 * holds the figure: a drag lifts it, and Enter lifts it for the arrow
 * keys. With the figure on the Moon it stands empty, and a tap or Enter
 * brings the astronaut home.
 */
import { useRef, type PointerEvent, type RefObject } from 'react';
import type { AstronautKit } from '../../astronaut/kit';
import { useI18n } from '../i18n-context';
import { useAstronaut, useWatched } from './context';
import { liftHandlers } from './lift-handlers';
import { noContextMenu } from './no-context-menu';

export type DockStatus = 'home' | 'carry' | 'away';

const HOME = { kind: 'home' } as const;

/** The dock's status, re-rendering when the astronaut moves. */
export function useDockStatus(): DockStatus {
  const kit = useAstronaut();
  const place = useWatched(kit?.places.place ?? null, HOME);
  const carried = useWatched(kit?.carrier.view ?? null, null);
  if (carried) return 'carry';
  return place.kind === 'moon' ? 'away' : 'home';
}

/**
 * A tap or Enter on the empty dock brings the astronaut home; the click
 * that ends a drag from the full dock does nothing.
 */
function bringHomeOnClick(
  kit: AstronautKit | null,
  status: DockStatus,
  pressed: RefObject<DockStatus | null>,
  say: string,
): () => void {
  return () => {
    const press = pressed.current;
    pressed.current = null;
    if (!kit || status !== 'away' || press === 'home') return;
    kit.places.bringHome();
    kit.live.set(say);
  };
}

/** The dock's status, name and handlers. */
export function useDock() {
  const kit = useAstronaut();
  const status = useDockStatus();
  const { t } = useI18n();
  const pressed = useRef<DockStatus | null>(null);
  const lift = kit ? liftHandlers(kit, () => undefined) : null;
  const home = status === 'home' ? lift : null;
  const onClick = bringHomeOnClick(kit, status, pressed, t('astro.say.home'));
  const key = status === 'away' ? 'astro.dock.label.away' : 'astro.dock.label.home';
  return {
    status,
    label: t(key),
    onClick,
    onKeyDown: home?.onKeyDown,
    onContextMenu: noContextMenu,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      pressed.current = status;
      home?.onPointerDown(event);
    },
  };
}
