/**
 * `defpatch(name, meta?, fn)` (MANIFESTO §5, shape C): a sub-patch module
 * whose body is ordinary patch JS. Every case renders bit-identically to the
 * equivalent old (object) `defmod({ name, ins, outs, patch })` form.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, runProgram } from "@/core3/api";
import { defpatch } from "@/core3/patch/defpatch";
import type { Handle } from "@/core3/patch/handle-data";
import { rewrite } from "@/core3/source/rewrite/rewrite";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { SR, firstBitDiff, interpreterRun } from "../wasm/differential-harness";

const saw = factory("saw");

function sameSound(oldForm: string, shapeC: string): void {
	const oldRun = interpreterRun(evalPatch(oldForm), SR);
	const newRun = interpreterRun(evalPatch(shapeC), SR);
	expect(firstBitDiff(oldRun.l, newRun.l), "left").toBe(-1);
	expect(firstBitDiff(oldRun.r, newRun.r), "right").toBe(-1);
}

describe("defpatch: single output", () => {
	it("renders like the equivalent defmod({ patch })", () => {
		sameSound(
			`const bright = defmod({
  name: "bright",
  ins: { pitch: semis(57), cutoff: semis(84) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.pitch.saw().lpf(i.cutoff) }),
})
bright(48, 90).out()`,
			`const bright = defpatch("bright", ({ pitch = 57, cutoff = 84 }) => pitch.saw().lpf(cutoff))
bright(48, 90).out()`,
		);
	});

	it("a bare expression body (no wrapping object) still names its output 'out'", () => {
		sameSound(
			`const halve = defmod({
  name: "halve",
  ins: { in: sig(0) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.in.mul(0.5) }),
})
saw(48).halve().out()`,
			`const halve = defpatch("halve", ({ in: x = 0 }) => x.mul(0.5))
saw(48).halve().out()`,
		);
	});
});

describe("defpatch: { l, r } outputs", () => {
	it("a stereo sub-patch connects to out by name", () => {
		sameSound(
			`const wide = defmod({
  name: "wide",
  ins: { in: sig(0) },
  outs: { l: sig(), r: sig() },
  patch: (i) => i.in.pan(0.5).apply((p) => ({ l: p.l, r: p.r })),
})
saw(45).mul(0.3).wide().out()`,
			`const wide = defpatch("wide", ({ in: x = 0 }) => {
  const p = x.pan(0.5)
  return { l: p.l, r: p.r }
})
saw(45).mul(0.3).wide().out()`,
		);
	});
});

describe("defpatch: meta.args", () => {
	it("meta.args is the complete positional list: naming the default input and the rest, in order", () => {
		sameSound(
			`const x = defmod({
  name: "x",
  ins: { in: sig(0), a: semis(1), b: semis(2) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.in.add(i.a).add(i.b) }),
})
x(saw(48), 1, 5).out()`,
			`const x = defpatch("x", { args: ["in", "a", "b"] }, ({ in: p, a = 1, b = 2 }) => p.add(a).add(b))
x(saw(48), 1, 5).out()`,
		);
	});

	it("without meta.args, every input is positional in declared order, default input first (today's default, unchanged)", () => {
		sameSound(
			`const x = defmod({
  name: "x",
  ins: { in: sig(0), a: semis(1), b: semis(2) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.in.add(i.a).add(i.b) }),
})
x(saw(48), 1, 5).out()`,
			`const x = defpatch("x", ({ in: p, a = 1, b = 2 }) => p.add(a).add(b))
x(saw(48), 1, 5).out()`,
		);
	});

	it("naming the default input in meta.args is allowed: it may sit at any slot, not just first", () => {
		sameSound(
			`const x = defmod({
  name: "x",
  ins: { in: sig(0), a: semis(1), b: semis(2) },
  outs: { out: sig() },
  positional: ["a", "in", "b"],
  patch: (i) => ({ out: i.in.add(i.a).add(i.b) }),
})
x(1, saw(48), 5).out()`,
			`const x = defpatch("x", { args: ["a", "in", "b"] }, ({ in: p, a = 1, b = 2 }) => p.add(a).add(b))
x(1, saw(48), 5).out()`,
		);
	});

	it("naming an unknown port in meta.args is a loud error", () => {
		expect(() =>
			evalPatch(`const x = defpatch("x", { args: ["nope"] }, ({ in: p, b = 2 }) => p.add(b))
x().out()`),
		).toThrow(/not an input/);
	});

	it("meta.args: [] — no port is positional; every port must be set by name", () => {
		sameSound(
			`const x = defmod({
  name: "x",
  ins: { in: sig(0), b: semis(2) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.in.add(i.b) }),
})
x({ in: saw(48), b: 5 }).out()`,
			`const x = defpatch("x", { args: [] }, ({ in: p, b = 2 }) => p.add(b))
x({ in: saw(48), b: 5 }).out()`,
		);
	});

	it("meta.args omitting the default input: it is only settable by name, not positionally", () => {
		sameSound(
			`const x = defmod({
  name: "x",
  ins: { in: sig(0), b: semis(2) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.in.add(i.b) }),
})
x({ in: saw(48), b: 5 }).out()`,
			`const x = defpatch("x", { args: ["b"] }, ({ in: p, b = 2 }) => p.add(b))
x({ in: saw(48), b: 5 }).out()`,
		);
	});
});

describe("defpatch: input ports", () => {
	it("a required input (no default) left unconnected is a loud error", () => {
		expect(() =>
			evalPatch(`const filt = defpatch("filt", ({ in: x, cutoff = 84 }) => x.lpf(cutoff))
filt().out()`),
		).toThrow(/required but unconnected/);
	});

	it("a default with a unit tag converts at the outer port", () => {
		sameSound(
			`const filt = defmod({
  name: "filt",
  ins: { in: sig(0), cutoff: hz(800) },
  outs: { out: sig() },
  patch: (i) => ({ out: i.in.lpf(i.cutoff) }),
})
saw(48).filt().out()`,
			`const filt = defpatch("filt", ({ in: x = 0, cutoff = hz(800) }) => x.lpf(cutoff))
saw(48).filt().out()`,
		);
	});
});

describe("defpatch: number drag protection", () => {
	it("a param-list default stays byte-identical after the rewrite; a body call is still traced", () => {
		const paramList = "{ pitch = 57, cutoff = 84 }";
		const source = `const bright = defpatch("bright", (${paramList}) => pitch.saw().lpf(cutoff))`;
		const { code } = rewrite(source, new Set(["defpatch"]));
		expect(code).toContain(paramList);
		expect(code).toContain("__aux.enter"); // the body IS traced: a wrapper surrounds its calls
	});

	it("a unit-tag default (a call) in the param list is untraced, so markerAnn still parses it", () => {
		const paramList = "{ in: x = 0, cutoff = hz(800) }";
		const source = `const filt = defpatch("filt", (${paramList}) => x.lpf(cutoff))`;
		const { code } = rewrite(source, new Set(["defpatch"]));
		expect(code).toContain(paramList);
	});
});

describe("defpatch: no source text", () => {
	it("used inside a TS closure (not through evalPatch, so currentSourceText() is null) still works", () => {
		const halveDirect = defpatch("halveDirect", ({ in: x }) => (x as Handle).mul(0.5));
		const program = runProgram(() => {
			saw(48).halveDirect().out();
		});
		expect(program.nodes.some((n) => n.module === "mul")).toBe(true);
	});
});
