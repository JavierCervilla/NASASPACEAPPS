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
 * A saved site's «…» menu (VENT-37, validated canvas «Saved list»): Rename,
 * Copy coordinates, Delete. A menu button opening a menu (WAI-ARIA menu
 * pattern) in the browser's popover, so it sits on the top layer over the
 * site popover or the sheet, closes on a click outside or Escape, and
 * works with a pointer, a finger and the keyboard alike: the focus starts
 * on Rename, the arrows, Home and End move it, and the focus goes back to
 * the button when the menu closes without an action that moves it.
 */
import { useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { menuIndex } from '../../lib/menu-keys';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';

export type RowAction = 'rename' | 'copy' | 'delete';

const ACTIONS: readonly RowAction[] = ['rename', 'copy', 'delete'];
const NAMES = {
  rename: 'saved.rename',
  copy: 'saved.copy',
  delete: 'saved.delete',
} as const;
/** Px between the button and the menu. */
const GAP_PX = 4;

/** Puts `menu` under `button`, its right edge on the button's. */
function anchor(button: HTMLElement, menu: HTMLElement | null): void {
  const box = button.getBoundingClientRect();
  const right = document.documentElement.clientWidth - box.right;
  menu?.style.setProperty('--top', `${box.bottom + GAP_PX}px`);
  menu?.style.setProperty('--right', `${Math.max(8, right)}px`);
}

/** The arrows, Home and End move the focus among `menu`'s items. */
function onMenuKeys(event: KeyboardEvent<HTMLDivElement>): void {
  const items = [...event.currentTarget.querySelectorAll('button')];
  const at = items.findIndex((item) => item === document.activeElement);
  const next = menuIndex(event.key, at, items.length);
  if (next === null) return;
  event.preventDefault();
  items[next]?.focus();
}

interface Props {
  /** The site's name, for the button's accessible name. */
  readonly name: string;
  /** `fromKeyboard`: chosen with Enter or Space, not a pointer. */
  readonly onAction: (action: RowAction, fromKeyboard: boolean) => void;
  readonly button: RefObject<HTMLButtonElement | null>;
}

export function RowMenu({ name, onAction, button }: Props) {
  const i18n = useI18n();
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  // The focus leaves the menu first, so hiding it restores nothing later
  // (over a rename field that has just taken the focus).
  const choose = (action: RowAction, fromKeyboard: boolean): void => {
    button.current?.focus();
    menu.current?.hidePopover();
    onAction(action, fromKeyboard);
  };
  return (
    <>
      <button ref={button} type="button" className="saved-row__more" popoverTarget={id} aria-haspopup="menu" aria-label={i18n.t('saved.more', { name })} onClick={(e) => anchor(e.currentTarget, menu.current)}>
        <Icon name="more" />
      </button>
      <div ref={menu} id={id} className="row-menu" popover="auto" role="menu" aria-label={i18n.t('saved.more', { name })} onKeyDown={onMenuKeys} onToggle={(e) => e.newState === 'open' && e.currentTarget.querySelector('button')?.focus()}>
        {ACTIONS.map((action) => (
          <button key={action} type="button" role="menuitem" className="row-menu__item" data-action={action} onClick={(e) => choose(action, e.detail === 0)}>
            {i18n.t(NAMES[action])}
            <Icon name={action} />
          </button>
        ))}
      </div>
    </>
  );
}
