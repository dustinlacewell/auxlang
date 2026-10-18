import { describe, expect, it } from "vitest";

import { getRegistry } from "@/engine/module/define";
import { defmod } from "@/engine/patch/defmod";
import { renderTap } from "@/engine/runtime/render";
import { c, n, pnode, prog } from "./helpers";

defmod("ch.add1", {}, () => {
	return ({ in: x = 0 }) => x + 1;
});

defmod("ch.mul2", {}, () => {
	return ({ in: x = 0 }) => x * 2;
});

describe("engine: 3-node chain", () => {
	const program = prog([
		pnode("ch.add1", [{ in: c(5) }], { place: "a" }), // 5 + 1 = 6
		pnode("ch.mul2", [{ in: n(0) }], { place: "b" }), // 6 * 2 = 12
		pnode("ch.add1", [{ in: n(1) }], { place: "c" }), // 12 + 1 = 13
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
