import { describe, expect, it } from "vitest";

import { getRegistry } from "@/engine/dsp/define";
import { defmod } from "@/engine/patch/defmod";
import { createEngine } from "@/engine/runtime/engine";
import { BACKENDS } from "./backends";
import { lam, pnode, prog } from "./helpers";

defmod("lt.pass", {}, () => {
	return ({ v = 0 }) => ({ l: v, r: v });
});

const SR = 1000;

describe("engine: lambdas", () => {
	it.each(BACKENDS)(
		"time continues across a swap (sampleCount seeds from prev) ($name)",
		({ create, swap }) => {
			const program = prog([pnode("lt.pass", [{ v: lam("(s, sr, t) => t") }])], [0]);
			const registry = getRegistry();
			const frame = new Float32Array(2);

			const first = create(program, SR, registry);
			for (let i = 0; i < 100; i++) first.tick(frame);
			expect(frame[0]).toBe(Math.fround(99 / SR));

			const second = swap(program, SR, registry, first);
			expect(second.sampleCount).toBe(100);
			second.tick(frame);
			expect(frame[0]).toBe(Math.fround(100 / SR));
		},
	);

	it("lambda state persists across samples within an engine", () => {
		const program = prog(
			[pnode("lt.pass", [{ v: lam("(s) => { s.n = (s.n ?? 0) + 1; return s.n; }") }])],
			[0],
		);
		const engine = createEngine(program, SR, getRegistry());
		const frame = new Float32Array(2);
		engine.tick(frame);
		engine.tick(frame);
		engine.tick(frame);
		expect(frame[0]).toBe(3);
	});
});
