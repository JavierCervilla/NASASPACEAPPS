import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from './max-functions-per-file.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});
const options = [{ max: 2 }];
const tooMany = (count) => [
  { messageId: 'tooMany', data: { count, max: 2 } },
];

tester.run('max-functions-per-file', rule, {
  valid: [
    { code: 'function a() {}\nfunction b() {}', options },
    {
      name: 'inline callbacks are not counted',
      code: `function a(xs) {
        return xs.map((x) => x + 1).filter(function (x) { return x; });
      }
      const p = new Promise((resolve) => resolve(1)).then(() => 2);`,
      options,
    },
    {
      name: 'const arrows inside a function are not counted',
      code: 'function a() { const b = () => 1; const c = () => 2; }',
      options,
    },
    {
      name: 'methods of a nested object are not counted',
      code: 'function a() { return [{ b() {}, c() {}, d() {} }]; }',
      options,
    },
    {
      name: 'the default maximum is five',
      code: 'function a() {}\nfunction b() {}\nfunction c() {}\n'
        + 'function d() {}\nfunction e() {}',
    },
  ],
  invalid: [
    {
      name: 'function declarations',
      code: 'function a() {}\nfunction b() {}\nfunction c() {}',
      options,
      errors: tooMany(3),
    },
    {
      name: 'module-scope arrow and function expressions',
      code: 'const a = () => 1;\nconst b = function () {};\nexport const c = () => 3;',
      options,
      errors: tooMany(3),
    },
    {
      name: 'nested function declarations',
      code: 'function a() { function b() {} function c() {} }',
      options,
      errors: tooMany(3),
    },
    {
      name: 'class methods',
      code: 'class A { constructor() {} b() {} get c() { return 1; } }',
      options,
      errors: tooMany(3),
    },
    {
      name: 'class properties holding functions',
      code: 'class A { a = () => 1; b = function () {}; c = () => 3; d = 4; }',
      options,
      errors: tooMany(3),
    },
    {
      name: 'the default maximum is five, so six fail',
      code: 'function a() {}\nfunction b() {}\nfunction c() {}\n'
        + 'function d() {}\nfunction e() {}\nfunction f() {}',
      errors: [{ messageId: 'tooMany', data: { count: 6, max: 5 } }],
    },
    {
      name: 'object-literal methods at module scope',
      code: 'export default { a() {}, b: () => 1, c: function () {} };',
      options,
      errors: tooMany(3),
    },
    {
      name: "methods of a factory's returned object",
      code: 'export function make() { return { a() {}, b: () => 2 }; }',
      options,
      errors: tooMany(3),
    },
    {
      name: 'an object returned by a module-scope arrow',
      code: 'const make = () => ({ a() {}, b() {} });',
      options,
      errors: tooMany(3),
    },
  ],
});
