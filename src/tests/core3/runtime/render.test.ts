import { describe, expect, it } from "vitest";

import { defineModule, getRegistry } from "@/core3/module/define";
import { createEngine } from "@/core3/runtime/engine";
import { render } from "@/core3/runtime/render";
import { sig } from "@/core3/types";
import { c, n, pnode, prog, type IO, type St } from "./helpers";

defineModule({
	name: "rn.osc",
	ins: { freq: sig(440) },
	outs: { out: sig() },
	defaultIn: "freq",
	defaultOut: "out",
	state: () => ({ ph: 0 }),
	tick: (s: St, ins: IO, o: IO, _cfg: St, sr: number) => {
		s.ph = ((s.ph as number) + (ins.freq as number) / sr) % 1;
		o.out = Math.sin(2 * Math.PI * (s.ph as number));
	},
});

defineModule({
	name: "rn.split",
	ins: { in: sig(0) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	defaultOut: "l",
	tick: (_s: St, ins: IO, o: IO) => {
		o.l = ins.in as number;
		o.r = (ins.in as number) * 0.5;
	},
});

defineModule({
	name: "rn.pair",
	ins: { in: sig(0) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	defaultOut: "l",
	config: { lv: 0, rv: 0 },
	tick: (_s: St, _ins: IO, o: IO, cfg: St) => {
		o.l = cfg.lv as number;
		o.r = cfg.rv as number;
	},
});

describe("render", () => {
	const program = prog(
		[pnode("rn.osc", [{ freq: c(440) }], { id: "osc" }), pnode("rn.split", [{ in: n(0) }], { id: "split" })],
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
				pnode("rn.pair", [{}], { id: "p1", config: { lv: 1, rv: 2 } }),
				pnode("rn.pair", [{}], { id: "p2", config: { lv: 10, rv: 20 } }),
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
