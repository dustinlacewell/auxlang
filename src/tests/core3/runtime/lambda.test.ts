import { describe, expect, it } from "vitest";

import { defineModule, getRegistry } from "@/core3/module/define";
import { createEngine } from "@/core3/runtime/engine";
import { sig } from "@/core3/types";
import { lam, pnode, prog, type IO, type St } from "./helpers";

defineModule({
	name: "lt.pass",
	ins: { v: sig(0) },
	outs: { l: sig(), r: sig() },
	defaultIn: "v",
	defaultOut: "l",
	tick: (_s: St, ins: IO, o: IO) => {
		o.l = ins.v as number;
		o.r = ins.v as number;
	},
});

const SR = 1000;

describe("engine: lambdas", () => {
	it("time continues across a swap (sampleCount seeds from prev)", () => {
		const program = prog([pnode("lt.pass", [{ v: lam("(s, sr, t) => t") }])], [0]);
		const registry = getRegistry();
		const frame = new Float32Array(2);

		const first = createEngine(program, SR, registry);
		for (let i = 0; i < 100; i++) first.tick(frame);
		expect(frame[0]).toBe(Math.fround(99 / SR));

		const second = createEngine(program, SR, registry, first.collectState());
		expect(second.sampleCount).toBe(100);
		second.tick(frame);
		expect(frame[0]).toBe(Math.fround(100 / SR));
	});

	it("lambda state persists across samples within an engine", () => {
		const program = prog([pnode("lt.pass", [{ v: lam("(s) => { s.n = (s.n ?? 0) + 1; return s.n; }") }])], [0]);
		const engine = createEngine(program, SR, getRegistry());
		const frame = new Float32Array(2);
		engine.tick(frame);
		engine.tick(frame);
		engine.tick(frame);
		expect(frame[0]).toBe(3);
	});
});
