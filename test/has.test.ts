import type { BinaryExpression, Block, FunctionDeclaration, IfStatement } from 'typescript';
import { describe, expect, it } from "vitest";

import { conditional, siblings, simpleProgram } from './fixtures';

import { ast, query, tsquery } from '../src/index';

describe('tsquery:', () => {
  describe('tsquery - :has:', () => {
    it('should find any nodes with multiple attributes', () => {
      const ast = tsquery.ast(conditional);
      const result = tsquery(
        ast,
        'ExpressionStatement:has([name="foo"][kindName="Identifier"])'
      );

      expect(result).toEqual([
        ((ast.statements[0] as IfStatement).thenStatement as Block)
          .statements[0]
      ]);
    });

    it('should find any nodes with one of multiple attributes', () => {
      const ast = tsquery.ast(conditional);
      const result = tsquery(
        ast,
        'IfStatement:has(BinaryExpression [name="foo"], BinaryExpression [name="x"])'
      );

      expect(result).toEqual([ast.statements[0], ast.statements[1]]);
    });

    it('should handle chained :has selectors', () => {
      const ast = tsquery.ast(conditional);
      const result = tsquery(
        ast,
        'BinaryExpression:has(Identifier[name="x"]):has([text="test"])'
      );

      expect(result).toEqual([
        (ast.statements[1] as IfStatement).expression,
        ((ast.statements[1] as IfStatement).expression as BinaryExpression)
          .left,
        (
          ((ast.statements[1] as IfStatement).expression as BinaryExpression)
            .left as BinaryExpression
        ).left
      ]);
    });

    it('should handle nested :has selectors', () => {
      const ast = tsquery.ast(conditional);
      const result = tsquery(
        ast,
        'SourceFile:has(IfStatement:has(TrueKeyword, FalseKeyword))'
      );

      expect(result).toEqual([ast]);
    });
    describe("with immeadiate child selector '>'", () => {
      it('should handle immediate child selectors within :has', () => {
        const ast = tsquery.ast(conditional);
        const result = tsquery(
          ast,
          'SourceFile:has(> IfStatement)'
        );
        expect(result).toEqual([ast]);
      });
      it('should handle immediate child selectors within :has and :not', () => {
        const ast = tsquery.ast(simpleProgram);
        const result = tsquery(
          ast,
          'SourceFile:not(:has(> *))'
        );
        expect(result).toEqual([]);
      });
      it('should handle has with no parent', () => {
        const ast = tsquery.ast(conditional);
        const result = tsquery(
          ast,
          ':has(> Identifier[name=x])'
        );
        expect(result).toMatchSnapshot();
      });
    });
    describe("with immeadite sibling selector '~'", () => {
      it('should find a node that is a subsequent sibling of another node', () => {
        const parsed = ast(simpleProgram);
        const result = query(parsed, 'VariableStatement:has(~ IfStatement)');

        expect(result).toEqual([
          parsed.statements[0],
          parsed.statements[1],
        ]);
      });
      it('should find a node that is a subsequent sibling of another node, including when visiting out of band nodes', () => {
        const parsed = ast(siblings);
        const result = query(parsed, 'Identifier[name="d"]:has(~ AnyKeyword)');

        expect(result).toEqual([
          (parsed.statements[2] as FunctionDeclaration).parameters[0].name
        ]);
      });
      it("should handle immediate sibling selectors within :has", () => {
        const ast = tsquery.ast(siblings);
        const result = tsquery(
          ast,
          "FunctionDeclaration:has(~ FunctionDeclaration)"
        );
        expect(result).toEqual([
          ast.statements[0],
          ast.statements[1],
        ])
      });
      it("should handle immediate sibling selectors within :has 2", () => {
        const ast = tsquery.ast(siblings);
        const result = tsquery(
          ast,
          "FunctionDeclaration:has(~ [parameters.length=0])"
        );
        expect(result).toEqual([
          ast.statements[0],
        ])
      });
    });
    describe("with immeadiate next sibling selector '+'", () => {
      it('should find a parameter that is the next sibling of another parameter', () => {
        const parsed = ast(siblings);
        const result = query(parsed, 'Parameter:has(+ Parameter)');

        expect(result).toEqual([
          (parsed.statements[2] as FunctionDeclaration).parameters[0]
        ]);
      });
    });
  });
});
