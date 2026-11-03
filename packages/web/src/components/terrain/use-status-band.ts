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
 * The phone's notice in the free band (VENT-51): the on-foot stage fills
 * the screen under the top bar and the sheet, so the band between them is
 * written into the stage's `--on-foot-band-top` and `--on-foot-band-height`
 * (through the CSSOM, so no style attribute meets the CSP), followed as the
 * sheet moves, and the notice is placed in it (on-foot.css). When the GPU
 * context is lost and the band has no room for the notice, the sheet is
 * asked once, for that loss, to make room.
 */
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { SceneHooks } from '../../terrain/scene/scene-types';
import {
  bandInStage,
  noticeFits,
  type StageBand,
} from '../../terrain/status-band';
import type { BandMoves, SceneStatus } from './use-terrain-scene';

export interface StatusBandParts {
  readonly host: RefObject<HTMLDivElement | null>;
  readonly status: SceneStatus;
  /** The free band in viewport px; none on a desktop. */
  readonly band?: SceneHooks['band'] | undefined;
  readonly bandMoves?: BandMoves | undefined;
  /** Asks the sheet to make room for the notice. */
  readonly makeRoom?: (() => void) | undefined;
}

/** Writes the band into `stage`'s custom properties; returns it. */
function placeBand(stage: HTMLElement, parts: StatusBandParts): StageBand {
  const screen = parts.band?.() ?? null;
  const top = stage.getBoundingClientRect().top;
  const band = screen ? bandInStage(screen, top) : { top: 0, height: 0 };
  stage.style.setProperty('--on-foot-band-top', `${band.top}px`);
  stage.style.setProperty('--on-foot-band-height', `${band.height}px`);
  return band;
}

/** The px the notice's words and buttons take, its padding included. */
function noticeHeight(stage: HTMLElement): number {
  const notice = stage.querySelector('.on-foot__status');
  const first = notice?.firstElementChild;
  const last = notice?.lastElementChild;
  if (!notice || !first || !last) return 0;
  const { paddingTop, paddingBottom } = getComputedStyle(notice);
  const words = last.getBoundingClientRect().bottom
    - first.getBoundingClientRect().top;
  return words + Number.parseFloat(paddingTop)
    + Number.parseFloat(paddingBottom);
}

type Latest = RefObject<StatusBandParts>;
type Host = StatusBandParts['host'];

/** Keeps the band written as the sheet moves and the window resizes. */
function useBandFollow(latest: Latest, host: Host, phone: boolean): void {
  useEffect(() => {
    const stage = host.current?.parentElement;
    if (!phone || !stage) return undefined;
    const follow = (): void => void placeBand(stage, latest.current);
    follow();
    window.addEventListener('resize', follow);
    const off = latest.current.bandMoves?.(follow);
    return () => {
      window.removeEventListener('resize', follow);
      off?.();
    };
  }, [latest, host, phone]);
}

/** On a loss with no room for the notice, asks the sheet once for some. */
function useRoomOnLoss(latest: Latest, phone: boolean, status: SceneStatus) {
  const asked = useRef(false);
  useLayoutEffect(() => {
    const stage = latest.current.host.current?.parentElement;
    if (!phone || !stage) return;
    const band = placeBand(stage, latest.current);
    if (status !== 'lost') asked.current = false;
    if (status !== 'lost' || asked.current) return;
    if (noticeFits(noticeHeight(stage), band)) return;
    asked.current = true;
    latest.current.makeRoom?.();
  }, [latest, phone, status]);
}

/** Places the phone's notice in the free band; nothing on a desktop. */
export function useStatusBand(parts: StatusBandParts): void {
  const latest = useRef(parts);
  useLayoutEffect(() => {
    latest.current = parts;
  });
  const phone = parts.band !== undefined;
  useBandFollow(latest, parts.host, phone);
  useRoomOnLoss(latest, phone, parts.status);
}
