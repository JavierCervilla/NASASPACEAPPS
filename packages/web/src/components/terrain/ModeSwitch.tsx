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
 * «Third person | First person» (VENT-34, the human's choice: the view
 * opens in third person): a radio group in the segmented control's style,
 * 44 px targets; the arrows move the choice, only the chosen segment is a
 * tab stop.
 */
import { useId, useRef, type KeyboardEvent } from 'react';
import type { CameraMode } from '../../terrain/view-camera';
import { useI18n } from '../i18n-context';

const MODES: readonly CameraMode[] = ['third', 'first'];
const NAMES = { third: 'onFoot.third', first: 'onFoot.first' } as const;
const STEPS: Readonly<Record<string, number>> = {
  ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
};

interface Props {
  readonly mode: CameraMode;
  readonly onMode: (mode: CameraMode) => void;
}

export function ModeSwitch({ mode, onMode }: Props) {
  const { t } = useI18n();
  const id = useId();
  const group = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const at = (MODES.indexOf(mode) + step + MODES.length) % MODES.length;
    onMode(MODES[at] ?? 'third');
    group.current?.querySelectorAll('button')[at]?.focus();
  };
  return (
    <div className="on-foot__modes">
      <span id={id} className="visually-hidden">{t('onFoot.camera')}</span>
      <div ref={group} className="on-foot__switch" role="radiogroup" aria-labelledby={id} onKeyDown={onKeyDown}>
        {MODES.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={option === mode} tabIndex={option === mode ? 0 : -1} onClick={() => onMode(option)}>
            {t(NAMES[option])}
          </button>
        ))}
      </div>
    </div>
  );
}
