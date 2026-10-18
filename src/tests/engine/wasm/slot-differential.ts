/**
 * Test support: render a program one sample at a time on the interpreter
 * and on WASM, and report the first value slot whose bits differ
 * (`Object.is`), or null when every slot matches for `samples` samples.
 */

import "@/engine/library/all";
import { getRegistry } from "@/engine/dsp/define";
import { Core3Engine } from "@/engine/runtime/engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import { slotOf } from "@/engine/runtime/output-slots";
import type { Program } from "@/engine/types";
import { prepareWasm } from "@/engine/wasm/host/prepare-wasm";
import { WasmEngine } from "@/engine/wasm/host/wasm-engine";

const SR = 48000;

export function firstSlotDifference(program: Program, samples: number): string | null {
	const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const prepared = prepareWasm(program, SR);
	const wasm = new WasmEngine(new WebAssembly.Module(prepared.compiled.bytes), prepared);
	const l = new Float32Array(1);
	const r = new Float32Array(1);
	const layout = js.layout;
	for (let k = 0; k < samples; k++) {
		js.renderBlock(l, r, 0, 1);
		wasm.renderBlock(l, r, 0, 1);
		for (const [node, ports] of layout.bases.entries()) {
			for (const port of Object.keys(ports)) {
				for (let lane = 0; lane < (layout.laneCounts[node] as number); lane++) {
					const a = js.peek(node, port, lane);
					const b = wasm.slot(slotOf(layout, node, port, lane));
					if (!Object.is(a, b))
						return `sample ${k}: node ${node} ${port}[${lane}] js ${a}, wasm ${b}`;
				}
			}
		}
	}
	return null;
}

/** The interpreter's values of `port` on `node` lane 0 over `samples` samples. */
export function interpreterSeries(
	program: Program,
	node: number,
	port: string,
	samples: number,
): number[] {
	const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program));
	const l = new Float32Array(1);
	const r = new Float32Array(1);
	const series: number[] = [];
	for (let k = 0; k < samples; k++) {
		js.renderBlock(l, r, 0, 1);
		series.push(js.peek(node, port, 0));
	}
	return series;
}
