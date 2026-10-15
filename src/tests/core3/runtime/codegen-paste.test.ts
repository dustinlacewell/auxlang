/**
 * Pasted ticks against the forms the library does not exercise: early
 * returns, labels, shadowed locals, `sr` reassigned, outputs read back or
 * left unwritten (the outs record is shared by the lanes), state field
 * updates, typed-array and array-of-object state, swapped state references,
 * `Math.random()` and `hashRandom`, a patch-defined reducer, and a tick that
 * must keep its call site. Each must paste (or not) as stated and match the
 * interpreter bit for bit; the driver source must carry no source names.
 */

import "@/core3/modules/all";

import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import type { Program } from "@/core3/types";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";
import { SR, expectIdentical } from "./codegen-harness";

/** The generated driver's source, captured from its one `new Function` call. */
function driverSource(program: Program): string {
	const Real = globalThis.Function;
	let source = "";
	globalThis.Function = new Proxy(Real, {
		construct(target, args: string[]) {
			const last = args[args.length - 1] as string;
			if (last.includes("function driver")) source = last;
			return Reflect.construct(target, args);
		},
	});
	try {
		new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program), undefined, {
			codegen: true,
		});
	} finally {
		globalThis.Function = Real;
	}
	return source;
}

/** Module names whose nodes were pasted. */
function pastedModules(program: Program): string[] {
	const source = driverSource(program);
	const nodes = new Set(
		[...source.matchAll(/\/\/ node (\d+) lane \d+ \(pasted\)/g)].map((m) => Number(m[1])),
	);
	return [...new Set([...nodes].map((i) => program.nodes[i]?.module as string))].sort();
}

const CONTROL_FLOW = `tempo(120)
const edgy = defmod({
  name: "edgy",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig(), hits: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({ n: 0, acc: 0, buf: new Float64Array(4), w: 0 }),
  helpers: { half: (x) => x / 2, twice: (x) => half(x) * 4 },
  tick: (s, i, o, cfg, sr) => {
    s.n++
    let total = 0
    outer: for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        if (b === a) continue outer
        if (a + b > 3) break outer
        total += a * b
      }
    }
    {
      const total = s.n * 2
      let k
      k = total + 1
      s.acc += k
    }
    s.buf[s.w] = i.in
    s.w = (s.w + 1) % 4
    switch (s.n % 3) {
      case 0:
        total += 1
      case 1:
        total += 2
        break
      default:
        total -= 1
    }
    let j = 0
    do { j++ } while (j < 2)
    sr = sr + 1
    if (i.in > 50) {
      o.out = twice(i.in) + total + j + s.buf[0] + sr * 0
      return
    }
    o.hits = o.hits + 1
  },
})
const e = seq("{c3,e4} <g3 a4>").edgy()
e.add(e.hits).mul(0.001).out()`;

const RANDOM_AND_SHAPES = `tempo(120)
const rnd = defmod({
  name: "rnd",
  category: "sources",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  config: { mode: "a" },
  state: () => ({ step: 0, voices: [{ x: 0 }, { x: 0 }], a: new Float32Array(2), b: new Float32Array(2) }),
  tick: (s, i, o, cfg) => {
    s.step = s.step + 1
    const r = Math.random()
    const h = hashRandom(s.step % 7)
    s.voices[s.step % 2].x += r
    const t = s.a
    s.a = s.b
    s.b = t
    s.a[0] = h
    o.out = cfg.mode === "a" ? r * 0.5 + s.b[0] * 0.1 + i.in * 0 : h
  },
})
seq("{c3,e3,g3}").rnd().mul(0.1).out()`;

const REDUCER = `tempo(120)
const sum2 = defmod({
  name: "sum2",
  category: "utils",
  policy: "reduce",
  ins: { in: sig(0), k: sig(1) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({ last: 0 }),
  tick: (s, i, o, cfg, sr, width) => {
    const lanes = i.in
    let acc = 0
    if (typeof lanes === "number") acc = lanes
    else for (let l = 0; l < width; l++) acc += lanes[l] ?? 0
    s.last = acc
    o.out = (acc * i.k) / width
  },
})
seq("{c3,e3,g3}").sin().sum2().mul(0.3).out()`;

const BARE_STATE = `tempo(120)
const peeker = defmod({
  name: "peeker",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({ v: 0.5 }),
  helpers: { peek: (st) => st.v },
  tick: (s, i, o) => {
    o.out = peek(s) * i.in
  },
})
seq("c3 e3").sin().peeker().mul(0.3).out()`;

describe("pasted ticks match the interpreter", () => {
	it("control flow, shadowing, sr reassigned, outputs read back or left unwritten", () => {
		const program = evalPatch(CONTROL_FLOW);
		expect(pastedModules(program)).toContain("edgy");
		const ref = expectIdentical(program, SR / 4);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
		const source = driverSource(program);
		for (const name of ["edgy", "total", "outer", "twice", "acc", "hits"])
			expect(source, `source name '${name}'`).not.toMatch(new RegExp(`\\b${name}\\b(?!")`));
	});

	it("Math.random, hashRandom, array-of-object and swapped typed-array state", () => {
		const program = evalPatch(RANDOM_AND_SHAPES);
		expect(pastedModules(program)).toContain("rnd");
		const ref = expectIdentical(program, SR / 4);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("a patch-defined reducer", () => {
		const program = evalPatch(REDUCER);
		expect(pastedModules(program)).toContain("sum2");
		expectIdentical(program, SR / 4);
	});

	it("a tick that passes its state object to a helper keeps its call site", () => {
		const program = evalPatch(BARE_STATE);
		expect(pastedModules(program)).not.toContain("peeker");
		expect(pastedModules(program)).toContain("sin");
		expectIdentical(program, SR / 4);
	});
});
