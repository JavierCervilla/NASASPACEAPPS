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
 * A site's LOLA relief thumbnail (thumbs/thumbs.ts): one file per screen
 * density, picked by the browser from `srcset` and `sizes`, so only the
 * selected site's image is fetched, once. Nothing at all for a site
 * without one (north of 80° S): never an empty frame that reads as a
 * broken image. A new site's image stays hidden (`data-ready`) until it
 * has loaded, so a stale relief never sits under a new name. Rendered in
 * the browser only: the static page would fetch it before the layout is
 * known.
 */
import { useState, useSyncExternalStore } from 'react';
import type { Thumb } from '../thumbs/thumbs';

interface Props {
  readonly thumb: Thumb | null;
  /** The width it is drawn at, for the browser's pick from `srcset`. */
  readonly sizes: string;
  readonly className: string;
}

/** The thumbnails' 1x pixel size (site_thumbs.py), so no layout shift. */
const THUMB_PX = 320;

const unchanging = (): (() => void) => () => undefined;

function ThumbImage({ thumb, sizes, className }: Props & { thumb: Thumb }) {
  const [ready, setReady] = useState(false);
  return (
    <img
      className={className}
      src={thumb.src}
      srcSet={thumb.srcset}
      sizes={sizes}
      alt={thumb.alt}
      width={THUMB_PX}
      height={THUMB_PX}
      decoding="async"
      draggable={false}
      data-ready={ready}
      onLoad={() => setReady(true)}
    />
  );
}

export function SiteThumb(props: Props) {
  const inBrowser = useSyncExternalStore(unchanging, () => true, () => false);
  const { thumb } = props;
  if (!thumb || !inBrowser) return null;
  // Keyed by its file: a new site's image starts hidden until it loads.
  return <ThumbImage key={thumb.src} {...props} thumb={thumb} />;
}
