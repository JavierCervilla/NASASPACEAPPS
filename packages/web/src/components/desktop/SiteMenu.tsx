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
 * The desktop header's site button (validated canvas «Globe view»): the
 * state dot, the mission, the place and the coordinates. It opens a
 * popover with the phone's site picker (search, region, list); picking a
 * site selects it in the shared store, so the globe turns to it. The
 * popover is the browser's (light dismiss, Escape, top layer), anchored
 * under the button.
 */
import { useRef, useState, type RefObject } from 'react';
import { formatCoords } from '../../i18n/format';
import type { I18n } from '../../i18n/translate';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { SitePicker } from '../phone/SitePicker';

const POPOVER_ID = 'site-popover';
/** Px between the button and the popover. */
const GAP_PX = 8;

interface Props {
  readonly sites: readonly PhoneSite[];
  readonly site: PhoneSite;
  /** The site's state at the selected instant, once loaded. */
  readonly state: NowState | null;
  /** Whether that state is the simulator's: the dot is hollow. */
  readonly computed?: boolean;
  readonly onPick: (id: string) => void;
}

/** «Mons Mouton · 84.79° S, 29.20° E», or the place alone. */
function placeLine(i18n: I18n, site: PhoneSite, title: string): string {
  const known = Number.isFinite(site.lat) && Number.isFinite(site.lonEast);
  if (!known) return title;
  return `${title} · ${formatCoords(i18n, site.lat, site.lonEast)}`;
}

/** Puts the popover under `button`, before the browser shows it. */
function anchorUnder(button: HTMLElement, popover: HTMLElement | null) {
  const box = button.getBoundingClientRect();
  popover?.style.setProperty('--top', `${box.bottom + GAP_PX}px`);
  popover?.style.setProperty('--left', `${box.left}px`);
}

type Anchor = RefObject<HTMLDivElement | null>;

function SiteButton(props: Props & { readonly popover: Anchor }) {
  const { site, state, computed, popover } = props;
  const i18n = useI18n();
  const { title, subtitle } = siteLabels(site);
  const name = subtitle === title ? title : `${subtitle}, ${title}`;
  return (
    <button
      type="button"
      className="site-button"
      popoverTarget={POPOVER_ID}
      aria-label={i18n.t('site.change', { name })}
      onClick={(e) => anchorUnder(e.currentTarget, popover.current)}
    >
      <span className="signal-dot" data-state={state ?? 'loading'} data-computed={computed} />
      <span className="site-button__name">{subtitle}</span>
      <span className="site-button__place">{placeLine(i18n, site, title)}</span>
      <Icon name="chevron" />
    </button>
  );
}

/**
 * The popover, holding the picker only while open: each opening starts
 * with an empty search on the selected site's region.
 */
function SitePopover(props: Props & { readonly popover: Anchor }) {
  const { popover, sites, site, state } = props;
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const close = (): void => popover.current?.hidePopover();
  const pick = (id: string): void => {
    props.onPick(id);
    close();
  };
  const picker = { sites, selected: site, state, onPick: pick, onDone: close };
  return (
    <div
      ref={popover}
      id={POPOVER_ID}
      className="site-popover"
      popover="auto"
      role="dialog"
      aria-label={t('site.choose')}
      onToggle={(e) => setOpen(e.newState === 'open')}
    >
      {open ? <SitePicker {...picker} /> : null}
    </div>
  );
}

export function SiteMenu(props: Props) {
  const popover = useRef<HTMLDivElement>(null);
  return (
    <>
      <SiteButton {...props} popover={popover} />
      <SitePopover {...props} popover={popover} />
    </>
  );
}
