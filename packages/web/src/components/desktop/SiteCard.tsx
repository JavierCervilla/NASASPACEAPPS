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
 * The desktop site card beside the view (validated canvas «Globe view»): the
 * site's LOLA relief image south of 80° S, with the state at the selected
 * instant and the ground it spans (VENT-33, canvas «DeskThumbH1440»); the
 * mission, its agency and date, the site, its point and how exact it is;
 * «Sunset in» and «Earthset in» (or «…rise in») for the selected instant with
 * each body's elevation; and the month's shares, longest window and longest
 * night, with where the figures come from. Grey blocks while the month loads,
 * an honest error with «Try again», and an honest state outside the data
 * window. On a short screen the card scrolls, focusable only then, and fades at
 * each edge that hides more.
 */
import { siteLabels } from '../../phone/phone-site';
import type { SiteState } from '../../phone/site-state';
import type { BodyWidget } from '../../phone/widget-types';
import { thumbOf, type Thumb } from '../../thumbs/thumbs';
import {
  missionLine,
  pointLine,
  type CardSite,
} from '../../card/site-facts';
import type { CardModel } from '../../card/site-card';
import { SiteThumb } from '../SiteThumb';
import { CardStatus } from './CardStatus';
import { useScrollEdges } from './use-scroll-edges';

interface Props {
  readonly site: CardSite;
  readonly model: CardModel;
  readonly onRetry: () => void;
  /** The state at the selected instant; null until it is known. */
  readonly state: SiteState | null;
  /** The site's base path, for the image. */
  readonly base: string;
}

/** The card is 320 px wide, the whole width below 1024 px. */
const THUMB_SIZES = '(max-width: 1023.98px) 100vw, 320px';

interface MediaProps {
  readonly thumb: Thumb | null;
  readonly state: SiteState | null;
}

/** The image with the state's badge and its frame; none without one. */
function CardMedia({ thumb, state }: MediaProps) {
  if (!thumb) return null;
  return (
    <div className="card-media">
      <SiteThumb thumb={thumb} sizes={THUMB_SIZES} className="card-media__image" />
      <span className="card-media__shade" aria-hidden="true" />
      {state ? (
        <span className="card-media__badge" data-tone={state.kind}>
          {state.badge}
        </span>
      ) : null}
      <span className="card-media__caption">{thumb.caption}</span>
    </div>
  );
}

function CardHead({ site, state, base }: Omit<Props, 'model' | 'onRetry'>) {
  const { title, subtitle } = siteLabels(site);
  const thumb = thumbOf(site.id, title, base);
  return (
    <div className="card-block card-head">
      <CardMedia thumb={thumb} state={state} />
      <p className="card-head__mission">{missionLine(site)}</p>
      <h2 className="card-head__name">{subtitle}</h2>
      {title === subtitle ? null : <p className="card-head__place">{title}</p>}
      <p className="card-head__point">{pointLine(site)}</p>
    </div>
  );
}

function Tile({ widget, tone }: { widget: BodyWidget; tone: string }) {
  return (
    <div className="card-block card-tile">
      <span className="card-tile__label" data-tone={tone}>{widget.label}</span>
      <span className="card-tile__value">{widget.value}</span>
      <span className="card-tile__detail">{widget.detail}</span>
    </div>
  );
}

function Figures({ model }: { readonly model: CardModel }) {
  if (model.kind !== 'ready') return null;
  return (
    <>
      <div className="card-tiles">
        <Tile widget={model.sun} tone="sun" />
        <Tile widget={model.earth} tone="earth" />
      </div>
      <dl className="card-block card-facts">
        {model.rows.map(({ label, value, tone }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-tone={tone}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="card-source">{model.source}</p>
    </>
  );
}

export function SiteCard({ model, onRetry, ...head }: Props) {
  const [scroller, edges] = useScrollEdges<HTMLDivElement>();
  // Focusable only while it overflows, so the keyboard can scroll it on a
  // short screen; on a tall one it would be an empty tab stop.
  const scrolls = edges.top || edges.bottom;
  return (
    <aside className="site-card" aria-label="Site card">
      <div
        className="site-card__scroll"
        ref={scroller}
        role={scrolls ? 'group' : undefined}
        aria-label={scrolls ? 'Site details' : undefined}
        tabIndex={scrolls ? 0 : undefined}
        data-fade-top={edges.top}
        data-fade-bottom={edges.bottom}
      >
        <CardHead {...head} />
        <Figures model={model} />
        <CardStatus kind={model.kind} onRetry={onRetry} />
      </div>
    </aside>
  );
}
