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
 * The header's view tabs: Globe, Polar map, DSN and Horizon are links to
 * `#globe`, `#polar-map`, `#dsn` (VENT-7) and `#horizon` (the on-foot 3D
 * view, VENT-34; the phone's DSN and Horizon tabs set them too), so a
 * switch is a hash change, never a page load, and the
 * selected site and instant carry over; the back button goes back a view.
 * No hash (the page as first opened) is the globe. Before the island runs,
 * the links still change the hash, and the island reads it when it does.
 */

export type View = 'globe' | 'polar' | 'dsn' | 'horizon';

/** The hash of each view's link (pages/index.astro). */
export const VIEW_HASH: Readonly<Record<View, string>> = {
  globe: '#globe',
  polar: '#polar-map',
  dsn: '#dsn',
  horizon: '#horizon',
};

/** The view a location hash names; anything else is the globe. */
export function viewOfHash(hash: string): View {
  const views = Object.entries(VIEW_HASH) as [View, string][];
  return views.find(([, h]) => h === hash)?.[0] ?? 'globe';
}

/**
 * Marks the tab of `view` in `nav` as the current page (its links carry
 * `data-view`), and unmarks the others.
 */
export function markCurrentTab(nav: ParentNode, view: View): void {
  for (const link of nav.querySelectorAll<HTMLElement>('[data-view]')) {
    if (link.dataset['view'] === view) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

/**
 * Shows `view` by setting its hash on `place` (the page's `location`), as
 * the header's links do; nothing when it already shows.
 */
export function goToView(place: { hash: string }, view: View): void {
  if (place.hash !== VIEW_HASH[view]) place.hash = VIEW_HASH[view];
}
