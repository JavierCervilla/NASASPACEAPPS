/**
 * Local ESLint rule: at most `max` named functions per file (the 42 Norm's "five functions per file", adapted to
 * TypeScript). ESLint has no built-in rule for this.
 *
 * Counted: every function declaration, a module-scope `const x = () => ...` or `const x = function ...`, every class
 * method, and every method of an object literal that sits at module scope or is returned by a module-scope function
 * (a factory). Not counted: inline callbacks, such as the arguments of `map`, `then` or `new Promise`, because they
 * are expressions, not named units of the module.
 */

const DEFAULT_MAX = 5;

const isFunctionNode = (node) =>
  node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';

/** The functions around a node, innermost first; empty at module scope. */
function enclosingFunctions(node) {
  const functions = [];
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'FunctionDeclaration' || isFunctionNode(current)) functions.push(current);
  }
  return functions;
}

function isModuleScopeFunction(fn) {
  if (fn.type === 'FunctionDeclaration') return enclosingFunctions(fn).length === 0;
  const declarator = fn.parent;
  return declarator?.type === 'VariableDeclarator' && declarator.init === fn && enclosingFunctions(fn).length === 0;
}

/** True when the object literal is at module scope or is what a module-scope function returns. */
function isCountedObject(object) {
  const functions = enclosingFunctions(object);
  if (functions.length === 0) return true;
  if (functions.length > 1 || !isModuleScopeFunction(functions[0])) return false;
  const parent = object.parent;
  return parent.type === 'ReturnStatement' || (parent === functions[0] && parent.body === object);
}

function isObjectMethod(property) {
  return property.method === true || property.kind !== 'init' || isFunctionNode(property.value);
}

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Limit the number of named functions in a file' },
    schema: [
      {
        type: 'object',
        properties: { max: { type: 'integer', minimum: 0 } },
        additionalProperties: false,
      },
    ],
    messages: {
      tooMany: 'File has too many named functions ({{count}}). Maximum allowed is {{max}}.',
    },
  },
  create(context) {
    const max = context.options[0]?.max ?? DEFAULT_MAX;
    const counted = [];
    return {
      FunctionDeclaration(node) {
        counted.push(node);
      },
      VariableDeclarator(node) {
        if (isFunctionNode(node.init) && enclosingFunctions(node).length === 0) counted.push(node);
      },
      MethodDefinition(node) {
        counted.push(node);
      },
      Property(node) {
        if (node.parent.type === 'ObjectExpression' && isObjectMethod(node) && isCountedObject(node.parent)) {
          counted.push(node);
        }
      },
      'Program:exit'() {
        if (counted.length <= max) return;
        context.report({
          node: counted[max],
          messageId: 'tooMany',
          data: { count: counted.length, max },
        });
      },
    };
  },
};
