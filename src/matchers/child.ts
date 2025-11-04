import type { Child } from 'esquery';
import type { Node } from 'typescript';

import { findMatches } from '../traverse';

export function child(
  node: Node,
  selector: Child,
  ancestors: Array<Node>
): boolean {
  // you cant be a child of nothing
  if (ancestors.length && findMatches(node, selector.right, ancestors)) {
    return findMatches(ancestors[0], selector.left, ancestors.slice(1));
  }
  return false;
}
