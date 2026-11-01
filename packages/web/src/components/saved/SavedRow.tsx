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
 * One saved site in the «Saved» list (VENT-37): a button that selects it
 * (its pin, its name, its state at the shared instant with its dot, and
 * its point; the check on the selected one), then its «…» menu. Rename
 * turns the name into a field in place: Enter or leaving it keeps the new
 * name, Escape the old one. Copy puts «85.87° S, 61.34° E» on the
 * clipboard and says so; Delete asks nothing and offers an undo instead.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { formatCoords } from '../../i18n/format';
import type { NowState } from '../../phone/widget-types';
import { NAME_MAX, type SavedSite } from '../../saved/saved-schema';
import { useI18n } from '../i18n-context';
import { Check } from '../phone/SiteList';
import { RowMenu, type RowAction } from './RowMenu';
import { STATE_WORDS, useRowActions, useRowState } from './row-parts';

interface Props {
  readonly site: SavedSite;
  readonly selected: boolean;
  /** The selected site's state, as the card shows it. */
  readonly state: NowState | null;
  readonly onPick: (id: string) => void;
  /** The site was deleted: the list moves the focus on, or the undo. */
  readonly onDeleted: (fromKeyboard: boolean) => void;
}

interface RenameProps {
  readonly site: SavedSite;
  readonly onDone: (name: string | null) => void;
}

function RenameField({ site, onDone }: RenameProps) {
  const i18n = useI18n();
  // Enter, then the blur of the field going, would end it twice.
  const ended = useRef(false);
  const end = (name: string | null): void => {
    if (ended.current) return;
    ended.current = true;
    onDone(name);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') end(event.currentTarget.value);
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    end(null);
  };
  return (
    <span className="site-row saved-row__edit">
      <span className="saved-glyph" aria-hidden="true" />
      <input className="saved-row__input" defaultValue={site.name} maxLength={NAME_MAX} autoFocus aria-label={i18n.t('saved.renameLabel', { name: site.name })} onKeyDown={onKeyDown} onBlur={(e) => end(e.currentTarget.value)} />
    </span>
  );
}

function PickButton({ site, selected, state, onPick }: Props) {
  const i18n = useI18n();
  const shown = useRowState(site, selected, state);
  const coords = formatCoords(i18n, site.lat, site.lonEast);
  const word = shown ? i18n.t(STATE_WORDS[shown]) : '';
  return (
    <button type="button" className="site-row saved-row__pick" data-saved-id={site.id} aria-current={selected ? 'true' : undefined} onClick={() => onPick(site.id)}>
      <span className="saved-glyph" data-state={shown ?? undefined} aria-hidden="true" />
      <span className="site-row__text">
        <span className="site-row__title">{site.name}</span>
        <span className="site-row__detail">
          {shown ? <span className="signal-dot" data-state={shown} aria-hidden="true" /> : null}
          {word ? `${word} · ` : null}
          <span className="saved-row__coords">{coords}</span>
        </span>
      </span>
      {selected ? <Check /> : null}
    </button>
  );
}

export function SavedRow(props: Props) {
  const { site, onDeleted } = props;
  const [renaming, setRenaming] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  const { act, rename } = useRowActions(site, onDeleted);
  const onAction = (action: RowAction, fromKeyboard: boolean): void =>
    action === 'rename' ? setRenaming(true) : act(action, fromKeyboard);
  const renamed = (name: string | null): void => {
    if (name !== null) rename(name);
    setRenaming(false);
    requestAnimationFrame(() => more.current?.focus());
  };
  const field = <RenameField site={site} onDone={renamed} />;
  return (
    <li className="saved-row">
      {renaming ? field : <PickButton {...props} />}
      <RowMenu name={site.name} onAction={onAction} button={more} />
    </li>
  );
}
