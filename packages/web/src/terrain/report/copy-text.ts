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
 * Puts a text on the clipboard (VENT-49), for the crash report's «Copy
 * report»: the clipboard API first, which a page may use after a tap, and a
 * hidden text area with `execCommand('copy')` where that API is missing or
 * refuses. It says whether anything was copied, and leaves nothing behind.
 */

export interface CopyDeps {
  /** `navigator.clipboard`; absent where the page may not use it. */
  readonly clipboard: Pick<Clipboard, 'writeText'> | undefined;
  readonly document: Document;
}

/** Copies `text` through a text area the person never sees. */
function copyThroughTextArea(text: string, page: Document): boolean {
  const area = page.createElement('textarea');
  const focused = page.activeElement as HTMLElement | null;
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'visually-hidden';
  try {
    page.body.append(area);
    area.select();
    area.setSelectionRange(0, text.length);
    return page.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    focused?.focus?.();
  }
}

/** Whether `text` was copied. */
export async function copyText(text: string, deps: CopyDeps): Promise<boolean> {
  try {
    if (deps.clipboard) {
      await deps.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused (no permission, an insecure page): the text area may still work.
  }
  return copyThroughTextArea(text, deps.document);
}
