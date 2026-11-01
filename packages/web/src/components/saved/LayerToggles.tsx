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
 * The layers as switches (VENT-37, validated canvas «Layers»): each row
 * its key mark (a solid dot for a landing site, a dashed ring for an
 * approximate zone, the silver pin for a saved site), its name and a
 * switch (a checkbox with the switch role, so it is said «on» or «off»),
 * the whole row its label. «Saved sites» shows how many; with none, on
 * the phone, it says how to save one. «Ghost rovers · soon» is there,
 * switched off and disabled. The flags are the page's layer registry's,
 * so the globe and the polar map follow, and they are kept on the device.
 */
import { useId, type ReactNode } from 'react';
import { LAYER_IDS } from '../../globe/layers/ids';
import type { TextKey } from '../../i18n/catalogue';
import { useI18n } from '../i18n-context';
import { useLayerShown, useSavedKit, useSavedSites } from './context';

interface RowProps {
  readonly id: string;
  readonly mark: 'exact' | 'zone' | 'saved' | 'rover';
  readonly name: TextKey;
  readonly extra?: ReactNode;
  readonly note?: string | undefined;
}

function ToggleRow({ id, mark, name, extra, note }: RowProps) {
  const kit = useSavedKit();
  const { t } = useI18n();
  const shown = useLayerShown(kit, id);
  const noteId = useId();
  const soon = mark === 'rover';
  return (
    <li className="layer-row" data-soon={soon}>
      <label className="layer-row__label">
        <span className={`layer-key layer-key--${mark}`} aria-hidden="true" />
        <span className="layer-row__text">
          <span className="layer-row__name">{t(name)}{extra}</span>
          {note ? <span id={noteId} className="layer-row__note" aria-hidden="true">{note}</span> : null}
        </span>
        <input type="checkbox" role="switch" className="layer-switch" checked={!soon && shown} aria-describedby={note ? noteId : undefined} disabled={soon || !kit} onChange={(e) => kit?.layers.setVisible(id, e.currentTarget.checked)} />
      </label>
    </li>
  );
}

/** The count after «Saved sites», muted; a note on how to save with none. */
function useSavedExtra(withNote: boolean) {
  const i18n = useI18n();
  const count = useSavedSites(useSavedKit()).length;
  if (count === 0) {
    return { note: withNote ? i18n.t('saved.emptyText') : undefined };
  }
  const extra = (
    <span className="layer-row__count"> {i18n.number(count)}</span>
  );
  return { extra };
}

interface Props {
  /** On the phone the empty «Saved sites» row says how to save one. */
  readonly withNote?: boolean;
}

export function LayerToggles({ withNote = false }: Props) {
  const saved = useSavedExtra(withNote);
  return (
    <ul className="layer-toggles">
      <ToggleRow id={LAYER_IDS.sites} mark="exact" name="layers.sites" />
      <ToggleRow id={LAYER_IDS.zones} mark="zone" name="layers.zones" />
      <ToggleRow id={LAYER_IDS.saved} mark="saved" name="layers.saved" {...saved} />
      <ToggleRow id="ghost-rovers" mark="rover" name="layers.rovers" />
    </ul>
  );
}

/** «Layers» over its switches, a group of the phone's Sites sheet. */
export function LayersGroup() {
  const { t } = useI18n();
  const title = useId();
  return (
    <section className="layers-group" aria-labelledby={title}>
      <h3 id={title} className="layers-group__title">{t('layers.title')}</h3>
      <div className="settings-group">
        <LayerToggles withNote />
      </div>
    </section>
  );
}
