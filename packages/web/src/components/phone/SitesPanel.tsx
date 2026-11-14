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

import { useRef, useState, type Ref } from 'react';
import type { SourceStore } from '../../source/data-source';
import { useI18n } from '../i18n-context';
import { DropPin } from '../pin/DropPin';
import { Icon } from './Icon';
import { SettingsPage } from './SettingsPage';
import { SitePicker, type PickerProps } from './SitePicker';
import { useFocusOnReturn, usePush } from './use-push';

interface GearProps {
  readonly onOpen: () => void;
  readonly ref: Ref<HTMLButtonElement>;
}

/** The gear in the picker's head: a 44 px target named «Settings». */
function SettingsGear({ onOpen, ref }: GearProps) {
  const { t } = useI18n();
  return (
    <button ref={ref} type="button" className="picker__gear"
      aria-label={t('settings.title')} onClick={onOpen}>
      <Icon name="gear" />
    </button>
  );
}

/** Above the search: «Drop a pin», an action, so it stays (VENT-37). */
function PinLead() {
  return (
    <div className="settings-group">
      <DropPin variant="row" />
    </div>
  );
}

interface PanelProps extends PickerProps {
  readonly base: string;
  readonly source: SourceStore;
}

export function SitesPanel(props: PanelProps) {
  const { base, source, ...picker } = props;
  const [pushed, setPushed] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const gear = useRef<HTMLButtonElement>(null);
  const at = usePush(stack, pushed);
  useFocusOnReturn(gear, pushed);
  const head = <SettingsGear ref={gear} onOpen={() => setPushed(true)} />;
  const page = { base, source, onDone: picker.onDone };
  return (
    <div ref={stack} className="push" data-pushed={pushed} data-at={at}>
      <div className="push__root" inert={pushed}>
        <SitePicker {...picker} lead={<PinLead />} gear={head}
          withSave withQuickmap />
      </div>
      <div className="push__page" inert={!pushed}>
        {pushed || at !== 'root'
          ? <SettingsPage {...page} onBack={() => setPushed(false)} />
          : null}
      </div>
    </div>
  );
}
