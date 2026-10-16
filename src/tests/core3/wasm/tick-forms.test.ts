/**
 * Patch-defined ticks on WASM in forms the library does not exercise: early
 * returns, labels, shadowed locals, outputs read back or left unwritten (the
 * outs record is shared by the lanes), state field updates, typed-array and
 * array-of-object state, `Math.random()` and `hashRandom`, a
 * patch-defined reducer, reassigned parameters, and the state record
 * passed to helpers. Each matches the interpreter bit for bit. Forms
 * neither backend can run alike the shared checker refuses at eval, for
 * both.
 */

import "@/core3/modules/all";

import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";
import { SR, expectIdentical } from "./differential-harness";

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
      let k = 0
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
    if (i.in > 50) {
      o.out = twice(i.in) + total + j + s.buf[0] + sr * 0
      return
    }
    o.hits = o.hits + 1
  },
})
const e = seq("[c3,e4] <g3 a4>").edgy()
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
    const t = s.a[0]
    s.a[0] = s.b[0]
    s.b[0] = t
    s.a[1] = h
    o.out = cfg.mode === "a" ? r * 0.5 + s.b[0] * 0.1 + i.in * 0 : h
  },
})
seq("[c3,e3,g3]").rnd().mul(0.1).out()`;

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
seq("[c3,e3,g3]").sin().sum2().mul(0.3).out()`;

const REASSIGNED_PARAMS = `tempo(120)
const srmod = defmod({
  name: "srmod",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({ ph: 0 }),
  helpers: { bump: (x, flag) => { x = x * 2; flag = !flag; return flag ? x : x + 1 } },
  tick: (s, i, o, cfg, sr) => {
    sr = sr + 1
    sr *= 2
    s.ph = (s.ph + (i.in * 4) / sr) % 1
    o.out = bump(s.ph, true) - 1
  },
})
seq("c3 <e3 g3>").srmod().mul(0.2).out()`;

const STATE_TO_HELPER = `tempo(120)
const stepper = defmod({
  name: "stepper",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: () => ({ n: 0, acc: 0, buf: new Float64Array(3), v: { x: 0 } }),
  helpers: {
    step: (st, x) => {
      st.n++
      st.buf[st.n % 3] = x
      st.v.x += x * 0.001
      return inner(st) * 0.5
    },
    inner: (r) => r.buf[0] - r.buf[1] + r.buf[2] * 0.5 + r.n * 0.001 + r.acc * 0,
  },
  tick: (s, i, o) => {
    s.acc = s.acc * 0.9 + step(s, i.in)
    o.out = s.acc * 0.01 + (s.v.x % 1) + (s.n % 5) * 0.01
  },
})
seq("[c3,e3] <g3 a3>").stepper().mul(0.1).out()`;

describe("patch-defined ticks on WASM match the interpreter", () => {
	it("control flow, shadowing, outputs read back or left unwritten", () => {
		const ref = expectIdentical(evalPatch(CONTROL_FLOW), SR / 4);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("Math.random, hashRandom, array-of-object and typed-array state", () => {
		const ref = expectIdentical(evalPatch(RANDOM_AND_SHAPES), SR / 4);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("a patch-defined reducer", () => {
		expectIdentical(evalPatch(REDUCER), SR / 4);
	});

	it("reassigned parameters: the tick's sample rate, a helper's known argument", () => {
		const ref = expectIdentical(evalPatch(REASSIGNED_PARAMS), SR / 4);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it("a tick passing its state record to helpers that read and write it", () => {
		const ref = expectIdentical(evalPatch(STATE_TO_HELPER), SR / 4);
		expect(Math.max(...ref.l.map(Math.abs))).toBeGreaterThan(0.01);
	});

	it.todo("swapped typed-array state references, `s.a = s.b` (WASM: 'this cannot be assigned')");
});
