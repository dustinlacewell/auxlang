/**
 * A module defined in the patch with its own tick (a program spec, hydrated
 * per engine) on WASM, bit-identical to the interpreter: helpers, auxlang
 * math, the random stream, a typed-array ring buffer, `??` and config.
 */

import { describe, expect, it } from "vitest";

import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { compareBlocks } from "./block-differential";

const PATCH = `const grain = defmod({
  name: "grain",
  category: "effects",
  ins: { in: sig(0), rate: sig(3), depth: sig(0.5) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  config: { taps: 3 },
  state: () => ({ phase: 0, ring: new Float32Array(64), at: 0 }),
  helpers: { frac: (x) => x - Math.floor(x) },
  tick: (s, i, o, c, sr) => {
    s.phase = frac(s.phase + i.rate / sr);
    s.ring[s.at] = i.in;
    s.at = (s.at + 1) % s.ring.length;
    let echo = 0;
    for (let k = 1; k <= c.taps; k++) echo += s.ring[s.at - 16 * k] ?? s.ring[s.at + 64 - 16 * k] ?? 0;
    const wobble = Math.sin(2 * Math.PI * s.phase) * i.depth;
    o.out = i.in * (1 - wobble) + 0.2 * echo + 0.01 * (Math.random() - 0.5);
  },
})

tempo(110)
const s = seq("c4 e4 <g4 a4> ~")
grain({ in: s.tri().mul(s.gate.ad(0.005, 0.2)), rate: lfo(0.3, 1, 6), depth: 0.4 })
  .gain(0.3)
  .out()`;

describe("WASM patch-defined module", () => {
	it("renders bit-identically to the interpreter over 2 s", () => {
		const program = evalPatch(PATCH);
		expect(program.specs?.map((spec) => spec.name)).toContain("grain");
		const result = compareBlocks(program, 2);
		expect(result.difference).toBeNull();
		expect(result.peak).toBeGreaterThan(0);
	});
});
