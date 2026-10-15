/**
 * Signal lambdas on WASM, bit-identical to the interpreter over 8 s: one
 * function per occurrence with its own math cache, time `(count + k) / sr`
 * from the sample count in memory, on map lanes and on a reducer input.
 */

import { describe, expect, it } from "vitest";

import { prepareWasm } from "@/core3/wasm/host/prepare-wasm";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { compareBlocks } from "./block-differential";

const SECONDS = 8;

const PATCHES: Readonly<Record<string, string>> = {
	"time only": "sin((s, sr, t) => 57 + t * 1.5).gain(0.2).out()",
	"auxlang math": `sin((s, sr, t) => 60 + 12 * Math.sin(2 * Math.PI * 0.25 * t))
  .lpf({ cutoff: (s, sr, t) => 80 + 20 * Math.cos(t * 3) * Math.exp(-t / 4), res: 0.3 })
  .gain((s, sr, t) => 0.2 * (1 + t) ** -0.5)
  .out()`,
	"exact host math": `sqr((s, sr, t) => 48 + 12 * (Math.floor(t * 4) % 2) + Math.round(t) * 0.01)
  .gain(0.1)
  .out()`,
	"sample rate, no time": "sin((s, sr) => 69 + sr / 48000).gain(0.1).out()",
	"one cache per lane": `tempo(120)
const s = seq("c3 e3 [g3,b3,d4]")
s.saw()
  .lpf({ cutoff: (s, sr, t) => 70 + 10 * Math.sin(t * 2), res: 0.2 })
  .mul(s.gate.adsr(0.01, 0.1, 0.5, 0.2))
  .gain(0.2)
  .out()`,
	"reducer input": `tempo(120)
sin(p\`[60, 64]\`).mul(0.2).spread((s, sr, t) => Math.sin(t)).out()`,
};

describe("WASM signal lambdas", () => {
	for (const [name, code] of Object.entries(PATCHES)) {
		it(`${name}: bit-identical to the interpreter over ${SECONDS} s`, () => {
			const program = evalPatch(code);
			expect(
				program.nodes.some((n) => Object.values(n.lanes[0] ?? {}).some((s) => s.k === "l")),
			).toBe(true);
			const result = compareBlocks(program, SECONDS);
			expect(result.difference).toBeNull();
			expect(result.peak).toBeGreaterThan(0);
		});
	}

	it("a lambda that returns a boolean is a loud compile error", () => {
		const program = evalPatch("sin((s, sr, t) => t > 1).gain(0.1).out()");
		expect(() => prepareWasm(program, 48000)).toThrow(/returns a boolean/);
	});
});
