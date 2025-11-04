import type { Child } from 'esquery';
import type { Node } from 'typescript';

import { findMatches } from '../traverse';

export function child(
  node: Node,
  selector: Child,
  ancestors: Array<Node>
): boolean {
  if (findMatches(node, selector.right, ancestors)) {
    return findMatches(ancestors[0], selector.left, ancestors.slice(1));
  }
  return false;
}

export function exactNode(
  node: Node,
  selector: { type: 'exactNode' },
  ancestors: Array<Node>
): boolean {
  return ancestors.length > 0 && ancestors[0].getChildren().includes(node);
}