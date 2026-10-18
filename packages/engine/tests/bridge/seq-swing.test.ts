/**
 * A swung pattern through seq: tempo(120), eight notes a bar under swing(4).
 * Each beat (24000 samples at 48 kHz) holds two eighths; the second starts
 * at 2/3 of the beat, 16000 samples in.
 */

import { runProgram, seq, tempo } from "@/api";
import { p } from "@/pattern/notation/template";
import { renderTap } from "@/runtime/render";
import { describe, expect, it } from "vitest";
import { nodeIndex } from "../../testing/bridge-helpers";

const BEAT = 24000;

describe("seq reads a swung pattern", () => {
	it("trigs land on the beat and 2/3 into it", () => {
		const program = runProgram(() => {
			tempo(120);
			seq(p`c4*8`.swing(4)).tri().out();
		});
		const trig = renderTap(program, nodeIndex(program, "seq"), "trig", 0, 2 * BEAT - 100);
		const at = [...trig.keys()].filter((k) => (trig[k] as number) > 0.5);
		const expected = [0, (2 * BEAT) / 3, BEAT, BEAT + (2 * BEAT) / 3];
		expect(at).toHaveLength(expected.length);
		at.forEach((k, i) => expect(Math.abs(k - (expected[i] as number))).toBeLessThanOrEqual(2));
	});
});
