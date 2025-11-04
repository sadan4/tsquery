import { IfStatement } from "typescript";
import { tsquery } from "../src";
import { conditional } from "./fixtures";
import { describe, expect, it } from "vitest";

describe("tsquery:", () => {
    describe("tsquery - :has:", () => {
        it("should handle type subjects", () => {
            const ast = tsquery.ast(conditional);

            const result = tsquery(ast, "!Block > ExpressionStatement > BinaryExpression");

            expect(result).toEqual([ast.statements[0]]);
        });
    });
});