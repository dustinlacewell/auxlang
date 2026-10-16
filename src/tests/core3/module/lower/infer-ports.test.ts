/**
 * `inferPorts` reads a tick's destructured first param: each key is a port,
 * its value the local binding name, its default the port's unit and value.
 */

import { parse } from "acorn";
import { describe, expect, it } from "vitest";

import { inferPorts } from "@/core3/module/lower/infer-ports";

function tickArrow(src: string) {
	const program = parse(`(${src})`, { ecmaVersion: "latest" });
	const stmt = program.body[0];
	if (stmt?.type !== "ExpressionStatement" || stmt.expression.type !== "ArrowFunctionExpression") {
		throw new Error("test tick must be an arrow");
	}
	return stmt.expression;
}

describe("inferPorts", () => {
	it("the echo example: order, optional fm, required cv, bindings", () => {
		const tick = tickArrow(
			"({ in: x = 0, time = secs(0.25), fm = NaN, cv }) => { return x }",
		);
		const result = inferPorts(tick, "echo");

		expect(result.order).toEqual(["in", "time", "fm", "cv"]);
		expect(result.ins.cv).toEqual({ unit: "sig", def: null });
		expect(result.ins.fm?.opt).toBe(true);
		expect(result.bindings.get("in")).toBe("x");
	});

	it("a marker name equal to a port name in the same pattern throws, with a rename hint", () => {
		const tick = tickArrow("({ gate = gate(0) }) => { return gate }");
		expect(() => inferPorts(tick, "bad")).toThrow(/rename the port binding/);
	});

	it("a rest element throws", () => {
		const tick = tickArrow("({ in: x = 0, ...rest }) => { return x }");
		expect(() => inferPorts(tick, "bad")).toThrow();
	});
});
