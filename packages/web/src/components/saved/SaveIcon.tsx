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
 * The icon-only «Save» at the top of the phone's full sheet, beside «Done»
 * (VENT-42): at full height the half sheet's «Save» is out of reach, so
 * the picker's head carries the same bookmark, outline or filled, for a
 * custom point only. It does what «Save» does (`useSaveToggle`); its
 * name, not a label, says which.
 */
import type { PhoneSite } from '../../phone/phone-site';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { useSaveToggle } from './SaveControl';

export function SaveIcon({ site }: { readonly site: PhoneSite }) {
  const { t } = useI18n();
  const { shown, saved, full, toggle } = useSaveToggle(site);
  if (!shown) return null;
  return (
    <button
      type="button"
      className="save-icon"
      data-saved={saved}
      aria-label={t(saved ? 'saved.unsave' : 'saved.save')}
      aria-disabled={full || undefined}
      onClick={toggle ?? undefined}
    >
      <Icon name={saved ? 'bookmarkFilled' : 'bookmark'} />
    </button>
  );
}
