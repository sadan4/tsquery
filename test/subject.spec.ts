import { IfStatement } from "typescript";
import { tsquery } from "../src";
import { conditional } from "./fixtures";
import { describe, expect, it } from "vitest";

describe("tsquery:", () => {
    describe("tsquery - Subject Selector(`!`):", () => {
        it("should handle type subjects", () => {
            const ast = tsquery.ast(conditional);

            const result = tsquery(ast, "!Block BinaryExpression");

            expect(result).toEqual([
                (ast.statements[0] as IfStatement).elseStatement,
                (ast.statements[1] as IfStatement).thenStatement,
                ((ast.statements[1] as IfStatement).elseStatement as IfStatement).thenStatement,
            ]);
        });
    });
});