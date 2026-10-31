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
 * Draws the app icon «J2» on a 2D canvas: the near-black rounded square,
 * the Moon in its current phase and the legend ring, each arc at the
 * opacity the site's state gives it. The geometry is the reference's,
 * on a 1024 px design canvas (scripts/app_icons.py draws the same).
 */
import { ARCS, BACKGROUND, TRACK, type ArcState } from './ring';

const DESIGN = 1024;
const MOON = 600;
const RING_RADIUS = 372;
const RING_WIDTH = 64;
const CORNER = 0.2237;

/** The canvas calls the icon needs: a fake one tests it. */
export type IconContext = Pick<
  CanvasRenderingContext2D,
  | 'clearRect'
  | 'beginPath'
  | 'roundRect'
  | 'fill'
  | 'drawImage'
  | 'arc'
  | 'stroke'
  | 'fillStyle'
  | 'strokeStyle'
  | 'lineWidth'
  | 'lineCap'
  | 'globalAlpha'
>;

export interface IconPicture {
  /** The side, in canvas pixels. */
  readonly size: number;
  /** The Moon's phase frame; null draws the ring alone. */
  readonly moon: CanvasImageSource | null;
  readonly emphasis: Readonly<Record<ArcState, number>>;
}

/** Degrees clockwise from 12 o'clock as a canvas angle. */
const angle = (deg: number): number => ((deg - 90) * Math.PI) / 180;

function drawRing(ctx: IconContext, picture: IconPicture): void {
  const scale = picture.size / DESIGN;
  const centre = picture.size / 2;
  ctx.lineWidth = RING_WIDTH * scale;
  ctx.lineCap = 'round';
  const stroke = (colour: string, from: number, to: number): void => {
    ctx.beginPath();
    ctx.arc(centre, centre, RING_RADIUS * scale, angle(from), angle(to));
    ctx.strokeStyle = colour;
    ctx.stroke();
  };
  ctx.globalAlpha = 1;
  stroke(TRACK, 0, 360);
  for (const arc of ARCS) {
    ctx.globalAlpha = picture.emphasis[arc.state];
    stroke(arc.colour, arc.from, arc.to);
  }
  ctx.globalAlpha = 1;
}

/** Draws the whole icon over whatever the canvas held. */
export function drawIcon(ctx: IconContext, picture: IconPicture): void {
  const { size, moon } = picture;
  ctx.clearRect(0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * CORNER);
  ctx.fillStyle = BACKGROUND;
  ctx.fill();
  if (moon) {
    const disk = (MOON * size) / DESIGN;
    const at = (size - disk) / 2;
    ctx.drawImage(moon, at, at, disk, disk);
  }
  drawRing(ctx, picture);
}
