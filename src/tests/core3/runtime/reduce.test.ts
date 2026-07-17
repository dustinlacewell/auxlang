import { describe, expect, it } from "vitest";

import { defineModule, getRegistry } from "@/core3/module/define";
import { renderTap } from "@/core3/runtime/render";
import { sig } from "@/core3/types";
import { c, n, pnode, prog, type IO, type St } from "./helpers";

defineModule({
	name: "rd.const",
	ins: { v: sig(0) },
	outs: { out: sig() },
	defaultIn: "v",
	defaultOut: "out",
	tick: (_s: St, ins: IO, o: IO) => {
		o.out = ins.v as number;
	},
});

defineModule({
	name: "rd.sum",
	ins: { in: sig(0), gain: sig(1) },
	outs: { out: sig(), isArr: sig(), w: sig() },
	defaultIn: "in",
	defaultOut: "out",
	policy: "reduce",
	tick: (_s, ins, o, _cfg, _sr, width) => {
		const lanes = ins.in as Float32Array | number;
		o.isArr = lanes instanceof Float32Array ? 1 : 0;
		o.w = width as number;
		let sum = 0;
		for (let l = 0; l < (width as number); l++) {
			sum += typeof lanes === "number" ? lanes : (lanes[l] as number);
		}
		o.out = sum * (ins.gain as number);
	},
});

describe("engine: reduce policy", () => {
	const program = prog([
		pnode("rd.const", [{ v: c(10) }, { v: c(20) }, { v: c(30) }], { id: "src" }),
		pnode("rd.sum", [{ in: n(0), gain: c(1) }], { id: "sum" }),
	]);

	it("receives connected lanes as a Float32Array and the gathered width", () => {
		expect(renderTap(program, 1, "isArr", 0, 1, getRegistry())[0]).toBe(1);
		expect(renderTap(program, 1, "w", 0, 1, getRegistry())[0]).toBe(3);
	});

	it("sums all lanes of the source", () => {
		expect(renderTap(program, 1, "out", 0, 2, getRegistry())[1]).toBe(60);
	});

	it("broadcast constants arrive as plain numbers", () => {
		const p2 = prog([
			pnode("rd.const", [{ v: c(7) }], { id: "src1" }),
			pnode("rd.sum", [{ in: c(4), gain: c(2) }], { id: "sum1" }),
		]);
		// const input, width 1 -> sum = 4, gain 2 -> 8
		expect(renderTap(p2, 1, "out", 0, 1, getRegistry())[0]).toBe(8);
		expect(renderTap(p2, 1, "isArr", 0, 1, getRegistry())[0]).toBe(0);
	});
});
