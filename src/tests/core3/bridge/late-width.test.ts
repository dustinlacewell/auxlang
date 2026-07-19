/**
 * seq lane count is sized over the pattern's true period, not a fixed window.
 * A voice that stays silent through early cycles must still get a lane (else the
 * node pins to width 0 and slotOf throws at build); a chord that only appears in
 * a later cycle must widen the node (else its extra voices are silently dropped).
 */

import { clock, p, runProgram, seq } from "@/core3/api";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

function widthOf(pattern: unknown): number {
	const program = runProgram(() => {
		clock(120);
		seq(pattern).tri().out();
	});
	return program.nodes[nodeIndex(program, "seq")]?.width ?? -1;
}

describe("seq width over true period", () => {
	it("a voice silent for its first 8 cycles still builds with one lane", () => {
		expect(() => widthOf(p`<~ ~ ~ ~ ~ ~ ~ ~ c4>`)).not.toThrow();
		expect(widthOf(p`<~ ~ ~ ~ ~ ~ ~ ~ c4>`)).toBe(1);
	});

	it("a slow(16) voice whose note lands past cycle 8 still builds", () => {
		expect(() => widthOf(p`<~ c4>`.slow(16))).not.toThrow();
		expect(widthOf(p`<~ c4>`.slow(16))).toBe(1);
	});

	it("an all-rest pattern floors at one lane", () => {
		expect(widthOf(p`~ ~ ~`)).toBe(1);
	});

	it("a chord that only appears in a later cycle widens the node", () => {
		// 9th alternation is a 3-note stack; a fixed 8-cycle window would miss it.
		expect(widthOf(p`<c4 c4 c4 c4 c4 c4 c4 c4 {c4,e4,g4}>`)).toBe(3);
	});

	it("normal patterns are unaffected", () => {
		expect(widthOf(p`{c4,e4,g4}`)).toBe(3);
		expect(widthOf(p`c4 e4 g4`)).toBe(1);
		expect(widthOf(p`{a4,b4} {c5,d5,e5}`)).toBe(3);
	});
});
