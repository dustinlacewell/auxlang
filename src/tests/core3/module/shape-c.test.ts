/**
 * Shape C end to end (MANIFESTO §5.1, card step 4): a module defined by its
 * string name and a setup function, written as patch TEXT with a same-file
 * helper and a setup param in place of config — the grain module from
 * `src/tests/core3/wasm/patch-defmod.test.ts`, lowered through `evalPatch`.
 * Its render must match the old (object) form bit for bit.
 */

import { describe, expect, it } from "vitest";

import { getRegistry } from "@/core3/module/define";
import { defmod } from "@/core3/patch/defmod";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { SR, firstBitDiff, interpreterRun } from "../wasm/differential-harness";

function helper(x: number): number {
	return x;
}

const OLD_FORM = `const grain = defmod({
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
grain({ in: s.tri().mul(s.gate.ad(0.005, 0.2)), rate: lfo(0.3, 1, 6), depth: 0.4 }).seed(7)
  .gain(0.3)
  .out()`;

const SHAPE_C = `function frac(x) { return x - Math.floor(x) }

const grain = defmod("grain", { cat: "effects" }, ({ sr, taps = 3 }) => {
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
grain({ in: s.tri().mul(s.gate.ad(0.005, 0.2)), rate: lfo(0.3, 1, 6), depth: 0.4 }).seed(7)
  .gain(0.3)
  .out()`;

describe("shape C", () => {
	it("the grain module, written in shape C, renders bit-identically to its old (object) form", () => {
		const oldRun = interpreterRun(evalPatch(OLD_FORM), SR * 2);
		const shapeCRun = interpreterRun(evalPatch(SHAPE_C), SR * 2);
		expect(firstBitDiff(oldRun.l, shapeCRun.l), "left").toBe(-1);
		expect(firstBitDiff(oldRun.r, shapeCRun.r), "right").toBe(-1);
	});

	it("a TS-closure patch (no source text) reaching a same-file helper throws naming evalPatch", () => {
		expect(() =>
			defmod(
				"direct",
				{},
				(({ sr }: { sr: number }) => {
					return () => helper(sr);
				}) as never,
			),
		).toThrow(/evalPatch/);
	});

	it("a shape-C tick using a __dsp_-prefixed name the author wrote throws the reserved-name error", () => {
		const PATCH = `defmod("bad", {}, ({ sr }) => {
  let __dsp_x = 0
  return () => __dsp_x
})`;
		expect(() => evalPatch(PATCH)).toThrow(/reserved/);
	});

	it("meta.args naming a setup config param: a positional call after the default input sets config, not a port", () => {
		const PATCH = `const x = defmod("x", { args: ["mul"] }, ({ sr, mul = 2 }) => {
  return ({ in: p = 0 }) => p * mul
})
x(3, 10).out()`;
		const program = evalPatch(PATCH);
		const registry = withProgramSpecs(getRegistry(), program);
		const engine = new Core3Engine(program, SR, registry);
		engine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(engine.peek(0, "out", 0)).toBe(30);
	});
});
