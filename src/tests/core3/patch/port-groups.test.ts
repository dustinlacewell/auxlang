/**
 * Port groups at the patch layer: a group key binds members from an object
 * or an array, a named argument that is no port goes to the open in-group,
 * setters and `.mod` reach members, an out member taps by name, and every
 * misuse is loud.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { defmod, factory, runEval, runProgram } from "@/core3/api";
import type { GNode } from "@/core3/graph/node";
import type { Handle } from "@/core3/patch/handle-data";
import { group, type PNode, type Program, sig, sigs, unit } from "@/core3/types";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

const pass = (_s: Record<string, unknown>, i: { in: number }, o: { out: number }) => {
	o.out = i.in;
};

const defMix = () =>
	defmod({
		name: "gmix",
		category: "utils",
		ins: { in: sig(0), ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },
		outs: { out: sig(), fields: group(sig(0), { open: true }) },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["in"],
		tick: pass,
	});

const defMux = () =>
	defmod({
		name: "gmux",
		category: "utils",
		ins: { in: sig(0), palette: sigs(0) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["in", "palette"],
		tick: pass,
	});

const osc = (f: number): Handle => factory("tosc")(f);
const nodeOf = (program: Program, module: string): PNode =>
	program.nodes.find((n) => n.module === module) as PNode;

describe("binding members", () => {
	it("unknown named keys are members of the open in-group; a like group defaults its members", () => {
		const mix = nodeOf(
			runProgram(() => {
				defMix()({ drums: osc(1), bass: osc(2) }).out();
			}),
			"gmix",
		);
		expect(mix.groups).toEqual({ ch: ["drums", "bass"] });
		const lane = mix.lanes[0] as Record<string, unknown>;
		expect(lane.drums).toMatchObject({ k: "n", port: "out" });
		expect(lane.bass).toMatchObject({ k: "n", port: "out" });
		expect(lane["level.drums"]).toEqual({ k: "c", v: 1 });
		expect(lane["level.bass"]).toEqual({ k: "c", v: 1 });
	});

	it("a group key takes an object of members, its like group too", () => {
		const mix = nodeOf(
			runProgram(() => {
				defMix()({ ch: { a: osc(1) }, level: { a: 0.25 } }).out();
			}),
			"gmix",
		);
		expect(mix.groups).toEqual({ ch: ["a"] });
		expect(mix.lanes[0]?.["level.a"]).toEqual({ k: "c", v: 0.25 });
	});

	it("an array sets members 0..n-1, positionally too", () => {
		const mux = nodeOf(
			runProgram(() => {
				defMux()(0, [osc(1), 3, osc(2)]).out();
			}),
			"gmux",
		);
		expect(mux.groups).toEqual({ palette: ["0", "1", "2"] });
		expect(mux.lanes[0]?.["palette.1"]).toEqual({ k: "c", v: 3 });
		expect(mux.lanes[0]?.["palette.2"]).toMatchObject({ k: "n" });
	});

	it("an out group takes a list of names, and a member taps by name", () => {
		const program = runProgram(() => {
			defMix()({ fields: ["vel", "cut"] }).vel.tlpf(800).out();
		});
		expect(nodeOf(program, "gmix").groups).toEqual({ fields: ["vel", "cut"] });
		expect(nodeOf(program, "tlpf").lanes[0]?.in).toMatchObject({ k: "n", port: "vel" });
	});
});

describe("setting members on a handle", () => {
	it("a group setter sets members and copies; the original keeps its own", () => {
		let before: Handle | undefined;
		const program = runProgram(() => {
			before = defMix()({ drums: osc(1), bass: osc(2) });
			before.level({ bass: 0.5 }).out();
			before.tlpf(800).out();
		});
		const [set, plain] = program.nodes.filter((n) => n.module === "gmix") as PNode[];
		expect(set?.lanes[0]?.["level.bass"]).toEqual({ k: "c", v: 0.5 });
		expect(plain?.lanes[0]?.["level.bass"]).toEqual({ k: "c", v: 1 });
	});

	it("a member is a setter by its port name, and a new member appends", () => {
		const mix = nodeOf(
			runProgram(() => {
				defMix()({ drums: osc(1) }).drums(0.3).ch({ keys: 0.7 }).out();
			}),
			"gmix",
		);
		expect(mix.groups).toEqual({ ch: ["drums", "keys"] });
		expect(mix.lanes[0]?.drums).toEqual({ k: "c", v: 0.3 });
		expect(mix.lanes[0]?.keys).toEqual({ k: "c", v: 0.7 });
	});

	it(".mod reaches a like member", () => {
		const { roots } = runEval(() => {
			defMix()({ bass: osc(2) }).mod("level.bass", osc(0.2), 0.3).out();
		});
		const mix = (roots[0]?.inputs.in as { node: GNode }).node;
		expect(Object.keys(mix.mods ?? {})).toEqual(["level.bass"]);
	});

	it(".mod on a member the node lacks", () => {
		expect(() =>
			runEval(() => {
				defMix()({ bass: osc(2) }).mod("level.keys", osc(0.2)).out();
			}),
		).toThrow(/not an input of 'gmix'/);
	});
});

describe("loud errors", () => {
	const run = (fn: () => void) => () => runProgram(fn);

	it("a key with no open in-group to take it", () => {
		expect(
			run(() => {
				defMux()({ foo: 1 }).out();
			}),
		).toThrow(/unknown parameter 'foo'/);
	});

	it("an open member clashing with a port or a handle name", () => {
		expect(
			run(() => {
				defMix()({ ch: { in: 1 } }).out();
			}),
		).toThrow(/member 'in' of open port group 'ch' clashes/);
		expect(
			run(() => {
				defMix()({ fields: ["out"] }).out();
			}),
		).toThrow(/member 'out' of open port group 'fields' clashes/);
	});

	it("a like member its target does not have", () => {
		expect(
			run(() => {
				defMix()({ drums: osc(1) }).level({ bass: 1 }).out();
			}),
		).toThrow(/'level.bass' is not a port.*takes the members of 'ch'; 'bass' is not one/);
	});

	it("a group bound to a signal", () => {
		expect(
			run(() => {
				defMux()({ palette: osc(1) }).out();
			}),
		).toThrow(/port group 'palette' takes an object of members or an array/);
	});

	it("a member name with a dot", () => {
		expect(
			run(() => {
				defMux()({ palette: { "a.b": 1 } }).out();
			}),
		).toThrow(/'a.b' is not a member name/);
	});

	it("chaining into a group default input", () => {
		expect(
			run(() => {
				defmod({
					name: "gsum",
					category: "utils",
					ins: { ch: group(sig(0), { open: true }) },
					outs: { out: sig() },
					defaultIn: "ch",
					defaultOut: "out",
					tick: (_s: Record<string, unknown>, _i: Record<string, number>, o: { out: number }) => {
						o.out = 0;
					},
				});
				osc(1).gsum().out();
			}),
		).toThrow(/default input 'ch' is a port group/);
	});
});

describe("loud errors at definition", () => {
	const define = (ins: Record<string, unknown>, outs: Record<string, unknown> = { out: sig() }, extra = {}) =>
		() =>
			runProgram(() => {
				defmod({
					name: "gbad",
					category: "utils",
					ins,
					outs,
					defaultIn: "in",
					defaultOut: "out",
					tick: pass,
					...extra,
				} as never);
			});

	it("two open groups on one side", () => {
		expect(define({ in: sig(0), a: group(sig(0), { open: true }), b: group(sig(0), { open: true }) })).toThrow(
			/more than one open port group in ins: \[a, b\]/,
		);
	});

	it("a group name on both sides", () => {
		expect(define({ in: sig(0), g: sigs(0) }, { out: sig(), g: sigs(0) })).toThrow(/'g' is both an input and an output/);
	});

	it("a like naming no plain group of its side", () => {
		expect(define({ in: sig(0), level: group(unit(1), { like: "ch" }) })).toThrow(/is like 'ch'/);
	});

	it("a group on a reduce module", () => {
		expect(define({ in: sig(0), g: sigs(0) }, { out: sig() }, { policy: "reduce" })).toThrow(
			/reduce module takes no port groups/,
		);
	});

	it("a group on a sub-patch module", () => {
		expect(() =>
			runProgram(() => {
				defmod({
					name: "gsub",
					ins: { in: sig(0), g: sigs(0) },
					outs: { out: sig() },
					patch: (i: Record<string, Handle>) => ({ out: i.in }),
				} as never);
			}),
		).toThrow(/A sub-patch takes no port groups/);
	});
});
