/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Has } from 'esquery';
import type { Node } from 'typescript';

import { findMatches, traverse } from '../traverse';

export function has(node: Node, selector: Has, ancestors: Array<Node>): boolean {
  const collector: Array<Node> = [];
  // workaround v8 crash while debugging a for each loop
  for (let i = 0; i < selector.selectors.length; i++) {
    const childSelector = selector.selectors[i];
    if ("left" in childSelector && childSelector.left.type === "exactNode") {
      const {right} = childSelector;
      switch (childSelector.type) {
        case "descendant":
          throw new Error("a decendant cannot have an exact node as left");
        case "adjacent": {
            if (ancestors.length) {
              const [parent] = ancestors;
              const siblings: Node[] = [];
              // do this to avoid hitting SyntaxList from getChildren
              parent.forEachChild(child => void siblings.push(child));
              const startingIndex = siblings.indexOf(node);
              if (startingIndex === -1) {
                console.warn("node not found in parent children");
                return false;
              }
              const nextNode = siblings.at(startingIndex + 1);
              return !!nextNode && findMatches(nextNode, right, [node]);
            } else {
              return false;
            }
        }
        case "sibling": {
          if (ancestors.length) {
            const [parent] = ancestors;
            const siblings: Node[] = [];
            // do this to avoid hitting SyntaxList from getChildren
            parent.forEachChild(child => void siblings.push(child));
            const startingIndex = siblings.indexOf(node);
            if (startingIndex === -1) {
              console.warn("node not found in parent children");
              return false;
            }
            return siblings.slice(startingIndex + 1).some(sibling => {
              return findMatches(sibling, right, [node]);
            });
          } else {
            return false;
          }
        }
        case "child": {
          return !!node.forEachChild((child) => findMatches(child, right, [node]))
        }
      }
      return false;
    }
    traverse(node, (childNode: Node, ancestors: Array<Node>) => {
      if (findMatches(childNode, childSelector, ancestors)) {
        collector.push(childNode);
      }
    });
  }
  return collector.length > 0;
}
