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
import { useI18n } from '../i18n-context';
import { SiteThumb } from '../SiteThumb';
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
   * Under the figures: the computed caption and, when Horizons failed,
   * the note that says so (VENT-36).
   */
  readonly notes?: ReactNode;
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

function CardHead(props: Omit<Props, 'model' | 'onRetry' | 'notes'>) {
  const { site, state, computed, base } = props;
  const i18n = useI18n();
  const { title, subtitle } = siteLabels(site);
  const thumb = thumbOf({ id: site.id, place: title }, base, i18n);
  return (
    <div className="card-block card-head">
      <CardMedia thumb={thumb} state={state} computed={computed} />
      <p className="card-head__mission">{missionLine(i18n, site)}</p>
      <h2 className="card-head__name">{subtitle}</h2>
      {title === subtitle ? null : <p className="card-head__place">{title}</p>}
      <p className="card-head__point">{pointLine(i18n, site)}</p>
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

export function SiteCard({ model, onRetry, notes, ...head }: Props) {
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
        <Figures model={model} />
        {model.kind === 'ready' ? notes : null}
        <CardStatus kind={model.kind} onRetry={onRetry} />
      </div>
    </aside>
  );
}
