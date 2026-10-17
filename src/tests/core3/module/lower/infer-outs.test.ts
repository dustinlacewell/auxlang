/**
 * `inferOuts` reads a tick's `return` statements: `return expr` names one
 * output, `out`; `return { l, r }` names one per key. Every return must
 * agree on the same keys, and a tick that returns a value must end in one.
 */

import { parse } from "acorn";
import { describe, expect, it } from "vitest";

import { applyEdits } from "@/core3/module/tick-build/text-edits";
import { inferOuts } from "@/core3/module/lower/infer-outs";
import type { ArrowFunctionExpression } from "acorn";

/** Parses `src` itself as the expression (no extra wrapping parens), so node offsets index `src` directly. */
function tickArrow(src: string): ArrowFunctionExpression {
	const program = parse(src, { ecmaVersion: "latest" });
	const stmt = program.body[0];
	if (stmt === undefined || stmt.type !== "ExpressionStatement" || stmt.expression.type !== "ArrowFunctionExpression") {
		throw new Error("test tick must be an arrow");
	}
	return stmt.expression;
}

describe("inferOuts", () => {
	it("a single 'return expr' names one output, 'out'", () => {
		const src = "({ in: x = 0 }) => { return x }";
		const tick = tickArrow(src);
		const result = inferOuts(tick, "echo");
		expect(result.outs).toEqual(["out"]);
		const rewritten = applyEdits(src, result.edits);
		expect(rewritten).toBe("({ in: x = 0 }) => { __dsp_o.out = (x); return; }");
	});

	it("'return { l, r }' names one output per key", () => {
		const src = "({ in: x = 0 }) => { return { l: x, r: x } }";
		const tick = tickArrow(src);
		const result = inferOuts(tick, "pan");
		expect(result.outs).toEqual(["l", "r"]);
		const rewritten = applyEdits(src, result.edits);
		expect(rewritten).toBe("({ in: x = 0 }) => { __dsp_o.l = (x); __dsp_o.r = (x); return; }");
	});

	it("mismatched key sets across returns throws", () => {
		const src = "({ in: x = 0 }) => { if (x) { return { l: x, r: x } } return { l: x } }";
		const tick = tickArrow(src);
		expect(() => inferOuts(tick, "bad")).toThrow(/same outputs/);
	});

	it("a returning tick that does not end in 'return' throws", () => {
		const src = "({ in: x = 0 }) => { if (x) { return x } x + 1 }";
		const tick = tickArrow(src);
		expect(() => inferOuts(tick, "bad")).toThrow(/must end its body in a 'return'/);
	});

	it("an expression-bodied arrow counts as one 'return expr'", () => {
		const src = "({ in: x = 0 }) => x + 1";
		const tick = tickArrow(src);
		const result = inferOuts(tick, "echo");
		expect(result.outs).toEqual(["out"]);
	});

	it("an unbraced 'if' return wraps its rewrite in braces, keeping the early return conditional", () => {
		const src = "({ in: x = 0 }) => { if (x > 0) return 1; return 2 }";
		const tick = tickArrow(src);
		const result = inferOuts(tick, "echo");
		const rewritten = applyEdits(src, result.edits);
		expect(rewritten).toBe(
			"({ in: x = 0 }) => { if (x > 0) { __dsp_o.out = (1); return; } __dsp_o.out = (2); return; }",
		);
	});

	it("an unbraced 'else' return also wraps its rewrite in braces", () => {
		const src = "({ in: x = 0 }) => { if (x > 0) return 1; else return 2; return 3 }";
		const tick = tickArrow(src);
		const result = inferOuts(tick, "echo");
		const rewritten = applyEdits(src, result.edits);
		expect(rewritten).toBe(
			"({ in: x = 0 }) => { if (x > 0) { __dsp_o.out = (1); return; } else { __dsp_o.out = (2); return; } __dsp_o.out = (3); return; }",
		);
	});

	it("an unbraced loop-body return wraps its rewrite in braces", () => {
		const src = "({ in: x = 0 }) => { for (let i = 0; i < 1; i++) if (x > 0) return 1; return 2 }";
		const tick = tickArrow(src);
		const result = inferOuts(tick, "echo");
		const rewritten = applyEdits(src, result.edits);
		expect(rewritten).toBe(
			"({ in: x = 0 }) => { for (let i = 0; i < 1; i++) if (x > 0) { __dsp_o.out = (1); return; } __dsp_o.out = (2); return; }",
		);
	});
});
