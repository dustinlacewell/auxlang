/**
 * Shape C end to end (MANIFESTO §5.1, card step 4): a module defined by its
 * string name and a setup function, written as patch TEXT with a same-file
 * helper and a setup param in place of config — the grain module from
 * `src/tests/core3/wasm/patch-defmod.test.ts`, lowered through `evalPatch`.
 * Its render is checked against fixed sample values (grain-fixed-values.ts).
 */

import { describe, expect, it } from "vitest";

import { getRegistry } from "@/core3/module/define";
import { defmod } from "@/core3/patch/defmod";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { SR, expectIdentical, interpreterRun } from "../wasm/differential-harness";

function helper(x: number): number {
	return x;
}

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
	it("the grain module, written in shape C, renders to fixed, deterministic sample values", () => {
		const run = interpreterRun(evalPatch(SHAPE_C), SR * 2);
		const expected: Record<number, number> = {
			0: -0.0013554792385548353,
			1: -0.0011001424863934517,
			100: 0.07273128628730774,
			1000: 0.11610257625579834,
			10000: -0.0007661228883080184,
			50000: 0.0001148110386566259,
			95999: 0.0007958012283779681,
		};
		for (const [i, v] of Object.entries(expected)) {
			expect(run.l[Number(i)]).toBe(v);
			expect(run.r[Number(i)]).toBe(v);
		}
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

	it("a shape-C tick using **= and ?. on a setup local renders through the lifted forms", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  let gain = 2
  const held = { n: 3 }
  return ({ in: p = 0 }) => {
    gain **= 1.5
    return p * gain + held?.n
  }
})
x(10).out()`;
		const program = evalPatch(PATCH);
		const registry = withProgramSpecs(getRegistry(), program);
		const engine = new Core3Engine(program, SR, registry);
		engine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(engine.peek(0, "out", 0)).toBeCloseTo(10 * 2 ** 1.5 + 3, 10);
	});

	it("a shape-C tick's nested arrow reading a setup local (a typed array) lifts to a helper, WASM bit-identical to the interpreter", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  const buf = new Float64Array(4)
  let n = 0
  return ({ in: v = 0 }) => {
    const peek = (k) => buf[k % 4]
    buf[n % 4] = v
    n++
    return peek(0)
  }
})
tempo(120)
seq("[c3,e3] <g3 a3>").x().mul(0.1).out()`;
		expectIdentical(evalPatch(PATCH), 2000);
	});

	it("a shape-C tick's nested arrow reading a setup local (a let number) lifts to a helper, WASM bit-identical to the interpreter", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  let n = 0
  return ({ in: v = 0 }) => {
    const addN = (a) => a + n
    n++
    return addN(v) * 0.001
  }
})
tempo(120)
seq("[c3,e3] <g3 a3>").x().mul(0.1).out()`;
		expectIdentical(evalPatch(PATCH), 2000);
	});

	it("a shape-C tick's nested arrow reading only its own params lifts to a helper, WASM bit-identical to the interpreter", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  return ({ in: v = 0 }) => {
    const lerp = (a, b, t) => a + (b - a) * t
    return lerp(0, v, 0.5)
  }
})
tempo(120)
seq("[c3,e3] <g3 a3>").x().mul(0.1).out()`;
		expectIdentical(evalPatch(PATCH), 2000);
	});

	it("a shape-C tick's nested arrow writing a setup local is a loud error", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  let n = 0
  return ({ in: v = 0 }) => {
    const bad = (a) => { n = a; return a }
    return bad(v)
  }
})
x(1).out()`;
		expect(() => evalPatch(PATCH)).toThrow(
			/a lifted helper has no closure, so it cannot write through a captured name/,
		);
	});

	it("an unbraced 'if' return keeps its early return conditional, not falling through to the next statement", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  return ({ in: v = 0 }) => {
    if (v > 0) return 1
    return 2
  }
})
x(5).out()`;
		const positive = evalPatch(PATCH);
		const positiveRegistry = withProgramSpecs(getRegistry(), positive);
		const positiveEngine = new Core3Engine(positive, SR, positiveRegistry);
		positiveEngine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(positiveEngine.peek(0, "out", 0)).toBe(1);

		const negative = evalPatch(`const x = defmod("x", {}, ({ sr }) => {
  return ({ in: v = 0 }) => {
    if (v > 0) return 1
    return 2
  }
})
x(-5).out()`);
		const negativeRegistry = withProgramSpecs(getRegistry(), negative);
		const negativeEngine = new Core3Engine(negative, SR, negativeRegistry);
		negativeEngine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(negativeEngine.peek(0, "out", 0)).toBe(2);
	});

	it("an unbraced three-way 'if/else if/else' return picks the right branch in each case", () => {
		const makePatch = (v: number) => `const x = defmod("x", {}, ({ sr }) => {
  return ({ in: w = 0 }) => {
    if (w > 0) return 1
    else if (w < 0) return -1
    return 0
  }
})
x(${v}).out()`;
		for (const [v, expected] of [[3, 1], [-3, -1], [0, 0]] as const) {
			const program = evalPatch(makePatch(v));
			const registry = withProgramSpecs(getRegistry(), program);
			const engine = new Core3Engine(program, SR, registry);
			engine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
			expect(engine.peek(0, "out", 0)).toBe(expected);
		}
	});

	it("an unbraced 'if' arm returning a group output ({ l, r }) writes both ports, not falling through", () => {
		const PATCH = `const x = defmod("x", {}, ({ sr }) => {
  return ({ in: v = 0 }) => {
    if (v > 0) return { l: v, r: -v }
    return { l: 0, r: 0 }
  }
})
x(7).out({ l: x.l, r: x.r })`;
		const program = evalPatch(PATCH);
		const registry = withProgramSpecs(getRegistry(), program);
		const engine = new Core3Engine(program, SR, registry);
		engine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(engine.peek(0, "l", 0)).toBe(7);
		expect(engine.peek(0, "r", 0)).toBe(-7);
	});

	it("meta.args naming a setup config param: a positional call (config before the default input, seq-style) sets both", () => {
		const PATCH = `const x = defmod("x", { args: ["mul", "in"] }, ({ sr, mul = 2 }) => {
  return ({ in: p = 0 }) => p * mul
})
x(10, 3).out()`;
		const program = evalPatch(PATCH);
		const registry = withProgramSpecs(getRegistry(), program);
		const engine = new Core3Engine(program, SR, registry);
		engine.renderBlock(new Float32Array(1), new Float32Array(1), 0, 1);
		expect(engine.peek(0, "out", 0)).toBe(30);
	});
});
