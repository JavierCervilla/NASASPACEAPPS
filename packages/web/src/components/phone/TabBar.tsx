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
 * The floating tab bar: Globe, Calendar, DSN, Horizon and Sites. Horizon
 * says «soon» until its view exists; Calendar opens the calendar, DSN the
 * DSN view (VENT-7, canvas «DsnC»), Sites the picker, and Globe closes the
 * sheet. Dragging up from it opens a closed
 * sheet.
 */
import type { Ref } from 'react';
import { useI18n } from '../i18n-context';
import { Icon, type IconName } from './Icon';

interface Props {
  /** The bar's element, where a drag up opens the closed sheet. */
  readonly ref?: Ref<HTMLElement>;
  /** The view on screen: the globe, or what fills the sheet at full. */
  readonly current: TabView;
  readonly onGlobe: () => void;
  readonly onCalendar: () => void;
  readonly onDsn: () => void;
  readonly onSites: () => void;
}

export type TabView = 'globe' | 'calendar' | 'dsn' | 'sites';

interface Tab {
  readonly icon: IconName;
  readonly label: string;
  readonly current?: boolean;
  readonly onClick?: () => void;
}

function TabButton({ icon, label, current, onClick }: Tab) {
  const soon = onClick === undefined;
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="tab"
      aria-current={current ? 'true' : undefined}
      aria-disabled={soon ? 'true' : undefined}
      aria-label={soon ? t('tabs.soonLabel', { label }) : undefined}
      onClick={onClick}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {soon ? <span className="tab__soon">{t('tabs.soon')}</span> : null}
    </button>
  );
}

export function TabBar(props: Props) {
  const { ref, current, onGlobe, onCalendar, onDsn, onSites } = props;
  const { t } = useI18n();
  return (
    <nav ref={ref} className="tab-bar" aria-label={t('tabs.label')}>
      <TabButton icon="globe" label={t('tabs.globe')} current={current === 'globe'} onClick={onGlobe} />
      <TabButton icon="calendar" label={t('tabs.calendar')} current={current === 'calendar'} onClick={onCalendar} />
      <TabButton icon="dsn" label={t('tabs.dsn')} current={current === 'dsn'} onClick={onDsn} />
      <TabButton icon="horizon" label={t('tabs.horizon')} />
      <TabButton icon="sites" label={t('tabs.sites')} current={current === 'sites'} onClick={onSites} />
    </nav>
  );
}
