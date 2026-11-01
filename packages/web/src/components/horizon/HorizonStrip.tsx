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
 * The horizon strip (VENT-40, canvas option B): the selected site's
 * horizon all around, north in the centre (S W N E S), the terrain's
 * skyline from LOLA in neutral line art over the level, stretched by the
 * «Height ×N» it states; the Sun and the Earth at the shared instant in
 * their signal colours, dimmed under the skyline and labelled «· hidden»
 * where it hides them. A custom point shows the smooth sphere's flat
 * horizon until its terrain comes. An SVG with a text alternative; its
 * box is measured, so nothing sets a style attribute (CSP).
 */
import type { SiteHorizon } from '../../horizon/horizon-store';
import type { HourSky } from '../../horizon/hour-sky';
import {
  stripModel,
  type LabelledMark,
  type StripModel,
} from '../../horizon/strip-model';
import { useI18n } from '../i18n-context';
import { useBoxSize } from './use-horizon';

interface Props {
  readonly horizon: SiteHorizon;
  /** The Sun and the Earth at the hour shown; null: not yet. */
  readonly sky: HourSky | null;
  readonly className: string;
}

/** A body's dot, under the skyline when hidden. */
function Dot({ mark }: { readonly mark: LabelledMark }) {
  return (
    <circle
      className="horizon__body"
      data-body={mark.id}
      data-hidden={!mark.visible}
      cx={mark.x}
      cy={mark.y}
      r={mark.visible ? 5.5 : 4.5}
    />
  );
}

/** The ground under the skyline, or under the level when smooth. */
function Ground({ model }: { readonly model: StripModel }) {
  const { width: w, height: h } = model.scale;
  if (!model.skyline) {
    const y = model.levelY;
    return <rect className="horizon__ground" x={0} y={y} width={w} height={h - y} />;
  }
  const area = `M0,${h} L${model.skyline.replaceAll(' ', ' L')} L${w},${h} Z`;
  return (
    <>
      <path className="horizon__ground" d={area} />
      <polyline className="horizon__skyline" points={model.skyline} />
    </>
  );
}

function Plot({ model }: { readonly model: StripModel }) {
  const { width: w, height: h } = model.scale;
  const { number } = useI18n();
  const hidden = model.marks.filter((mark) => !mark.visible);
  const shown = model.marks.filter((mark) => mark.visible);
  return (
    <svg className="horizon__svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={model.alt}>
      <line className="horizon__level" x1={0} x2={w} y1={model.levelY} y2={model.levelY} />
      <text className="horizon__level-label" x={2} y={model.levelY - 3}>{`${number(0)}°`}</text>
      {hidden.map((mark) => <Dot key={mark.id} mark={mark} />)}
      <Ground model={model} />
      {shown.map((mark) => <Dot key={mark.id} mark={mark} />)}
      {model.marks.map((mark) => (
        <text key={mark.id} className="horizon__label" x={mark.labelX} y={mark.labelY} textAnchor={mark.anchor}>
          {mark.label}
        </text>
      ))}
    </svg>
  );
}

/** The compass under the strip, south to south through north. */
const COMPASS = [
  'horizon.compassS',
  'horizon.compassW',
  'horizon.compassN',
  'horizon.compassE',
  'horizon.compassS',
] as const;

/** S W N E S under the strip, at each quarter of its width. */
function Compass() {
  const { t } = useI18n();
  return (
    <p className="horizon__compass" aria-hidden="true">
      {COMPASS.map((key, i) => <span key={i}>{t(key)}</span>)}
    </p>
  );
}

export function HorizonStrip({ horizon, sky, className }: Props) {
  const i18n = useI18n();
  const [box, size] = useBoxSize<HTMLDivElement>();
  const model = stripModel(i18n, horizon, sky, size);
  return (
    <section className={`horizon ${className}`} aria-label={i18n.t('horizon.title')} data-horizon={horizon.kind}>
      <p className="horizon__head">
        <span className="horizon__title">{i18n.t('horizon.title')}</span>
        {model.stretch ? <span>{model.stretch}</span> : null}
      </p>
      <div className="horizon__plot" ref={box}>
        {size.width > 0 && size.height > 0 ? <Plot model={model} /> : null}
      </div>
      <Compass />
      <p className="horizon__foot">
        <span>{model.source}</span>
        {model.note ? <span className="horizon__note">{model.note}</span> : null}
      </p>
    </section>
  );
}
