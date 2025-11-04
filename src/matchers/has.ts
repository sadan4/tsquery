import type { Has, HasStartingBinaryOp, Selector, Sequence, Wildcard } from 'esquery';
import type { Node } from 'typescript';

import { findMatches, traverse } from '../traverse';
import { MATCHERS } from '.';
import { UnionToIntersection } from '../types';

export function has(node: Node, selector: Has): boolean {
  const collector: Array<Node> = [];
  selector.selectors.forEach((childSelector) => {
    traverse(node, (childNode: Node, ancestors: Array<Node>) => {
      if (findMatches(childNode, childSelector, ancestors)) {
        collector.push(childNode);
      }
    });
  });
  return collector.length > 0;
}

type TFound = Sequence | Wildcard;
const nodeCache = new WeakMap<HasStartingBinaryOp, TFound>();

export function exactNode(
  node: Node,
  selector: HasStartingBinaryOp,
  ancestors: Array<Node>
): boolean {
  const { parent } = selector;
  if (!parent) {
    throw new Error("missing parent");
  }
  if (parent.parent?.type !== "has") {
    throw new Error("an exact node must be a direct grandchild of a has selector");
  }
  let cur: Selector | undefined = parent.parent;
  let prev: Selector = parent;
  let found: TFound | undefined = nodeCache.get(selector) ?? {
    type: 'wildcard',
    value: '*',
  };
  while (!found) {
    if (!(prev = cur, cur = cur.parent)) {
      // we reached the top and found nothing so it must be `:has()`; use a wildcard
      break;
    }
    if (cur.type === "has") {
      throw new Error(":has cannot be a decendant of another :has")
    } else if (cur.type === "not") {
      // the not will be handled elsewhere
      continue;
      // any binary expr
    } else if ("left" in cur || cur.type === "matches") {
      break;
    } else if (cur.type === "compound") {
      if (cur.selectors.length === 0) {
        // if it is empty, we should prob just use a wildcare
        throw new Error("shouldnt be possible");
      }
      const idx = cur.selectors.indexOf(prev);
      if (idx === -1) {
        throw new Error("unreachable");
      }
      found = {
        type: "compound",
        selectors: cur.selectors.slice(0, idx),
      } satisfies Sequence;
    }
  }
  nodeCache.set(selector, found);

  switch (parent.type) {
    case 'child': {
      const matcher  = MATCHERS[found.type];
      // typescript cant express that matcher and found are linked without extra boilerplate
      return matcher(node, found as UnionToIntersection<TFound>, ancestors);
    }
    case 'sibling':
    case 'adjacent': {
      throw new Error("not implemented yet");
      break;
    }
    case 'has':
    case 'descendant':
    case 'compound':
    case 'not':
    case 'matches':
    default:
      throw new Error("invalid parent type for HasStartingBinaryOp selector");
  }
}