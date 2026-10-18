/**
 * Sub-patch definition and misuse (MANIFESTO §5). `defpatch` is scope-aware
 * like any defmod, and every misuse is loud: an optional input, a name
 * collision, effects inside the body, a missing required input, a
 * sub-patch that contains itself.
 *
 * `outs` is inferred from the function's own return, so it can't disagree
 * with itself, and there's no arbitrary-keys object to mis-dispatch on.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { defpatch, factory, out, runEval, runProgram, tempo } from "@/engine/api";
import type { Handle } from "@/engine/patch/handle-data";

const saw = factory("saw");

const half = ({ in: x }: { in: Handle }) => x.mul(0.5);

describe("defpatch: definition", () => {
	it("an optional input is refused", () => {
		expect(() =>
			runEval(() => {
				defpatch("half", (({ in: x = NaN }: { in: number }) => (x as unknown as Handle).mul(0.5)) as never);
			}),
		).toThrow(/input 'in' is optional/);
	});

	it("a name taken by a registered module is refused", () => {
		expect(() =>
			runEval(() => {
				defpatch("lpf", half as never);
			}),
		).toThrow(/'lpf' collides with a registered module/);
	});

	it("at root scope it registers for every eval, call-style and by chaining", () => {
		const halve = defpatch("rootHalf", half as never);
		const program = runProgram(() => {
			halve(saw(40)).out();
			saw(41).rootHalf().out();
		});
		expect(program.nodes.filter((n) => n.module === "mul")).toHaveLength(2);
		expect(program.nodes.some((n) => n.module === "rootHalf")).toBe(false);
	});
});

describe("defpatch: a sub-patch with no inputs", () => {
	const drone = () => saw(40) as unknown as Handle;

	it("is a self-contained source: called on its own, it builds its graph", () => {
		const program = runProgram(() => {
			defpatch("drone", drone as never)()
				.mul(0.5)
				.out();
		});
		expect(program.nodes.map((n) => n.module)).toContain("saw");
	});

	it("cannot be chained into, loudly", () => {
		expect(() =>
			runEval(() => {
				defpatch("drone", drone as never);
				saw(41).drone();
			}),
		).toThrow(/'drone' has no inputs, so nothing can be chained/);
	});
});

describe("defpatch: loud errors at compile", () => {
	it("out() inside the body", () => {
		expect(() =>
			runProgram(() => {
				defpatch(
					"half",
					(({ in: x }: { in: Handle }) => {
						out(x);
						return x.mul(0.5);
					}) as never,
				)(saw(40)).out();
			}),
		).toThrow(/out\(\) inside patch/);
	});

	it("tempo() inside the body", () => {
		expect(() =>
			runProgram(() => {
				defpatch(
					"half",
					(({ in: x }: { in: Handle }) => {
						tempo(120);
						return x.mul(0.5);
					}) as never,
				)(saw(40)).out();
			}),
		).toThrow(/tempo\(\) and seed\(\) are patch settings/);
	});

	it("a required input left unconnected", () => {
		expect(() =>
			runProgram(() => {
				defpatch("half", half as never)().out();
			}),
		).toThrow(/half\.in is required but unconnected/);
	});

	it("a sub-patch that contains itself", () => {
		expect(() =>
			runProgram(() => {
				defpatch(
					"forever",
					(({ in: x }: { in: Handle }) => (x as unknown as { forever(): Handle }).forever()) as never,
				)(saw(40)).out();
			}),
		).toThrow(/sub-patch 'forever' contains itself/);
	});

	it(".width() on an instance is refused, naming why", () => {
		expect(() =>
			runProgram(() => {
				defpatch("half", half as never)(saw(40))
					.width(2)
					.out();
			}),
		).toThrow(/\.width\(\) does not apply\. A sub-patch has no lanes of its own/);
	});

	it("an unused sub-patch never runs its patch", () => {
		let ran = false;
		runProgram(() => {
			defpatch(
				"half",
				(({ in: x }: { in: Handle }) => {
					ran = true;
					return x.mul(0.5);
				}) as never,
			)(saw(40));
			saw(40).out();
		});
		expect(ran).toBe(false);
	});
});
