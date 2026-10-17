/**
 * `defpatch(name, meta?, fn)` (MANIFESTO §5, shape C): a sub-patch module
 * whose body is ordinary patch JS. Every case renders bit-identically to the
 * same signal built directly from built-in modules, with no sub-patch
 * wrapping it.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, runProgram } from "@/core3/api";
import { defpatch } from "@/core3/patch/defpatch";
import { rootSubpatches } from "@/core3/patch/subpatch/registry";
import type { Handle } from "@/core3/patch/handle-data";
import { rewrite } from "@/core3/source/rewrite/rewrite";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { SR, firstBitDiff, interpreterRun } from "../wasm/differential-harness";

const saw = factory("saw");

function sameSound(plain: string, shapeC: string): void {
	const plainRun = interpreterRun(evalPatch(plain), SR);
	const newRun = interpreterRun(evalPatch(shapeC), SR);
	expect(firstBitDiff(plainRun.l, newRun.l), "left").toBe(-1);
	expect(firstBitDiff(plainRun.r, newRun.r), "right").toBe(-1);
}

describe("defpatch: single output", () => {
	it("renders like the equivalent plain patch", () => {
		sameSound(
			`saw(48).lpf(90).out()`,
			`const bright = defpatch("bright", ({ pitch = 57, cutoff = 84 }) => pitch.saw().lpf(cutoff))
bright(48, 90).out()`,
		);
	});

	it("a bare expression body (no wrapping object) still names its output 'out'", () => {
		sameSound(
			`saw(48).mul(0.5).out()`,
			`const halve = defpatch("halve", ({ in: x = 0 }) => x.mul(0.5))
saw(48).halve().out()`,
		);
	});
});

describe("defpatch: { l, r } outputs", () => {
	it("a stereo sub-patch connects to out by name", () => {
		sameSound(
			`saw(45).mul(0.3).pan(0.5).out()`,
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
			`saw(48).add(1).add(5).out()`,
			`const x = defpatch("x", { args: ["in", "a", "b"] }, ({ in: p, a = 1, b = 2 }) => p.add(a).add(b))
x(saw(48), 1, 5).out()`,
		);
	});

	it("without meta.args, every input is positional in declared order, default input first (today's default, unchanged)", () => {
		sameSound(
			`saw(48).add(1).add(5).out()`,
			`const x = defpatch("x", ({ in: p, a = 1, b = 2 }) => p.add(a).add(b))
x(saw(48), 1, 5).out()`,
		);
	});

	it("naming the default input in meta.args is allowed: it may sit at any slot, not just first", () => {
		sameSound(
			`saw(48).add(1).add(5).out()`,
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
			`saw(48).add(5).out()`,
			`const x = defpatch("x", { args: [] }, ({ in: p, b = 2 }) => p.add(b))
x({ in: saw(48), b: 5 }).out()`,
		);
	});

	it("meta.args omitting the default input: it is only settable by name, not positionally", () => {
		sameSound(
			`saw(48).add(5).out()`,
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
		const PATCH = `const filt = defpatch("filt", ({ in: x = 0, cutoff = hz(800) }) => x.lpf(cutoff))
saw(48).filt().out()`;
		const run = interpreterRun(evalPatch(PATCH), SR);
		const expected: Record<number, number> = {
			0: 0,
			1: -0.5288408398628235,
			50: -0.3953387141227722,
			100: -0.2315976470708847,
			199: 0.07845938205718994,
		};
		for (const [i, v] of Object.entries(expected)) expect(run.l[Number(i)]).toBe(v);
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

/** A marker, never called: its default-expression TEXT is what `markerAnn` reads (port-markers.ts). */
function range(def: number, _min: number, _max: number): number {
	return def;
}

describe("defpatch: a port's range", () => {
	it("a range default on a param carries its range onto the inferred input port (defpatch shares markerAnn with shape-C ticks)", () => {
		defpatch("rangedPatch", ({ in: x = 0, fb = range(0.5, 0, 1) }) => (x as Handle).add(fb));
		const spec = rootSubpatches().get("rangedPatch");
		expect(spec?.ins.fb).toEqual({ unit: "sig", def: 0.5, range: { min: 0, max: 1 } });
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
