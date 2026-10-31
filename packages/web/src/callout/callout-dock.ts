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
 * Where the selected site's callout docks (VENT-32, validated canvases
 * «FixedCalloutPhone», «FixedCalloutPhoneClosed» and «FixedCalloutDesktop»):
 * a fixed card at the bottom left of the globe, not beside its marker. On
 * a phone it rides 12 px above the sheet's top edge, or above the tab bar
 * when the sheet is lower; on a desktop it stands 14 px above the Layers
 * key, on its left edge. Where the image card has no room there (a short
 * laptop window) it drops to the compact card, and where even that has
 * none (large text) it hides: beside the key it would stand over the
 * globe's middle and the selected marker (QA F2), and the site card beside
 * the globe already shows the site. Pure, so it is tested alone.
 */

/** A box in px from the globe host's top left. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The phone card's gap to the screen's left edge and to the sheet. */
export const PHONE_GAP_PX = 12;
/** The desktop card's gap to the Layers key below it. */
export const DESKTOP_GAP_PX = 14;
/** Where the Layers key sits (styles/globe.css) when it is not drawn. */
const DESKTOP_INSET_PX = 20;
/** The least room the desktop card leaves to the globe's top and right. */
const DESKTOP_EDGE_PX = 8;

/** What the dock is measured from; px from the globe host's top left. */
export interface CalloutLayout {
  /** The phone layout (below 768 px) or the desktop one. */
  readonly phone: boolean;
  readonly hostWidth: number;
  readonly hostHeight: number;
  /** The card's own size. */
  readonly cardWidth: number;
  readonly cardHeight: number;
  /** The phone sheet's top edge; no sheet: +Infinity. */
  readonly sheetTop: number;
  /** The phone tab bar's top edge; none: +Infinity. */
  readonly tabsTop: number;
  /** The phone top bar's bottom edge; none: 0. */
  readonly barBottom: number;
  /** The desktop Layers key's box; null while it is not drawn. */
  readonly layers: Box | null;
}

/** The card's left edge and the line its bottom edge sits on. */
export interface CalloutDock {
  readonly left: number;
  readonly bottom: number;
}

function phoneDock(layout: CalloutLayout): CalloutDock | null {
  const edge = Math.min(layout.sheetTop, layout.tabsTop, layout.hostHeight);
  const bottom = edge - PHONE_GAP_PX;
  // At full height, or a short screen, it would reach the top bar: hide.
  const room = bottom - layout.cardHeight - layout.barBottom;
  return room < PHONE_GAP_PX ? null : { left: PHONE_GAP_PX, bottom };
}

/** `dock` if the desktop card fits inside the globe there, else null. */
function fits(layout: CalloutLayout, dock: CalloutDock): CalloutDock | null {
  const top = dock.bottom - layout.cardHeight;
  const right = dock.left + layout.cardWidth;
  const inside =
    top >= DESKTOP_EDGE_PX && right <= layout.hostWidth - DESKTOP_EDGE_PX;
  return inside ? dock : null;
}

function desktopDock(layout: CalloutLayout): CalloutDock | null {
  const { layers, hostHeight } = layout;
  if (!layers) {
    const bottom = hostHeight - DESKTOP_INSET_PX;
    return fits(layout, { left: DESKTOP_INSET_PX, bottom });
  }
  const above = { left: layers.left, bottom: layers.top - DESKTOP_GAP_PX };
  return fits(layout, above);
}

/** Where the card docks for `layout`, or null when there is no room. */
export function dockCallout(layout: CalloutLayout): CalloutDock | null {
  return layout.phone ? phoneDock(layout) : desktopDock(layout);
}

/** Which desktop card shows: the image card, or the compact one. */
export interface CalloutFit {
  readonly dock: CalloutDock | null;
  readonly compact: boolean;
  /** The image card's height, as last measured (0: not yet). */
  readonly fullHeight: number;
}

/**
 * The dock and the card for `layout`, from the last fit `was`. The
 * layout's card size is the card as `was` drew it, so the image card's
 * height is kept from when it was drawn: a compact card goes back to the
 * image card once that height fits again. A switch hides the card until
 * the new one is measured, unless the old one's dock still holds.
 */
export function fitCallout(
  layout: CalloutLayout,
  was: CalloutFit,
): CalloutFit {
  const { fullHeight } = was;
  if (layout.phone) {
    return { dock: dockCallout(layout), compact: false, fullHeight };
  }
  if (!was.compact) {
    const dock = dockCallout(layout);
    const height = layout.cardHeight;
    const compact = dock === null && height > 0;
    return { dock, compact, fullHeight: height };
  }
  const full = { ...layout, cardHeight: fullHeight };
  const back = dockCallout(full) !== null;
  return { dock: dockCallout(layout), compact: !back, fullHeight };
}
