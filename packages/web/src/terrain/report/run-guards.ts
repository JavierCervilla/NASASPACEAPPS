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
 * What the stored runs are read through (VENT-49): a stored value is
 * unknown until it is checked, and one that does not fit is dropped, never
 * trusted.
 */

export type Bag = Readonly<Record<string, unknown>>;

/** Whether `value` is an object to read fields from. */
export const isBag = (value: unknown): value is Bag =>
  typeof value === 'object' && value !== null;

/** `value` when it is a string, else null. */
export const textOf = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

/** The items of `value` when it is a list, else none. */
export const listOf = (value: unknown): unknown[] =>
  Array.isArray(value) ? (value as unknown[]) : [];

/** `value` when it is a finite number, else null. */
export const numOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
