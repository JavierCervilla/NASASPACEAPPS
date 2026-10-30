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
 * The callout's DOM: one card for both layouts (globe.css draws it as the
 * image card on a desktop and as the compact card on a phone) and the
 * leader line to its marker. Built once; a new site or instant only
 * rewrites its text and, for a new site, its image. The card is a named
 * group, not a control: no focus stop, no pointer events.
 */
import type { CalloutContent } from './callout-content';

/** The parts of the card that change with the content. */
export interface CalloutDom {
  readonly card: HTMLDivElement;
  readonly leader: HTMLSpanElement;
  readonly img: HTMLImageElement;
  readonly text: Readonly<Record<TextPart, HTMLElement>>;
}

type TextPart =
  | 'badge' | 'caption' | 'mission' | 'place' | 'point' | 'pill'
  | 'sunLabel' | 'sunValue' | 'earthLabel' | 'earthValue';

/** The thumbnails' pixel size (site_thumbs.py), so no layout shift. */
const THUMB_PX = '320';

function part<K extends keyof HTMLElementTagNameMap>(
  parent: HTMLElement,
  tag: K,
  name: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = `globe-callout__${name}`;
  parent.append(el);
  return el;
}

function tile(parent: HTMLElement, tone: string): [HTMLElement, HTMLElement] {
  const box = part(parent, 'span', 'tile');
  const label = part(box, 'span', 'tile-label');
  label.dataset['tone'] = tone;
  return [label, part(box, 'b', 'tile-value')];
}

/** Builds the card and its leader, hidden until placed. */
export function calloutDom(): CalloutDom {
  const card = document.createElement('div');
  card.className = 'globe-callout';
  card.setAttribute('role', 'group');
  const media = part(card, 'div', 'media');
  const img = part(media, 'img', 'image');
  Object.assign(img, { decoding: 'async', width: THUMB_PX, height: THUMB_PX });
  part(media, 'span', 'shade').setAttribute('aria-hidden', 'true');
  const [badge, caption] = [part(media, 'span', 'badge'), part(media, 'span', 'caption')];
  part(card, 'span', 'glyph').setAttribute('aria-hidden', 'true');
  const body = part(card, 'div', 'body');
  const [mission, place] = [part(body, 'p', 'mission'), part(body, 'p', 'place')];
  const [point, pill] = [part(body, 'p', 'point'), part(body, 'span', 'pill')];
  const tiles = part(body, 'div', 'tiles');
  const [sunLabel, sunValue] = tile(tiles, 'sun');
  const [earthLabel, earthValue] = tile(tiles, 'earth');
  const leader = document.createElement('span');
  leader.className = 'globe-callout-leader';
  leader.setAttribute('aria-hidden', 'true');
  const text = {
    badge, caption, mission, place, point, pill,
    sunLabel, sunValue, earthLabel, earthValue,
  };
  return { card, leader, img, text };
}

/** Writes `content` into the card. */
export function renderCallout(dom: CalloutDom, content: CalloutContent): void {
  const { card, img, text } = dom;
  const { image, state, bodies } = content;
  card.setAttribute('aria-label', content.name);
  card.dataset['site'] = content.id;
  card.dataset['image'] = image ? 'yes' : 'none';
  card.dataset['state'] = state?.kind ?? 'unknown';
  if (image && img.getAttribute('src') !== image.src) img.src = image.src;
  if (!image) img.removeAttribute('src');
  img.alt = image?.alt ?? '';
  const words = {
    badge: state?.badge ?? '', caption: image?.caption ?? '',
    mission: content.mission, place: content.place, point: content.point,
    pill: state?.pill ?? '',
    sunLabel: bodies?.sun.label ?? '', sunValue: bodies?.sun.value ?? '',
    earthLabel: bodies?.earth.label ?? '', earthValue: bodies?.earth.value ?? '',
  };
  for (const [key, value] of Object.entries(words)) {
    const el = text[key as TextPart];
    if (el.textContent !== value) el.textContent = value;
  }
}
