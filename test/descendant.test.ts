import { describe, expect, it } from "vitest";
import type { IfStatement } from 'typescript';
import { conditional } from './fixtures';

import { tsquery } from '../src/index';

describe('tsquery:', () => {
  describe('tsquery - descendant:', () => {
    it('should find any nodes that are a descendant of another node', () => {
      const ast = tsquery.ast(conditional);
      const result = tsquery(ast, 'SourceFile IfStatement');

      expect(result).toEqual([
        ast.statements[0],
        ast.statements[1],
        (ast.statements[1] as IfStatement).elseStatement
      ]);
    });
    it("should properly match nested descendants when passed a non-root node", () => {
      const ast = tsquery.ast(`class Foo {
  #a = 2;

  static b(c) {
    return ++c.#a;
  }
}`);
      const [method] = tsquery(ast, "MethodDeclaration[name.text=b]");
      const result = tsquery(method, "ClassDeclaration PrivateIdentifier");

      expect(result).toEqual([]);
    });
  });
});
