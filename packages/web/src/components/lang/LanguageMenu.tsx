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
 * The desktop header's language menu (validated canvas «LangDesktop»): a
 * button with a globe and the language's code, after the view tabs,
 * that opens the language list in a popover under it, aligned to its
 * right edge. The popover is the browser's (light dismiss, Escape, top
 * layer); closing it from inside gives the focus back to the button.
 */
import { useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AUTONYMS, isLocale } from '../../i18n/locales';
import { useI18n } from '../i18n-context';
import { Icon } from '../phone/Icon';
import { LanguageList } from './LanguageList';

const SLOT_ID = 'lang-slot';
const POPOVER_ID = 'lang-popover';
/** Px between the button and the popover. */
const GAP_PX = 8;

const unchanging = (): (() => void) => () => undefined;

/** Puts the popover under `button`, its right edge on the button's. */
function anchorUnder(button: HTMLElement, popover: HTMLElement | null) {
  const box = button.getBoundingClientRect();
  const right = document.documentElement.clientWidth - box.right;
  popover?.style.setProperty('--top', `${box.bottom + GAP_PX}px`);
  popover?.style.setProperty('--right', `${right}px`);
}

interface MenuProps {
  readonly base: string;
  readonly button: RefObject<HTMLButtonElement | null>;
  readonly popover: RefObject<HTMLDivElement | null>;
}

/** The popover, holding the list only while open. */
function LanguagePopover({ base, button, popover }: MenuProps) {
  const [open, setOpen] = useState(false);
  const close = (): void => {
    popover.current?.hidePopover();
    button.current?.focus();
  };
  return (
    <div
      ref={popover}
      id={POPOVER_ID}
      className="lang-popover"
      popover="auto"
      onToggle={(e) => setOpen(e.newState === 'open')}
    >
      {open ? <LanguageList base={base} onClose={close} /> : null}
    </div>
  );
}

function LanguageButton({ base }: { readonly base: string }) {
  const { t, locale } = useI18n();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const name = isLocale(locale) ? AUTONYMS[locale] : locale;
  return (
    <>
      <button
        ref={button}
        type="button"
        className="lang-button"
        popoverTarget={POPOVER_ID}
        aria-haspopup="menu"
        aria-label={t('lang.button', { name })}
        onClick={(e) => anchorUnder(e.currentTarget, popover.current)}
      >
        <Icon name="globe" />
        <span className="lang-button__code">{locale.slice(0, 2).toUpperCase()}</span>
        <Icon name="chevron" />
      </button>
      <LanguagePopover base={base} button={button} popover={popover} />
    </>
  );
}

/** The menu, in the header's slot once the page is in the browser. */
export function LanguageMenu({ base }: { readonly base: string }) {
  const find = (): HTMLElement | null => document.getElementById(SLOT_ID);
  const slot = useSyncExternalStore(unchanging, find, () => null);
  return slot ? createPortal(<LanguageButton base={base} />, slot) : null;
}
