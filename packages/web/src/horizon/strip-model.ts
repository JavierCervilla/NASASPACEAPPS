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
 * What the horizon strip draws and says (VENT-40, canvas option B): the
 * skyline of the site's terrain (none on the smooth sphere), the level,
 * the Sun and the Earth at the shared instant with their labels, the
 * stretch, where the horizon comes from (short in the head, as the mock
 * has it, «LOLA · 20 m · Height ×7», and whole for a screen reader), and
 * the text alternative. Pure.
 */
import type { TextKey } from '../i18n/catalogue';
import type { I18n } from '../i18n/translate';
import type { SiteHorizon } from './horizon-store';
import { horizonAlt } from './horizon-alt';
import { placeLabels, type LabelPlace } from './strip-labels';
import { bodiesAt, stripMarks, type StripMark } from './strip-marks';
import { skyline } from './strip-skyline';
import { stripScale, yOfEl, type StripScale } from './strip-scale';

export interface LabelledMark extends StripMark, LabelPlace {
  readonly label: string;
}

export interface StripBox {
  readonly width: number;
  readonly height: number;
  /** The labels' font size, px. */
  readonly fontPx: number;
}

export interface StripModel {
  readonly scale: StripScale;
  /** The terrain's skyline as SVG points; null: the smooth sphere. */
  readonly skyline: string | null;
  readonly levelY: number;
  readonly marks: readonly LabelledMark[];
  /** «Height ×7» over terrain; null on the smooth sphere. */
  readonly stretch: string | null;
  /** Where the horizon comes from, whole and short, and a quiet note. */
  readonly source: string;
  readonly sourceShort: string;
  readonly note: string | null;
  readonly alt: string;
}

type Sky = Parameters<typeof bodiesAt>[0];

const LABELS: Record<StripMark['id'], readonly [TextKey, TextKey]> = {
  sun: ['horizon.sunHidden', 'horizon.sun'],
  earth: ['horizon.earthHidden', 'horizon.earth'],
};

/** The marks with their labels, «Sun» or «Sun · hidden», placed. */
function labelled(
  i18n: I18n,
  marks: readonly StripMark[],
  box: StripBox,
): LabelledMark[] {
  const named = marks.map((mark) => ({
    ...mark,
    label: i18n.t(LABELS[mark.id][mark.visible ? 1 : 0]),
  }));
  return placeLabels(named, box);
}

/** «Height ×7», whole from 2 up, one decimal under it. */
function stretchText(i18n: I18n, exaggeration: number): string {
  const n = i18n.number(exaggeration, exaggeration < 2 ? 1 : 0);
  return i18n.t('horizon.height', { n });
}

/** Where `horizon` comes from, and what to say when it failed. */
function sourceOf(i18n: I18n, horizon: SiteHorizon) {
  switch (horizon.kind) {
    case 'terrain': {
      const res = i18n.number(horizon.resolutionM);
      const source = i18n.t('horizon.source', { res });
      const short = i18n.t('horizon.sourceShort', { res });
      return { source, sourceShort: short, note: null };
    }
    case 'loading':
      return plain(i18n.t('horizon.loading'), null);
    case 'unavailable':
      return plain(i18n.t('horizon.smooth'), i18n.t('horizon.unavailable'));
    default:
      return plain(i18n.t('horizon.smooth'), null);
  }
}

/** A source with nothing to shorten. */
function plain(source: string, note: string | null) {
  return { source, sourceShort: source, note };
}

/**
 * The strip of a `size` box for `horizon`, with the bodies of `sky` (the
 * hour the views show; null: none yet).
 */
export function stripModel(
  i18n: I18n,
  horizon: SiteHorizon,
  sky: Sky | null,
  size: StripBox,
): StripModel {
  const profile = horizon.kind === 'terrain' ? horizon.profile : undefined;
  const bodies = sky ? bodiesAt(sky, profile) : [];
  const scale = stripScale(profile, size.width, size.height);
  const marks = labelled(i18n, stripMarks(bodies, scale), size);
  const ex = scale.exaggeration;
  return {
    scale,
    skyline: profile ? skyline(profile, scale) : null,
    levelY: yOfEl(scale, 0),
    marks,
    stretch: profile && size.width > 0 ? stretchText(i18n, ex) : null,
    ...sourceOf(i18n, horizon),
    alt: horizonAlt(i18n, bodies, profile !== undefined),
  };
}
