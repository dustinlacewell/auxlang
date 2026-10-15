/**
 * seq lane count comes from pattern structure, not from a query window.
 * A voice that stays silent through early cycles must still get a lane (else the
 * node pins to width 0 and slotOf throws at build); a chord that only appears in
 * a later cycle, or under a slow that no window reaches, must widen the node
 * (else its extra voices are silently dropped).
 */

import { p, runProgram, seq, tempo } from "@/core3/api";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "./helpers";

function widthOf(pattern: unknown): number {
	const program = runProgram(() => {
		tempo(120);
		seq(pattern).tri().out();
	});
	return program.nodes[nodeIndex(program, "seq")]?.width ?? -1;
}

describe("seq width from structure", () => {
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

	it("a 3-note chord under slow(1.4) or slow(800) widens the node to 3", () => {
		expect(widthOf(p`c4 d4 e4 [f4,a4,c5]`.slow(1.4))).toBe(3);
		expect(widthOf(p`c4 d4 e4 f4 g4 a4 b4 c5 d5 [e5,g5,b5]`.slow(800))).toBe(3);
	});

	it("an explicit .voices(policy, n) sets the lane count", () => {
		expect(widthOf(p`[c4,e4]`.voices("packed", 4))).toBe(4);
		expect(() => widthOf(p`[c4,e4,g4]`.voices("packed", 2))).toThrow(/needs 3 lanes/);
	});

	it("normal patterns are unaffected", () => {
		expect(widthOf(p`{c4,e4,g4}`)).toBe(3);
		expect(widthOf(p`c4 e4 g4`)).toBe(1);
		expect(widthOf(p`{a4,b4} {c5,d5,e5}`)).toBe(3);
	});
});
