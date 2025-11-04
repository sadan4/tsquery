/* eslint-disable no-unused-labels */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type {
  Selector,
  MultiSelector,
  BinarySelector,
  Identifier
} from './index';

import * as esquery from 'esquery';
import { SyntaxKind } from 'typescript';

const IDENTIFIER_QUERY = 'identifier';

/**
 * @public
 * Parse a `string` into an ESQuery `Selector`.
 *
 * @param selector - a TSQuery `Selector` (using the [ESQuery selector syntax](https://github.com/estools/esquery)).
 * @returns a validated `Selector` or `null` if the input `string` is invalid.
 * @throws if the `Selector` is syntactically valid, but contains an invalid TypeScript Node kind.
 */
export function parse(selector: string): Selector | null {
  const cleanSelector = esquery.parse(stripComments(stripNewLines(selector)));
  transform(cleanSelector);
  return validate(cleanSelector);
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

function validate(selector: Selector): Selector | null {
  if (!selector) {
    return null;
  }

  if ("parent" in selector) {
    delete (selector as any).parent;
  }

  const { selectors } = selector as MultiSelector;
  if (selectors) {
    selectors.map(validate);
  }
  const { left, right } = selector as BinarySelector;
  if (left) {
    validate(left);
  }
  if (right) {
    validate(right);
  }

  if ((selector.type as string) === IDENTIFIER_QUERY) {
    const { value } = selector as Identifier;
    if (SyntaxKind[value as keyof typeof SyntaxKind] == null) {
      throw new SyntaxError(`"${value}" is not a valid TypeScript Node kind.`);
    }
  }

  return selector;
}

type MultiWithParent = MultiSelector & { selectors: SelectorWithParent<esquery.SubjectSelector>[]; }
type BinaryWithParent = BinarySelector & { left: SelectorWithParent<esquery.SubjectSelector>; right: SelectorWithParent<esquery.SubjectSelector>; }

type SelectorWithParent<T extends Selector = Selector> = T & { parent?: SelectorWithParent<MultiWithParent | BinaryWithParent>; };

export function transform(selector: Selector) {
  const stack: Selector[] = [];
  let reRun = false;

  do {
    stack.length = 0;
    reRun = false;
    visit(selector);
  } while (reRun);

  type TAfter = (cb: () => void) => void;
  
  function visitMulti(node: SelectorWithParent<MultiSelector>, after: TAfter) {
    node.selectors.forEach(visit);
  }
  function visitBinarySelector(node: SelectorWithParent<BinaryWithParent>, after: TAfter) {
    visitBinary: {
      node.left.parent = node.right.parent = node;
      visitLeft: {
        if (node.left.subject) {
          const { left } = node;
          const newRoot: SelectorWithParent<MultiWithParent> = {
            type: 'compound',
            selectors: []
          };
          if ("selectors" in left) {
            newRoot.selectors.push(...left.selectors);
          } else {
            newRoot.selectors.push(left);
          }
          let cur: SelectorWithParent | undefined = node;
          let following: SelectorWithParent<esquery.SubjectSelector | BinarySelector> = cur.right;
          cur = node.parent;
          while (cur && "left" in cur && "right" in cur) {
            const { right, type } = cur;
            following = {
              type,
              left: following,
              right
            } satisfies BinarySelector;
            // @ts-expect-error guh
            following.left.parent = following.right.parent = following;
            // always leave cur defined so it can be used after the loop
            if (!cur.parent) {
              break;
            }
            cur = cur.parent;
          }
          if (node.type != "descendant") {
            following = {
              type: node.type,
              left: {
                type: "exactNode",
              } as never as esquery.SubjectSelector,
              right: following
            } satisfies BinarySelector;
            // @ts-expect-error guh
            following.left.parent = following.right.parent = following;
          }
          const has = {
            type: "has",
            selectors: [following]
          } satisfies SelectorWithParent<esquery.Has>;
          has.selectors[0].parent = has;
          newRoot.selectors.push(has);
          newRoot.selectors.forEach(s => (s as any).parent = newRoot);
          // overwrite the root with itself
          const root = cur ?? node;
          newRoot.parent = root.parent;
          Object.keys(root).forEach(key => {
            delete (root as never)[key];
          });
          Object.assign(root, newRoot);
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
  function visit(node: Selector | undefined) {
    if (!node || reRun) {
      return;
    }
    const top = stack.at(-1);
    if (top) {
      (node as SelectorWithParent).parent = top as MultiSelector | BinarySelector;
    }
    stack.push(node);
    const cbs: (() => void)[] = [];
    if ("selectors" in node) {
      visitMulti(node, after);
    }
    if (reRun) {
      return;
    }
    if ("left" in node && "right" in node) {
      visitBinarySelector(node, after);
    }
    if (reRun) {
      return;
    }
    stack.pop();
    cbs.forEach((cb) => cb());
    function after(cb: () => void) {
      cbs.push(cb);
    }
  }
}