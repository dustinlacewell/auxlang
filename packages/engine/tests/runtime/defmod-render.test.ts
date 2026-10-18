/**
 * The string crossing, end to end: a patch-defined module compiles into
 * Program.specs, survives JSON.stringify/parse (exactly what the worklet
 * boundary does to it), hydrates via withProgramSpecs, and TICKS — producing
 * sound headlessly through the same render host the engine tests use. Also
 * pins the layering contract: the bundled registry is never mutated.
 */

import "@/library/all";

import { compile, defmod, factory, out, runEval } from "@/api";
import { getRegistry } from "@/dsp/define";
import { withProgramSpecs } from "@/runtime/hydrate-specs";
import { render } from "@/runtime/render";
import type { Program } from "@/types";
import { describe, expect, it } from "vitest";

function maxAbs(buf: Float32Array): number {
	let m = 0;
	for (const x of buf) m = Math.max(m, Math.abs(x));
	return m;
}

/** A stateless wavefolder chained mid-signal — the guide's shape. */
const wavefoldPatch = () => {
	defmod("wavefold", { cat: "effects", doc: "sine-shaper wavefolder" }, () => {
		return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6));
	});
	const saw = factory("saw");
	out(saw(110).wavefold(0.7).mul(0.2));
};

/** A stateFUL ramp — proves the state constructor crosses as a string too. */
const rampPatch = () => {
	const ramp = defmod("ramp", { cat: "sources" }, () => {
		let v = 0;
		return ({ rate = 0.001 }) => {
			v = v + rate;
			return v;
		};
	});
	out(ramp(0.001));
};

describe("defmod round-trip rendering", () => {
	it("a JSON round-tripped Program renders non-silent through the hydrated spec", () => {
		const program = compile(runEval(wavefoldPatch));
		expect(program.specs!.map((s) => s.name)).toEqual(["wavefold"]);

		const wire = JSON.parse(JSON.stringify(program)) as Program;
		const { l, r } = render(wire, 0.1);
		expect(maxAbs(l)).toBeGreaterThan(0.01);
		expect(maxAbs(r)).toBeGreaterThan(0.01);
	});

	it("a serialized state constructor hydrates and accumulates", () => {
		const program = JSON.parse(JSON.stringify(compile(runEval(rampPatch)))) as Program;
		const { l } = render(program, 0.01);
		const last = l[l.length - 1] as number;
		expect(last).toBeGreaterThan(0);
	});
});

describe("withProgramSpecs layering", () => {
	it("layers hydrated specs over the base without mutating it", () => {
		const program = compile(runEval(wavefoldPatch));
		const base = getRegistry();
		const sizeBefore = base.size;

		const layered = withProgramSpecs(base, program);
		expect(layered.has("wavefold")).toBe(true);
		expect(layered.has("saw")).toBe(true);
		expect(base.has("wavefold")).toBe(false);
		expect(base.size).toBe(sizeBefore);
	});

	it("returns the base untouched for spec-less programs", () => {
		const program = compile(
			runEval(() => {
				out(factory("sin")(440));
			}),
		);
		const base = getRegistry();
		expect(withProgramSpecs(base, program)).toBe(base);
	});
});
