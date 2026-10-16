import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { getRegistry } from "@/core3/module/define";
import { defmod } from "@/core3/patch/defmod";
import { Core3Engine } from "@/core3/runtime/engine";
import { renderTap } from "@/core3/runtime/render";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { sig } from "@/core3/types";
import { type IO, type St, c, n, pnode, prog } from "./helpers";

defmod({
	name: "rd.const",
	category: "utils",
	ins: { v: sig(0) },
	outs: { out: sig() },
	defaultIn: "v",
	defaultOut: "out",
	tick: (_s: St, ins: IO, o: IO) => {
		o.out = ins.v as number;
	},
});

defmod({
	name: "rd.sum",
	category: "utils",
	ins: { in: sig(0), gain: sig(1) },
	outs: { out: sig(), isArr: sig(), w: sig() },
	defaultIn: "in",
	defaultOut: "out",
	policy: "reduce",
	tick: (_s, ins, o, _cfg, _sr, width) => {
		const lanes = ins.in as Float32Array | number;
		o.isArr = typeof lanes === "number" ? 0 : 1;
		o.w = width as number;
		let sum = 0;
		for (let l = 0; l < (width as number); l++) {
			sum += typeof lanes === "number" ? lanes : (lanes[l] as number);
		}
		o.out = sum * (ins.gain as number);
	},
});

defmod({
	name: "rd.jacks",
	category: "utils",
	ins: { a: sig(0), b: sig(0) },
	outs: { out: sig(), w: sig(), aLen: sig(), bLen: sig(), bSum: sig() },
	defaultIn: "a",
	defaultOut: "out",
	policy: "reduce",
	tick: (_s, ins, o, _cfg, _sr, width) => {
		const a = ins.a as Float64Array;
		const b = ins.b as Float64Array;
		o.w = width as number;
		o.aLen = a.length;
		o.bLen = b.length;
		let sum = 0;
		for (let l = 0; l < b.length; l++) sum += b[l] as number;
		o.bSum = sum;
	},
});

describe("engine: reduce policy", () => {
	const program = prog([
		pnode("rd.const", [{ v: c(10) }, { v: c(20) }, { v: c(30) }], { place: "src" }),
		pnode("rd.sum", [{ in: n(0), gain: c(1) }], { place: "sum" }),
	]);

	it("receives connected lanes as a Float64Array and the gathered width", () => {
		expect(renderTap(program, 1, "isArr", 0, 1, getRegistry())[0]).toBe(1);
		expect(renderTap(program, 1, "w", 0, 1, getRegistry())[0]).toBe(3);
	});

	it("sums all lanes of the source", () => {
		expect(renderTap(program, 1, "out", 0, 2, getRegistry())[1]).toBe(60);
	});

	it("a narrower source is not copied across lanes: each port gets its own lanes", () => {
		const p3 = prog([
			pnode("rd.const", [{ v: c(10) }, { v: c(20) }, { v: c(30) }], { place: "wide" }),
			pnode("rd.const", [{ v: c(5) }], { place: "mono" }),
			pnode("rd.jacks", [{ a: n(0), b: n(1) }], { place: "jacks" }),
		]);
		expect(renderTap(p3, 2, "w", 0, 1, getRegistry())[0]).toBe(3);
		expect(renderTap(p3, 2, "aLen", 0, 1, getRegistry())[0]).toBe(3);
		expect(renderTap(p3, 2, "bLen", 0, 1, getRegistry())[0]).toBe(1);
		expect(renderTap(p3, 2, "bSum", 0, 1, getRegistry())[0]).toBe(5);
	});

	it("out: a mono l beside a 4-lane in sums the mono source once", () => {
		// First sample: the DC blocker passes x through; gain 1 so l reads raw.
		const p4 = prog([
			pnode("rd.const", [{ v: c(0) }, { v: c(0) }, { v: c(0) }, { v: c(0) }], { place: "poly" }),
			pnode("rd.const", [{ v: c(0.25) }], { place: "monoL" }),
			pnode("out", [{ in: n(0), l: n(1), gain: c(1) }], { place: "master" }),
		]);
		expect(renderTap(p4, 2, "l", 0, 1, getRegistry())[0]).toBeCloseTo(0.25, 6);
	});

	it("a reducer sums f64 values without f32 truncation", () => {
		// 0.1 + 0.2 rounds differently at f32 than at f64 (Math.fround proves it).
		// A reducer's gathered lane view must carry the exact f64 value through,
		// not round-trip it through a narrower array first. renderTap's own tap
		// buffer is f32 (it mirrors the audio-output contract), so this reads the
		// node's raw f64 output slot directly via peek(), bypassing that tap.
		const v = 0.1 + 0.2;
		expect(Math.fround(v)).not.toBe(v);
		const p = prog([
			pnode("rd.const", [{ v: c(v) }], { place: "exact" }),
			pnode("rd.sum", [{ in: n(0), gain: c(1) }], { place: "sum64" }),
		]);
		const engine = new Core3Engine(p, 48000, withProgramSpecs(getRegistry(), p));
		engine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(engine.peek(1, "out", 0)).toBe(v);
	});

	it("broadcast constants arrive as plain numbers", () => {
		const p2 = prog([
			pnode("rd.const", [{ v: c(7) }], { place: "src1" }),
			pnode("rd.sum", [{ in: c(4), gain: c(2) }], { place: "sum1" }),
		]);
		// const input, width 1 -> sum = 4, gain 2 -> 8
		expect(renderTap(p2, 1, "out", 0, 1, getRegistry())[0]).toBe(8);
		expect(renderTap(p2, 1, "isArr", 0, 1, getRegistry())[0]).toBe(0);
	});
});
