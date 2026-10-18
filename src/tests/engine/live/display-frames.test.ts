/**
 * The monitor's display section (live/live-contract.ts): a scope's buffer
 * and head, copied whole into a DisplaySource at frame rate, matching
 * between the WASM engine and the reference interpreter.
 */

import "@/engine/library/all";

import { getRegistry } from "@/engine/dsp/define";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { displayList } from "@/engine/runtime/live/display-list";
import { InterpretedMonitor } from "@/engine/runtime/live/interpreted-monitor";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { evaluatePatch } from "@/engine/eval-patch";
import { describe, expect, it } from "vitest";

const SR = 48000;
const BLOCK = 128;

function render(engine: { renderBlock(l: Float32Array, r: Float32Array, offset: number, n: number): void }, samples: number): void {
	const l = new Float32Array(BLOCK);
	const r = new Float32Array(BLOCK);
	for (let at = 0; at < samples; at += BLOCK) engine.renderBlock(l, r, 0, Math.min(BLOCK, samples - at));
}

describe("display frames", () => {
	const src = 'sin(hz(440)).scope().out()';

	it("the WASM engine's displays.copyInto gives one display, 1 lane, head and filled buckets", () => {
		const { program } = evaluatePatch(src);
		const prepared = prepareWasm(program, SR, getRegistry(), undefined, true);
		const engine = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
		render(engine, SR / 2);

		const displays = displayList(program);
		expect(displays).toHaveLength(1);
		expect(displays[0]?.lanes).toBe(1);

		const into = new Float64Array(engine.displays.words);
		engine.displays.copyInto(into, 0);
		const head = into[0] as number;
		const n = into[1] as number;
		expect(n).toBe(8192); // 8 traces * 512 buckets * 2 (lo, hi)
		expect(head).toBeGreaterThanOrEqual(0);
		expect(head).toBeLessThanOrEqual(512); // 512: a full sweep waiting for its trigger

		// Trace 0's filled buckets hold sin(440Hz)'s min/max envelope: lo ~ -1, hi ~ 1.
		const BUCKETS = 512;
		const filled: number[] = [];
		for (let b = 0; b < BUCKETS; b++) {
			const lo = into[2 + b * 2] as number;
			const hi = into[2 + b * 2 + 1] as number;
			if (lo !== 0 || hi !== 0) filled.push(lo, hi);
		}
		expect(filled.length).toBeGreaterThan(0);
		const los = filled.filter((_, i) => i % 2 === 0);
		const his = filled.filter((_, i) => i % 2 === 1);
		expect(Math.min(...los)).toBeGreaterThanOrEqual(-1.05);
		expect(Math.min(...los)).toBeLessThan(-0.95);
		expect(Math.max(...his)).toBeLessThanOrEqual(1.05);
		expect(Math.max(...his)).toBeGreaterThan(0.95);
	});

	it("the interpreted monitor's displays.copyInto gives the same word count as the WASM one", () => {
		const { program } = evaluatePatch(src);
		const registry = withProgramSpecs(getRegistry(), program);

		const prepared = prepareWasm(program, SR, registry, undefined, true);
		const wasm = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
		render(wasm, SR / 2);

		const interpreted = new InterpretedMonitor(program, SR, registry);
		render(interpreted, SR / 2);

		expect(interpreted.displays.words).toBe(wasm.displays.words);
	});
});
