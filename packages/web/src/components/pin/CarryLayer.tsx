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
 * The carried pin (VENT-10, VENT-37), over everything and never in the way
 * of the pointer: the pin, lifted, its centre on the drop point, and the
 * readout beside it: the point and its state at the shared instant, or
 * «Off the Moon · Let go to cancel». Positions follow the pointer through
 * transforms only.
 */
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { CarryView } from '../../pin/carry-view';
import { formatCoords } from '../../i18n/format';
import { useI18n } from '../i18n-context';
import { usePin, useWatched } from './context';

/** Between the pin's centre and the readout, px. */
const READOUT_GAP_PX = 30;

const placed = ({ x, y }: CarryView['at']): CSSProperties => ({
  transform: `translate3d(${x}px, ${y}px, 0)`,
});

function Readout({ view }: { readonly view: CarryView }) {
  const i18n = useI18n();
  // Beside the pin, on the side with more room, never off the screen.
  const right = window.innerWidth - view.at.x;
  const flip = right < view.at.x;
  const room = (flip ? view.at.x : right) - READOUT_GAP_PX;
  const style = { ...placed(view.at), maxWidth: `${room}px` };
  const { point, state } = view;
  return (
    <p className="pin-readout" data-side={flip ? 'left' : 'right'} style={style}>
      {point && state ? (
        <>
          <span className="pin-readout__coords">{formatCoords(i18n, point.lat, point.lonEast)}</span>
          <span className="pin-readout__state" data-tone={state}>{i18n.t(`state.line.${state}`)}</span>
        </>
      ) : (
        <span className="pin-readout__off">{i18n.t('pin.readout.off')}</span>
      )}
    </p>
  );
}

export function CarryLayer() {
  const kit = usePin();
  const view = useWatched(kit?.carrier.view ?? null, null);
  if (!kit || !view) return null;
  return createPortal(
    <div
      className="pin-carry"
      data-phase={view.phase}
      data-mode={view.mode}
      data-over={view.point ? 'moon' : 'off'}
      data-state={view.state ?? 'off'}
      aria-hidden="true"
    >
      <span className="pin-carry__pin" style={placed(view.at)} />
      {view.phase === 'carry' ? <Readout view={view} /> : null}
    </div>,
    document.body,
  );
}
