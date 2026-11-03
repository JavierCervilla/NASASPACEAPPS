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
 * The language list, as Apple's language picker draws it (validated
 * canvases «LangDesktop» and «LangPhoneB»): each language's own name as
 * the main line, its name in the current language under it, and a check
 * on the current one. A menu of radio items: focus starts on the current
 * language, the arrows, Home and End move it, Escape closes the list.
 * Each item is a real link to its locale's page; choosing one keeps the
 * choice and opens that page on the same view.
 */
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { localStore } from '../../i18n/choice';
import { AUTONYMS, LOCALES, type Locale } from '../../i18n/locales';
import { localePath } from '../../i18n/routes';
import { switchLocale } from '../../i18n/switch';
import { menuIndex } from '../../lib/menu-keys';
import { leftOnPurpose } from '../../terrain/view-tier-open';
import { useI18n } from '../i18n-context';

interface Props {
  /** The site's base path, for the locales' pages. */
  readonly base: string;
  /** Escape: the list closes, and the focus goes back where it was. */
  readonly onClose: () => void;
}

/** Arrows, Home and End move the focus; Escape closes. */
function menuKeys(onClose: () => void) {
  return (event: KeyboardEvent<HTMLUListElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    const items = [...event.currentTarget.querySelectorAll('a')];
    const at = items.findIndex((item) => item === document.activeElement);
    const next = menuIndex(event.key, at, items.length);
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  };
}

function Check() {
  return (
    <svg className="lang-option__check" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The language's own name, its name in the page's language, the check. */
function OptionLabel(props: { locale: Locale; current: boolean }) {
  const { locale, current } = props;
  const i18n = useI18n();
  // Its name in the page's language, unless that is its own name again.
  const local = i18n.t(`lang.name.${locale}`);
  return (
    <>
      <span className="lang-option__name" lang={locale}>{AUTONYMS[locale]}</span>
      {local === AUTONYMS[locale] ? null : (
        <span className="lang-option__local">{local}</span>
      )}
      {current ? <Check /> : null}
    </>
  );
}

function Option({ locale, base }: { locale: Locale; base: string }) {
  const current = locale === useI18n().locale;
  const choose = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    switchLocale(base, locale,
      { storage: localStore(), location, leaving: leftOnPurpose });
  };
  return (
    <li role="none">
      <a
        className="lang-option"
        role="menuitemradio"
        aria-checked={current}
        href={localePath(base, locale)}
        hrefLang={locale}
        tabIndex={current ? 0 : -1}
        onClick={choose}
      >
        <OptionLabel locale={locale} current={current} />
      </a>
    </li>
  );
}

export function LanguageList({ base, onClose }: Props) {
  const list = useRef<HTMLUListElement>(null);
  const { t } = useI18n();
  useEffect(() => {
    const items = list.current?.querySelectorAll('a');
    const current = list.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    (current ?? items?.[0])?.focus();
  }, []);
  return (
    <ul ref={list} className="lang-list" role="menu" aria-label={t('lang.label')} onKeyDown={menuKeys(onClose)}>
      {LOCALES.map((locale) => (
        <Option key={locale} locale={locale} base={base} />
      ))}
    </ul>
  );
}
