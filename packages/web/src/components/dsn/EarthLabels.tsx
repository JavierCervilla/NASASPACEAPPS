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
 * The DSN view's labels over its Earth: each antenna in sight, «Moon
 * overhead» under its mark and «Moon above 10°» at the top of the ring.
 * HTML over the picture, so they follow the text size; placed by percent
 * through the CSSOM. Hidden from assistive technology: the view says it all
 * in words.
 */
import type { EarthPicture } from '../../dsn/earth-picture';
import { STATIONS } from '../../dsn/stations';

interface Props {
  readonly picture: EarthPicture;
  readonly moonText: string;
  readonly ringText: string;
}

/** The CSS position of a picture point, in percent of the picture. */
const at = (r: number, x: number, y: number) => ({
  left: `${(x / (2 * r)) * 100}%`,
  top: `${(y / (2 * r)) * 100}%`,
});

export function EarthLabels({ picture, moonText, ringText }: Props) {
  const { r, moon, ring } = picture;
  return (
    <div className="dsn-earth__labels" aria-hidden="true">
      {picture.stations.filter((s) => s.front).map((s) => (
        <span key={s.complex} className="dsn-earth__label" data-active={s.active} style={at(r, s.x, s.y)}>
          {STATIONS[s.complex].short}
        </span>
      ))}
      {moon.front ? (
        <span className="dsn-earth__label dsn-earth__label--moon" style={at(r, moon.x, moon.y)}>
          {moonText}
        </span>
      ) : null}
      {ring.top ? (
        <span className="dsn-earth__label dsn-earth__label--ring" style={at(r, ring.top.x, ring.top.y)}>
          {ringText}
        </span>
      ) : null}
    </div>
  );
}
