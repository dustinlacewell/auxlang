/**
 * A reducer's gathered lane view is f64 in WASM, as the engine's
 * Float64Array (runtime/gathers.ts): `out` sums two sine lanes and every
 * value slot matches the JS backend bit for bit, sample by sample. An f32
 * view rounds each lane before the sum and differs on the first non-zero
 * sample.
 */

import "@/core3/modules/all";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { slotOf } from "@/core3/runtime/output-slots";
import { prepareWasm } from "@/core3/wasm/host/prepare-wasm";
import { WasmEngine } from "@/core3/wasm/host/wasm-engine";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";

const SR = 48000;
const PATCH = "tempo(120)\nsin(p`[60, 64]`).out()";

/** The first value slot that differs, rendering one sample at a time, or null. */
function firstDifference(samples: number): string | null {
	const program = evalPatch(PATCH);
	const js = new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program), undefined, {
		codegen: true,
	});
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

describe("WASM reducer views", () => {
	it("gather lanes at f64, so a two-lane out matches JS bit for bit", () => {
		expect(firstDifference(64)).toBeNull();
	});
});
