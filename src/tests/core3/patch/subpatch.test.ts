/**
 * Sub-patch definition and misuse (MANIFESTO §5). `defmod` with `patch` is
 * scope-aware like any defmod, and every misuse is loud: tick and patch
 * together, a returned record that does not match `outs`, effects inside
 * `patch`, a missing required input, a sub-patch that contains itself.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { defmod, factory, out, runEval, runProgram, tempo } from "@/core3/api";
import { optional, sig } from "@/core3/types";

const saw = factory("saw");

const half = {
	name: "half",
	ins: { in: sig(0) },
	outs: { out: sig() },
	patch: (i: { in: { mul: (x: number) => unknown } }) => ({ out: i.in.mul(0.5) }),
};

describe("defmod({ patch }): definition", () => {
	it("tick and patch together is a loud error", () => {
		expect(() =>
			runEval(() => {
				defmod({ ...half, tick: () => {} } as never);
			}),
		).toThrow(/tick and patch together/);
	});

	it("a tick-only key on a sub-patch is a loud error naming what applies", () => {
		expect(() =>
			runEval(() => {
				defmod({ ...half, state: () => ({}) } as never);
			}),
		).toThrow(/'state' does not apply to a sub-patch/);
	});

	it("an optional input is refused", () => {
		expect(() =>
			runEval(() => {
				defmod({ ...half, ins: { in: optional(sig(null)) } } as never);
			}),
		).toThrow(/input 'in' is optional/);
	});

	it("a name taken by a registered module is refused", () => {
		expect(() =>
			runEval(() => {
				defmod({ ...half, name: "lpf" } as never);
			}),
		).toThrow(/'lpf' collides with a registered module/);
	});

	it("at root scope it registers for every eval, call-style and by chaining", () => {
		const halve = defmod({
			name: "rootHalf",
			ins: { in: sig(0) },
			outs: { out: sig() },
			patch: (i) => ({ out: i.in.mul(0.5) }),
		});
		const program = runProgram(() => {
			halve(saw(40)).out();
			saw(41).rootHalf().out();
		});
		expect(program.nodes.filter((n) => n.module === "mul")).toHaveLength(2);
		expect(program.nodes.some((n) => n.module === "rootHalf")).toBe(false);
	});
});

describe("defmod({ patch }): a sub-patch with no inputs", () => {
	const drone = { name: "drone", ins: {}, outs: { out: sig() }, patch: () => ({ out: saw(40) }) };

	it("is a self-contained source: called on its own, it builds its graph", () => {
		const program = runProgram(() => {
			defmod(drone as never)()
				.mul(0.5)
				.out();
		});
		expect(program.nodes.map((n) => n.module)).toContain("saw");
	});

	it("cannot be chained into, loudly", () => {
		expect(() =>
			runEval(() => {
				defmod(drone as never);
				saw(41).drone();
			}),
		).toThrow(/'drone' has no inputs, so nothing can be chained/);
	});

	it("still needs at least one output", () => {
		expect(() =>
			runEval(() => {
				defmod({ ...drone, outs: {} } as never);
			}),
		).toThrow(/outs must be a record of at least 1 port/);
	});
});

describe("defmod({ patch }): loud errors at compile", () => {
	it("returned keys that differ from outs name both sets", () => {
		expect(() =>
			runProgram(() => {
				defmod({ ...half, patch: (i: { in: unknown }) => ({ wrong: i.in }) } as never)(
					saw(40),
				).out();
			}),
		).toThrow(/patch returned \[wrong\], but outs declare \[out\]/);
	});

	it("out() inside patch", () => {
		expect(() =>
			runProgram(() => {
				defmod({
					...half,
					patch: (i: { in: unknown }) => {
						out(i.in);
						return { out: i.in };
					},
				} as never)(saw(40)).out();
			}),
		).toThrow(/out\(\) inside patch/);
	});

	it("tempo() inside patch", () => {
		expect(() =>
			runProgram(() => {
				defmod({
					...half,
					patch: (i: { in: unknown }) => {
						tempo(120);
						return { out: i.in };
					},
				} as never)(saw(40)).out();
			}),
		).toThrow(/tempo\(\) and seed\(\) are patch settings/);
	});

	it("a required input left unconnected", () => {
		expect(() =>
			runProgram(() => {
				defmod({ ...half, ins: { in: sig(null) } } as never)().out();
			}),
		).toThrow(/half\.in is required but unconnected/);
	});

	it("a sub-patch that contains itself", () => {
		expect(() =>
			runProgram(() => {
				defmod({
					...half,
					name: "forever",
					patch: (i: { in: { forever: () => unknown } }) => ({ out: i.in.forever() }),
				} as never)(saw(40)).out();
			}),
		).toThrow(/sub-patch 'forever' contains itself/);
	});

	it(".width() on an instance is refused, naming why", () => {
		expect(() =>
			runProgram(() => {
				defmod(half as never)(saw(40))
					.width(2)
					.out();
			}),
		).toThrow(/\.width\(\) does not apply\. A sub-patch has no lanes of its own/);
	});

	it("an unused sub-patch never runs its patch", () => {
		let ran = false;
		runProgram(() => {
			defmod({
				...half,
				patch: (i: { in: unknown }) => {
					ran = true;
					return { out: i.in };
				},
			} as never)(saw(40));
			saw(40).out();
		});
		expect(ran).toBe(false);
	});
});
