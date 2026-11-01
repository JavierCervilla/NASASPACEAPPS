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
 * Saving the custom point (VENT-37, validated canvas «Save A»): «Save»,
 * with a bookmark, in the head of the desktop site card and of the phone
 * sheet; once saved it reads «Saved», its bookmark filled, and a press
 * deletes it again (with the undo, never a question). Saved, the name is a
 * field, «Name this site», that starts as the «Near …» line, and «Kept on
 * this device only» says where it lives. With the list full a note says
 * so instead of saving.
 */
import { useId, useState, type KeyboardEvent } from 'react';
import { formatCoords } from '../../i18n/format';
import type { PhoneSite } from '../../phone/phone-site';
import {
  NAME_MAX,
  SAVED_CAP,
  type SavedSite,
} from '../../saved/saved-schema';
import type { SavedSites } from '../../saved/saved-sites';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { useSavedKit, useSavedSites } from './context';

interface Props {
  readonly site: PhoneSite;
}

/** The saved entry of `site`, and whether the list has room for it. */
function useSaved(site: PhoneSite) {
  const kit = useSavedKit();
  const sites = useSavedSites(kit);
  const entry = sites.find(({ id }) => id === site.id) ?? null;
  return { kit, entry, full: !entry && sites.length >= SAVED_CAP };
}

/** «Save» or «Saved», for a custom point only. */
export function SaveButton({ site }: Props) {
  const i18n = useI18n();
  const { kit, entry, full } = useSaved(site);
  if (!site.custom || !kit) return null;
  const near = site.custom.near;
  const name = near || formatCoords(i18n, site.lat, site.lonEast);
  const toggle = (): void => {
    const removed = entry ? kit.saved.remove(entry.id) : null;
    if (removed) kit.undo.offer(removed);
    else if (!entry) kit.saved.save(site, name);
  };
  const label = entry ? i18n.t('saved.unsave') : undefined;
  return (
    <button type="button" className="save-button" data-saved={entry !== null} aria-label={label} aria-disabled={full || undefined} onClick={full ? undefined : toggle}>
      <Icon name={entry ? 'bookmarkFilled' : 'bookmark'} />
      {i18n.t(entry ? 'saved.saved' : 'saved.save')}
    </button>
  );
}

interface FieldProps {
  readonly entry: SavedSite;
  readonly saved: SavedSites;
}

/**
 * The name field: Enter or leaving it keeps the name (an empty one keeps
 * the old), Escape puts the old one back. Keyed by the kept name, so it
 * starts again from any rename.
 */
function NameField({ entry, saved }: FieldProps) {
  const i18n = useI18n();
  const field = useId();
  const [draft, setDraft] = useState(entry.name);
  const keep = (): void => {
    saved.rename(entry.id, draft);
    setDraft(saved.find(entry.id)?.name ?? entry.name);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') keep();
    if (event.key === 'Escape') setDraft(entry.name);
  };
  return (
    <div className="save-name">
      <label className="save-name__label" htmlFor={field}>{i18n.t('saved.nameLabel')}</label>
      <input id={field} className="save-name__input" value={draft} maxLength={NAME_MAX} onChange={(e) => setDraft(e.currentTarget.value)} onBlur={keep} onKeyDown={onKeyDown} />
      <p className="save-name__note">{i18n.t('saved.device')}</p>
    </div>
  );
}

/** Under the point: the name field once saved, or why it cannot be. */
export function SaveName({ site }: Props) {
  const i18n = useI18n();
  const { kit, entry, full } = useSaved(site);
  if (full && site.custom) {
    const note = i18n.plural('saved.full', SAVED_CAP);
    return <p className="save-note" role="status">{note}</p>;
  }
  if (!entry || !kit) return null;
  return <NameField key={entry.name} entry={entry} saved={kit.saved} />;
}
