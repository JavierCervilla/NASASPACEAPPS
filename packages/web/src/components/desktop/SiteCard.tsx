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
 * The desktop site card beside the view (validated canvas «Globe view»):
 * the mission, its agency and date, the site, its point and how exact it
 * is; «Sunset in» and «Earthset in» (or «…rise in») for the selected
 * instant with each body's elevation; and the month's shares, longest
 * window and longest night, with where the figures come from. Grey
 * blocks while the month loads, an honest error with «Try again», and an
 * honest state outside the data window. On a short screen the card
 * scrolls, focusable, and fades at each edge that hides more.
 */
import { siteLabels } from '../../phone/phone-site';
import type { BodyWidget } from '../../phone/widget-types';
import {
  missionLine,
  pointLine,
  type CardSite,
} from '../../card/site-facts';
import type { CardModel } from '../../card/site-card';
import { CardStatus } from './CardStatus';
import { useScrollEdges } from './use-scroll-edges';

interface Props {
  readonly site: CardSite;
  readonly model: CardModel;
  readonly onRetry: () => void;
}

function CardHead({ site }: { readonly site: CardSite }) {
  const { title, subtitle } = siteLabels(site);
  return (
    <div className="card-block card-head">
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

export function SiteCard({ site, model, onRetry }: Props) {
  const [scroller, edges] = useScrollEdges<HTMLDivElement>();
  return (
    <aside className="site-card" aria-label="Site card">
      {/* Focusable, so the keyboard can scroll it on a short screen. */}
      <div
        className="site-card__scroll"
        ref={scroller}
        role="group"
        aria-label="Site details"
        tabIndex={0}
        data-fade-top={edges.top}
        data-fade-bottom={edges.bottom}
      >
        <CardHead site={site} />
        <Figures model={model} />
        <CardStatus kind={model.kind} onRetry={onRetry} />
      </div>
    </aside>
  );
}
