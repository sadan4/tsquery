import { IfStatement } from "typescript";
import { tsquery } from "../src";
import { conditional } from "./fixtures";
import { describe, expect, it } from "vitest";

describe("tsquery:", () => {
    describe("tsquery - :has:", () => {
        it("should handle type subjects", () => {
            const ast = tsquery.ast(conditional);

            const result = tsquery(ast, "!IfStatement Identifier");

            expect(result).toEqual([
                ast.statements[0],
                ast.statements[1],
                (ast.statements[1] as IfStatement).elseStatement
            ]);
        });
    });
});