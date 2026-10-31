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
 * letter in it; a string with a letter given to an attribute a person
 * reads or a screen reader speaks (aria-label, alt, title, placeholder…),
 * as a literal or a template; the same strings reached through a JSX
 * expression, as a child or an attribute, including both branches of
 * `? :`, `&&`, `||` and `??`; and, in plain .ts DOM code, a literal
 * written to `textContent`, `title`, `ariaLabel`… or given to
 * `setAttribute('aria-label', …)`. Text with no letters (numbers, «°»,
 * «–», «·») is not language. Proper nouns that never change go in `allow`.
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

/**
 * The literal texts an expression can evaluate to: a string, the static
 * parts of a template, and both branches of `a ? b : c` or `a && b` /
 * `a ?? b`. A call or a name is computed: none.
 */
function literalTexts(node) {
  if (!node) return [];
  if (node.type === 'Literal') return typeof node.value === 'string' ? [node.value] : [];
  if (node.type === 'TemplateLiteral') return [node.quasis.map((q) => q.value.cooked).join(' ')];
  if (node.type === 'ConditionalExpression') return [...literalTexts(node.consequent), ...literalTexts(node.alternate)];
  if (node.type === 'LogicalExpression') return [...literalTexts(node.left), ...literalTexts(node.right)];
  return [];
}

/** The literal texts of an attribute's value, `="x"` or `={…}`. */
function attributeTexts(value) {
  if (!value) return [];
  if (value.type === 'Literal') return literalTexts(value);
  return value.type === 'JSXExpressionContainer' ? literalTexts(value.expression) : [];
}

/** The properties of a DOM node a person reads or a screen reader speaks. */
const DOM_PROPERTIES = new Set(['textContent', 'innerText', 'title', 'placeholder', 'alt', 'ariaLabel', 'ariaRoleDescription']);

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
        for (const text of attributeTexts(node.value).filter(isLanguage)) {
          context.report({ node, messageId: 'attribute', data: { name, text: clip(text) } });
        }
      },
      // `{'Yes'}`, `{open ? 'Open' : 'Closed'}` and `{a && 'x'}` as children.
      JSXExpressionContainer(node) {
        if (node.parent.type === 'JSXAttribute') return;
        for (const text of literalTexts(node.expression).filter(isLanguage)) {
          context.report({ node, messageId: 'text', data: { text: clip(text) } });
        }
      },
      // In a .ts DOM writer: `el.textContent = 'Loading'`.
      AssignmentExpression(node) {
        const { left } = node;
        if (left.type !== 'MemberExpression' || left.computed || !DOM_PROPERTIES.has(left.property.name)) return;
        for (const text of literalTexts(node.right).filter(isLanguage)) {
          context.report({ node, messageId: 'attribute', data: { name: left.property.name, text: clip(text) } });
        }
      },
      // `el.setAttribute('aria-label', 'Open')`.
      CallExpression(node) {
        const { callee, arguments: [name, value] } = node;
        const isSet = callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'setAttribute';
        if (!isSet || name?.type !== 'Literal' || !attributes.has(name.value)) return;
        for (const text of literalTexts(value).filter(isLanguage)) {
          context.report({ node, messageId: 'attribute', data: { name: name.value, text: clip(text) } });
        }
      },
    };
  },
};
