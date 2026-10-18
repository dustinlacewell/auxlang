/**
 * Seq tables in the table heap, one cycle ahead (wasm-backend-full card,
 * step 6): a table outgrows its slot and memory grows, still bit-identical
 * to the interpreter; a clocked seq makes no `env.fill` call inside `render`
 * after its first one; a scanning position keeps the miss path and stays
 * bit-identical; bound carry views follow a grow on either side.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { factory, runProgram, seq, tempo } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { Program } from "@/engine/types";
import { createWasmEngine } from "@/engine/wasm/host/create-wasm-engine";
import { prepareWasm, prepareWasmSwap } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { EXAMPLES } from "@/ui/editor/examples/examples";
import { evalPatch } from "@/engine/eval-patch";

const SR = 48000;
const BLOCK = 128;
/** One second: one cycle at 240 bpm. */
const SECOND = Math.ceil(SR / BLOCK);

const lfo = factory("lfo");

/** Cycle 0 holds one row, cycle 1 two thousand (the spike's tables held 256). */
const GROWING = "<c3 [c3 e3]*1000>";
/** Cycle 2 is the first big one: filled ahead when the position enters cycle 1. */
const GROWING_LATE = "<c3 c3 [c3 e3]*1000>";

const growing =
	(gain: number, pattern = GROWING) =>
	() =>
		runProgram(() => {
			tempo(240);
			const s = seq(pattern);
			s.tri().mul(s.gate).mul(gain).out();
		});

const scanning = () =>
	runProgram(() => {
		tempo(120);
		seq("c3 e3 [g3 b3] <c4 d4>", lfo(0.7, -1, 5))
			.tri()
			.mul(0.2)
			.out();
	});

const chord = () =>
	runProgram(() => {
		tempo(480);
		const s = seq("[c3, e3, g3, b3, d4, f4, a4, c5] <[e3 g3] a3*3>");
		s.sin().mul(s.gate).mul(0.1).out();
	});

/** A record seq: its tables carry two field columns. */
const record = () =>
	evalPatch(`tempo(240)
const s = seq(p\`c3 e3 [g3 b3] <c4 d4>\`.with({ vel: p\`1 0.4 0.7\`, cv2: p\`<0.1 0.2>\` }))
s.tri().mul(s.gate).mul(s.vel).add(s.cv2.mul(0.1)).mul(0.2).out()`);

const coastline = () =>
	evalPatch(EXAMPLES.find((e) => e.name.startsWith("coastline"))?.source ?? "");

function wasmOf(program: Program, budget?: number): WasmEngine {
	const prepared = prepareWasm(program, SR);
	const options = budget === undefined ? {} : { fillBudget: budget };
	return new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared, options);
}

function jsOf(program: Program, prev?: ReturnType<Core3Engine["liveState"]>): Core3Engine {
	return new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program), prev);
}

/** The first output sample whose bits differ over `blocks`, or null. */
function differ(js: Core3Engine, wasm: WasmEngine, blocks: number): string | null {
	const jl = new Float32Array(BLOCK);
	const jr = new Float32Array(BLOCK);
	const wl = new Float32Array(BLOCK);
	const wr = new Float32Array(BLOCK);
	for (let b = 0; b < blocks; b++) {
		js.renderBlock(jl, jr, 0, BLOCK);
		wasm.renderBlock(wl, wr, 0, BLOCK);
		for (let k = 0; k < BLOCK; k++)
			if (!Object.is(jl[k], wl[k]) || !Object.is(jr[k], wr[k]))
				return `block ${b} sample ${k}: js ${jl[k]}/${jr[k]}, wasm ${wl[k]}/${wr[k]}`;
	}
	return null;
}

const memorySize = (wasm: WasmEngine) => wasm.liveState().f64.buffer.byteLength;

describe("WASM seq tables: heap and one cycle ahead", () => {
	it("a cycle of 2000 rows grows its table and memory, bit-identical", () => {
		const program = growing(0.2)();
		const wasm = wasmOf(program);
		const before = memorySize(wasm);
		expect(differ(jsOf(program), wasm, 4 * SECOND)).toBeNull();
		expect(memorySize(wasm)).toBeGreaterThan(before);
	});

	for (const [name, make] of [
		["growing", growing(0.2)],
		["eight-lane chord, budget 4", chord],
		["coastline", coastline],
		["record seq", record],
	] as const)
		it(`clocked seqs (${name}): no env.fill inside render after the first block, bit-identical`, () => {
			const program = make();
			const wasm = wasmOf(program, name.endsWith("budget 4") ? 4 : undefined);
			const js = jsOf(program);
			expect(differ(js, wasm, 1)).toBeNull();
			const first = wasm.tableMisses;
			expect(first).toBeGreaterThan(0);
			expect(differ(js, wasm, 8 * SECOND)).toBeNull();
			expect(wasm.tableMisses).toBe(first);
		});

	it("prefilled, a clocked seq never misses", () => {
		const wasm = wasmOf(chord());
		wasm.prefill(0);
		expect(differ(jsOf(chord()), wasm, 4 * SECOND)).toBeNull();
		expect(wasm.tableMisses).toBe(0);
	});

	it("a scanning position keeps the miss path, bit-identical", () => {
		const program = scanning();
		const wasm = wasmOf(program);
		expect(differ(jsOf(program), wasm, 8 * SECOND)).toBeNull();
		expect(wasm.tableMisses).toBeGreaterThan(8);
	});

	it("bound carry views follow a grow of the running and of the new memory", () => {
		const a = growing(0.2, GROWING_LATE)();
		const b = growing(0.3, GROWING_LATE)();
		const old = { js: jsOf(a), wasm: createWasmEngine(a, SR, getRegistry()) };
		expect(differ(old.js, old.wasm, SECOND / 2)).toBeNull();
		const prepared = prepareWasmSwap(b, SR, getRegistry(), old.wasm.side);
		const next = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
		next.bindCarry(old.wasm.liveState());

		const sizes = { old: memorySize(old.wasm), next: memorySize(next) };
		next.prefill(2);
		expect(differ(old.js, old.wasm, SECOND)).toBeNull();
		expect(memorySize(old.wasm)).toBeGreaterThan(sizes.old);
		expect(memorySize(next)).toBeGreaterThan(sizes.next);

		next.bindCarry(old.wasm.liveState());
		next.handOver(old.wasm.liveState());
		const js = jsOf(b, old.js.liveState());
		expect(next.collectState()).toEqual(js.collectState());
		expect(differ(js, next, 2 * SECOND)).toBeNull();
	});
});
