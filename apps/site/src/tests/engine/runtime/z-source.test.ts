import { describe, expect, it } from "vitest";

import { getRegistry } from "@/engine/dsp/define";
import { defmod } from "@/engine/patch/defmod";
import { renderTap } from "@/engine/runtime/render";
import { pnode, prog, z } from "./helpers";

defmod("zt.inc", {}, () => {
	return ({ in: x = 0 }) => x + 1;
});

describe("engine: z-source", () => {
	it("self-accumulator via z-edge ramps by 1 per sample (reads PREVIOUS sample)", () => {
		const program = prog([pnode("zt.inc", [{ in: z(0) }])]);
		const tap = renderTap(program, 0, "out", 0, 6, getRegistry());
		expect(Array.from(tap)).toEqual([1, 2, 3, 4, 5, 6]);
	});
});
