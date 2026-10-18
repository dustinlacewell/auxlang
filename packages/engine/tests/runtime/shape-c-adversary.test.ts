/**
 * Adversary probes against shape-C's carry rule and re-eval lowering
 * (MANIFESTO §5, "Re-eval keeps the music going"; module/front/state/
 * carry-fields.ts; module/lower/tick-writes.ts; module/lower/infer-outs.ts).
 * Each `it` proves one hypothesis; a passing one is a regression row, an
 * `it.fails` names the observed wrong behaviour.
 */

import { describe, expect, it } from "vitest";

import "@/library/all";
import { getRegistry } from "@/dsp/define";
import { InterpreterEngine } from "@/runtime/interpreter-engine";
import { withProgramSpecs } from "@/runtime/hydrate-specs";
import { slotOf } from "@/runtime/output-slots";
import type { Program } from "@/types";
import { createWasmEngine, swapWasmEngine } from "@/wasm/host/create-wasm-engine";
import { evalPatch } from "@/eval-patch";

const SR = 48000;

const registry = (program: Program) => withProgramSpecs(getRegistry(), program);

function laneOf(engine: InterpreterEngine): Record<string, unknown> {
	return (Object.values(engine.collectState().nodes)[0] as Record<string, unknown>[])[0] as Record<
		string,
		unknown
	>;
}

function swapJs(before: string, after: string, ticksBefore = 1): { readonly before: InterpreterEngine; readonly after: InterpreterEngine } {
	const a = evalPatch(before);
	const js = new InterpreterEngine(a, SR, registry(a));
	const l = new Float32Array(1);
	const r = new Float32Array(1);
	for (let i = 0; i < ticksBefore; i++) js.renderBlock(l, r, 0, 1);
	const b = evalPatch(after);
	const swapped = new InterpreterEngine(b, SR, registry(b), js.liveState());
	return { before: js, after: swapped };
}

describe("shape-C adversary: tick-writes aliasing", () => {
	it("const v = voices[0]; v.x += 1 marks 'voices' written — a re-eval carries the lane instead of dropping it to a fresh array (tick-writes.ts follows the alias through the element access, by the records shape)", () => {
		const before = `const osc = defmod("osc", {}, ({ sr }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  return () => {
    const v = voices[0]
    v.x += 1
    return v.x
  }
})
osc().out()`;
		const after = `const osc = defmod("osc", {}, ({ sr }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  return () => {
    const v = voices[0]
    v.x += 1000
    return v.x
  }
})
osc().out()`;
		const { after: swapped } = swapJs(before, after);
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		swapped.renderBlock(l, r, 0, 1);
		expect((laneOf(swapped).voices as { x: number }[])[0]?.x).toBe(1001);
	});

	it("a same-file helper that mutates its array argument keeps the buffer written: the field carries across re-eval", () => {
		const before = `function push(b, x) { b[0] = x }
const osc = defmod("osc", {}, ({ sr }) => {
  const buf = new Float64Array(4)
  return () => {
    push(buf, buf[0] + 1)
    return buf[0]
  }
})
osc().out()`;
		const after = `function push(b, x) { b[0] = x }
const osc = defmod("osc", {}, ({ sr }) => {
  const buf = new Float64Array(4)
  return () => {
    push(buf, buf[0] + 100)
    return buf[0]
  }
})
osc().out()`;
		const { after: swapped } = swapJs(before, after);
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		swapped.renderBlock(l, r, 0, 1); // buf[0] was 1 (carried), += 100 under the new tick
		expect((laneOf(swapped).buf as Float64Array)[0]).toBe(101);
	});

	it("a tick local that shadows a setup local of the same name is not that local: it never appears as a written field, and the setup local is untouched", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  let w = 999
  return () => {
    let w = 5
    w += 1
    return w
  }
})
osc().out()`;
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		expect(laneOf(js)).not.toHaveProperty("w"); // setup's w was never read by the tick, so it isn't even a field
		expect(js.peek(0, "out", 0)).toBe(6); // the shadow's own arithmetic, unaffected by setup's w
	});
});

describe("shape-C adversary: carry rule across a kind/role change", () => {
	it("a field changing kind (number -> Float64Array, same name) starts the lane fresh: no stale number leaks into the array, no throw", () => {
		const before = `const osc = defmod("osc", {}, ({ sr }) => {
  let buf = 0
  return () => {
    buf = buf + 1
    return buf
  }
})
osc().out()`;
		const after = `const osc = defmod("osc", {}, ({ sr }) => {
  let buf = new Float64Array(4)
  return () => {
    buf[0] = buf[0] + 1
    return buf[0]
  }
})
osc().out()`;
		const { after: swapped } = swapJs(before, after, 1);
		const buf = laneOf(swapped).buf as Float64Array;
		expect(buf).toBeInstanceOf(Float64Array);
		expect(Array.from(buf)).toEqual([0, 0, 0, 0]);
	});

	it("returning a read-only setup local from the tick does not mark it 'written' (a tick's own return is its output, not an escaping reference), so editing its setup constant takes effect after a field that was written in the old tick becomes read-only in the new one", () => {
		const before = `const osc = defmod("osc", {}, ({ sr, base = 7 }) => {
  let g = base
  return () => {
    g += 1
    return g
  }
})
osc().out()`;
		const after = `const osc = defmod("osc", {}, ({ sr, base = 100 }) => {
  const g = base
  return () => {
    return g
  }
})
osc().out()`;
		const { after: swapped } = swapJs(before, after, 2); // g = 9 after 2 ticks under 'before'
		// g is read-only in the new tick, so it rebuilds fresh from base = 100
		expect(laneOf(swapped).g).toBe(100);
	});

	it("returning a setup local that is only read takes effect on an edited constant even unswapped: a fresh eval with no re-eval history also reads base, not a stale default", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr, base = 42 }) => {
  const g = base
  return () => {
    return g
  }
})
osc().out()`;
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		expect(laneOf(js).g).toBe(42);
	});
});

describe("shape-C adversary: identity and independence", () => {
	it("two different shape-C modules with different names keep separate compiled code and separate memory", () => {
		const PATCH = `const a = defmod("modA", {}, ({ sr }) => {
  let n = 0
  return () => {
    n++
    return n
  }
})
const b = defmod("modB", {}, ({ sr }) => {
  let n = 0
  return () => {
    n += 2
    return n
  }
})
a().out()
b().out()`;
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		for (let i = 0; i < 5; i++) js.renderBlock(l, r, 0, 1);
		expect(js.peek(0, "out", 0)).toBe(5);
		expect(js.peek(2, "out", 0)).toBe(10);
	});

	it("two instances of the same shape-C module keep independent memory across a re-eval: neither one's carried count cross-wires into the other", () => {
		const before = `const osc = defmod("osc", {}, ({ sr }) => {
  let n = 0
  return () => {
    n++
    return n
  }
})
osc().out()
osc().out()`;
		const after = `const osc = defmod("osc", {}, ({ sr }) => {
  let n = 0
  return () => {
    n += 1000
    return n
  }
})
osc().out()
osc().out()`;
		const a = evalPatch(before);
		const js = new InterpreterEngine(a, SR, registry(a));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		js.renderBlock(l, r, 0, 1); // both instances independently at n=2
		const b = evalPatch(after);
		const swapped = new InterpreterEngine(b, SR, registry(b), js.liveState());
		swapped.renderBlock(l, r, 0, 1);
		expect(swapped.peek(0, "out", 0)).toBe(1002);
		expect(swapped.peek(2, "out", 0)).toBe(1002);
	});

	it("the alias-through-index carry is correct identically on WASM (js === wasm), confirming the fix is in the shared lowering stage (tick-writes.ts), not one engine's carry path", () => {
		const before = `const osc = defmod("osc", {}, ({ sr }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  return () => {
    const v = voices[0]
    v.x += 1
    return v.x
  }
})
osc().out()`;
		const after = `const osc = defmod("osc", {}, ({ sr }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  return () => {
    const v = voices[0]
    v.x += 1000
    return v.x
  }
})
osc().out()`;
		const a = evalPatch(before);
		const js = new InterpreterEngine(a, SR, registry(a));
		const wasm = createWasmEngine(a, SR, getRegistry());
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		wasm.renderBlock(l, r, 0, 1);

		const b = evalPatch(after);
		const swappedJs = new InterpreterEngine(b, SR, registry(b), js.liveState());
		const swappedWasm = swapWasmEngine(b, SR, getRegistry(), wasm);
		swappedJs.renderBlock(l, r, 0, 1);
		swappedWasm.renderBlock(l, r, 0, 1);
		const jsOut = swappedJs.peek(0, "out", 0);
		const wasmOut = swappedWasm.slot(slotOf(swappedJs.layout, 0, "out", 0));
		expect(jsOut).toBe(1001);
		expect(wasmOut).toBe(1001);
	});
});

describe("shape-C adversary: randomness and ports", () => {
	it("Math.random()'s stream continues across a re-eval that only edits a config constant", () => {
		const before = `const osc = defmod("osc", {}, ({ sr, g = 1 }) => {
  return () => {
    return Math.random() * g
  }
})
osc().out()`;
		const after = `const osc = defmod("osc", {}, ({ sr, g = 2 }) => {
  return () => {
    return Math.random() * g
  }
})
osc().out()`;
		const a = evalPatch(before);
		const js = new InterpreterEngine(a, SR, registry(a));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		for (let i = 0; i < 4; i++) js.renderBlock(l, r, 0, 1);

		// reference: re-eval the SAME code (no stream change) from this point, to see what the stream gives next
		const reference = new InterpreterEngine(a, SR, registry(a), js.liveState());
		reference.renderBlock(l, r, 0, 1);
		const refNext = reference.peek(0, "out", 0);

		const b = evalPatch(after);
		const swapped = new InterpreterEngine(b, SR, registry(b), js.liveState());
		swapped.renderBlock(l, r, 0, 1);
		const afterNext = swapped.peek(0, "out", 0);
		expect(afterNext).toBeCloseTo(refNext * 2, 9); // same draw, scaled by the new g
	});

	it("an optional port left unconnected reads its stated default (NaN), and a required port left unconnected is a loud error naming it", () => {
		const optional = `const osc = defmod("osc", {}, ({ sr }) => {
  return ({ fm = NaN }) => {
    return fm !== fm ? -1 : fm
  }
})
osc().out()`;
		const a = evalPatch(optional);
		const js = new InterpreterEngine(a, SR, registry(a));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		expect(js.peek(0, "out", 0)).toBe(-1);

		const required = `const osc = defmod("osc", {}, ({ sr }) => {
  return ({ pitch }) => {
    return pitch
  }
})
osc().out()`;
		expect(() => evalPatch(required)).toThrow(/pitch.*required.*unconnected/);
	});
});

describe("shape-C adversary: lowering of bare expression-bodied ticks", () => {
	it("a tick written as a bare expression-bodied arrow (no braces, no explicit 'return') compiles and runs", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  return () => 42
})
osc().out()`;
		expect(() => evalPatch(PATCH)).not.toThrow();
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		expect(js.peek(0, "out", 0)).toBe(42);
	});

	it("a block-bodied tick's `return { l: a, r: b }` resolves the object literal's keys as property names, not free names, and both outputs carry across a re-eval", () => {
		const before = `const osc = defmod("osc", {}, ({ sr }) => {
  let g = 1
  return () => {
    g += 1
    return { l: g, r: -g }
  }
})
const o = osc()
out({ l: o.l, r: o.r })`;
		const after = `const osc = defmod("osc", {}, ({ sr }) => {
  let g = 1
  return () => {
    g += 1000
    return { l: g, r: -g }
  }
})
const o = osc()
out({ l: o.l, r: o.r })`;
		const a = evalPatch(before);
		const js = new InterpreterEngine(a, SR, registry(a));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		expect(js.peek(0, "l", 0)).toBe(2);
		expect(js.peek(0, "r", 0)).toBe(-2);

		const b = evalPatch(after);
		const swapped = new InterpreterEngine(b, SR, registry(b), js.liveState());
		swapped.renderBlock(l, r, 0, 1);
		expect(swapped.peek(0, "l", 0)).toBe(1002);
		expect(swapped.peek(0, "r", 0)).toBe(-1002);
	});

	it("`return { l: x, r: y }` is identical on JS and WASM: the object-literal fix is in the shared resolve-bindings stage, not one engine's path", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  return () => {
    return { l: 5, r: -5 }
  }
})
const o = osc()
out({ l: o.l, r: o.r })`;
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const wasm = createWasmEngine(program, SR, getRegistry());
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		wasm.renderBlock(l, r, 0, 1);
		const jsL = js.peek(0, "l", 0);
		const jsR = js.peek(0, "r", 0);
		const wasmL = wasm.slot(slotOf(js.layout, 0, "l", 0));
		const wasmR = wasm.slot(slotOf(js.layout, 0, "r", 0));
		expect(jsL).toBe(5);
		expect(jsR).toBe(-5);
		expect(wasmL).toBe(jsL);
		expect(wasmR).toBe(jsR);
	});

	it("a block-bodied tick's `return { l, r }` (shorthand, both tick locals) resolves `l`/`r` as references to those locals, not as property names", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  return () => {
    const l = 3
    const r = 4
    return { l, r }
  }
})
const o = osc()
out({ l: o.l, r: o.r })`;
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const left = new Float32Array(1);
		const right = new Float32Array(1);
		js.renderBlock(left, right, 0, 1);
		expect(js.peek(0, "l", 0)).toBe(3);
		expect(js.peek(0, "r", 0)).toBe(4);
	});

	it("an expression-bodied arrow returning an output object, `() => ({ l: a, r: b })`, lowers to the same correct result as the block-bodied form", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  return () => ({ l: 1, r: 2 })
})
const o = osc()
out({ l: o.l, r: o.r })`;
		const program = evalPatch(PATCH);
		const js = new InterpreterEngine(program, SR, registry(program));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		js.renderBlock(l, r, 0, 1);
		expect(js.peek(0, "l", 0)).toBe(1);
		expect(js.peek(0, "r", 0)).toBe(2);
	});
});

describe("shape-C adversary: static error line numbers", () => {
	it("a write-rule violation nested inside if/for reports the tick's own source line, counting from the patch's start", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  let w = 0
  const buf = new Float64Array(4)
  return () => {
    if (w > 0) {
      for (let k = 0; k < 2; k++) {
        buf.length = 8
      }
    }
    return w
  }
})
osc().out()`;
		expect(() => evalPatch(PATCH)).toThrow(/tick at patch line 7:/);
	});

	it("an unresolved free name in the tick is a loud error naming the patch line it was read at", () => {
		const PATCH = `const osc = defmod("osc", {}, ({ sr }) => {
  return () => {
    return notAThing
  }
})
osc().out()`;
		expect(() => evalPatch(PATCH)).toThrow(/line 3.*'notAThing'/);
	});
});
