/**
 * defmod(spec) — THE module registration function, scope-aware. Inside an eval
 * a spec chains like any built-in, compiles to ordinary nodes, ships inside
 * Program.specs (only when used), folds its tick source into structural
 * identity, is loud on every misuse, and never leaks between evals; at root
 * scope the same call registers into the realm registry. The closure-free
 * fence lives at the serialization crossing: a closure-capturing tick fails at
 * compile when a reachable node uses it, never in the audio thread — and never
 * at all if nothing crosses. Compositions need no registration: they are plain
 * JS functions used call-style or via `.apply`.
 */

import { defmod, factory, out, runEval, runProgram } from "@/core3/api";
import type { DefmodSpec } from "@/core3/patch/defmod";
import type { Handle } from "@/core3/patch/handle-data";
import { sig, unit } from "@/core3/types";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

/** A minimal well-formed spec; tests override what they exercise. */
const boostSpec = {
	name: "boost",
	category: "utils",
	ins: { in: sig(0), amt: unit(2) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["in", "amt"],
	tick: (_s: Record<string, unknown>, i: { in: number; amt: number }, o: { out: number }) => {
		o.out = i.in * i.amt;
	},
} as const;

const defBoost = () => defmod(boostSpec);

describe("defmod chaining", () => {
	it("a spec defined in-eval chains like a built-in and compiles to a real node", () => {
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
			defmod({ ...boostSpec, name: "unused" });
			const tosc = factory("tosc");
			out(tosc(220).boost(3));
		});
		expect(program.specs!.map((s) => s.name)).toEqual(["boost"]);
		expect(typeof program.specs![0]!.tick).toBe("string");
		expect(program.specs![0]!.tick).toContain("i.in * i.amt");
	});

	it("is absent when no patch-defined module is used", () => {
		const program = runProgram(() => {
			out(factory("tosc")(220));
		});
		expect(program.specs).toBeUndefined();
	});
});

describe("structural identity", () => {
	const patch = (tick: (typeof boostSpec)["tick"]) => () => {
		defmod({ ...boostSpec, tick });
		out(factory("tosc")(220).boost(3));
	};
	const boostId = (p: ReturnType<typeof runProgram>) =>
		p.nodes.find((n) => n.module === "boost")!.id;

	it("identical source across re-evals yields identical ids (state migrates)", () => {
		const tick = boostSpec.tick;
		expect(boostId(runProgram(patch(tick)))).toBe(boostId(runProgram(patch(tick))));
	});

	it("a changed tick source yields a new id (fresh state — different machine)", () => {
		const a = runProgram(
			patch((_s, i, o) => {
				o.out = i.in * i.amt;
			}),
		);
		const b = runProgram(
			patch((_s, i, o) => {
				o.out = i.in * i.amt * 2;
			}),
		);
		expect(boostId(a)).not.toBe(boostId(b));
	});
});

describe("closure fence (at the serialization crossing)", () => {
	it("a used tick capturing a patch variable fails loudly at compile", () => {
		expect(() =>
			runProgram(() => {
				const gain = 0.5;
				const tick: (typeof boostSpec)["tick"] = (_s, i, o) => {
					o.out = i.in * gain;
				};
				defmod({ ...boostSpec, tick });
				out(factory("tosc")(220).boost(1));
			}),
		).toThrow(/closure-free.*gain/s);
	});

	it("a used state constructor capturing a patch variable fails the same way", () => {
		expect(() =>
			runProgram(() => {
				const init = 3;
				defmod({
					...boostSpec,
					state: () => ({ v: init }),
				});
				out(factory("tosc")(220).boost(1));
			}),
		).toThrow(/closure-free.*init/s);
	});

	it("an unused closure-capturing definition compiles fine — nothing crosses", () => {
		const program = runProgram(() => {
			const gain = 0.5;
			const tick: (typeof boostSpec)["tick"] = (_s, i, o) => {
				o.out = i.in * gain;
			};
			defmod({ ...boostSpec, tick });
			out(factory("tosc")(220));
		});
		expect(program.specs).toBeUndefined();
	});
});

describe("defmod loud failures", () => {
	const bad = (over: Record<string, unknown>) =>
		({ ...boostSpec, ...over }) as unknown as DefmodSpec;

	it("empty name", () => {
		expect(() => runEval(() => defmod(bad({ name: "" })))).toThrow(/name.*non-empty string/s);
	});

	it("missing category", () => {
		expect(() => runEval(() => defmod(bad({ category: undefined })))).toThrow(
			/category is required/s,
		);
	});

	it("tick not a function", () => {
		expect(() => runEval(() => defmod(bad({ tick: 42 })))).toThrow(/tick must be a function/s);
	});

	it("name colliding with a bundled module", () => {
		expect(() => runEval(() => defmod(bad({ name: "tlpf" })))).toThrow(
			/tlpf.*collides with a registered module/s,
		);
	});

	it("name colliding with a reserved patch-scope helper", () => {
		// `sig` is a PortAnn helper in the user scope, not a module.
		expect(() => runEval(() => defmod(bad({ name: "sig" })))).toThrow(
			/sig.*reserved patch-scope helper/s,
		);
	});

	it("name colliding with a reserved handle name", () => {
		expect(() => runEval(() => defmod(bad({ name: "apply" })))).toThrow(
			/apply.*reserved handle name/s,
		);
	});

	it("duplicate defmod in one eval", () => {
		expect(() =>
			runEval(() => {
				defBoost();
				defBoost();
			}),
		).toThrow(/boost.*already defined in this patch/s);
	});

	it("defaultIn that is not an input", () => {
		expect(() => runEval(() => defmod(bad({ defaultIn: "nope" })))).toThrow(
			/defaultIn 'nope' is not an input/s,
		);
	});

	it("a port named like a reserved handle name fails at the definition", () => {
		expect(() =>
			runEval(() => defmod(bad({ ins: { in: sig(0), apply: unit(1) }, positional: ["in"] }))),
		).toThrow(/input 'apply' collides with a reserved handle name/s);
	});

	it("non-JSON config", () => {
		expect(() => runEval(() => defmod(bad({ config: { fn: () => 1 } })))).toThrow(
			/config\.fn.*JSON-serializable/s,
		);
	});
});

describe("defmod at root scope", () => {
	it("registers into the realm registry and returns the factory", () => {
		const rootboost = defmod({ ...boostSpec, name: "rootboost" });
		expect(typeof rootboost).toBe("function");
		const program = runProgram(() => {
			out(factory("tosc")(220).rootboost(2));
		});
		const node = program.nodes.find((n) => n.module === "rootboost");
		expect((node!.lanes[0]!.amt as { v: number }).v).toBe(2);
		expect(program.specs).toBeUndefined(); // root-scope specs never serialize
	});

	it("a duplicate root-scope name is a loud error", () => {
		defmod({ ...boostSpec, name: "rootdup" });
		expect(() => defmod({ ...boostSpec, name: "rootdup" })).toThrow(
			/module 'rootdup' already defined/s,
		);
	});
});

describe("defmod eval isolation", () => {
	it("a spec from one eval is invisible in a second", () => {
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
