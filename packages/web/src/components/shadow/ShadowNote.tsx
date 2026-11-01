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
 * The site's shadow note (VENT-39): a crater in section and two quiet
 * lines, in neutral ink, never a signal colour; nothing for a site NASA's
 * maps do not mark.
 */
import type { SiteShadow } from '@ventana/sim';
import { shadowNote } from '../../card/shadow-note';
import { useI18n } from '../i18n-context';

interface Props {
  readonly shadow: SiteShadow | undefined;
  /** Without «not a landing point», which the line above already says. */
  readonly short?: boolean;
  readonly className?: string;
}

/** A crater in section: the rim, its floor shaded. */
function CraterIcon() {
  return (
    <svg className="shadow-note__icon" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.6 9.5 A6.25 6.25 0 0 0 13.4 9.5 Z" fill="currentColor" />
    </svg>
  );
}

export function ShadowNote(props: Props) {
  const { shadow, short = false, className = '' } = props;
  const note = shadowNote(useI18n(), shadow, short);
  if (!note) return null;
  return (
    <div
      className={`shadow-note ${className}`.trim()}
      role="note"
      data-shadow={note.kind}
    >
      <CraterIcon />
      <div>
        <p className="shadow-note__title">{note.title}</p>
        <p className="shadow-note__body">{note.body}</p>
      </div>
    </div>
  );
}
