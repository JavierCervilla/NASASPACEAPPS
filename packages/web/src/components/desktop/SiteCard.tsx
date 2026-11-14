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
 * mission, its agency and date, the site, its point and how exact it is,
 * and whether NASA's maps put it in shadow (VENT-39);
 * «Sunset in» and «Earthset in» (or «…rise in») for the selected instant with
 * each body's elevation and where the terrain decides; when Horizons
 * failed, the note that says so, in view (VENT-57); the horizon strip
 * (VENT-40) and who listens on Earth (VENT-7), folded into one block
 * (VENT-57); and the month's
 * shares, longest window and longest night, with where the figures come
 * from. Grey blocks while the month loads, an honest error with «Try
 * again», and an honest state outside the data window. On a short screen
 * the card scrolls, focusable only then, and fades at each edge that hides
 * more. Last, whatever the card ends with, «Open in LROC QuickMap»
 * (VENT-125).
 */
import type { ReactNode } from 'react';
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
import type { Dsn } from '../dsn/use-dsn';
import { useI18n } from '../i18n-context';
import { QuickMapLink } from '../quickmap/QuickMapLink';
import { SaveButton, SaveName } from '../saved/SaveControl';
import { ShadowNote } from '../shadow/ShadowNote';
import { SiteThumb } from '../SiteThumb';
import { CardPoint } from './CardPoint';
import { CardSky } from './CardSky';
import { CardStatus } from './CardStatus';
import { StateBadge } from './StateBadge';
import { useScrollEdges } from './use-scroll-edges';

interface Props {
  readonly site: CardSite;
  readonly model: CardModel;
  readonly onRetry: () => void;
  /** The state at the selected instant; null until it is known. */
  readonly state: SiteState | null;
  /** Whether that state is the simulator's: the badge's dot is hollow. */
  readonly computed: boolean;
  /** The site's base path, for the image. */
  readonly base: string;
  /**
   * Under the tiles, in view without scrolling: the note that Horizons
   * failed, with its retry (VENT-36; moved up by VENT-57).
   */
  readonly down?: ReactNode;
  /** At the card's end: the computed caption (VENT-36). */
  readonly caption?: ReactNode;
  /** The DSN at the instant (VENT-7); null until it is known. */
  readonly dsn: Dsn | null;
  /** Under the tiles: the site's horizon strip (VENT-40). */
  readonly horizon?: ReactNode;
}

/** The card is 320 px wide, the whole width below 1024 px. */
const THUMB_SIZES = '(max-width: 1023.98px) 100vw, 320px';

interface MediaProps {
  readonly thumb: Thumb | null;
  readonly state: SiteState | null;
  readonly computed: boolean;
}

/** The image with the state's badge and its frame; none without one. */
function CardMedia({ thumb, state, computed }: MediaProps) {
  if (!thumb) return null;
  return (
    <div className="card-media">
      <SiteThumb thumb={thumb} sizes={THUMB_SIZES} className="card-media__image" />
      <span className="card-media__shade" aria-hidden="true" />
      <StateBadge state={state} computed={computed} />
      <span className="card-media__caption">{thumb.caption}</span>
    </div>
  );
}

/**
 * The head: the image with its badge or, without an image (north of
 * 80° S, the custom point), the badge on its own at the top. The custom
 * point leads with its name, then the site it is near, with «Save» at the
 * top right and, once saved, its name field (VENT-37).
 */
type HeadProps = Omit<
  Props,
  'model' | 'onRetry' | 'down' | 'caption' | 'dsn' | 'horizon'
>;

function CardHead(props: HeadProps) {
  const { site, state, computed, base } = props;
  const i18n = useI18n();
  const { title, subtitle } = siteLabels(site);
  const thumb = thumbOf({ id: site.id, place: title }, base, i18n);
  const [name, place] = site.custom ? [title, subtitle] : [subtitle, title];
  const mission = site.custom ? '' : missionLine(i18n, site);
  return (
    <div className="card-block card-head">
      <CardMedia thumb={thumb} state={state} computed={computed} />
      {thumb ? null : <StateBadge state={state} computed={computed} inHead />}
      <SaveButton site={site} />
      {mission ? <p className="card-head__mission">{mission}</p> : null}
      <h2 className="card-head__name">{name}</h2>
      {!place || name === place ? null : (
        <p className="card-head__place">{place}</p>
      )}
      <CardPoint {...pointLine(i18n, site)} />
      <ShadowNote shadow={site.shadow} short className="card-head__shadow" />
      <SaveName site={site} />
    </div>
  );
}

function Tile({ widget, tone }: { widget: BodyWidget; tone: string }) {
  return (
    <div className="card-block card-tile">
      <span className="card-tile__label" data-tone={tone}>{widget.label}</span>
      <span className="card-tile__value">{widget.value}</span>
      <span className="card-tile__detail">{widget.detail}</span>
      {widget.terrain ? (
        <span className="card-tile__detail">{widget.terrain}</span>
      ) : null}
    </div>
  );
}

type FiguresProps = Pick<Props, 'model' | 'dsn' | 'horizon' | 'down'>;

function Figures({ model, dsn, horizon, down }: FiguresProps) {
  if (model.kind !== 'ready') return null;
  return (
    <>
      <div className="card-tiles">
        <Tile widget={model.sun} tone="sun" />
        <Tile widget={model.earth} tone="earth" />
      </div>
      {down}
      <CardSky horizon={horizon} dsn={dsn} />
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

export function SiteCard(props: Props) {
  const { model, onRetry, down, caption, dsn, horizon, ...head } = props;
  const [scroller, edges] = useScrollEdges<HTMLDivElement>();
  // Focusable only while it overflows, so the keyboard can scroll it on a
  // short screen; on a tall one it would be an empty tab stop.
  const scrolls = edges.top || edges.bottom;
  const { t } = useI18n();
  return (
    <aside className="site-card" aria-label={t('card.label')}>
      <div
        className="site-card__scroll"
        ref={scroller}
        role={scrolls ? 'group' : undefined}
        aria-label={scrolls ? t('card.details') : undefined}
        tabIndex={scrolls ? 0 : undefined}
        data-fade-top={edges.top}
        data-fade-bottom={edges.bottom}
      >
        <CardHead {...head} />
        <Figures model={model} dsn={dsn} horizon={horizon} down={down} />
        {model.kind === 'ready' ? caption : null}
        <CardStatus kind={model.kind} onRetry={onRetry} />
        <QuickMapLink point={head.site} className="card-quickmap" />
      </div>
    </aside>
  );
}
