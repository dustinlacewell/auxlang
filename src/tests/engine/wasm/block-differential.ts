/**
 * Test support: render a program in 128-sample blocks on the interpreter and
 * on WASM, and report the first output sample or (at a block's end) value
 * slot whose bits differ (`Object.is`), or null when all match for
 * `seconds`, with the output's peak. Faster than slot-differential.ts over
 * long renders.
 */

import "@/engine/modules/all";
import { getRegistry } from "@/engine/module/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { slotOf } from "@/engine/runtime/output-slots";
import type { Program } from "@/engine/types";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";

const SR = 48000;
const BLOCK = 128;

export interface BlockComparison {
	/** The first difference, or null. */
	readonly difference: string | null;
	/** The interpreter's largest |sample| up to there: 0 means the patch proved nothing. */
	readonly peak: number;
}

export function compareBlocks(program: Program, seconds: number): BlockComparison {
	const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const prepared = prepareWasm(program, SR);
	const wasm = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
	const jl = new Float32Array(BLOCK);
	const jr = new Float32Array(BLOCK);
	const wl = new Float32Array(BLOCK);
	const wr = new Float32Array(BLOCK);
	let peak = 0;
	for (let at = 0; at < seconds * SR; at += BLOCK) {
		js.renderBlock(jl, jr, 0, BLOCK);
		wasm.renderBlock(wl, wr, 0, BLOCK);
		for (let k = 0; k < BLOCK; k++) {
			peak = Math.max(peak, Math.abs(jl[k] as number), Math.abs(jr[k] as number));
			if (!Object.is(jl[k], wl[k]) || !Object.is(jr[k], wr[k]))
				return {
					difference: `sample ${at + k}: js ${jl[k]}/${jr[k]}, wasm ${wl[k]}/${wr[k]}`,
					peak,
				};
		}
		const slot = firstSlot(js, wasm);
		if (slot !== null) return { difference: `block ending ${at + BLOCK}: ${slot}`, peak };
	}
	return { difference: null, peak };
}

function firstSlot(js: Core3Engine, wasm: WasmEngine): string | null {
	const layout = js.layout;
	for (const [node, ports] of layout.bases.entries())
		for (const port of Object.keys(ports))
			for (let lane = 0; lane < (layout.laneCounts[node] as number); lane++) {
				const a = js.peek(node, port, lane);
				const b = wasm.slot(slotOf(layout, node, port, lane));
				if (!Object.is(a, b)) return `node ${node} ${port}[${lane}] js ${a}, wasm ${b}`;
			}
	return null;
}
