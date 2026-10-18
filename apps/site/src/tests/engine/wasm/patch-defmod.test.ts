/**
 * A module defined in the patch with its own tick (a program spec, hydrated
 * per engine) on WASM, bit-identical to the interpreter: helpers, auxlang
 * math, the random stream, a typed-array ring buffer, `??` and config.
 */

import { describe, expect, it } from "vitest";

import { evalPatch } from "@/engine/eval-patch";
import { compareBlocks } from "./block-differential";

const PATCH = `function frac(x) { return x - Math.floor(x) }

const grain = defmod("grain", { cat: "effects", args: ["rate", "depth"] }, ({ sr, taps = 3 }) => {
  let phase = 0
  const ring = new Float32Array(64)
  let at = 0
  return ({ in: x = 0, rate = 3, depth = 0.5 }) => {
    phase = frac(phase + rate / sr)
    ring[at] = x
    at = (at + 1) % ring.length
    let echo = 0
    for (let k = 1; k <= taps; k++) echo += ring[at - 16 * k] ?? ring[at + 64 - 16 * k] ?? 0
    const wobble = Math.sin(2 * Math.PI * phase) * depth
    return x * (1 - wobble) + 0.2 * echo + 0.01 * (Math.random() - 0.5)
  }
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
