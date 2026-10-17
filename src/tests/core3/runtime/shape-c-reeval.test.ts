/**
 * Shape-C re-eval identity (MANIFESTO §6.2, §5.1): editing a shape-C module's
 * setup or tick is not a re-eval identity change — its code is not part of
 * `kindOf` (compile/kind.ts) — so the running node still matches and the
 * per-field carry rule (module/front/state/carry-fields.ts) decides what
 * state survives. Through `evalPatch` and a real swap, on both engines.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { runProgram } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { slotOf } from "@/core3/runtime/output-slots";
import type { Program } from "@/core3/types";
import { createWasmEngine, swapWasmEngine } from "@/core3/wasm/host/create-wasm-engine";
import type { WasmEngine } from "@/core3/wasm/host/wasm-engine";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

const SR = 48000;
const BLOCK = 128;
const BEFORE = 10;
const AFTER = 10;

interface Pair {
	readonly js: Core3Engine;
	readonly wasm: WasmEngine;
}

const registry = (program: Program) => withProgramSpecs(getRegistry(), program);

/** A at SR on both engines, `BEFORE` blocks, then B swapped in on both. */
function swapAtK(before: () => Program, after: () => Program): Pair {
	const a = before();
	const old = {
		js: new Core3Engine(a, SR, registry(a)),
		wasm: createWasmEngine(a, SR, getRegistry()),
	};
	runBlocks(old, BEFORE);
	const b = after();
	return {
		js: new Core3Engine(b, SR, registry(b), old.js.liveState()),
		wasm: swapWasmEngine(b, SR, getRegistry(), old.wasm),
	};
}

function runBlocks({ js, wasm }: Pair, blocks: number): void {
	const l = new Float32Array(BLOCK);
	const r = new Float32Array(BLOCK);
	for (let b = 0; b < blocks; b++) {
		js.renderBlock(l, r, 0, BLOCK);
		wasm.renderBlock(l, r, 0, BLOCK);
	}
}

/** The first output sample or block-end value slot whose bits differ, or null. */
function firstDiff(pair: Pair, blocks: number): string | null {
	const jl = new Float32Array(BLOCK);
	const jr = new Float32Array(BLOCK);
	const wl = new Float32Array(BLOCK);
	const wr = new Float32Array(BLOCK);
	for (let b = 0; b < blocks; b++) {
		pair.js.renderBlock(jl, jr, 0, BLOCK);
		pair.wasm.renderBlock(wl, wr, 0, BLOCK);
		for (let k = 0; k < BLOCK; k++)
			if (!Object.is(jl[k], wl[k]) || !Object.is(jr[k], wr[k]))
				return `block ${b} sample ${k}: js ${jl[k]}/${jr[k]}, wasm ${wl[k]}/${wr[k]}`;
		const slot = firstSlotDiff(pair);
		if (slot !== null) return `block ${b}: ${slot}`;
	}
	return null;
}

function firstSlotDiff({ js, wasm }: Pair): string | null {
	const { bases, laneCounts } = js.layout;
	for (const [node, ports] of bases.entries())
		for (const port of Object.keys(ports))
			for (let lane = 0; lane < (laneCounts[node] as number); lane++) {
				const a = js.peek(node, port, lane);
				const b = wasm.slot(slotOf(js.layout, node, port, lane));
				if (!Object.is(a, b)) return `node ${node} ${port}[${lane}] js ${a}, wasm ${b}`;
			}
	return null;
}

/** A shape-C oscillator-like module: `phase` (written, a phase accumulator),
 * `ring` (written, a buffer), `g` (read-only, a setup constant). */
const osc = (gain: number, ringSize = 64) => `const osc = defmod("osc", {}, ({ sr, gain = ${gain} }) => {
  let phase = 0
  const ring = new Float64Array(${ringSize})
  let at = 0
  const g = gain
  return ({ hz = 110 }) => {
    phase = (phase + hz / sr) % 1
    ring[at] = phase
    at = (at + 1) % ring.length
    return Math.sin(2 * Math.PI * phase) * g + ring[at] * 0
  }
})
osc({ hz: 110 }).out()`;

/** As \`osc\`, with the tick's arithmetic changed (a factor of 2): proves the
 * new code runs, not a cached old one. */
const oscDoubled = (gain: number, ringSize = 64) =>
	`const osc = defmod("osc", {}, ({ sr, gain = ${gain} }) => {
  let phase = 0
  const ring = new Float64Array(${ringSize})
  let at = 0
  const g = gain
  return ({ hz = 110 }) => {
    phase = (phase + hz / sr) % 1
    ring[at] = phase
    at = (at + 1) % ring.length
    return Math.sin(2 * Math.PI * phase) * g * 2 + ring[at] * 0
  }
})
osc({ hz: 110 }).out()`;

describe("shape-C re-eval identity: a setup/tick edit keeps the running node (match.ts, kindOf)", () => {
	it("a new unused setup local leaves the phase accumulator running (no reset)", () => {
		const before = () => evalPatch(osc(0.5));
		const after = () =>
			evalPatch(`const osc = defmod("osc", {}, ({ sr, gain = 0.5 }) => {
  let phase = 0
  const ring = new Float64Array(64)
  let at = 0
  const g = gain
  const unused = 42
  return ({ hz = 110 }) => {
    phase = (phase + hz / sr) % 1
    ring[at] = phase
    at = (at + 1) % ring.length
    return Math.sin(2 * Math.PI * phase) * g + ring[at] * 0 + unused * 0
  }
})
osc({ hz: 110 }).out()`);

		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;

		const a = before();
		const js = new Core3Engine(a, SR, registry(a));
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		js.renderBlock(l, r, 0, BLOCK);
		const phaseBefore = laneOf(js.collectState()).phase as number;
		expect(phaseBefore).toBeGreaterThan(0); // the accumulator has moved off its initial 0

		const b = after();
		const swapped = new Core3Engine(b, SR, registry(b), js.liveState());
		const phaseAfterSwap = laneOf(swapped.collectState()).phase as number;
		expect(phaseAfterSwap).toBe(phaseBefore); // carried, not reset to 0
	});

	it("editing a read-only setup constant takes effect immediately after the swap", () => {
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;
		const pair = swapAtK(
			() => evalPatch(osc(0.5)),
			() => evalPatch(osc(0.25)),
		);
		// read-only field `g`, if it were carried stale, would still read 0.5
		expect(laneOf(pair.js.collectState()).g).toBe(0.25);
	});

	it("resizing a written buffer starts the lane fresh", () => {
		const a = evalPatch(osc(0.5, 64));
		const js = new Core3Engine(a, SR, registry(a));
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		js.renderBlock(l, r, 0, BLOCK);
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;
		expect(laneOf(js.collectState())?.phase).toBeGreaterThan(0);

		const b = evalPatch(osc(0.5, 32));
		const swapped = new Core3Engine(b, SR, registry(b), js.liveState());
		const lane = laneOf(swapped.collectState());
		expect(lane?.at).toBe(0);
		expect(lane?.phase).toBe(0);
		expect((lane?.ring as Float64Array).length).toBe(32);
	});

	it("changing the tick's arithmetic carries state but runs the new code", () => {
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;

		// ground truth: the UNDOUBLED tick's own value (its own `out` port, not the mixed `.out()`)
		// one block past the same swap point, no swap
		const reference = evalPatch(osc(0.5));
		const refEngine = new Core3Engine(reference, SR, registry(reference));
		const refBlock = new Float32Array(BLOCK);
		for (let b = 0; b < BEFORE; b++) refEngine.renderBlock(refBlock, refBlock, 0, BLOCK);
		const phaseBefore = laneOf(refEngine.collectState()).phase as number;
		refEngine.renderBlock(refBlock, refBlock, 0, BLOCK);
		const refNext = refEngine.peek(0, "out", 0);

		const pair = swapAtK(
			() => evalPatch(osc(0.5)),
			() => evalPatch(oscDoubled(0.5)),
		);
		const phase = laneOf(pair.js.collectState()).phase as number;
		expect(phase).toBe(phaseBefore); // state carried (not reset), matches the un-swapped reference

		expect(firstDiff(pair, 1)).toBeNull(); // JS === WASM for the first post-swap block
		expect(pair.js.peek(0, "out", 0)).toBeCloseTo(refNext * 2, 9); // the doubled-gain tick ran, not the old one
		expect(firstDiff(pair, AFTER)).toBeNull(); // JS === WASM continuing on
	});

	it("a for...of write carries the array of records it mutates (write analysis runs on the original for...of, not the lowered index loop)", () => {
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;

		const bumper = (gain: number) => `const bumper = defmod("bumper", {}, ({ sr, gain = ${gain} }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  return ({ hz = 110 }) => {
    for (const v of voices) v.x += 1
    return voices[0].x * gain
  }
})
bumper({ hz: 110 }).out()`;

		const before = () => evalPatch(bumper(0.5));
		// an unrelated setup constant changes: a new unused local, same shape, same kind
		const after = () =>
			evalPatch(`const bumper = defmod("bumper", {}, ({ sr, gain = 0.5 }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  const unused = 42
  return ({ hz = 110 }) => {
    for (const v of voices) v.x += 1
    return voices[0].x * gain + unused * 0
  }
})
bumper({ hz: 110 }).out()`);

		const a = before();
		const js = new Core3Engine(a, SR, registry(a));
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		js.renderBlock(l, r, 0, BLOCK);
		const xBefore = (laneOf(js.collectState()).voices as Record<string, unknown>[])[0]?.x as number;
		expect(xBefore).toBeGreaterThan(0); // the for...of write moved it off its initial 0

		const b = after();
		const swapped = new Core3Engine(b, SR, registry(b), js.liveState());
		const xAfterSwap = (laneOf(swapped.collectState()).voices as Record<string, unknown>[])[0]?.x as number;
		expect(xAfterSwap).toBe(xBefore); // carried, not reset to 0
	});

	it("a destructured alias write carries the field it aliases (write analysis reaches through the pattern on the original AST, not the lowered plain declaration)", () => {
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;

		const bumper = (gain: number) => `const bumper = defmod("bumper", {}, ({ sr, gain = ${gain} }) => {
  const voice = { env: { t: 0 }, gain: 1 }
  return ({ hz = 110 }) => {
    const { env } = voice
    env.t += 1
    return voice.env.t * gain
  }
})
bumper({ hz: 110 }).out()`;

		const before = () => evalPatch(bumper(0.5));
		// an unrelated setup constant changes: a new unused local, same shape, same kind
		const after = () =>
			evalPatch(`const bumper = defmod("bumper", {}, ({ sr, gain = 0.5 }) => {
  const voice = { env: { t: 0 }, gain: 1 }
  const unused = 42
  return ({ hz = 110 }) => {
    const { env } = voice
    env.t += 1
    return voice.env.t * gain + unused * 0
  }
})
bumper({ hz: 110 }).out()`);

		const a = before();
		const js = new Core3Engine(a, SR, registry(a));
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		js.renderBlock(l, r, 0, BLOCK);
		const tBefore = (laneOf(js.collectState()).voice as Record<string, unknown>).env;
		expect((tBefore as Record<string, unknown>).t).toBeGreaterThan(0); // the aliased write moved it off its initial 0

		const b = after();
		const swapped = new Core3Engine(b, SR, registry(b), js.liveState());
		const tAfterSwap = ((laneOf(swapped.collectState()).voice as Record<string, unknown>).env as Record<string, unknown>)
			.t;
		expect(tAfterSwap).toBe((tBefore as Record<string, unknown>).t); // carried, not reset to 0
	});

	it("an address select write (`const v = cond ? voices[0] : voices[1]`) carries `voices` (write analysis reaches through the ORIGINAL ConditionalExpression, not the lowered plain rebind)", () => {
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;

		const picker = (gain: number) => `const picker = defmod("picker", {}, ({ sr, gain = ${gain} }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  let n = 0
  return ({ hz = 110 }) => {
    n++
    const v = n % 2 === 0 ? voices[0] : voices[1]
    v.x += 1
    return (voices[0].x + voices[1].x) * gain
  }
})
picker({ hz: 110 }).out()`;

		const before = () => evalPatch(picker(0.5));
		// an unrelated setup constant changes: a new unused local, same shape, same kind
		const after = () =>
			evalPatch(`const picker = defmod("picker", {}, ({ sr, gain = 0.5 }) => {
  const voices = [{ x: 0 }, { x: 0 }]
  let n = 0
  const unused = 42
  return ({ hz = 110 }) => {
    n++
    const v = n % 2 === 0 ? voices[0] : voices[1]
    v.x += 1
    return (voices[0].x + voices[1].x) * gain + unused * 0
  }
})
picker({ hz: 110 }).out()`);

		const a = before();
		const js = new Core3Engine(a, SR, registry(a));
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		js.renderBlock(l, r, 0, BLOCK);
		const voicesBefore = laneOf(js.collectState()).voices as Record<string, unknown>[];
		const xBefore = (voicesBefore[0] as Record<string, unknown>).x as number;
		expect(xBefore).toBeGreaterThan(0); // the address-select write moved it off its initial 0

		const b = after();
		const swapped = new Core3Engine(b, SR, registry(b), js.liveState());
		const voicesAfterSwap = laneOf(swapped.collectState()).voices as Record<string, unknown>[];
		expect((voicesAfterSwap[0] as Record<string, unknown>).x).toBe(xBefore); // carried, not reset to 0
	});

	it("an address select written through `.fill` (`const v = cond ? bufA : bufB; v.fill(...)`) carries BOTH roots", () => {
		const laneOf = (state: ReturnType<Core3Engine["collectState"]>) =>
			(Object.values(state.nodes)[0] as Record<string, unknown>[])[0] as Record<string, unknown>;

		const picker = (gain: number) => `const picker = defmod("picker", {}, ({ sr, gain = ${gain} }) => {
  const bufA = new Float64Array(2)
  const bufB = new Float64Array(2)
  let n = 0
  return ({ hz = 110 }) => {
    n++
    const v = n % 2 === 0 ? bufA : bufB
    v.fill(n)
    return (bufA[0] + bufB[0]) * gain
  }
})
picker({ hz: 110 }).out()`;

		const before = () => evalPatch(picker(0.5));
		// an unrelated setup constant changes: a new unused local, same shape, same kind
		const after = () =>
			evalPatch(`const picker = defmod("picker", {}, ({ sr, gain = 0.5 }) => {
  const bufA = new Float64Array(2)
  const bufB = new Float64Array(2)
  let n = 0
  const unused = 42
  return ({ hz = 110 }) => {
    n++
    const v = n % 2 === 0 ? bufA : bufB
    v.fill(n)
    return (bufA[0] + bufB[0]) * gain + unused * 0
  }
})
picker({ hz: 110 }).out()`);

		const a = before();
		const js = new Core3Engine(a, SR, registry(a));
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		js.renderBlock(l, r, 0, BLOCK);
		const bufABefore = laneOf(js.collectState()).bufA as Float64Array;
		const bufBBefore = laneOf(js.collectState()).bufB as Float64Array;
		expect(bufABefore[0]).toBeGreaterThan(0); // the address-select fill moved bufA off its initial 0
		expect(bufBBefore[0]).toBeGreaterThan(0); // and bufB too: both candidates are carried, neither rebuilt

		const b = after();
		const swapped = new Core3Engine(b, SR, registry(b), js.liveState());
		const laneAfterSwap = laneOf(swapped.collectState());
		expect((laneAfterSwap.bufA as Float64Array)[0]).toBe(bufABefore[0]); // carried, not reset to 0
		expect((laneAfterSwap.bufB as Float64Array)[0]).toBe(bufBBefore[0]); // carried, not reset to 0
	});

	it("two different shape-C modules with different names keep separate compiled code", () => {
		const PATCH = `const a = defmod("modA", {}, ({ sr }) => {
  let n = 0
  return () => { n++; return n }
})
const b = defmod("modB", {}, ({ sr }) => {
  let n = 0
  return () => { n += 2; return n }
})
a().out()
b().out()`;
		const program = evalPatch(PATCH);
		const js = new Core3Engine(program, SR, registry(program));
		const l = new Float32Array(1);
		const r = new Float32Array(1);
		for (let i = 0; i < 5; i++) js.renderBlock(l, r, 0, 1);
		expect(js.peek(0, "out", 0)).toBe(5); // a's own count, unaffected by b
		expect(js.peek(2, "out", 0)).toBe(10); // b's own count: 2,4,6,8,10
	});
});
