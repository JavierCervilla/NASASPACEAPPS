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
 * «Data source: Computed | Horizons | Compare» (VENT-36, validated canvas
 * option C): a radio group in the segmented control's style, in the
 * desktop Layers key and in the phone's Sites sheet. The arrows move the
 * choice and wrap, Home and End reach its ends; only the chosen segment
 * is a tab stop.
 */
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { TextKey } from '../../i18n/catalogue';
import { menuIndex } from '../../lib/menu-keys';
import { DATA_SOURCES, type SourceStore } from '../../source/data-source';
import { useI18n } from '../i18n-context';
import { useDataSource } from '../use-site-hours';

const NAMES: Readonly<Record<(typeof DATA_SOURCES)[number], TextKey>> = {
  computed: 'source.computed',
  horizons: 'source.horizons',
  compare: 'source.compare',
};

/** A radio group's arrows, as the menu's: right and down move on. */
const AS_MENU: Readonly<Record<string, string>> = {
  ArrowRight: 'ArrowDown',
  ArrowLeft: 'ArrowUp',
};

interface SwitchProps {
  readonly source: SourceStore;
  /** The id of the visible label naming the group. */
  readonly labelledBy: string;
}

function SourceSwitch({ source, labelledBy }: SwitchProps) {
  const chosen = useDataSource(source);
  const { t } = useI18n();
  const group = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const at = DATA_SOURCES.indexOf(chosen);
    const key = AS_MENU[event.key] ?? event.key;
    const to = menuIndex(key, at, DATA_SOURCES.length);
    const next = to === null ? undefined : DATA_SOURCES[to];
    if (!next) return;
    event.preventDefault();
    source.set(next);
    group.current?.querySelectorAll('button')[to ?? 0]?.focus();
  };
  return (
    <div ref={group} className="segmented source-switch" role="radiogroup" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {DATA_SOURCES.map((option) => (
        <button key={option} type="button" role="radio" aria-checked={option === chosen} tabIndex={option === chosen ? 0 : -1} onClick={() => source.set(option)}>
          {t(NAMES[option])}
        </button>
      ))}
    </div>
  );
}

interface RowProps {
  readonly source: SourceStore;
  /** Before the label: the phone row's icon. */
  readonly icon?: ReactNode;
}

/** «Data source» and the switch, on one row. */
export function SourceRow({ source, icon }: RowProps) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="source-row">
      {icon}
      <span id={id} className="source-row__label">{t('source.label')}</span>
      <SourceSwitch source={source} labelledBy={id} />
    </div>
  );
}
