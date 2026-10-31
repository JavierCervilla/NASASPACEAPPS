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
 * The shape of a message catalogue, from the English one: every locale
 * has every key, a plain text where English has one and plural forms
 * where English has them (messages/*.json).
 */
import type en from './messages/en.json';

/** A message by plural category (Intl.PluralRules); `other` always. */
export type PluralForms = Readonly<
  Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
>;

type English = typeof en;

export type Catalogue = {
  readonly [K in keyof English]: English[K] extends string
    ? string
    : PluralForms;
};

/** The keys of plain messages. */
export type TextKey = {
  [K in keyof English]: English[K] extends string ? K : never;
}[keyof English];

/** The keys of messages that change with a count. */
export type PluralKey = Exclude<keyof English, TextKey>;

/** The values a message's `{placeholders}` take. */
export type Params = Readonly<Record<string, string | number>>;
