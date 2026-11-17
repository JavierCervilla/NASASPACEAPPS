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

import {
  useEffect,
  useRef,
  useState,
  type Ref,
} from 'react';
import { AUTONYMS, isLocale } from '../../i18n/locales';
import type { SourceStore } from '../../source/data-source';
import { Credits } from '../credits/Credits';
import { useI18n } from '../i18n-context';
import { LanguageList } from '../lang/LanguageList';
import { LayersGroup } from '../saved/LayerToggles';
import { SourceRow } from '../source/SourceSwitch';
import { useScrollFade } from '../use-scroll-fade';
import { Icon } from './Icon';
import { escapeTo, useFocusOnReturn, usePush } from './use-push';

interface RowProps {
  readonly onOpen: () => void;
  readonly ref: Ref<HTMLButtonElement>;
}

function LanguageRow({ onOpen, ref }: RowProps) {
  const { t, locale } = useI18n();
  const name = isLocale(locale) ? AUTONYMS[locale] : locale;
  return (
    <button ref={ref} type="button" className="lang-row"
      aria-haspopup="menu" onClick={onOpen}>
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

interface HeadProps {
  readonly onBack: () => void;
  readonly onDone: () => void;
}

/** «‹ Landing sites», «Settings» and «Done»; Back takes the focus. */
function SettingsHead({ onBack, onDone }: HeadProps) {
  const { t } = useI18n();
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => back.current?.focus(), []);
  return (
    <div className="lang-page__head settings-page__head">
      <button ref={back} type="button" className="lang-page__back"
        onClick={onBack}>
        <span className="lang-page__back-chevron" aria-hidden="true" />
        <span className="settings-page__back-label">{t('picker.title')}</span>
      </button>
      <h2 className="lang-page__title">{t('settings.title')}</h2>
      <button type="button" className="picker__done" onClick={onDone}>
        {t('picker.done')}
      </button>
    </div>
  );
}

interface ListProps {
  readonly source: SourceStore;
  readonly row: Ref<HTMLButtonElement>;
  readonly onLanguage: () => void;
}

/**
 * The layers, then the language and the data source, then the credits
 * (VENT-126), scrolling as one.
 */
function SettingsList({ source, row, onLanguage }: ListProps) {
  const fade = useScrollFade<HTMLDivElement>();
  return (
    <div className="picker__scroll scroll-fade" data-sheet-scroll {...fade}>
      <LayersGroup />
      <div className="settings-group">
        <LanguageRow ref={row} onOpen={onLanguage} />
        <SourceRow source={source} icon={<Icon name="database" />} />
      </div>
      <Credits />
    </div>
  );
}

interface PageProps extends HeadProps {
  readonly base: string;
  readonly source: SourceStore;
}

export function SettingsPage({ base, source, onBack, onDone }: PageProps) {
  const [pushed, setPushed] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLButtonElement>(null);
  const at = usePush(stack, pushed);
  useFocusOnReturn(row, pushed);
  return (
    <div ref={stack} className="push settings-page"
      data-pushed={pushed} data-at={at}>
      <div className="push__root settings-page__body" inert={pushed}
        onKeyDown={escapeTo(onBack)}>
        <SettingsHead onBack={onBack} onDone={onDone} />
        <SettingsList source={source} row={row}
          onLanguage={() => setPushed(true)} />
      </div>
      <div className="push__page" inert={!pushed}>
        {pushed || at !== 'root'
          ? <LanguagePage base={base} onBack={() => setPushed(false)} />
          : null}
      </div>
    </div>
  );
}
