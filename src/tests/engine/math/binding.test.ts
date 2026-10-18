/**
 * No tick, helper or lambda reaches host transcendental math (MANIFESTO §7):
 * after binding, the only `Math.*` calls left are exact IEEE operations and
 * the seeded `Math.random`, and `**` is gone. The math helpers themselves pass
 * the tick subset, and the checker turns away every other `Math` use.
 */

import { type AnyNode, parse } from "acorn";
import { describe, expect, it } from "vitest";

import "@/engine/modules/all";
import { EXACT_HOST_MATH } from "@/engine/math/exact-host-math";
import { MATH_CONSTANTS } from "@/engine/math/math-constants";
import { bindLambdaMath } from "@/engine/module/bind-math/bind-lambda-math";
import { lambdaWrapper } from "@/engine/module/bind-math/lambda-wrapper";
import { mathFunctions } from "@/engine/module/bind-math/math-functions";
import { mathFunctionNames, mathHelpers } from "@/engine/module/bind-math/math-helpers";
import { getRegistry } from "@/engine/module/define";
import { analyseFunction, resolvePart } from "@/engine/module/front/module/analyse-function";
import { parsePart } from "@/engine/module/front/parse/parse-part";
import { walk } from "@/engine/module/front/parse/walk";
import { checkLambda } from "@/engine/module/front/module/check-lambda";

/** Every host-math reach in `text`: a Math member that is not exact, random or a constant, or a `**`. */
function hostMathIn(text: string): string[] {
	const found: string[] = [];
	walk(parse(`(${text})`, { ecmaVersion: "latest" }) as AnyNode, (node) => {
		if (
			node.type === "MemberExpression" &&
			node.object.type === "Identifier" &&
			node.object.name === "Math" &&
			node.property.type === "Identifier"
		) {
			const name = node.property.name;
			if (!EXACT_HOST_MATH.has(name) && !MATH_CONSTANTS.has(name) && name !== "random")
				found.push(`Math.${name}`);
		}
		if (
			(node.type === "BinaryExpression" || node.type === "AssignmentExpression") &&
			node.operator.startsWith("**")
		)
			found.push(node.operator);
	});
	return found;
}

describe("math binding", () => {
	const modules = [...getRegistry().values()];

	it.each(modules.map((spec) => [spec.name, spec] as const))(
		"%s reaches no host transcendental",
		(_name, spec) => {
			const source = spec.source;
			expect(source).toBeDefined();
			if (source === undefined) return;
			for (const text of [source.tick, ...Object.values(source.helpers)])
				expect(hostMathIn(text)).toEqual([]);
		},
	);

	it("binds the library's transcendental calls (osc pitch goes through exp2)", () => {
		const helpers = Object.keys(getRegistry().get("saw")?.source?.helpers ?? {});
		expect(helpers).toContain("__math_exp2");
		expect(Object.keys(getRegistry().get("out")?.source?.helpers ?? {})).toContain("__math_sin");
	});

	it("each math helper passes the tick subset and reaches no host transcendental", () => {
		const all = mathHelpers(mathFunctionNames());
		const helpers = new Set(Object.keys(all));
		for (const [name, text] of Object.entries(all)) {
			expect(hostMathIn(text)).toEqual([]);
			const part = parsePart({ owner: "auxlang math", part: `helper '${name}'`, src: text });
			analyseFunction(resolvePart(part, helpers), {
				kind: "helper",
				helpers,
				ins: new Set(),
				outs: new Set(),
				inGroups: new Set(),
				outGroups: new Set(),
				state: {},
				tables: false,
			});
		}
	});

	it("binds a lambda: same results as auxlang math, no host transcendental left", () => {
		const lambda = (_s: unknown, _sr: number, t: number) => Math.sin(t) + t ** 1.5 + Math.floor(t);
		const bound = lambdaWrapper(bindLambdaMath(lambda.toString()));
		expect(hostMathIn(bound)).toEqual([]);
		const fn = new Function(`"use strict"; return (${bound});`)() as typeof lambda;
		const m = mathFunctions();
		for (const t of [0.1, 1.7, 123.25])
			expect(fn({}, 48000, t)).toBe((m.sin?.(t) ?? 0) + (m.pow?.(t, 1.5) ?? 0) + Math.floor(t));
	});

	it("leaves a lambda without auxlang math unchanged", () => {
		const src = ((_s: unknown, _sr: number, t: number) => Math.abs(t) * Math.PI).toString();
		expect(bindLambdaMath(src)).toEqual({ fn: src, math: [], slots: 0 });
	});
});

describe("the checker's Math surface", () => {
	const lambda = (body: string) => () => checkLambda(`(s, sr, t) => ${body}`);

	it("accepts auxlang math, exact host operations and constants", () => {
		expect(
			lambda("Math.sin(t) + Math.atan2(t, 1) + Math.floor(t) * Math.PI + t ** 2"),
		).not.toThrow();
	});

	it("rejects Math functions outside the set, and engine-only ones", () => {
		expect(lambda("Math.f16round(t)")).toThrow(/not available in a tick/);
		expect(lambda("Math.nope(t)")).toThrow(/not available in a tick/);
	});

	it("rejects a Math function read as a value", () => {
		expect(lambda("Math.sin")).toThrow(/may only be called/);
	});

	it("checks arity of auxlang math", () => {
		expect(lambda("Math.hypot(t, t, t)")).toThrow(/takes 2 arguments/);
		expect(lambda("Math.sin()")).toThrow(/takes one argument/);
	});

	it("rejects **=", () => {
		expect(() => checkLambda("(s, sr, t) => { let x = t; x **= 2; return x; }")).toThrow(/\*\*=/);
	});
});
