import { describe, expect, it } from "vitest";

import { getRegistry } from "@/engine/module/define";
import { defmod } from "@/engine/patch/defmod";
import { createEngine } from "@/engine/runtime/engine";
import { render } from "@/engine/runtime/render";
import { c, n, pnode, prog } from "./helpers";

defmod("rn.osc", {}, ({ sr }) => {
	let ph = 0;
	return ({ freq = 440 }) => {
		ph = (ph + freq / sr) % 1;
		return Math.sin(2 * Math.PI * ph);
	};
});

defmod("rn.split", {}, () => {
	return ({ in: x = 0 }) => ({ l: x, r: x * 0.5 });
});

defmod("rn.pair", {}, ({ lv = 0, rv = 0 }) => {
	return ({ in: _x = 0 }) => ({ l: lv, r: rv });
});

describe("render", () => {
	const program = prog(
		[
			pnode("rn.osc", [{ freq: c(440) }], { place: "osc" }),
			pnode("rn.split", [{ in: n(0) }], { place: "split" }),
		],
		[1],
	);

	it("is deterministic: two renders are bit-identical", () => {
		const a = render(program, 0.05, 48000, getRegistry());
		const b = render(program, 0.05, 48000, getRegistry());
		expect(a.l).toEqual(b.l);
		expect(a.r).toEqual(b.r);
		expect(a.l.length).toBe(2400);
		expect(Math.max(...a.l)).toBeGreaterThan(0.5); // non-silence
	});

	it("sums two out-nodes' l/r into the frame", () => {
		const two = prog(
			[
				pnode("rn.pair", [{}], { place: "p1", config: { lv: 1, rv: 2 } }),
				pnode("rn.pair", [{}], { place: "p2", config: { lv: 10, rv: 20 } }),
			],
			[0, 1],
		);
		const engine = createEngine(two, 48000, getRegistry());
		const frame = new Float32Array(2);
		engine.tick(frame);
		expect(frame[0]).toBe(11);
		expect(frame[1]).toBe(22);
	});
});
