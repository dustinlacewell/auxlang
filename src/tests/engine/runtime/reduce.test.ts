import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { getRegistry } from "@/engine/dsp/define";
import { defmod } from "@/engine/patch/defmod";
import { Core3Engine } from "@/engine/runtime/engine";
import { renderTap } from "@/engine/runtime/render";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { c, n, pnode, prog } from "./helpers";

defmod("rd.const", {}, () => {
	return ({ v = 0 }) => v;
});

defmod("rd.sum", { reduce: true }, ({ width }) => {
	return ({ in: lanes = 0, gain = 1 }) => {
		const isArr = typeof lanes === "number" ? 0 : 1;
		const w = width;
		let sum = 0;
		for (let l = 0; l < width; l++) {
			sum += typeof lanes === "number" ? lanes : (lanes[l] ?? 0);
		}
		return { out: sum * gain, isArr, w };
	};
});

defmod("rd.jacks", { reduce: true }, () => {
	return ({ a = 0, b = 0 }) => {
		const aArr = a as unknown as Float64Array;
		const bArr = b as unknown as Float64Array;
		const w = typeof aArr === "number" ? 1 : aArr.length;
		const aLen = typeof aArr === "number" ? 1 : aArr.length;
		const bLen = typeof bArr === "number" ? 1 : bArr.length;
		let bSum = 0;
		if (typeof bArr === "number") bSum = bArr;
		else for (let l = 0; l < bArr.length; l++) bSum += bArr[l] ?? 0;
		return { out: 0, w, aLen, bLen, bSum };
	};
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
