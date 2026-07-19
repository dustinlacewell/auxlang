import { describe, expect, it } from "vitest";

import { getRegistry } from "@/core3/module/define";
import { defmod } from "@/core3/patch/defmod";
import { renderTap } from "@/core3/runtime/render";
import { sig } from "@/core3/types";
import { type IO, type St, pnode, prog, z } from "./helpers";

defmod({
	name: "zt.inc",
	category: "utils",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s: St, ins: IO, o: IO) => {
		o.out = (ins.in as number) + 1;
	},
});

describe("engine: z-source", () => {
	it("self-accumulator via z-edge ramps by 1 per sample (reads PREVIOUS sample)", () => {
		const program = prog([pnode("zt.inc", [{ in: z(0) }])]);
		const tap = renderTap(program, 0, "out", 0, 6, getRegistry());
		expect(Array.from(tap)).toEqual([1, 2, 3, 4, 5, 6]);
	});
});
