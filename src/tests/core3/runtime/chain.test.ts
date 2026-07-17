import { describe, expect, it } from "vitest";

import { defineModule } from "@/core3/module/define";
import { getRegistry } from "@/core3/module/define";
import { renderTap } from "@/core3/runtime/render";
import { sig } from "@/core3/types";
import { c, n, pnode, prog, type IO, type St } from "./helpers";

defineModule({
	name: "ch.add1",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s: St, ins: IO, o: IO) => {
		o.out = (ins.in as number) + 1;
	},
});

defineModule({
	name: "ch.mul2",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s: St, ins: IO, o: IO) => {
		o.out = (ins.in as number) * 2;
	},
});

describe("engine: 3-node chain", () => {
	const program = prog([
		pnode("ch.add1", [{ in: c(5) }], { id: "a" }), // 5 + 1 = 6
		pnode("ch.mul2", [{ in: n(0) }], { id: "b" }), // 6 * 2 = 12
		pnode("ch.add1", [{ in: n(1) }], { id: "c" }), // 12 + 1 = 13
	]);

	it("propagates constants through same-sample n-sources", () => {
		const tap = renderTap(program, 2, "out", 0, 4, getRegistry());
		expect(Array.from(tap)).toEqual([13, 13, 13, 13]);
	});

	it("intermediate node carries the intermediate value", () => {
		const tap = renderTap(program, 1, "out", 0, 2, getRegistry());
		expect(Array.from(tap)).toEqual([12, 12]);
	});
});
