/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-unused-labels */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type {
  Selector,
  MultiSelector,
  BinarySelector,
} from './index';

import * as esquery from 'esquery';
import { SyntaxKind } from 'typescript';

/**
 * @public
 * Parse a `string` into an ESQuery `Selector`.
 *
 * @param selectorString - a TSQuery `Selector` (using the [ESQuery selector syntax](https://github.com/estools/esquery)).
 * @returns a validated `Selector` or `null` if the input `string` is invalid.
 * @throws if the `Selector` is syntactically valid, but contains an invalid TypeScript Node kind.
 */
export function parse(selectorString: string): Selector | null {
  const selector = esquery.parse(stripComments(stripNewLines(selectorString)));

  if (!selector) {
    return null;
  }
  transform(selector);
  return validate(selector, undefined);
}

/**
 * @public
 * Ensure that an input is a parsed ESQuery `Selector`.
 *
 * @param selector - a TSQuery `Selector` (using the [ESQuery selector syntax](https://github.com/estools/esquery)).
 * @returns a validated `Selector`
 * @throws if the input `string` is invalid.
 */
parse.ensure = function ensure(selector: string | Selector): Selector {
  if (isSelector(selector)) {
    return selector;
  }
  const parsed = parse(selector);
  if (!parsed) {
    throw new SyntaxError(`"${selector}" is not a valid TSQuery Selector.`);
  }
  return parsed;
};

function isSelector(selector: string | Selector): selector is Selector {
  return typeof selector !== 'string';
}

function stripComments(input: string): string {
  return input.replace(/\/\*[\w\W]*\*\//g, '');
}

function stripNewLines(input: string): string {
  return input.replace(/\n/g, '');
}

function validate(selector: Selector, parent: Selector["parent"]): Selector {
  selector.parent = parent;

  if ("selectors" in selector) {
    selector.selectors.map(child => validate(child, selector));
  }
  if ("left" in selector) {
    const { left, right } = selector;
    validate(left, selector);
    validate(right, selector);
  }

  if (selector.type === "identifier") {
    const { value } = selector;
    if (!(value in SyntaxKind && !Number.isNaN(+SyntaxKind[value as keyof typeof SyntaxKind]))) {
      throw new SyntaxError(`"${value}" is not a valid TypeScript Node kind.`);
    }
  }

  return selector;
}

export function transform(selector: Selector) {
  addParent(selector, undefined);
  let reRun = false;

  do {
    reRun = false;
    visit(selector);
  } while (reRun);

  function visit(node: Selector | undefined) {
    if (!node || reRun) {
      return;
    }
    if ("selectors" in node) {
      visitMulti(node);
    }
    if (reRun) {
      return;
    }
    if ("left" in node && "right" in node) {
      visitBinarySelector(node);
    }
    if (reRun) {
      return;
    }
  }
  function visitMulti(node: MultiSelector) {
    node.selectors.forEach(visit);
  }
  function visitBinarySelector(node: BinarySelector) {
    visitBinary: {
      node.left.parent = node.right.parent = node;
      visitLeft: {
        if (node.left.subject) {
          const { left } = node;
          const newRoot: MultiSelector = {
            type: 'compound',
            selectors: []
          };
          if ("selectors" in left) {
            newRoot.selectors.push(...left.selectors);
          } else {
            newRoot.selectors.push(left);
          }
          let cur: Selector["parent"] = node;
          let following: esquery.SubjectSelector = cur.right;
          while ((cur = cur.parent) && "left" in cur) {
            const { right, type } = cur;
            following = {
              left: following,
              right,
              type,
            } satisfies BinarySelector as BinarySelector;
            following.left.parent = following.right.parent = following;
            // always leave cur defined so it can be used after the loop
            if (!cur.parent) {
              break;
            }
          }
          if (node.type !== "descendant") {
            following = {
              type: node.type,
              left: {
                type: "exactNode",
              },
              right: following
            } satisfies BinarySelector as BinarySelector;
            following.left.parent = following.right.parent = following;
          }
          const has: esquery.Has = {
            type: "has",
            selectors: [following]
          };
          has.selectors[0].parent = has;
          newRoot.selectors.push(has);
          newRoot.selectors.forEach(s => s.parent = newRoot);
          // overwrite the root with itself
          const root = cur ?? node;
          replaceNode(root, newRoot);
          reRun = true;
          return;
        } else {
          visit(node.left);
        }
      }
      visitRight: {
        visit(node.right);
      }
    }
  }
  function replaceNode(oldNode: Selector, newNode: Selector) {
    const { parent } = oldNode;
    Object.keys(oldNode).forEach(key => {
      delete oldNode[key as keyof Selector];
    })
    Object.assign(oldNode, newNode, { parent });
  }
}

function addParent(selector: Selector, parent: Selector["parent"]): void {
  if (parent) {
    selector.parent = parent;
  }
  if ("left" in selector && "right" in selector) {
    addParent(selector.left, selector);
    addParent(selector.right, selector);
  }
  if ("selectors" in selector) {
    selector.selectors.forEach(child => addParent(child, selector))
  }
}