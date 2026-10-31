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
 * The Sites sheet at full (validated canvas «LangPhoneB»): the site
 * picker with a «Language · English ›» row under its title. The row
 * pushes the language list into the sheet with a Back control, as an iOS
 * navigation push: the picker slides left as the list comes in from the
 * right, and Back (or Escape) slides them home and gives the focus back
 * to the row.
 */
import { useEffect, useRef, useState, type Ref, type RefObject } from 'react';
import { AUTONYMS, isLocale } from '../../i18n/locales';
import { useI18n } from '../i18n-context';
import { LanguageList } from '../lang/LanguageList';
import { Icon } from './Icon';
import { SitePicker, type PickerProps } from './SitePicker';
import { usePush } from './use-push';

interface RowProps {
  readonly onOpen: () => void;
  readonly ref: Ref<HTMLButtonElement>;
}

function LanguageRow({ onOpen, ref }: RowProps) {
  const { t, locale } = useI18n();
  const name = isLocale(locale) ? AUTONYMS[locale] : locale;
  return (
    <button ref={ref} type="button" className="lang-row" aria-haspopup="menu" onClick={onOpen}>
      <Icon name="globe" />
      <span className="lang-row__label">{t('lang.label')}</span>
      <span className="lang-row__value">{name}</span>
      <span className="lang-row__chevron" aria-hidden="true" />
    </button>
  );
}

function LanguagePage(props: { base: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="lang-page">
      <div className="lang-page__head">
        <button type="button" className="lang-page__back" onClick={props.onBack}>
          <span className="lang-page__back-chevron" aria-hidden="true" />
          {t('lang.back')}
        </button>
        <h2 className="lang-page__title">{t('lang.label')}</h2>
      </div>
      <LanguageList base={props.base} onClose={props.onBack} />
    </div>
  );
}

/**
 * Gives the focus back to the row once the list is popped and the picker
 * is no longer inert.
 */
function useFocusOnReturn(row: RefObject<HTMLElement | null>, pushed: boolean) {
  const was = useRef(pushed);
  useEffect(() => {
    if (was.current && !pushed) row.current?.focus();
    was.current = pushed;
  }, [row, pushed]);
}

export function SitesPanel(props: PickerProps & { readonly base: string }) {
  const { base, ...picker } = props;
  const [pushed, setPushed] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLButtonElement>(null);
  const at = usePush(stack, pushed);
  useFocusOnReturn(row, pushed);
  const back = (): void => setPushed(false);
  const languageRow = <LanguageRow ref={row} onOpen={() => setPushed(true)} />;
  return (
    <div ref={stack} className="push" data-pushed={pushed} data-at={at}>
      <div className="push__root" inert={pushed}>
        <SitePicker {...picker} languageRow={languageRow} />
      </div>
      <div className="push__page" inert={!pushed}>
        {pushed || at !== 'root' ? <LanguagePage base={base} onBack={back} /> : null}
      </div>
    </div>
  );
}
