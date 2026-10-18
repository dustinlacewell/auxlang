/**
 * defmod(name, meta?, setup) — THE module registration function, scope-aware
 * (shape C, MANIFESTO §5.1). Inside an eval a module chains like any
 * built-in, compiles to ordinary nodes, ships inside Program.specs (only
 * when used), and is loud on every misuse, and never leaks between evals; at
 * root scope the same call registers into the realm registry. Compositions
 * need no registration: they are plain JS functions used call-style or via
 * `.apply`.
 *
 * A shape-C module's kind is just its name (MANIFESTO §7: a module's code is
 * not its identity) — unlike the old object form, editing its tick is not a
 * re-eval identity change. That carry behavior is proven in
 * runtime/shape-c-reeval.test.ts, not here.
 */

import { defmod, factory, out, runEval, runProgram } from "@/engine/api";
import type { Handle } from "@/engine/patch/handle-data";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

/** A minimal well-formed module: default-in `in`, positional `amt`. */
const boostSetup1 = () => {
	return ({ in: x = 0, amt = 2 }: { in: number; amt: number }) => x * amt;
};

const defBoost = () => defmod("boost", {}, boostSetup1 as never);

describe("defmod chaining", () => {
	it("a module defined in-eval chains like a built-in and compiles to a real node", () => {
		const program = runProgram(() => {
			defBoost();
			const tosc = factory("tosc");
			out(tosc(220).boost(3));
		});

		const boosts = program.nodes.filter((n) => n.module === "boost");
		expect(boosts).toHaveLength(1);
		expect((boosts[0]!.lanes[0]!.amt as { v: number }).v).toBe(3);
		expect(boosts[0]!.lanes[0]!.in).toMatchObject({ k: "n", port: "out" });
	});

	it("chains with output-port selection intact", () => {
		const program = runProgram(() => {
			defBoost();
			const tseq = factory("tseq");
			out(tseq().gate.boost());
		});
		const boost = program.nodes.find((n) => n.module === "boost");
		expect(boost!.lanes[0]!.in).toMatchObject({ k: "n", port: "gate" });
	});
});

describe("defmod factory (standalone style)", () => {
	it("returns the module factory for source-style use", () => {
		const program = runProgram(() => {
			const boost = defBoost();
			const tosc = factory("tosc");
			out(boost(tosc(220), 5));
		});
		const boost = program.nodes.find((n) => n.module === "boost");
		expect((boost!.lanes[0]!.amt as { v: number }).v).toBe(5);
		expect(boost!.lanes[0]!.in).toMatchObject({ k: "n", port: "out" });
	});
});

describe("Program.specs", () => {
	it("carries only the specs reachable nodes use, tick as source", () => {
		const program = runProgram(() => {
			defBoost();
			defmod("unused", {}, boostSetup1 as never);
			const tosc = factory("tosc");
			out(tosc(220).boost(3));
		});
		expect(program.specs!.map((s) => s.name)).toEqual(["boost"]);
		expect(typeof program.specs![0]!.tick).toBe("string");
		expect(program.specs![0]!.tick).toContain("__dsp_i.in * __dsp_i.amt");
	});

	it("is absent when no patch-defined module is used", () => {
		const program = runProgram(() => {
			out(factory("tosc")(220));
		});
		expect(program.specs).toBeUndefined();
	});
});

describe("defmod loud failures", () => {
	it("the deleted object form (a spec object as the first argument) throws, naming the shape-C and defpatch forms", () => {
		expect(() =>
			runEval(() =>
				defmod(
					{
						name: "old",
						ins: { in: { unit: "sig", def: 0 } },
						outs: { out: { unit: "sig", def: 0 } },
						defaultIn: "in",
						tick: (_s: unknown, i: { in: number }, o: { out: number }) => {
							o.out = i.in;
						},
					} as never,
					(() => 0) as never,
				),
			),
		).toThrow(/defpatch/);
	});

	it("a port named like a reserved handle name fails at the definition", () => {
		expect(() =>
			runEval(() =>
				defmod("boost", {}, (() => {
					return ({ in: x = 0, apply = 1 }: { in: number; apply: number }) => x * apply;
				}) as never),
			),
		).toThrow(/apply.*reserved handle name/s);
	});

	it("non-JSON config", () => {
		expect(() =>
			runEval(() => {
				defmod("boost", { config: { fn: () => 1 } }, (() => {
					return () => 0;
				}) as never);
			}),
		).toThrow(/config\.fn.*JSON-serializable/s);
	});
});

describe("defmod at root scope", () => {
	it("registers into the realm registry and returns the factory", () => {
		const rootboost = defmod("rootboost", {}, boostSetup1 as never);
		expect(typeof rootboost).toBe("function");
		const program = runProgram(() => {
			out(factory("tosc")(220).rootboost(2));
		});
		const node = program.nodes.find((n) => n.module === "rootboost");
		expect((node!.lanes[0]!.amt as { v: number }).v).toBe(2);
		expect(program.specs).toBeUndefined(); // root-scope specs never serialize
	});

	it("a duplicate root-scope name is a loud error", () => {
		defmod("rootdup", {}, boostSetup1 as never);
		expect(() => defmod("rootdup", {}, boostSetup1 as never)).toThrow(
			/module 'rootdup' already defined/s,
		);
	});
});

describe("defmod eval isolation", () => {
	it("a module from one eval is invisible in a second", () => {
		runEval(() => {
			defBoost();
		});
		expect(() =>
			runEval(() => {
				out(factory("tosc")(220).boost(3));
			}),
		).toThrow(/'boost' is not an input, output, or module/s);
	});
});

describe("compositions stay plain functions", () => {
	const brighten = (h: Handle, cutoff: number) => h.tlpf(cutoff) as Handle;
	/** TS resolves `.apply` to Function.prototype under strictBindCallApply; name the handle's real shape. */
	const applyOf = (h: Handle) => h as unknown as { apply(fn: (x: Handle) => Handle): Handle };

	it("call-style needs no registration", () => {
		const program = runProgram(() => {
			const tosc = factory("tosc");
			out(brighten(tosc(220), 900));
		});
		const filt = program.nodes.find((n) => n.module === "tlpf");
		expect((filt!.lanes[0]!.cutoff as { v: number }).v).toBe(900);
	});

	it(".apply-style needs no registration", () => {
		const program = runProgram(() => {
			const tosc = factory("tosc");
			out(applyOf(tosc(220)).apply((h) => brighten(h, 700)));
		});
		const filt = program.nodes.find((n) => n.module === "tlpf");
		expect((filt!.lanes[0]!.cutoff as { v: number }).v).toBe(700);
	});
});
