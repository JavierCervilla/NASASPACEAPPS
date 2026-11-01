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
 * The carried astronaut (VENT-10), over everything and never in the way
 * of the pointer: the figure, tilted as if held (upright under reduced
 * motion) with its shadow, the crosshair on the drop point, and the
 * readout beside it: the point and its state at the shared instant, or
 * «Off the Moon · Let go and it walks home». Positions follow the
 * pointer through transforms only.
 */
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { CarryView } from '../../astronaut/carry-view';
import { formatCoords } from '../../i18n/format';
import { useI18n } from '../i18n-context';
import { useAstronaut, useWatched } from './context';
import { Figure } from './Figure';

/** Between the feet and the readout, px (the figure's half width). */
const READOUT_GAP_PX = 56;

const at = ({ x, y }: CarryView['feet'], extra = ''): CSSProperties => ({
  transform: `translate3d(${x}px, ${y}px, 0)${extra}`,
});

function Readout({ view }: { readonly view: CarryView }) {
  const i18n = useI18n();
  // Beside the figure, on the side with more room, never off the screen.
  const right = window.innerWidth - view.feet.x;
  const flip = right < view.feet.x;
  const room = (flip ? view.feet.x : right) - READOUT_GAP_PX;
  const style = { ...at(view.feet), maxWidth: `${room}px` };
  const { point, state } = view;
  return (
    <p className="astro-readout" data-side={flip ? 'left' : 'right'} style={style}>
      {point && state ? (
        <>
          <span className="astro-readout__coords">{formatCoords(i18n, point.lat, point.lonEast)}</span>
          <span className="astro-readout__state" data-tone={state}>{i18n.t(`state.line.${state}`)}</span>
        </>
      ) : (
        <span className="astro-readout__off">{i18n.t('astro.readout.off')}</span>
      )}
    </p>
  );
}

/** The figure, its shadow and the crosshair at the feet. */
function Carried({ view, reduced }: { view: CarryView; reduced: boolean }) {
  const lean = reduced ? '' : ` rotate(${view.lean}deg)`;
  return (
    <>
      <span className="astro-carry__shadow" style={at(view.feet)} />
      {view.point ? <span className="astro-carry__cross" style={at(view.feet)} /> : null}
      <span className="astro-carry__figure" style={at(view.feet, lean)}>
        <Figure pose={reduced ? 'stand' : 'carry'} visor={view.state ?? 'idle'} />
      </span>
    </>
  );
}

export function CarryLayer() {
  const kit = useAstronaut();
  const view = useWatched(kit?.carrier.view ?? null, null);
  if (!kit || !view) return null;
  return createPortal(
    <div
      className="astro-carry"
      data-phase={view.phase}
      data-mode={view.mode}
      data-over={view.point ? 'moon' : 'off'}
      data-state={view.state ?? 'off'}
      aria-hidden="true"
    >
      <Carried view={view} reduced={kit.reducedMotion()} />
      {view.phase === 'carry' ? <Readout view={view} /> : null}
    </div>,
    document.body,
  );
}
