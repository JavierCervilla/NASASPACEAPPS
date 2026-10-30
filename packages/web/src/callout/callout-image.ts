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
 * The callout's thumbnail: one file per screen density, picked by the
 * browser from `srcset` and `sizes`, so only the selected site's image is
 * fetched, once. A new site hides the old image (`data-image-ready`) until
 * the new one has loaded, so a stale relief never sits under a new name.
 */
import type { Thumb } from './thumbs';

/**
 * The width the image is drawn at: the compact card's 84 px square below
 * 768 px, the image card's full width (16.5rem) above.
 */
const SIZES = '(max-width: 767.98px) 84px, 16.5rem';

/** The thumbnails' 1x pixel size (site_thumbs.py), so no layout shift. */
const THUMB_PX = '320';

/**
 * Sets up `img` (decoded off the main thread, sized, its `sizes`), and
 * marks the card's image ready each time it finishes loading.
 */
export function prepareImage(card: HTMLElement, img: HTMLImageElement) {
  Object.assign(img, { decoding: 'async', width: THUMB_PX, height: THUMB_PX });
  img.sizes = SIZES;
  img.addEventListener('load', () => {
    card.dataset['imageReady'] = 'true';
  });
}

/** Shows `image` in `img`, hidden until it loads when it is a new one. */
export function showImage(
  card: HTMLElement,
  img: HTMLImageElement,
  image: Thumb | null,
): void {
  card.dataset['image'] = image ? 'yes' : 'none';
  img.alt = image?.alt ?? '';
  if (!image) {
    img.removeAttribute('srcset');
    img.removeAttribute('src');
    return;
  }
  if (img.getAttribute('src') === image.src) return;
  card.dataset['imageReady'] = 'false';
  img.srcset = image.srcset;
  img.src = image.src;
}
