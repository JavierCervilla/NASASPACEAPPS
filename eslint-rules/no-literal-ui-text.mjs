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
 * Local ESLint rule: no user-visible text written as a literal in markup
 * (VENT-35). Every word a visitor reads or hears comes from the message
 * catalogues (packages/web/src/i18n/messages/*.json), so it exists in all
 * five languages. Flagged: JSX text (in .tsx and .astro templates) with a
 * letter in it, and a string with a letter given to an attribute a person
 * reads or a screen reader speaks (aria-label, alt, title, placeholder…),
 * as a literal or a template. Text with no letters (numbers, «°», «–»,
 * «·») is not language. Proper nouns that never change go in `allow`.
 */

const LETTER = /\p{L}/u;
const DEFAULT_ATTRIBUTES = [
  'aria-label',
  'aria-roledescription',
  'aria-valuetext',
  'aria-placeholder',
  'alt',
  'title',
  'placeholder',
  'label',
];

/** The JSX attribute's name, `aria-label` or `alt`. */
const attributeName = (node) =>
  node.name.type === 'JSXNamespacedName' ? `${node.name.namespace.name}:${node.name.name.name}` : node.name.name;

/** The literal text of an attribute's value, or null when it is computed. */
function literalText(value) {
  if (!value) return null;
  if (value.type === 'Literal') return typeof value.value === 'string' ? value.value : null;
  if (value.type !== 'JSXExpressionContainer') return null;
  const { expression } = value;
  if (expression.type === 'Literal' && typeof expression.value === 'string') return expression.value;
  if (expression.type === 'TemplateLiteral') return expression.quasis.map((q) => q.value.cooked).join(' ');
  return null;
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow user-visible text literals in markup: use the message catalogues' },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } },
          attributes: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      text: 'User-visible text "{{text}}" is a literal: take it from the message catalogue (i18n).',
      attribute: 'The {{name}} "{{text}}" is a literal: take it from the message catalogue (i18n).',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const allow = new Set(options.allow ?? []);
    const attributes = new Set(options.attributes ?? DEFAULT_ATTRIBUTES);
    const isLanguage = (text) => {
      const trimmed = text.replace(/\s+/g, ' ').trim();
      return LETTER.test(trimmed) && !allow.has(trimmed);
    };
    const clip = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 40);
    return {
      JSXText(node) {
        if (isLanguage(node.value)) context.report({ node, messageId: 'text', data: { text: clip(node.value) } });
      },
      JSXAttribute(node) {
        const name = attributeName(node);
        if (!attributes.has(name)) return;
        const text = literalText(node.value);
        if (text !== null && isLanguage(text)) {
          context.report({ node, messageId: 'attribute', data: { name, text: clip(text) } });
        }
      },
    };
  },
};
