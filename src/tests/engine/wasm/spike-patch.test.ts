/**
 * The WASM spike: the spike patch (oscillators, filters, envelopes, seq,
 * out) compiled to one WASM module renders bit-identically to the
 * interpreter (the reference): every output sample, and every
 * value slot at every block end. A WASM build at another sample rate must
 * differ, so the comparison can fail.
 */

import "@/engine/library/all";
import { getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { type OutputLayout, slotOf } from "@/engine/runtime/output-slots";
import type { Program } from "@/engine/types";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";
import { evalPatch } from "@/engine/eval-patch";
import { describe, expect, it } from "vitest";
import { WASM_SPIKE_PATCH } from "./spike-patch";

const SR = 48000;
const BLOCK = 128;

function wasmEngine(program: Program, sampleRate: number): WasmEngine {
	const prepared = prepareWasm(program, sampleRate);
	return new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
}

/** The first difference over `seconds`, or null. */
function firstDifference(program: Program, wasm: WasmEngine, seconds: number): string | null {
	const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const jl = new Float32Array(BLOCK);
	const jr = new Float32Array(BLOCK);
	const wl = new Float32Array(BLOCK);
	const wr = new Float32Array(BLOCK);
	const slots = allSlots(js.layout);
	for (let at = 0; at < seconds * SR; at += BLOCK) {
		js.renderBlock(jl, jr, 0, BLOCK);
		wasm.renderBlock(wl, wr, 0, BLOCK);
		for (let k = 0; k < BLOCK; k++) {
			if (!Object.is(jl[k], wl[k]) || !Object.is(jr[k], wr[k]))
				return `sample ${at + k}: js ${jl[k]} ${jr[k]}, wasm ${wl[k]} ${wr[k]}`;
		}
		for (const { node, port, lane, slot } of slots) {
			const a = js.peek(node, port, lane);
			const b = wasm.slot(slot);
			if (!Object.is(a, b))
				return `node ${node} ${port}[${lane}] at ${at + BLOCK}: js ${a}, wasm ${b}`;
		}
	}
	return null;
}

/** Every (node, output, lane) and its value slot. */
function allSlots(
	layout: OutputLayout,
): { node: number; port: string; lane: number; slot: number }[] {
	return layout.bases.flatMap((ports, node) =>
		Object.keys(ports).flatMap((port) =>
			Array.from({ length: layout.laneCounts[node] as number }, (_, lane) => ({
				node,
				port,
				lane,
				slot: slotOf(layout, node, port, lane),
			})),
		),
	);
}

describe("WASM spike patch", () => {
	const program = evalPatch(WASM_SPIKE_PATCH);

	it("renders bit-identically to the interpreter (8 s: both pad chords, every bass note)", () => {
		expect(firstDifference(program, wasmEngine(program, SR), 8)).toBeNull();
	});

	it("is audible, so the comparison means something", () => {
		const wasm = wasmEngine(program, SR);
		const l = new Float32Array(BLOCK);
		const r = new Float32Array(BLOCK);
		let peak = 0;
		for (let at = 0; at < SR; at += BLOCK) {
			wasm.renderBlock(l, r, 0, BLOCK);
			for (const v of l) peak = Math.max(peak, Math.abs(v));
		}
		expect(peak).toBeGreaterThan(0.1);
	});

	it("differs when built at another sample rate", () => {
		expect(firstDifference(program, wasmEngine(program, SR + 1), 0.1)).not.toBeNull();
	});
});
